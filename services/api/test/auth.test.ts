import { decodeJwt } from "jose";
import { describe, expect, it, vi } from "vitest";
import { createAuthService } from "../src/auth/authService.js";
import {
  type AuthRepository,
  type ConsumeMagicLinkResult,
  type RefreshRotationResult,
  type RefreshSessionRecord,
  type StoredMagicLink,
  type UserRecord,
} from "../src/auth/authRepository.js";
import { hashOpaqueToken } from "../src/auth/tokens.js";
import type { EmailSender } from "../src/email/emailSender.js";

const now = new Date("2026-06-12T00:00:00.000Z");
const userId = "6cf8c51d-45b9-4c7f-bf58-bab0a80e18ef";
const deviceId = "93f39cf5-d988-49d9-9cc0-a857d13ac1d6";

class MemoryAuthRepository implements AuthRepository {
  async cleanupAuthArtifacts() {
    return { magicLinks: 0, refreshSessions: 0 };
  }
  readonly magicLinks = new Map<string, StoredMagicLink>();
  readonly refreshSessions = new Map<string, RefreshSessionRecord>();
  readonly users = new Map<string, UserRecord>();
  readonly devices = new Map<string, { userId: string }>();

  async hasActiveDevice(input: {
    userId: string;
    deviceId: string;
  }): Promise<boolean> {
    return this.devices.get(input.deviceId)?.userId === input.userId;
  }

  async storeMagicLink(record: StoredMagicLink): Promise<void> {
    this.magicLinks.set(record.tokenHash, record);
  }

  async countRecentMagicLinkRequests(input: {
    normalizedEmail: string;
    requestedIpHash: string;
    since: Date;
  }): Promise<{ emailCount: number; ipCount: number }> {
    const recent = [...this.magicLinks.values()]
      .filter((link) => link.createdAt >= input.since);
    return {
      emailCount: recent.filter(
        (link) => link.normalizedEmail === input.normalizedEmail,
      ).length,
      ipCount: recent.filter(
        (link) => link.requestedIpHash === input.requestedIpHash,
      ).length,
    };
  }

  async consumeMagicLink(
    tokenHash: string,
    consumedAt: Date,
  ): Promise<ConsumeMagicLinkResult> {
    const link = this.magicLinks.get(tokenHash);
    if (!link) return { status: "invalid" };
    if (link.usedAt) return { status: "used" };
    if (link.expiresAt <= consumedAt) return { status: "expired" };
    link.usedAt = consumedAt;
    return { status: "valid", normalizedEmail: link.normalizedEmail };
  }

  async findOrCreateUser(normalizedEmail: string): Promise<UserRecord> {
    const existing = this.users.get(normalizedEmail);
    if (existing) return existing;
    const user = { id: userId, email: normalizedEmail };
    this.users.set(normalizedEmail, user);
    return user;
  }

  async upsertDevice(input: {
    id: string;
    userId: string;
    name: string;
    platform: "android" | "windows";
    seenAt: Date;
  }): Promise<void> {
    this.devices.set(input.id, { userId: input.userId });
  }

  async createRefreshSession(
    record: RefreshSessionRecord,
  ): Promise<void> {
    this.refreshSessions.set(record.tokenHash, record);
  }

  async rotateRefreshSession(input: {
    tokenHash: string;
    deviceId: string;
    replacement: Pick<
      RefreshSessionRecord,
      "id" | "tokenHash" | "expiresAt"
    >;
    rotatedAt: Date;
  }): Promise<RefreshRotationResult> {
    const current = this.refreshSessions.get(input.tokenHash);
    if (
      !current
      || current.deviceId !== input.deviceId
      || current.expiresAt <= input.rotatedAt
    ) {
      return { status: "invalid" };
    }
    if (current.revokedAt) {
      for (const session of this.refreshSessions.values()) {
        if (session.familyId === current.familyId) {
          session.revokedAt ??= input.rotatedAt;
        }
      }
      return { status: "reused" };
    }

    current.revokedAt = input.rotatedAt;
    current.replacedById = input.replacement.id;
    this.refreshSessions.set(input.replacement.tokenHash, {
      ...input.replacement,
      userId: current.userId,
      deviceId: current.deviceId,
      familyId: current.familyId,
      revokedAt: null,
      replacedById: null,
    });
    const user = [...this.users.values()]
      .find((candidate) => candidate.id === current.userId)!;
    return { status: "rotated", user };
  }

  async revokeRefreshSession(
    tokenHash: string,
    revokedAt: Date,
  ): Promise<void> {
    const session = this.refreshSessions.get(tokenHash);
    if (session) session.revokedAt ??= revokedAt;
  }
}

