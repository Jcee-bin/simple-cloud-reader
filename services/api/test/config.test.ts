import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("parses Railway-compatible S3 settings", () => {
    expect(loadConfig({
      PORT: "4000",
      DATABASE_URL: "postgres://reader:reader@localhost:5432/simple_cloud_reader",
      S3_ENDPOINT: "https://objects.example.com",
      S3_REGION: "auto",
      S3_ACCESS_KEY_ID: "access",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_BUCKET: "books",
      S3_FORCE_PATH_STYLE: "false",
    })).toEqual({
      PORT: 4000,
      DATABASE_URL: "postgres://reader:reader@localhost:5432/simple_cloud_reader",
      S3_ENDPOINT: "https://objects.example.com",
      S3_REGION: "auto",
      S3_ACCESS_KEY_ID: "access",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_BUCKET: "books",
      S3_FORCE_PATH_STYLE: false,
    });
  });
});
