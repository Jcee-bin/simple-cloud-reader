import {
  fileDownloadResponseSchema,
  fileUploadCompleteSchema,
  fileUploadRequestSchema,
  fileUploadResponseSchema,
} from "@simple-cloud-reader/sync-contract";
import { randomUUID } from "node:crypto";
import type { ObjectStore } from "../storage/objectStore.js";

export type FileState = "pending" | "ready" | "deleted";

export interface FileRecord {
  id: string;
  userId: string;
  bookId: string;
  sha256: string;
  objectKey: string;
  byteSize: number;
  contentType: string;
  originalFileName: string;
  state: FileState;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FileRepository {
  hasOwnedBook(input: {
    userId: string;
    bookId: string;
  }): Promise<boolean>;
  reservePendingFile(input: FileRecord): Promise<FileRecord>;
  findOwnedFile(input: {
    userId: string;
    fileId: string;
  }): Promise<FileRecord | null>;
  markReady(input: {
    userId: string;
    fileId: string;
    updatedAt: Date;
  }): Promise<FileRecord>;
  markDeleted(input: {
    userId: string;
    fileId: string;
    deletedAt: Date;
  }): Promise<void>;
}

export class FileError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
  ) {
    super(code);
  }
}

export function createFileService(input: {
  repository: FileRepository;
  objectStore: ObjectStore;
  now?: () => Date;
  generateId?: () => string;
}) {
  const now = input.now ?? (() => new Date());
  const generateId = input.generateId ?? randomUUID;

  async function requireOwnedFile(
    userId: string,
    fileId: string,
  ): Promise<FileRecord> {
    const file = await input.repository.findOwnedFile({ userId, fileId });
    if (!file || file.deletedAt) {
      throw new FileError(404, "file_not_found");
    }
    return file;
  }

  return {
    async reserveUpload(rawInput: {
      userId: string;
      bookId: string;
      sha256: string;
      byteSize: number;
      contentType: string;
      originalFileName: string;
    }) {
      const request = fileUploadRequestSchema.parse({
        sha256: rawInput.sha256,
        byteSize: rawInput.byteSize,
        contentType: rawInput.contentType,
        originalFileName: rawInput.originalFileName,
      });
      if (!await input.repository.hasOwnedBook({
        userId: rawInput.userId,
        bookId: rawInput.bookId,
      })) {
        throw new FileError(404, "book_not_found");
      }

      const createdAt = now();
      const id = generateId();
      const objectKey = [
        "users",
        rawInput.userId,
        "books",
        rawInput.bookId,
        "files",
        id,
        request.sha256,
      ].join("/");
      const file = await input.repository.reservePendingFile({
        id,
        userId: rawInput.userId,
        bookId: rawInput.bookId,
        sha256: request.sha256,
        objectKey,
        byteSize: request.byteSize,
        contentType: request.contentType,
        originalFileName: request.originalFileName,
        state: "pending",
        version: 1,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
      });
      if (
        file.byteSize !== request.byteSize
        || file.contentType !== request.contentType
      ) {
        throw new FileError(409, "file_metadata_mismatch");
      }
      if (file.bookId !== rawInput.bookId) {
        throw new FileError(409, "file_hash_already_attached");
      }
      if (file.state === "ready") {
        throw new FileError(409, "file_already_ready");
      }

      const signed = await input.objectStore.createUploadUrl(
        file.objectKey,
        file.contentType,
      );
      return fileUploadResponseSchema.parse({
        fileId: file.id,
        state: "pending",
        uploadUrl: signed.url,
        expiresAt: signed.expiresAt.toISOString(),
      });
    },

    async complete(rawInput: {
      userId: string;
      fileId: string;
      byteSize: number;
    }) {
      const request = fileUploadCompleteSchema.parse({
        byteSize: rawInput.byteSize,
      });
      const file = await requireOwnedFile(rawInput.userId, rawInput.fileId);
      if (file.state === "ready") {
        return file;
      }
      if (request.byteSize !== file.byteSize) {
        throw new FileError(409, "file_size_mismatch");
      }

      const object = await input.objectStore.headObject(file.objectKey);
      if (!object.exists) {
        throw new FileError(409, "file_upload_missing");
      }
      if (object.byteSize !== file.byteSize) {
        throw new FileError(409, "file_size_mismatch");
      }
      return input.repository.markReady({
        userId: rawInput.userId,
        fileId: rawInput.fileId,
        updatedAt: now(),
      });
    },

    async download(rawInput: { userId: string; fileId: string }) {
      const file = await requireOwnedFile(rawInput.userId, rawInput.fileId);
      if (file.state !== "ready") {
        throw new FileError(409, "file_not_ready");
      }
      const signed = await input.objectStore.createDownloadUrl(file.objectKey);
      return fileDownloadResponseSchema.parse({
        fileId: file.id,
        downloadUrl: signed.url,
        expiresAt: signed.expiresAt.toISOString(),
      });
    },

    async remove(rawInput: {
      userId: string;
      fileId: string;
    }): Promise<void> {
      const file = await requireOwnedFile(rawInput.userId, rawInput.fileId);
      // S3 deletion is idempotent, so a retry can safely finish the database
      // tombstone if the first attempt stops between these two operations.
      await input.objectStore.deleteObject(file.objectKey);
      await input.repository.markDeleted({
        userId: rawInput.userId,
        fileId: rawInput.fileId,
        deletedAt: now(),
      });
    },
  };
}

export type FileService = ReturnType<typeof createFileService>;
