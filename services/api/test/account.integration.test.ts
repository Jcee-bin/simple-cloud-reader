import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createAccountService } from "../src/account/accountService.js";
import { PostgresAccountRepository } from "../src/account/postgresAccountRepository.js";
import { createDatabase } from "../src/db/client.js";
import { books, fileObjects, users } from "../src/db/schema.js";
import {
  applyMigrationsToSchema,
  dropTestSchema,
} from "../src/db/testDatabase.js";
import type { ObjectStore } from "../src/storage/objectStore.js";

describe.runIf(Boolean(process.env.TEST_DATABASE_URL))(
  "PostgreSQL account deletion",
  () => {
    const schemaName = `account_${crypto.randomUUID().replaceAll("-", "")}`;
    const database = createDatabase(process.env.TEST_DATABASE_URL!, {
      searchPath: schemaName,
    });
    const userId = "6cf8c51d-45b9-4c7f-bf58-bab0a80e18ef";
    const bookId = "d1822de7-f117-4910-96d2-e8a07fb7455f";
    const objectKey = `users/${userId}/books/${bookId}/files/test`;
    const deleteObject = vi.fn(async () => undefined);

    beforeAll(async () => {
      await applyMigrationsToSchema(schemaName);
      await database.db.insert(users).values({
        id: userId,
        normalizedEmail: "delete@example.com",
      });
      await database.db.insert(books).values({
        id: bookId,
        userId,
        title: "Delete Me",
        authors: [],
        format: "epub",
        mediaType: "application/epub+zip",
        originalFileName: "delete.epub",
        coverImageUrl: null,
      });
      await database.db.insert(fileObjects).values({
        id: "62b8247b-3d50-43e0-91aa-8c47506e58d5",
        userId,
        bookId,
        sha256: "a".repeat(64),
        objectKey,
        byteSize: 123,
        contentType: "application/epub+zip",
        originalFileName: "delete.epub",
        state: "ready",
      });
    });

    afterAll(async () => {
      await database.pool.end();
      await dropTestSchema(schemaName);
    });

    it("deletes objects and cascades every owned database row", async () => {
      const service = createAccountService({
        repository: new PostgresAccountRepository(database.db),
        objectStore: { deleteObject } as unknown as ObjectStore,
      });
      await service.remove(userId);
      expect(deleteObject).toHaveBeenCalledWith(objectKey);
      expect(await database.db
        .select()
        .from(users)
        .where(eq(users.id, userId))).toEqual([]);
      expect(await database.db
        .select()
        .from(fileObjects)
        .where(eq(fileObjects.userId, userId))).toEqual([]);
    });
  },
);
