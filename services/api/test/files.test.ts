import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import type { ObjectStore } from "../src/storage/objectStore.js";

describe("POST /v1/files/:bookId/upload-url", () => {
  it("uses a user-scoped object key", async () => {
    const objectStore: ObjectStore = {
      createUploadUrl: vi.fn(async (key, contentType) => ({
        key,
        contentType,
        url: `https://objects.test/${key}`,
      })),
      createDownloadUrl: vi.fn(),
    };
    const app = buildApp({
      objectStore,
      authenticate: async (request) => {
        request.auth = {
          userId: "user-1",
          deviceId: "93f39cf5-d988-49d9-9cc0-a857d13ac1d6",
        };
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/files/book-1/upload-url",
      payload: {
        sha256: "a".repeat(64),
        contentType: "application/epub+zip",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(objectStore.createUploadUrl).toHaveBeenCalledWith(
      `users/user-1/books/book-1/${"a".repeat(64)}`,
      "application/epub+zip",
    );
    await app.close();
  });
});
