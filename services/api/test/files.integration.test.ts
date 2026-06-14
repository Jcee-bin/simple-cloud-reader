import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PostgresFileRepository } from "../src/files/postgresFileRepository.js";
import { createFileService } from "../src/files/fileService.js";
import { createDatabase } from "../src/db/client.js";
import { books, devices, users } from "../src/db/schema.js";
import {
  applyMigrationsToSchema,
  dropTestSchema,
} from "../src/db/testDatabase.js";
import type { ObjectStore } from "../src/storage/objectStore.js";
import { PostgresSyncStore } from "../src/sync/postgresSyncStore.js";

describe.runIf(Boolean(process.env.TEST_DATABASE_URL))(
  "PostgreSQL managed file lifecycle",
  () => {
    const schemaName = `files_${crypto.randomUUID().replaceAll("-", "")}`;
    const database = createDatabase(process.env.TEST_DATABASE_URL!, {
      searchPath: schemaName,
    });
    const repository = new PostgresFileRepository(database.db);
    const userA = "6cf8c51d-45b9-4c7f-bf58-bab0a80e18ef";
    const userB = "a46192d0-6480-4ba8-a821-d70136418c5c";
    const bookA = "d1822de7-f117-4910-96d2-e8a07fb7455f";
    const bookB = "236687b9-d11e-42f4-9164-8753c4f48e37";
    const fileA = "62b8247b-3d50-43e0-91aa-8c47506e58d5";
    const retryCandidate = "54492941-0008-454b-b913-6406f747b8dc";
    const fileB = "d62aeceb-047c-48ff-964c-9db5a15b5c5e";
    const sha256 = "a".repeat(64);
    const now = new Date("2026-06-12T00:00:00.000Z");
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
      headObject: vi.fn(async () => ({
        exists: true,
        byteSize: 123456,
      })),
      deleteObject: vi.fn(async () => undefined),
    };
    const generatedIds = [fileA, retryCandidate, fileB];
    const service = createFileService({
      repository,
      objectStore,
      now: () => new Date(now),
      generateId: () => generatedIds.shift()!,
    });
    const syncStore = new PostgresSyncStore({
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
          id: "93f39cf5-d988-49d9-9cc0-a857d13ac1d6",
          userId: userA,
          name: "Phone A",
          platform: "android",
        },
        {
          id: "a4c5868a-5437-4df2-ad1c-10daf31f7e9c",
          userId: userB,
          name: "Phone B",
          platform: "android",
        },
      ]);
      await database.db.insert(books).values([
        {
          id: bookA,
          userId: userA,
          title: "Book A",
          authors: [],
          format: "epub",
          mediaType: "application/epub+zip",
          originalFileName: "a.epub",
        },
        {
          id: bookB,
          userId: userB,
          title: "Book B",
          authors: [],
          format: "epub",
          mediaType: "application/epub+zip",
          originalFileName: "b.epub",
        },
      ]);
    });

    afterAll(async () => {
      await database.pool.end();
      await dropTestSchema(schemaName);
    });

    it("deduplicates a retry but isolates the same hash between users", async () => {
      const requestA = {
        userId: userA,
        deviceId: "93f39cf5-d988-49d9-9cc0-a857d13ac1d6",
        bookId: bookA,
        sha256,
        byteSize: 123456,
        contentType: "application/epub+zip",
        originalFileName: "a.epub",
      };
      const first = await service.reserveUpload(requestA);
      const retry = await service.reserveUpload(requestA);
      const otherUser = await service.reserveUpload({
        ...requestA,
        userId: userB,
        deviceId: "a4c5868a-5437-4df2-ad1c-10daf31f7e9c",
        bookId: bookB,
        originalFileName: "b.epub",
      });

      expect(retry.fileId).toBe(first.fileId);
      expect(otherUser.fileId).not.toBe(first.fileId);
      expect(vi.mocked(objectStore.createUploadUrl).mock.calls[0]?.[0])
        .not.toBe(vi.mocked(objectStore.createUploadUrl).mock.calls[2]?.[0]);
    });

    it("persists completion and deletion without deleting book metadata", async () => {
      await service.complete({
        userId: userA,
        deviceId: "93f39cf5-d988-49d9-9cc0-a857d13ac1d6",
        fileId: fileA,
        byteSize: 123456,
      });
      await expect(service.download({
        userId: userA,
        fileId: fileA,
      })).resolves.toMatchObject({ fileId: fileA });
      const readyChanges = await syncStore.pull({
        userId: userA,
        limit: 500,
      });
      expect(
        readyChanges.changes
          .filter(({ entityType }) => entityType === "fileObject")
          .map(({ action, payload }) => ({
            action,
            state: payload && "state" in payload ? payload.state : null,
          })),
      ).toEqual([
        { action: "upsert", state: "pending" },
        { action: "upsert", state: "ready" },
      ]);

      await service.remove({
        userId: userA,
        deviceId: "93f39cf5-d988-49d9-9cc0-a857d13ac1d6",
        fileId: fileA,
      });
      await expect(service.download({
        userId: userA,
        fileId: fileA,
      })).rejects.toMatchObject({ code: "file_not_found" });
      await expect(repository.hasOwnedBook({
        userId: userA,
        bookId: bookA,
      })).resolves.toBe(true);
      const removed = await syncStore.pull({
        userId: userA,
        cursor: readyChanges.cursor,
        limit: 500,
      });
      expect(removed.changes).toHaveLength(1);
      expect(removed.changes[0]).toMatchObject({
        entityType: "fileObject",
        action: "delete",
        payload: null,
      });
    });
  },
);
