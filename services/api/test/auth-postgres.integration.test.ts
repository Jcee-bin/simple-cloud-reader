import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresAuthRepository } from "../src/auth/postgresAuthRepository.js";
import { createDatabase } from "../src/db/client.js";
import {
  applyMigrationsToSchema,
  dropTestSchema,
} from "../src/db/testDatabase.js";

describe.runIf(Boolean(process.env.TEST_DATABASE_URL))(
  "PostgreSQL authentication repository",
  () => {
    const schemaName = `auth_${crypto.randomUUID().replaceAll("-", "")}`;
    const databaseUrl = process.env.TEST_DATABASE_URL!;
    const database = createDatabase(databaseUrl, {
      searchPath: schemaName,
    });
    const repository = new PostgresAuthRepository(database.db);
    const now = new Date("2026-06-12T00:00:00.000Z");
    const userEmail = "reader@example.com";
    const deviceId = "93f39cf5-d988-49d9-9cc0-a857d13ac1d6";
    const tokenHash = "a".repeat(64);

    beforeAll(async () => {
      await applyMigrationsToSchema(schemaName);
    });

    afterAll(async () => {
      await database.pool.end();
      await dropTestSchema(schemaName);
    });

    it("consumes each magic link only once", async () => {
      await repository.storeMagicLink({
        id: "1cf2790c-c900-428f-ae5f-521696bb714f",
        normalizedEmail: userEmail,
        tokenHash,
        requestedIpHash: "b".repeat(64),
        expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
        usedAt: null,
        createdAt: now,
      });

      await expect(repository.consumeMagicLink(tokenHash, now)).resolves
        .toEqual({ status: "valid", normalizedEmail: userEmail });
      await expect(repository.consumeMagicLink(tokenHash, now)).resolves
        .toEqual({ status: "used" });
    });

    it("rotates a refresh token and detects replay atomically", async () => {
      const user = await repository.findOrCreateUser(userEmail);
      await repository.upsertDevice({
        id: deviceId,
        userId: user.id,
        name: "Android phone",
        platform: "android",
        seenAt: now,
      });
      await repository.createRefreshSession({
        id: "6b9e33bf-426b-45a2-85e7-e2d79f27f18a",
        userId: user.id,
        deviceId,
        familyId: "b83139c3-b893-477f-af1a-e7fabf625a5a",
        tokenHash: "c".repeat(64),
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        replacedById: null,
      });

      await expect(repository.rotateRefreshSession({
        tokenHash: "c".repeat(64),
        deviceId,
        replacement: {
          id: "4f300f25-08ef-4663-8617-17543933d094",
          tokenHash: "d".repeat(64),
          expiresAt: new Date(
            now.getTime() + 30 * 24 * 60 * 60 * 1000,
          ),
        },
        rotatedAt: now,
      })).resolves.toEqual({ status: "rotated", user });

      await expect(repository.rotateRefreshSession({
        tokenHash: "c".repeat(64),
        deviceId,
        replacement: {
          id: "569919d4-869f-45b9-9b02-4209456fa565",
          tokenHash: "e".repeat(64),
          expiresAt: new Date(
            now.getTime() + 30 * 24 * 60 * 60 * 1000,
          ),
        },
        rotatedAt: now,
      })).resolves.toEqual({ status: "reused" });

      await expect(repository.rotateRefreshSession({
        tokenHash: "d".repeat(64),
        deviceId,
        replacement: {
          id: "bc511a3b-8540-47bf-849d-78f27c6ce218",
          tokenHash: "f".repeat(64),
          expiresAt: new Date(
            now.getTime() + 30 * 24 * 60 * 60 * 1000,
          ),
        },
        rotatedAt: now,
      })).resolves.toEqual({ status: "reused" });
    });
  },
);
