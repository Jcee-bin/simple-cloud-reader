import { describe, expect, it, vi } from "vitest";
import {
  createFileService,
  type FileRecord,
  type FileRepository,
} from "../src/files/fileService.js";
import type { ObjectStore } from "../src/storage/objectStore.js";

const userId = "6cf8c51d-45b9-4c7f-bf58-bab0a80e18ef";
const deviceId = "93f39cf5-d988-49d9-9cc0-a857d13ac1d6";
const otherUserId = "a46192d0-6480-4ba8-a821-d70136418c5c";
const bookId = "d1822de7-f117-4910-96d2-e8a07fb7455f";
const fileId = "62b8247b-3d50-43e0-91aa-8c47506e58d5";
const sha256 = "a".repeat(64);
const now = new Date("2026-06-12T00:00:00.000Z");

class MemoryFileRepository implements FileRepository {
  readonly books = new Set([`${userId}:${bookId}`]);
  readonly files = new Map<string, FileRecord>();

  async hasOwnedBook(input: {
    userId: string;
    bookId: string;
  }): Promise<boolean> {
    return this.books.has(`${input.userId}:${input.bookId}`);
  }

  async reservePendingFile(input: FileRecord): Promise<FileRecord> {
    const existing = [...this.files.values()].find(
      (file) => file.userId === input.userId && file.sha256 === input.sha256,
    );
    if (existing) return existing;
    this.files.set(input.id, input);
    return input;
  }

  async findOwnedFile(input: {
    userId: string;
    fileId: string;
  }): Promise<FileRecord | null> {
    const file = this.files.get(input.fileId);
    return file?.userId === input.userId ? file : null;
  }

  async markReady(input: {
    userId: string;
    fileId: string;
    updatedAt: Date;
    originatingDeviceId: string;
  }): Promise<FileRecord> {
    const file = (await this.findOwnedFile(input))!;
    const updated = {
      ...file,
      state: "ready" as const,
      version: file.version + 1,
      updatedAt: input.updatedAt,
    };
    this.files.set(file.id, updated);
    return updated;
  }

  async markDeleted(input: {
    userId: string;
    fileId: string;
    deletedAt: Date;
    originatingDeviceId: string;
  }): Promise<void> {
    const file = (await this.findOwnedFile(input))!;
    this.files.set(file.id, {
      ...file,
      state: "deleted",
      version: file.version + 1,
      updatedAt: input.deletedAt,
      deletedAt: input.deletedAt,
    });
  }
}

function createHarness() {
  const repository = new MemoryFileRepository();
  const objectStore: ObjectStore = {
    checkReady: vi.fn(async () => undefined),
    createUploadUrl: vi.fn(async (key, contentType) => ({
      key,
      contentType,
      url: `https://objects.test/upload/${key}`,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
    })),
    createDownloadUrl: vi.fn(async (key) => ({
      key,
      url: `https://objects.test/download/${key}`,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
    })),
    headObject: vi.fn(async () => ({ exists: true, byteSize: 123456 })),
    deleteObject: vi.fn(async () => undefined),
  };
  const service = createFileService({
    repository,
    objectStore,
    now: () => new Date(now),
    generateId: () => fileId,
  });
  return { objectStore, repository, service };
}

describe("managed file lifecycle", () => {
  it("reserves one pending user-scoped upload and deduplicates retries", async () => {
    const { objectStore, repository, service } = createHarness();
    const request = {
      userId,
      deviceId,
      bookId,
      sha256,
      byteSize: 123456,
      contentType: "application/epub+zip",
      originalFileName: "book.epub",
    };

    const first = await service.reserveUpload(request);
    const retry = await service.reserveUpload(request);

    expect(first.fileId).toBe(fileId);
    expect(retry.fileId).toBe(fileId);
    expect(repository.files.size).toBe(1);
    expect(objectStore.createUploadUrl).toHaveBeenLastCalledWith(
      `users/${userId}/books/${bookId}/files/${fileId}/${sha256}`,
      request.contentType,
    );
  });

  it("does not reveal whether another user's book or file exists", async () => {
    const { service } = createHarness();

    await expect(service.reserveUpload({
      userId: otherUserId,
      deviceId,
      bookId,
      sha256,
      byteSize: 123456,
      contentType: "application/epub+zip",
      originalFileName: "book.epub",
    })).rejects.toMatchObject({
      statusCode: 404,
      code: "book_not_found",
    });
    await expect(service.download({
      userId: otherUserId,
      fileId,
    })).rejects.toMatchObject({
      statusCode: 404,
      code: "file_not_found",
    });
  });

  it("requires an uploaded object with the exact recorded size", async () => {
    const { objectStore, service } = createHarness();
    await service.reserveUpload({
      userId,
      deviceId,
      bookId,
      sha256,
      byteSize: 123456,
      contentType: "application/epub+zip",
      originalFileName: "book.epub",
    });
    vi.mocked(objectStore.headObject).mockResolvedValueOnce({
      exists: true,
      byteSize: 12,
    });

    await expect(service.complete({
      userId,
      deviceId,
      fileId,
      byteSize: 123456,
    })).rejects.toMatchObject({
      statusCode: 409,
      code: "file_size_mismatch",
    });
  });

  it("allows downloads only after completion", async () => {
    const { service } = createHarness();
    await service.reserveUpload({
      userId,
      deviceId,
      bookId,
      sha256,
      byteSize: 123456,
      contentType: "application/epub+zip",
      originalFileName: "book.epub",
    });

    await expect(service.download({ userId, fileId })).rejects.toMatchObject({
      statusCode: 409,
      code: "file_not_ready",
    });
    await service.complete({ userId, deviceId, fileId, byteSize: 123456 });
    await expect(service.download({ userId, fileId })).resolves.toMatchObject({
      fileId,
      downloadUrl: expect.stringContaining("/download/"),
    });
  });

  it("removes the cloud object while preserving book metadata", async () => {
    const { objectStore, repository, service } = createHarness();
    await service.reserveUpload({
      userId,
      deviceId,
      bookId,
      sha256,
      byteSize: 123456,
      contentType: "application/epub+zip",
      originalFileName: "book.epub",
    });

    await service.remove({ userId, deviceId, fileId });

    expect(objectStore.deleteObject).toHaveBeenCalledOnce();
    expect(repository.books.has(`${userId}:${bookId}`)).toBe(true);
    expect(repository.files.get(fileId)?.state).toBe("deleted");
  });
});
