import type { ObjectStore } from "../src/storage/objectStore.js";
import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { createAuthenticate } from "../src/auth/authenticate.js";
import { signAccessToken } from "../src/auth/tokens.js";
import {
  createFileService,
  type FileRepository,
} from "../src/files/fileService.js";

const jwtSecret = "a-secure-test-secret-that-is-at-least-32-bytes";
const userId = "6cf8c51d-45b9-4c7f-bf58-bab0a80e18ef";
const deviceId = "93f39cf5-d988-49d9-9cc0-a857d13ac1d6";

async function tokenAt(issuedAt: Date): Promise<string> {
  return (await signAccessToken({
    userId,
    deviceId,
    jwtSecret,
    issuedAt,
  })).token;
}

function createHarness(active = true) {
  const objectStore: ObjectStore = {
    createUploadUrl: vi.fn(async (key, contentType) => ({
      key,
      contentType,
      url: `https://objects.test/${key}`,
      expiresAt: new Date(Date.now() + 900_000),
    })),
    createDownloadUrl: vi.fn(async (key) => ({
      key,
      url: `https://objects.test/${key}`,
      expiresAt: new Date(Date.now() + 900_000),
    })),
    headObject: vi.fn(async () => ({ exists: false })),
    deleteObject: vi.fn(async () => undefined),
  };
  const authenticate = createAuthenticate({
    jwtSecret,
    accessRepository: {
      hasActiveDevice: vi.fn(async () => active),
    },
  });
  const fileRepository: FileRepository = {
    hasOwnedBook: vi.fn(async () => true),
    reservePendingFile: vi.fn(async (file) => file),
    findOwnedFile: vi.fn(async () => null),
    markReady: vi.fn(),
    markDeleted: vi.fn(),
  };
  const fileService = createFileService({
    repository: fileRepository,
    objectStore,
    generateId: () => "62b8247b-3d50-43e0-91aa-8c47506e58d5",
  });
  const app = buildApp({ authenticate, fileService });
  return { app, objectStore };
}

describe("bearer authentication boundary", () => {
  it("rejects a missing access token", async () => {
    const { app } = createHarness();
    const response = await app.inject({
      method: "POST",
      url: `/v1/books/${crypto.randomUUID()}/files`,
      payload: {
        sha256: "a".repeat(64),
        byteSize: 123456,
        contentType: "application/epub+zip",
        originalFileName: "book.epub",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "missing_access_token" });
    await app.close();
  });

  it("rejects malformed and expired bearer tokens", async () => {
    const { app } = createHarness();
    const bookId = crypto.randomUUID();
    const malformed = await app.inject({
      method: "POST",
      url: `/v1/books/${bookId}/files`,
      headers: { authorization: "Token not-a-bearer-token" },
      payload: {
        sha256: "a".repeat(64),
        byteSize: 123456,
        contentType: "application/epub+zip",
        originalFileName: "book.epub",
      },
    });
    const expired = await app.inject({
      method: "POST",
      url: `/v1/books/${bookId}/files`,
      headers: {
        authorization: `Bearer ${
          await tokenAt(new Date(Date.now() - 60 * 60 * 1000))
        }`,
      },
      payload: {
        sha256: "a".repeat(64),
        byteSize: 123456,
        contentType: "application/epub+zip",
        originalFileName: "book.epub",
      },
    });

    expect(malformed.json()).toEqual({ error: "invalid_access_token" });
    expect(expired.json()).toEqual({ error: "access_token_expired" });
    await app.close();
  });

  it("rejects a token whose device or user is no longer active", async () => {
    const { app } = createHarness(false);
    const response = await app.inject({
      method: "POST",
      url: `/v1/books/${crypto.randomUUID()}/files`,
      headers: {
        authorization: `Bearer ${await tokenAt(new Date())}`,
      },
      payload: {
        sha256: "a".repeat(64),
        byteSize: 123456,
        contentType: "application/epub+zip",
        originalFileName: "book.epub",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "invalid_access_token" });
    await app.close();
  });

  it("scopes protected file keys to the authenticated user", async () => {
    const { app, objectStore } = createHarness();
    const bookId = crypto.randomUUID();
    const response = await app.inject({
      method: "POST",
      url: `/v1/books/${bookId}/files`,
      headers: {
        authorization: `Bearer ${await tokenAt(new Date())}`,
      },
      payload: {
        sha256: "a".repeat(64),
        byteSize: 123456,
        contentType: "application/epub+zip",
        originalFileName: "book.epub",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(objectStore.createUploadUrl).toHaveBeenCalledWith(
      `users/${userId}/books/${bookId}/files/62b8247b-3d50-43e0-91aa-8c47506e58d5/${
        "a".repeat(64)
      }`,
      "application/epub+zip",
    );
    await app.close();
  });
});
