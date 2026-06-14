import { describe, expect, it } from "vitest";
import {
  fileDownloadResponseSchema,
  fileUploadCompleteSchema,
  fileUploadRequestSchema,
  fileUploadResponseSchema,
} from "../src/index.js";

describe("managed file contracts", () => {
  it("accepts a private book upload request", () => {
    const value = {
      sha256: "a".repeat(64),
      byteSize: 123456,
      contentType: "application/epub+zip",
      originalFileName: "book.epub",
    };

    expect(fileUploadRequestSchema.parse(value)).toEqual(value);
  });

  it("rejects non-SHA-256 hashes", () => {
    expect(() => fileUploadRequestSchema.parse({
      sha256: "ABC123",
      byteSize: 42,
      contentType: "application/pdf",
      originalFileName: "book.pdf",
    })).toThrow();
  });

  it("models the upload, completion, and download lifecycle", () => {
    const fileId = "62b8247b-3d50-43e0-91aa-8c47506e58d5";
    expect(fileUploadResponseSchema.parse({
      fileId,
      state: "pending",
      uploadUrl: "https://objects.example/upload",
      expiresAt: "2026-06-12T00:15:00.000Z",
    }).state).toBe("pending");
    expect(fileUploadCompleteSchema.parse({
      byteSize: 123456,
    }).byteSize).toBe(123456);
    expect(fileDownloadResponseSchema.parse({
      fileId,
      downloadUrl: "https://objects.example/download",
      expiresAt: "2026-06-12T00:15:00.000Z",
    }).fileId).toBe(fileId);
  });
});
