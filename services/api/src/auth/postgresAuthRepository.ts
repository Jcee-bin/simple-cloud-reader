import { and, eq, gte } from "drizzle-orm";
import type { Database } from "../db/client.js";
import {
  devices,
  magicLinks,
  refreshSessions,
  users,
} from "../db/schema.js";
import type {
  AuthRepository,
  ConsumeMagicLinkResult,
  RefreshRotationResult,
  RefreshSessionRecord,
  StoredMagicLink,
  UserRecord,
} from "./authRepository.js";

export class PostgresAuthRepository implements AuthRepository {
  constructor(private readonly db: Database) {}

  async storeMagicLink(record: StoredMagicLink): Promise<void> {
    await this.db.insert(magicLinks).values(record);
  }

  async countRecentMagicLinkRequests(input: {
    normalizedEmail: string;
    requestedIpHash: string;
    since: Date;
  }): Promise<{ emailCount: number; ipCount: number }> {
    const [emailCount, ipCount] = await Promise.all([
      this.db.$count(
        magicLinks,
        and(
          eq(magicLinks.normalizedEmail, input.normalizedEmail),
          gte(magicLinks.createdAt, input.since),
        ),
      ),
      this.db.$count(
        magicLinks,
        and(
          eq(magicLinks.requestedIpHash, input.requestedIpHash),
          gte(magicLinks.createdAt, input.since),
        ),
      ),
    ]);
    return { emailCount, ipCount };
  }

  async consumeMagicLink(
    tokenHash: string,
    consumedAt: Date,
  ): Promise<ConsumeMagicLinkResult> {
    return this.db.transaction(async (transaction) => {
      const [link] = await transaction
        .select()
        .from(magicLinks)
        .where(eq(magicLinks.tokenHash, tokenHash))
        .for("update")
        .limit(1);
      if (!link) return { status: "invalid" };
      if (link.usedAt) return { status: "used" };
      if (link.expiresAt <= consumedAt) return { status: "expired" };

      await transaction
        .update(magicLinks)
        .set({ usedAt: consumedAt })
        .where(eq(magicLinks.id, link.id));
      return {
        status: "valid",
        normalizedEmail: link.normalizedEmail,
      };
    });
  }

  async findOrCreateUser(normalizedEmail: string): Promise<UserRecord> {
    const [created] = await this.db
      .insert(users)
      .values({ normalizedEmail })
      .onConflictDoNothing({ target: users.normalizedEmail })
      .returning({
        id: users.id,
        email: users.normalizedEmail,
      });
    if (created) return created;

    const [existing] = await this.db
      .select({
        id: users.id,
        email: users.normalizedEmail,
      })
      .from(users)
      .where(eq(users.normalizedEmail, normalizedEmail))
      .limit(1);
    if (!existing) {
      throw new Error("User creation conflicted without a readable user");
    }
    return existing;
  }

  async upsertDevice(input: {
    id: string;
    userId: string;
    name: string;
    platform: "android" | "windows";
    seenAt: Date;
  }): Promise<void> {
    await this.db.transaction(async (transaction) => {
      const [existing] = await transaction
        .select({ userId: devices.userId })
        .from(devices)
        .where(eq(devices.id, input.id))
        .for("update")
        .limit(1);
      if (existing && existing.userId !== input.userId) {
        throw new Error("Device identifier belongs to another user");
      }

      await transaction
        .insert(devices)
        .values({
          id: input.id,
          userId: input.userId,
          name: input.name,
          platform: input.platform,
          lastSeenAt: input.seenAt,
        })
        .onConflictDoUpdate({
          target: devices.id,
          set: {
            name: input.name,
            platform: input.platform,
            lastSeenAt: input.seenAt,
          },
        });
    });
  }

  async createRefreshSession(
    record: RefreshSessionRecord,
  ): Promise<void> {
    await this.db.insert(refreshSessions).values(record);
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
    return this.db.transaction(async (transaction) => {
      const [record] = await transaction
        .select({
          session: refreshSessions,
          user: {
            id: users.id,
            email: users.normalizedEmail,
          },
        })
        .from(refreshSessions)
        .innerJoin(users, eq(users.id, refreshSessions.userId))
        .where(eq(refreshSessions.tokenHash, input.tokenHash))
        .for("update")
        .limit(1);

      if (
        !record
        || record.session.deviceId !== input.deviceId
        || record.session.expiresAt <= input.rotatedAt
      ) {
        return { status: "invalid" };
      }

      if (record.session.revokedAt) {
        await transaction
          .update(refreshSessions)
          .set({ revokedAt: input.rotatedAt })
          .where(and(
            eq(refreshSessions.userId, record.session.userId),
            eq(refreshSessions.familyId, record.session.familyId),
          ));
        return { status: "reused" };
      }

      await transaction
        .update(refreshSessions)
        .set({
          revokedAt: input.rotatedAt,
          replacedById: input.replacement.id,
        })
        .where(eq(refreshSessions.id, record.session.id));
      await transaction.insert(refreshSessions).values({
        ...input.replacement,
        userId: record.session.userId,
        deviceId: record.session.deviceId,
        familyId: record.session.familyId,
        revokedAt: null,
        replacedById: null,
      });
      return { status: "rotated", user: record.user };
    });
  }

  async revokeRefreshSession(
    tokenHash: string,
    revokedAt: Date,
  ): Promise<void> {
    await this.db
      .update(refreshSessions)
      .set({ revokedAt })
      .where(eq(refreshSessions.tokenHash, tokenHash));
  }
}
