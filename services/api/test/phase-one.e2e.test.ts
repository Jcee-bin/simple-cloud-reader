import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { createAuthService } from "../src/auth/authService.js";
import { createAuthenticate } from "../src/auth/authenticate.js";
import { PostgresAuthRepository } from "../src/auth/postgresAuthRepository.js";
import { createDatabase } from "../src/db/client.js";
import {
  applyMigrationsToSchema,
  dropTestSchema,
} from "../src/db/testDatabase.js";
import { createFileService } from "../src/files/fileService.js";
import { PostgresFileRepository } from "../src/files/postgresFileRepository.js";
import type { ObjectStore } from "../src/storage/objectStore.js";
import { PostgresSyncStore } from "../src/sync/postgresSyncStore.js";

describe.runIf(Boolean(process.env.TEST_DATABASE_URL))(
  "Phase 1 authenticated two-device journey",
  () => {
    const schemaName = `phase_one_${crypto.randomUUID().replaceAll("-", "")}`;
    const database = createDatabase(process.env.TEST_DATABASE_URL!, {
      searchPath: schemaName,
    });
    const jwtSecret = "phase-one-jwt-secret-that-is-at-least-32-bytes";
    const now = new Date("2026-06-12T00:00:00.000Z");
    const sentLinks: string[] = [];
    const objectStore: ObjectStore = {
      checkReady: vi.fn(async () => undefined),
      createUploadUrl: vi.fn(async (key, contentType) => ({
        key,
        contentType,
        url: `https://objects.test/upload/${key}`,
        expiresAt: new Date(now.getTime() + 900_000),
      })),
      createDownloadUrl: vi.fn(async (key) => ({
        key,
        url: `https://objects.test/download/${key}`,
        expiresAt: new Date(now.getTime() + 900_000),
      })),
      headObject: vi.fn(async () => ({ exists: true, byteSize: 4096 })),
      deleteObject: vi.fn(async () => undefined),
    };
    const authRepository = new PostgresAuthRepository(database.db);
    const authService = createAuthService({
      repository: authRepository,
      emailSender: {
        async sendMagicLink(input) {
          sentLinks.push(input.url);
        },
      },
      publicAppUrl: "https://reader.test",
      jwtSecret,
      now: () => new Date(now),
    });
    const app = buildApp({
      authService,
      authenticate: createAuthenticate({
        jwtSecret,
        accessRepository: authRepository,
      }),
      fileService: createFileService({
        repository: new PostgresFileRepository(database.db),
        objectStore,
        now: () => new Date(now),
      }),
      syncStore: new PostgresSyncStore({
        db: database.db,
        cursorSecret: "phase-one-cursor-secret-that-is-at-least-32-bytes",
        now: () => new Date(now),
      }),
    });

    const phoneId = "93f39cf5-d988-49d9-9cc0-a857d13ac1d6";
    const windowsId = "28f4616f-67ac-4313-bb26-aea8d7a86dcd";
    const bookId = "d1822de7-f117-4910-96d2-e8a07fb7455f";
    const progressId = "17d24783-4be7-4857-94de-1e78ab58db60";
    const highlightId = "65ca1b9a-7ef1-4473-99b8-46143a6f22c8";
    const progressOperation = {
      operationId: "a85e8696-0835-4b16-837d-497f6e71d6f3",
      entityType: "progress",
      entityId: progressId,
      action: "upsert",
      baseVersion: 0,
      clientTimestamp: now.toISOString(),
      deletedAt: null,
      payload: {
        bookId,
        locator: {
          format: "epub",
          progression: 0.42,
          engine: "koreader",
          engineLocation: {},
        },
      },
    };
    const highlightOperation = {
      operationId: "b6bfe077-c73b-4fe4-8b8f-0ab074ad5481",
      entityType: "highlight",
      entityId: highlightId,
      action: "upsert",
      baseVersion: 0,
      clientTimestamp: now.toISOString(),
      deletedAt: null,
      payload: {
        bookId,
        selectedText: "A selected sentence",
        prefix: "Before ",
        suffix: " after",
        colorRole: "quote",
        note: "Remember this",
        locator: {
          format: "epub",
          progression: 0.43,
          engine: "readium",
          engineLocation: {},
        },
      },
    };

    beforeAll(async () => {
      await applyMigrationsToSchema(schemaName);
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
      await database.pool.end();
      await dropTestSchema(schemaName);
    });

    async function signIn(device: {
      id: string;
      name: string;
      platform: "android" | "windows";
    }): Promise<string> {
      const requested = await app.inject({
        method: "POST",
        url: "/v1/auth/magic-link",
        payload: { email: "reader@example.com" },
      });
      expect(requested.statusCode).toBe(202);
      const token = new URL(sentLinks.pop()!).searchParams.get("token");
      expect(token).toBeTruthy();

      const redeemed = await app.inject({
        method: "POST",
        url: "/v1/auth/redeem",
        payload: {
          token,
          deviceId: device.id,
          deviceName: device.name,
          platform: device.platform,
        },
      });
      expect(redeemed.statusCode).toBe(200);
      return redeemed.json().accessToken as string;
    }

    function bearer(accessToken: string) {
      return { authorization: `Bearer ${accessToken}` };
    }

    it("syncs a managed book and reading state across phone and Windows", async () => {
      const phoneToken = await signIn({
        id: phoneId,
        name: "Android phone",
        platform: "android",
      });
      const windowsToken = await signIn({
        id: windowsId,
        name: "Windows desktop",
        platform: "windows",
      });

      const initialPush = await app.inject({
        method: "POST",
        url: "/v1/sync/push",
        headers: bearer(phoneToken),
        payload: {
          deviceId: phoneId,
          operations: [{
            operationId: "7051b4c1-e421-4c97-941d-c8d49d380cfc",
            entityType: "book",
            entityId: bookId,
            action: "upsert",
            baseVersion: 0,
            clientTimestamp: now.toISOString(),
            deletedAt: null,
            payload: {
              title: "The Left Hand of Darkness",
              authors: ["Ursula K. Le Guin"],
              format: "epub",
              mediaType: "application/epub+zip",
              originalFileName: "left-hand.epub",
              coverImageUrl: null,
            },
          }, progressOperation],
        },
      });
      expect(initialPush.statusCode).toBe(200);
      expect(initialPush.json().results.map(
        (result: { status: string }) => result.status,
      )).toEqual(["accepted", "accepted"]);

      const reserved = await app.inject({
        method: "POST",
        url: `/v1/books/${bookId}/files`,
        headers: bearer(phoneToken),
        payload: {
          sha256: "a".repeat(64),
          byteSize: 4096,
          contentType: "application/epub+zip",
          originalFileName: "left-hand.epub",
        },
      });
      expect(reserved.statusCode).toBe(200);
      const fileId = reserved.json().fileId as string;
      const completed = await app.inject({
        method: "POST",
        url: `/v1/files/${fileId}/complete`,
        headers: bearer(phoneToken),
        payload: { byteSize: 4096 },
      });
      expect(completed.json()).toEqual({ fileId, state: "ready" });

      const onWindows = await app.inject({
        method: "GET",
        url: "/v1/sync/pull",
        headers: bearer(windowsToken),
      });
      expect(onWindows.statusCode).toBe(200);
      expect(onWindows.json().changes.map(
        (change: { entityType: string }) => change.entityType,
      )).toEqual(["book", "progress", "fileObject", "fileObject"]);
      const windowsCursor = onWindows.json().cursor as string;

      const highlighted = await app.inject({
        method: "POST",
        url: "/v1/sync/push",
        headers: bearer(windowsToken),
        payload: {
          deviceId: windowsId,
          operations: [highlightOperation],
        },
      });
      expect(highlighted.json().results[0].status).toBe("accepted");

      const onPhone = await app.inject({
        method: "GET",
        url: `/v1/sync/pull?cursor=${encodeURIComponent(windowsCursor)}`,
        headers: bearer(phoneToken),
      });
      expect(onPhone.json().changes).toEqual([
        expect.objectContaining({
          entityType: "highlight",
          entityId: highlightId,
        }),
      ]);
      const highlightCursor = onPhone.json().cursor as string;

      for (const [token, deviceId, operation] of [
        [phoneToken, phoneId, progressOperation],
        [windowsToken, windowsId, highlightOperation],
      ] as const) {
        const retried = await app.inject({
          method: "POST",
          url: "/v1/sync/push",
          headers: bearer(token),
          payload: { deviceId, operations: [operation] },
        });
        expect(retried.json().results[0].status).toBe("duplicate");
      }

      const deleted = await app.inject({
        method: "POST",
        url: "/v1/sync/push",
        headers: bearer(windowsToken),
        payload: {
          deviceId: windowsId,
          operations: [{
            operationId: "f601f7e4-e9d1-4455-9bd7-f99e97125cbb",
            entityType: "highlight",
            entityId: highlightId,
            action: "delete",
            baseVersion: 1,
            clientTimestamp: now.toISOString(),
            deletedAt: "2026-06-12T00:05:00.000Z",
            payload: null,
          }],
        },
      });
      expect(deleted.json().results[0]).toMatchObject({
        status: "accepted",
        serverVersion: 2,
      });

      const tombstone = await app.inject({
        method: "GET",
        url: `/v1/sync/pull?cursor=${encodeURIComponent(highlightCursor)}`,
        headers: bearer(phoneToken),
      });
      expect(tombstone.json().changes).toEqual([
        expect.objectContaining({
          entityType: "highlight",
          action: "delete",
          payload: null,
          serverVersion: 2,
        }),
      ]);

      const stale = await app.inject({
        method: "POST",
        url: "/v1/sync/push",
        headers: bearer(phoneToken),
        payload: {
          deviceId: phoneId,
          operations: [{
            ...highlightOperation,
            operationId: "084d2722-daee-4603-adb6-981e1df7d427",
            baseVersion: 1,
            clientTimestamp: "2026-06-12T00:04:00.000Z",
          }],
        },
      });
      expect(stale.json().results[0]).toMatchObject({
        status: "conflict",
        serverVersion: 2,
        errorCode: "version_conflict",
      });
    });
  },
);
