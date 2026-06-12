import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../db/client.js";
import { books, fileObjects } from "../db/schema.js";
import type {
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

  async reservePendingFile(input: FileRecord): Promise<FileRecord> {
    return this.db.transaction(async (transaction) => {
      const [created] = await transaction
        .insert(fileObjects)
        .values(input)
        .onConflictDoNothing({
          target: [fileObjects.userId, fileObjects.sha256],
        })
        .returning();
      if (created) return toFileRecord(created);

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
            updatedAt: input.updatedAt,
            deletedAt: null,
          })
          .where(eq(fileObjects.id, existing.id))
          .returning();
        if (!restored) throw new Error("Failed to restore file reservation");
        return toFileRecord(restored);
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
  }): Promise<FileRecord> {
    const [file] = await this.db
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
    if (!file) throw new Error("Owned file disappeared during completion");

    return toFileRecord(file);
  }

  async markDeleted(input: {
    userId: string;
    fileId: string;
    deletedAt: Date;
  }): Promise<void> {
    await this.db
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
      ));

  }
}
