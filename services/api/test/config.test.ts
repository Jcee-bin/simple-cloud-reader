import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("parses Railway-compatible S3 settings", () => {
    expect(loadConfig({
      PORT: "4000",
      DATABASE_URL: "postgres://reader:reader@localhost:5432/simple_cloud_reader",
      JWT_SECRET: "a-secure-test-secret-that-is-at-least-32-bytes",
      CURSOR_SECRET: "a-secure-cursor-secret-that-is-at-least-32-bytes",
      PUBLIC_APP_URL: "https://reader.example.com",
      RESEND_API_KEY: "resend-secret",
      AUTH_FROM_EMAIL: "Simple Reader <login@reader.example.com>",
      S3_ENDPOINT: "https://objects.example.com",
      S3_REGION: "auto",
      S3_ACCESS_KEY_ID: "access",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_BUCKET: "books",
      S3_FORCE_PATH_STYLE: "false",
    })).toEqual({
      PORT: 4000,
      DATABASE_URL: "postgres://reader:reader@localhost:5432/simple_cloud_reader",
      JWT_SECRET: "a-secure-test-secret-that-is-at-least-32-bytes",
      CURSOR_SECRET: "a-secure-cursor-secret-that-is-at-least-32-bytes",
      PUBLIC_APP_URL: "https://reader.example.com",
      RESEND_API_KEY: "resend-secret",
      AUTH_FROM_EMAIL: "Simple Reader <login@reader.example.com>",
      S3_ENDPOINT: "https://objects.example.com",
      S3_REGION: "auto",
      S3_ACCESS_KEY_ID: "access",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_BUCKET: "books",
      S3_FORCE_PATH_STYLE: false,
      MAX_FILE_BYTES: 250 * 1024 * 1024,
      MAX_USER_STORAGE_BYTES: 2 * 1024 ** 3,
    });
  });
});