function createHarness() {
  const repository = new MemoryAuthRepository();
  const emailSender: EmailSender = {
    sendMagicLink: vi.fn(async () => undefined),
  };
  const tokens = [
    "magic-token",
    "refresh-token",
    "next-refresh-token",
    "unused-replay-token",
    ...Array.from({ length: 25 }, (_, index) => `generated-token-${index}`),
  ];
  const authService = createAuthService({
    repository,
    emailSender,
    publicAppUrl: "https://reader.example.com",
    jwtSecret: "a-secure-test-secret-that-is-at-least-32-bytes",
    now: () => new Date(now),
    generateOpaqueToken: () => tokens.shift()!,
    generateId: (() => {
      const ids = [
        "1cf2790c-c900-428f-ae5f-521696bb714f",
        "6b9e33bf-426b-45a2-85e7-e2d79f27f18a",
        "b83139c3-b893-477f-af1a-e7fabf625a5a",
        "4f300f25-08ef-4663-8617-17543933d094",
        "569919d4-869f-45b9-9b02-4209456fa565",
        "bc511a3b-8540-47bf-849d-78f27c6ce218",
        "6919ae17-cb38-4554-b0d1-c1028d4ae657",
        "a553a47e-a5e2-438a-bd70-f09e5f9ef67c",
        "5eb1d0e3-d041-4385-b0e9-7d7210a28169",
        "d71e4a77-23e9-452c-9655-a6d351c3fb48",
      ];
      return () => ids.shift()!;
    })(),
  });

  return { authService, emailSender, repository };
}

describe("magic-link authentication", () => {
  it("sends one link and stores only the SHA-256 token hash", async () => {
    const { authService, emailSender, repository } = createHarness();

    await authService.requestMagicLink({
      email: " Reader@Example.COM ",
      requestIp: "203.0.113.10",
    });

    expect(emailSender.sendMagicLink).toHaveBeenCalledWith({
      to: "reader@example.com",
      url: "https://reader.example.com/auth/redeem?token=magic-token",
    });
    expect(repository.magicLinks.has(hashOpaqueToken("magic-token"))).toBe(
      true,
    );
    expect(JSON.stringify([...repository.magicLinks.values()])).not.toContain(
      "magic-token",
    );
  });

  it("silently rate limits repeated requests by normalized email", async () => {
    const { authService, emailSender } = createHarness();

    for (let attempt = 0; attempt < 6; attempt += 1) {
      await expect(authService.requestMagicLink({
        email: " Reader@Example.COM ",
        requestIp: `203.0.113.${attempt + 1}`,
      })).resolves.toBeUndefined();
    }

    expect(emailSender.sendMagicLink).toHaveBeenCalledTimes(5);
  });

  it("redeems a link once and creates a device session", async () => {
    const { authService } = createHarness();
    await authService.requestMagicLink({
      email: "reader@example.com",
      requestIp: "203.0.113.10",
    });

    const session = await authService.redeemMagicLink({
      token: "magic-token",
      deviceId,
      deviceName: "My Android phone",
      platform: "android",
    });

    expect(session.user).toEqual({
      id: userId,
      email: "reader@example.com",
    });
    expect(session.refreshToken).toBe("refresh-token");
    await expect(authService.redeemMagicLink({
      token: "magic-token",
      deviceId,
      deviceName: "My Android phone",
      platform: "android",
    })).rejects.toMatchObject({
      statusCode: 401,
      code: "magic_link_used",
    });
  });

  it("issues access tokens that expire after 15 minutes", async () => {
    const { authService } = createHarness();
    await authService.requestMagicLink({
      email: "reader@example.com",
      requestIp: "203.0.113.10",
    });
    const session = await authService.redeemMagicLink({
      token: "magic-token",
      deviceId,
      deviceName: "My Windows PC",
      platform: "windows",
    });

    const claims = decodeJwt(session.accessToken);
    expect(claims.exp! - claims.iat!).toBe(15 * 60);
    expect(claims.sub).toBe(userId);
    expect(claims.deviceId).toBe(deviceId);
  });

  it("rotates refresh tokens and revokes the family on replay", async () => {
    const { authService, repository } = createHarness();
    await authService.requestMagicLink({
      email: "reader@example.com",
      requestIp: "203.0.113.10",
    });
    const first = await authService.redeemMagicLink({
      token: "magic-token",
      deviceId,
      deviceName: "My Android tablet",
      platform: "android",
    });

    const second = await authService.refresh({
      refreshToken: first.refreshToken,
      deviceId,
    });
    expect(second.refreshToken).toBe("next-refresh-token");

    await expect(authService.refresh({
      refreshToken: first.refreshToken,
      deviceId,
    })).rejects.toMatchObject({
      statusCode: 401,
      code: "refresh_token_reused",
    });
    expect(
      [...repository.refreshSessions.values()]
        .every((session) => session.revokedAt !== null),
    ).toBe(true);
  });
});
