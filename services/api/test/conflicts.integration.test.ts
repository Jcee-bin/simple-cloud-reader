import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createDatabase } from "../src/db/client.js";
import {
  devices,
  entityHistory,
  highlights,
  readingPositions,
  users,
} from "../src/db/schema.js";
import {
  applyMigrationsToSchema,
  dropTestSchema,
} from "../src/db/testDatabase.js";
import { PostgresSyncStore } from "../src/sync/postgresSyncStore.js";

describe.runIf(Boolean(process.env.TEST_DATABASE_URL))(
  "PostgreSQL conflict semantics",
  () => {
    const schemaName = `conflicts_${crypto.randomUUID().replaceAll("-", "")}`;
    const database = createDatabase(process.env.TEST_DATABASE_URL!, {
      searchPath: schemaName,
    });
    const userId = "e87c4158-3268-4bcb-9bd4-f22a3b8d24f8";
    const phoneId = "a8818622-2076-4806-bb72-72cf38f398a3";
    const windowsId = "48b028d7-a509-4296-8375-8fe6cd755130";
    const bookId = "8c8df19c-3b47-479c-a1ca-cb3e14fdaeb6";
    const highlightId = "9d2638d6-7bee-4cad-b265-ee183b416c72";
    const progressId = "eb7e4a03-b8a3-4cdb-8514-6c8ae2eb1d78";
    let serverNow = new Date("2026-06-12T00:00:00.000Z");
    const store = new PostgresSyncStore({
      db: database.db,
      cursorSecret: "a-secure-cursor-secret-that-is-at-least-32-bytes",
      now: () => new Date(serverNow),
    });

    const locator = (
      progression: number,
      engine: "readium" | "koreader" = "readium",
    ) => ({
      format: "epub" as const,
      progression,
      engine,
      engineLocation: { href: `chapter-${Math.ceil(progression * 10)}.xhtml` },
    });

    beforeAll(async () => {
      await applyMigrationsToSchema(schemaName);
      await database.db.insert(users).values({
        id: userId,
        normalizedEmail: "conflicts@example.com",
      });
      await database.db.insert(devices).values([
        {
          id: phoneId,
          userId,
          name: "Phone",
          platform: "android",
        },
        {
          id: windowsId,
          userId,
          name: "Windows",
          platform: "windows",
        },
      ]);
      await store.push({
        userId,
        authenticatedDeviceId: phoneId,
        batch: {
          deviceId: phoneId,
          operations: [{
            operationId: "b2ca6e56-96f2-4dc3-9aa8-bf49a7dbf6dd",
            entityType: "book",
            entityId: bookId,
            action: "upsert",
            baseVersion: 0,
            clientTimestamp: serverNow.toISOString(),
            deletedAt: null,
            payload: {
              title: "Conflict Test Book",
              authors: ["Test Author"],
              format: "epub",
              mediaType: "application/epub+zip",
              originalFileName: "conflict-test.epub",
              coverImageUrl: null,
            },
          }],
        },
      });
    });

    afterAll(async () => {
      await database.pool.end();
      await dropTestSchema(schemaName);
    });

    it("uses server acceptance order for concurrent note edits and preserves the losing note", async () => {
      const basePayload = {
        bookId,
        selectedText: "A stable selection",
        prefix: "Before ",
        suffix: " after",
        colorRole: "important" as const,
        locator: locator(0.4),
      };
      const create = await store.push({
        userId,
        authenticatedDeviceId: phoneId,
        batch: {
          deviceId: phoneId,
          operations: [{
            operationId: "3f5b5fc0-1267-49c6-b710-707a48dbf5cb",
            entityType: "highlight",
            entityId: highlightId,
            action: "upsert",
            baseVersion: 0,
            clientTimestamp: serverNow.toISOString(),
            deletedAt: null,
            payload: { ...basePayload, note: "Original note" },
          }],
        },
      });
      expect(create.results[0]?.status).toBe("accepted");

      serverNow = new Date("2026-06-12T00:01:00.000Z");
      const phoneEdit = await store.push({
        userId,
        authenticatedDeviceId: phoneId,
        batch: {
          deviceId: phoneId,
          operations: [{
            operationId: "7e4f845a-7a2e-4c50-a71f-e04cd2ee0c13",
            entityType: "highlight",
            entityId: highlightId,
            action: "upsert",
            baseVersion: 1,
            clientTimestamp: "2026-06-12T00:00:30.000Z",
            deletedAt: null,
            payload: { ...basePayload, note: "Phone note" },
          }],
        },
      });
      expect(phoneEdit.results[0]).toMatchObject({
        status: "accepted",
        serverVersion: 2,
      });

      serverNow = new Date("2026-06-12T00:02:00.000Z");
      const staleWindowsEdit = await store.push({
        userId,
        authenticatedDeviceId: windowsId,
        batch: {
          deviceId: windowsId,
          operations: [{
            operationId: "28b5b5a0-ecee-4f61-aa41-28e395946a74",
            entityType: "highlight",
            entityId: highlightId,
            action: "upsert",
            baseVersion: 1,
            clientTimestamp: "2026-06-12T00:00:45.000Z",
            deletedAt: null,
            payload: { ...basePayload, note: "Windows note" },
          }],
        },
      });
      expect(staleWindowsEdit.results[0]).toMatchObject({
        status: "accepted",
        serverVersion: 3,
      });

      const [current] = await database.db
        .select({ note: highlights.note, version: highlights.version })
        .from(highlights)
        .where(and(
          eq(highlights.userId, userId),
          eq(highlights.id, highlightId),
        ));
      expect(current).toEqual({ note: "Windows note", version: 3 });

      const history = await database.db
        .select({
          version: entityHistory.version,
          payload: entityHistory.payload,
        })
        .from(entityHistory)
        .where(and(
          eq(entityHistory.userId, userId),
          eq(entityHistory.entityType, "highlight"),
          eq(entityHistory.entityId, highlightId),
        ));
      expect(history).toEqual([
        {
          version: 2,
          payload: expect.objectContaining({ note: "Phone note" }),
        },
      ]);
    });

    it("accepts the latest intentional progress event despite a stale base version", async () => {
      const first = await store.push({
        userId,
        authenticatedDeviceId: phoneId,
        batch: {
          deviceId: phoneId,
          operations: [{
            operationId: "041d9e93-dba9-434c-bd76-e772e258de50",
            entityType: "progress",
            entityId: progressId,
            action: "upsert",
            baseVersion: 0,
            clientTimestamp: serverNow.toISOString(),
            deletedAt: null,
            payload: { bookId, locator: locator(0.5) },
          }],
        },
      });
      expect(first.results[0]?.status).toBe("accepted");

      serverNow = new Date("2026-06-12T01:00:00.000Z");
      const phoneProgress = await store.push({
        userId,
        authenticatedDeviceId: phoneId,
        batch: {
          deviceId: phoneId,
          operations: [{
            operationId: "040e9947-5cd5-463f-a39e-27f0c3766394",
            entityType: "progress",
            entityId: progressId,
            action: "upsert",
            baseVersion: 1,
            clientTimestamp: "2026-06-12T00:30:00.000Z",
            deletedAt: null,
            payload: { bookId, locator: locator(0.65) },
          }],
        },
      });
      expect(phoneProgress.results[0]?.serverVersion).toBe(2);

      serverNow = new Date("2026-06-12T02:00:00.000Z");
      const windowsProgress = await store.push({
        userId,
        authenticatedDeviceId: windowsId,
        batch: {
          deviceId: windowsId,
          operations: [{
            operationId: "fc28e787-6dc7-4918-a530-5b55992a3900",
            entityType: "progress",
            entityId: progressId,
            action: "upsert",
            baseVersion: 1,
            clientTimestamp: "2026-06-12T00:45:00.000Z",
            deletedAt: null,
            payload: { bookId, locator: locator(0.7, "koreader") },
          }],
        },
      });
      expect(windowsProgress.results[0]).toMatchObject({
        status: "accepted",
        serverVersion: 3,
      });

      const [current] = await database.db
        .select({
          locator: readingPositions.locator,
          version: readingPositions.version,
        })
        .from(readingPositions)
        .where(eq(readingPositions.id, progressId));
      expect(current).toEqual({
        locator: locator(0.7, "koreader"),
        version: 3,
      });
    });

    it("returns both locators instead of silently applying a recent backward jump", async () => {
      serverNow = new Date("2026-06-12T03:00:00.000Z");
      const proposedLocator = locator(0.55, "koreader");
      const conflict = await store.push({
        userId,
        authenticatedDeviceId: phoneId,
        batch: {
          deviceId: phoneId,
          operations: [{
            operationId: "99e1db91-c5a1-4c46-916b-856eec96ff88",
            entityType: "progress",
            entityId: progressId,
            action: "upsert",
            baseVersion: 3,
            clientTimestamp: serverNow.toISOString(),
            deletedAt: null,
            payload: { bookId, locator: proposedLocator },
          }],
        },
      });

      expect(conflict.results[0]).toEqual({
        operationId: "99e1db91-c5a1-4c46-916b-856eec96ff88",
        status: "conflict",
        serverVersion: 3,
        errorCode: "backward_progress",
        conflict: {
          kind: "backward_progress",
          currentLocator: locator(0.7, "koreader"),
          proposedLocator,
        },
      });
    });
  },
);
