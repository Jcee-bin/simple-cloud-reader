import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import type { FileService } from "../src/files/fileService.js";

const userId = "6cf8c51d-45b9-4c7f-bf58-bab0a80e18ef";
const deviceId = "93f39cf5-d988-49d9-9cc0-a857d13ac1d6";
const bookId = "d1822de7-f117-4910-96d2-e8a07fb7455f";
const fileId = "62b8247b-3d50-43e0-91aa-8c47506e58d5";

function createHarness() {
  const fileService = {
    reserveUpload: vi.fn(async () => ({
      fileId,
      state: "pending",
      uploadUrl: "https://objects.test/upload",
      expiresAt: "2026-06-12T00:15:00.000Z",
    })),
    complete: vi.fn(async () => ({ id: fileId, state: "ready" })),
    download: vi.fn(async () => ({
      fileId,
      downloadUrl: "https://objects.test/download",
      expiresAt: "2026-06-12T00:15:00.000Z",
    })),
    remove: vi.fn(async () => undefined),
  } as unknown as FileService;
  const app = buildApp({
    fileService,
    authenticate: async (request) => {
      request.auth = { userId, deviceId };
    },
  });
  return { app, fileService };
}

describe("managed file routes", () => {
  it("reserves and completes an authenticated book upload", async () => {
    const { app, fileService } = createHarness();
    const reserve = await app.inject({
      method: "POST",
      url: `/v1/books/${bookId}/files`,
      payload: {
        sha256: "a".repeat(64),
        byteSize: 123456,
        contentType: "application/epub+zip",
        originalFileName: "book.epub",
      },
    });
    const complete = await app.inject({
      method: "POST",
      url: `/v1/files/${fileId}/complete`,
      payload: { byteSize: 123456 },
    });

    expect(reserve.statusCode).toBe(200);
    expect(fileService.reserveUpload).toHaveBeenCalledWith({
      userId,
      bookId,
      sha256: "a".repeat(64),
      byteSize: 123456,
      contentType: "application/epub+zip",
      originalFileName: "book.epub",
    });
    expect(complete.statusCode).toBe(200);
    expect(fileService.complete).toHaveBeenCalledWith({
      userId,
      fileId,
      byteSize: 123456,
    });
    await app.close();
  });

  it("downloads and removes only the authenticated user's file", async () => {
    const { app, fileService } = createHarness();
    const download = await app.inject({
      method: "GET",
      url: `/v1/files/${fileId}/download-url`,
    });
    const remove = await app.inject({
      method: "DELETE",
      url: `/v1/files/${fileId}`,
    });

    expect(download.statusCode).toBe(200);
    expect(fileService.download).toHaveBeenCalledWith({ userId, fileId });
    expect(remove.statusCode).toBe(204);
    expect(fileService.remove).toHaveBeenCalledWith({ userId, fileId });
    await app.close();
  });

  it("returns stable lifecycle errors", async () => {
    const { app, fileService } = createHarness();
    vi.mocked(fileService.download).mockRejectedValueOnce(
      Object.assign(new Error("file_not_ready"), {
        statusCode: 409,
        code: "file_not_ready",
      }),
    );

    const response = await app.inject({
      method: "GET",
      url: `/v1/files/${fileId}/download-url`,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: "file_not_ready" });
    await app.close();
  });

  it("rejects malformed upload metadata as a client error", async () => {
    const { app } = createHarness();
    const response = await app.inject({
      method: "POST",
      url: `/v1/books/${bookId}/files`,
      payload: {
        sha256: "not-a-hash",
        byteSize: -1,
        contentType: "",
        originalFileName: "",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "invalid_request" });
    await app.close();
  });

  it("rejects malformed path identifiers as a client error", async () => {
    const { app } = createHarness();
    const response = await app.inject({
      method: "GET",
      url: "/v1/files/not-a-uuid/download-url",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "invalid_request" });
    await app.close();
  });
});
