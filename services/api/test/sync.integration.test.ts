import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase } from "../src/db/client.js";
import { devices, users } from "../src/db/schema.js";
import {
  applyMigrationsToSchema,
  dropTestSchema,
} from "../src/db/testDatabase.js";
import { PostgresSyncStore } from "../src/sync/postgresSyncStore.js";

describe.runIf(Boolean(process.env.TEST_DATABASE_URL))(
  "PostgreSQL cross-device synchronization",
  () => {
    const schemaName = `sync_${crypto.randomUUID().replaceAll("-", "")}`;
    const database = createDatabase(process.env.TEST_DATABASE_URL!, {
      searchPath: schemaName,
    });
    const userA = "6cf8c51d-45b9-4c7f-bf58-bab0a80e18ef";
    const userB = "a46192d0-6480-4ba8-a821-d70136418c5c";
    const deviceA = "93f39cf5-d988-49d9-9cc0-a857d13ac1d6";
    const deviceB = "28f4616f-67ac-4313-bb26-aea8d7a86dcd";
    const deviceC = "a4c5868a-5437-4df2-ad1c-10daf31f7e9c";
    const bookId = "d1822de7-f117-4910-96d2-e8a07fb7455f";
    const progressId = "17d24783-4be7-4857-94de-1e78ab58db60";
    const highlightId = "65ca1b9a-7ef1-4473-99b8-46143a6f22c8";
    const now = new Date("2026-06-12T00:00:00.000Z");
    const store = new PostgresSyncStore({
      db: database.db,
      cursorSecret: "a-secure-cursor-secret-that-is-at-least-32-bytes",
      now: () => new Date(now),
    });

    beforeAll(async () => {
      await applyMigrationsToSchema(schemaName);
      await database.db.insert(users).values([
        { id: userA, normalizedEmail: "a@example.com" },
        { id: userB, normalizedEmail: "b@example.com" },
      ]);
      await database.db.insert(devices).values([
        {
          id: deviceA,
          userId: userA,
          name: "Phone",
          platform: "android",
        },
        {
          id: deviceB,
          userId: userA,
          name: "Windows",
          platform: "windows",
        },
        {
          id: deviceC,
          userId: userB,
          name: "Other phone",
          platform: "android",
        },
      ]);
    });

    afterAll(async () => {
      await database.pool.end();
      await dropTestSchema(schemaName);
    });

    it("synchronizes a book, progress, and highlight between two devices", async () => {
      const imported = await store.push({
        userId: userA,
        authenticatedDeviceId: deviceA,
        batch: {
          deviceId: deviceA,
          operations: [
            {
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
            },
            {
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
            },
          ],
        },
      });

      expect(imported.results.map(({ status }) => status)).toEqual([
        "accepted",
        "accepted",
      ]);
      const onWindows = await store.pull({
        userId: userA,
        limit: 500,
      });
      expect(onWindows.changes.map(({ entityType }) => entityType)).toEqual([
        "book",
        "progress",
      ]);

      const highlighted = await store.push({
        userId: userA,
        authenticatedDeviceId: deviceB,
        batch: {
          deviceId: deviceB,
          operations: [{
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
              note: null,
              locator: {
                format: "epub",
                progression: 0.43,
                engine: "readium",
                engineLocation: {},
              },
            },
          }],
        },
      });
      expect(highlighted.results[0]?.status).toBe("accepted");

      const onPhone = await store.pull({
        userId: userA,
        cursor: onWindows.cursor,
        limit: 500,
      });
      expect(onPhone.changes).toHaveLength(1);
      expect(onPhone.changes[0]?.entityType).toBe("highlight");

      const firstPage = await store.pull({
        userId: userA,
        limit: 1,
      });
      expect(firstPage.changes).toHaveLength(1);
      expect(firstPage.hasMore).toBe(true);
      const secondPage = await store.pull({
        userId: userA,
        cursor: firstPage.cursor,
        limit: 1,
      });
      expect(secondPage.changes).toHaveLength(1);
      expect(secondPage.changes[0]?.serverVersion).toBe(1);

      const retry = await store.push({
        userId: userA,
        authenticatedDeviceId: deviceB,
        batch: {
          deviceId: deviceB,
          operations: [onPhone.changes[0]!],
        },
      });
      expect(retry.results[0]).toMatchObject({
        operationId: "b6bfe077-c73b-4fe4-8b8f-0ab074ad5481",
        status: "duplicate",
      });

      const otherUser = await store.pull({ userId: userB, limit: 500 });
      expect(otherUser.changes).toEqual([]);
    });

    it("rejects device impersonation and cross-user cursors", async () => {
      await expect(store.push({
        userId: userA,
        authenticatedDeviceId: deviceA,
        batch: { deviceId: deviceB, operations: [] },
      })).rejects.toMatchObject({
        statusCode: 403,
        code: "device_mismatch",
      });

      const cursor = (await store.pull({
        userId: userA,
        limit: 1,
      })).cursor;
      await expect(store.pull({
        userId: userB,
        cursor,
        limit: 1,
      })).rejects.toMatchObject({
        statusCode: 400,
        code: "invalid_cursor",
      });
    });
  },
);
