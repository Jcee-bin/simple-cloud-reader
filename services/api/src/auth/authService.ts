import {
  authSessionSchema,
  magicLinkRedeemSchema,
  magicLinkRequestSchema,
  refreshRequestSchema,
} from "@simple-cloud-reader/sync-contract";
import type { EmailSender } from "../email/emailSender.js";
import type {
  AuthRepository,
  RefreshSessionRecord,
  UserRecord,
} from "./authRepository.js";
import {
  generateId as defaultGenerateId,
  generateOpaqueToken as defaultGenerateOpaqueToken,
  hashOpaqueToken,
  signAccessToken,
} from "./tokens.js";

const MAGIC_LINK_LIFETIME_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const MAGIC_LINK_EMAIL_LIMIT = 5;
const MAGIC_LINK_IP_LIMIT = 20;

export class AuthError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
  ) {
    super(code);
  }
}

interface AuthServiceDependencies {
  repository: AuthRepository;
  emailSender: EmailSender;
  publicAppUrl: string;
  jwtSecret: string;
  now?: () => Date;
  generateOpaqueToken?: () => string;
  generateId?: () => string;
}

export function createAuthService(dependencies: AuthServiceDependencies) {
  if (new TextEncoder().encode(dependencies.jwtSecret).byteLength < 32) {
    throw new Error("JWT secret must be at least 32 bytes");
  }

  const now = dependencies.now ?? (() => new Date());
  const generateOpaqueToken = dependencies.generateOpaqueToken
    ?? defaultGenerateOpaqueToken;
  const generateId = dependencies.generateId ?? defaultGenerateId;

  async function createSession(
    user: UserRecord,
    deviceId: string,
    familyId: string,
  ) {
    const issuedAt = now();
    const refreshToken = generateOpaqueToken();
    const accessToken = await signAccessToken({
      userId: user.id,
      deviceId,
      jwtSecret: dependencies.jwtSecret,
      issuedAt,
    });
    const refreshSession: RefreshSessionRecord = {
      id: generateId(),
      userId: user.id,
      deviceId,
      familyId,
      tokenHash: hashOpaqueToken(refreshToken),
      expiresAt: new Date(issuedAt.getTime() + REFRESH_TOKEN_LIFETIME_MS),
      revokedAt: null,
      replacedById: null,
    };

    return {
      accessToken,
      refreshToken,
      refreshSession,
      response: authSessionSchema.parse({
        accessToken: accessToken.token,
        accessTokenExpiresAt: accessToken.expiresAt.toISOString(),
        refreshToken,
        user,
      }),
    };
  }

  return {
    async requestMagicLink(input: {
      email: string;
      requestIp: string;
    }): Promise<void> {
      const { email } = magicLinkRequestSchema.parse({ email: input.email });
      const createdAt = now();
      const requestedIpHash = hashOpaqueToken(input.requestIp);
      const counts = await dependencies.repository.countRecentMagicLinkRequests({
        normalizedEmail: email,
        requestedIpHash,
        since: new Date(createdAt.getTime() - MAGIC_LINK_LIFETIME_MS),
      });
      if (
        counts.emailCount >= MAGIC_LINK_EMAIL_LIMIT
        || counts.ipCount >= MAGIC_LINK_IP_LIMIT
      ) {
        return;
      }

      const token = generateOpaqueToken();
      await dependencies.repository.storeMagicLink({
        id: generateId(),
        normalizedEmail: email,
        tokenHash: hashOpaqueToken(token),
        requestedIpHash,
        expiresAt: new Date(createdAt.getTime() + MAGIC_LINK_LIFETIME_MS),
        usedAt: null,
        createdAt,
      });
      const redeemUrl = new URL("/auth/redeem", dependencies.publicAppUrl);
      redeemUrl.searchParams.set("token", token);
      await dependencies.emailSender.sendMagicLink({
        to: email,
        url: redeemUrl.toString(),
      });
    },

    async redeemMagicLink(rawInput: unknown) {
      const input = magicLinkRedeemSchema.parse(rawInput);
      const consumedAt = now();
      const result = await dependencies.repository.consumeMagicLink(
        hashOpaqueToken(input.token),
        consumedAt,
      );
      if (result.status !== "valid") {
        const code = result.status === "used"
          ? "magic_link_used"
          : result.status === "expired"
          ? "magic_link_expired"
          : "invalid_magic_link";
        throw new AuthError(401, code);
      }

      const user = await dependencies.repository.findOrCreateUser(
        result.normalizedEmail,
      );
      await dependencies.repository.upsertDevice({
        id: input.deviceId,
        userId: user.id,
        name: input.deviceName,
        platform: input.platform,
        seenAt: consumedAt,
      });
      const session = await createSession(user, input.deviceId, generateId());
      await dependencies.repository.createRefreshSession(
        session.refreshSession,
      );
      return session.response;
    },

    async refresh(rawInput: unknown) {
      const input = refreshRequestSchema.parse(rawInput);
      const rotatedAt = now();
      const replacementToken = generateOpaqueToken();
      const replacement = {
        id: generateId(),
        tokenHash: hashOpaqueToken(replacementToken),
        expiresAt: new Date(
          rotatedAt.getTime() + REFRESH_TOKEN_LIFETIME_MS,
        ),
      };
      const result = await dependencies.repository.rotateRefreshSession({
        tokenHash: hashOpaqueToken(input.refreshToken),
        deviceId: input.deviceId,
        replacement,
        rotatedAt,
      });
      if (result.status !== "rotated") {
        throw new AuthError(
          401,
          result.status === "reused"
            ? "refresh_token_reused"
            : "invalid_refresh_token",
        );
      }

      const accessToken = await signAccessToken({
        userId: result.user.id,
        deviceId: input.deviceId,
        jwtSecret: dependencies.jwtSecret,
        issuedAt: rotatedAt,
      });
      return authSessionSchema.parse({
        accessToken: accessToken.token,
        accessTokenExpiresAt: accessToken.expiresAt.toISOString(),
        refreshToken: replacementToken,
        user: result.user,
      });
    },

    async signOut(rawInput: unknown): Promise<void> {
      const input = refreshRequestSchema.parse(rawInput);
      await dependencies.repository.revokeRefreshSession(
        hashOpaqueToken(input.refreshToken),
        now(),
      );
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
