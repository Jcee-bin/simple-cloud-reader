import { describe, expect, it } from "vitest";
import { createObjectStore } from "../src/storage/objectStore.js";

describe("createObjectStore", () => {
  it("creates short-lived signed upload and download URLs", async () => {
    const store = createObjectStore({
      S3_ENDPOINT: "http://127.0.0.1:9000",
      S3_REGION: "auto",
      S3_ACCESS_KEY_ID: "test-access-key",
      S3_SECRET_ACCESS_KEY: "test-secret-key",
      S3_BUCKET: "simple-cloud-reader",
      S3_FORCE_PATH_STYLE: true,
    });

    const upload = await store.createUploadUrl(
      "users/user-1/books/book-1/hash",
      "application/epub+zip",
    );
    const download = await store.createDownloadUrl(
      "users/user-1/books/book-1/hash",
    );

    expect(upload.url).toContain("X-Amz-Signature=");
    expect(upload.url).toContain("X-Amz-Expires=900");
    expect(download.url).toContain("X-Amz-Signature=");
    expect(upload.key).toBe(download.key);
  });
});
