import { and, eq, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { Database } from "../db/client.js";
import { books, changeLog, fileObjects } from "../db/schema.js";
import {
  FileError,
  FileRecord,
  FileRepository,
} from "./fileService.js";

function toFileRecord(
  record: typeof fileObjects.$inferSelect,
): FileRecord {
  if (
    record.state !== "pending"
    && record.state !== "ready"
    && record.state !== "deleted"
  ) {
    throw new Error(`Unknown file state: ${record.state}`);
  }
  return {
    ...record,
    state: record.state,
  };
}

export class PostgresFileRepository implements FileRepository {
  constructor(private readonly db: Database) {}

  private async appendChange(
    transaction: Parameters<
      Parameters<Database["transaction"]>[0]
    >[0],
    file: FileRecord,
    originatingDeviceId: string,
    action: "upsert" | "delete",
  ): Promise<void> {
    const operationId = randomUUID();
    await transaction.insert(changeLog).values({
      userId: file.userId,
      entityType: "fileObject",
      entityId: file.id,
      action,
      payload: {
        operationId,
        baseVersion: Math.max(file.version - 1, 0),
        clientTimestamp: file.updatedAt.toISOString(),
        deletedAt: file.deletedAt?.toISOString() ?? null,
        payload: action === "delete"
          ? null
          : {
            bookId: file.bookId,
            sha256: file.sha256,
            byteSize: file.byteSize,
            contentType: file.contentType,
            originalFileName: file.originalFileName,
            state: file.state,
          },
      },
      serverVersion: file.version,
      serverTimestamp: file.updatedAt,
      originatingDeviceId,
    });
  }

  async hasOwnedBook(input: {
    userId: string;
    bookId: string;
  }): Promise<boolean> {
    const [book] = await this.db
      .select({ id: books.id })
      .from(books)
      .where(and(
        eq(books.id, input.bookId),
        eq(books.userId, input.userId),
        isNull(books.deletedAt),
      ))
      .limit(1);
    return Boolean(book);
  }

  async reservePendingFile(
    input: FileRecord,
    originatingDeviceId: string,
    limits: { maxUserStorageBytes: number },
  ): Promise<FileRecord> {
    return this.db.transaction(async (transaction) => {
      await transaction.execute(sql`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${`storage-quota:${input.userId}`}, 0)
        )
      `);
      const [usage] = await transaction
        .select({
          bytes: sql<number>`
            coalesce(sum(${fileObjects.byteSize}), 0)
          `.mapWith(Number),
        })
        .from(fileObjects)
        .where(and(
          eq(fileObjects.userId, input.userId),
          isNull(fileObjects.deletedAt),
        ));
      const [sameHash] = await transaction
        .select({
          deletedAt: fileObjects.deletedAt,
        })
        .from(fileObjects)
        .where(and(
          eq(fileObjects.userId, input.userId),
          eq(fileObjects.sha256, input.sha256),
        ))
        .limit(1);
      const additionalBytes = sameHash && !sameHash.deletedAt
        ? 0
        : input.byteSize;
      if ((usage?.bytes ?? 0) + additionalBytes > limits.maxUserStorageBytes) {
        throw new FileError(409, "storage_quota_exceeded");
      }

      const [created] = await transaction
        .insert(fileObjects)
        .values(input)
        .onConflictDoNothing({
          target: [fileObjects.userId, fileObjects.sha256],
        })
        .returning();
      if (created) {
        const file = toFileRecord(created);
        await this.appendChange(
          transaction,
          file,
          originatingDeviceId,
          "upsert",
        );
        return file;
      }

      const [existing] = await transaction
        .select()
        .from(fileObjects)
        .where(and(
          eq(fileObjects.userId, input.userId),
          eq(fileObjects.sha256, input.sha256),
        ))
        .for("update")
        .limit(1);
      if (!existing) {
        throw new Error("File reservation conflicted without a readable row");
      }
      if (existing.deletedAt) {
        const [restored] = await transaction
          .update(fileObjects)
          .set({
            bookId: input.bookId,
            byteSize: input.byteSize,
            contentType: input.contentType,
            originalFileName: input.originalFileName,
            state: "pending",
            version: sql`${fileObjects.version} + 1`,
            updatedAt: input.updatedAt,
            deletedAt: null,
          })
          .where(eq(fileObjects.id, existing.id))
          .returning();
        if (!restored) throw new Error("Failed to restore file reservation");
        const file = toFileRecord(restored);
        await this.appendChange(
          transaction,
          file,
          originatingDeviceId,
          "upsert",
        );
        return file;
      }
      return toFileRecord(existing);
    });
  }

  async findOwnedFile(input: {
    userId: string;
    fileId: string;
  }): Promise<FileRecord | null> {
    const [file] = await this.db
      .select()
      .from(fileObjects)
      .where(and(
        eq(fileObjects.id, input.fileId),
        eq(fileObjects.userId, input.userId),
      ))
      .limit(1);
    return file ? toFileRecord(file) : null;
  }

  async markReady(input: {
    userId: string;
    fileId: string;
    updatedAt: Date;
    originatingDeviceId: string;
  }): Promise<FileRecord> {
    return this.db.transaction(async (transaction) => {
      const [record] = await transaction
        .update(fileObjects)
        .set({
          state: "ready",
          version: sql`${fileObjects.version} + 1`,
          updatedAt: input.updatedAt,
        })
        .where(and(
          eq(fileObjects.id, input.fileId),
          eq(fileObjects.userId, input.userId),
          isNull(fileObjects.deletedAt),
        ))
        .returning();
      if (!record) {
        throw new Error("Owned file disappeared during completion");
      }
      const file = toFileRecord(record);
      await this.appendChange(
        transaction,
        file,
        input.originatingDeviceId,
        "upsert",
      );
      return file;
    });
  }

  async markDeleted(input: {
    userId: string;
    fileId: string;
    deletedAt: Date;
    originatingDeviceId: string;
  }): Promise<void> {
    await this.db.transaction(async (transaction) => {
      const [record] = await transaction
        .update(fileObjects)
        .set({
          state: "deleted",
          version: sql`${fileObjects.version} + 1`,
          deletedAt: input.deletedAt,
          updatedAt: input.deletedAt,
        })
        .where(and(
          eq(fileObjects.id, input.fileId),
          eq(fileObjects.userId, input.userId),
          isNull(fileObjects.deletedAt),
        ))
        .returning();
      if (!record) return;
      await this.appendChange(
        transaction,
        toFileRecord(record),
        input.originatingDeviceId,
        "delete",
      );
    });
  }
}
