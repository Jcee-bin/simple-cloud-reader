import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateOpenApiDocument } from "../src/openapi.js";

const fixtureUrl = new URL(
  "../openapi/simple-cloud-reader-v1.json",
  import.meta.url,
);

describe("OpenAPI v1 contract", () => {
  it("matches the deterministic checked-in document", async () => {
    const checkedIn = JSON.parse(await readFile(fixtureUrl, "utf8"));

    expect(generateOpenApiDocument()).toEqual(checkedIn);
  });

  it("publishes every stable operation and bearer boundary", () => {
    const document = generateOpenApiDocument();
    const operations = Object.values(document.paths).flatMap((path) =>
      Object.values(path)
    );

    expect(operations.map((operation) => operation.operationId).sort()).toEqual([
      "deleteAccount",
      "getHealth",
      "getLiveness",
      "getReadiness",
      "getOpenApiDocument",
      "requestMagicLink",
      "redeemMagicLink",
      "refreshSession",
      "signOut",
      "reserveBookFileUpload",
      "completeFileUpload",
      "getFileDownloadUrl",
      "deleteFile",
      "pushSyncChanges",
      "pullSyncChanges",
    ].sort());
    expect(document.components.securitySchemes).toEqual({
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    });

    for (const operation of operations) {
      if (
        operation.operationId.startsWith("reserve")
        || operation.operationId.startsWith("complete")
        || operation.operationId.startsWith("getFile")
        || operation.operationId === "deleteFile"
        || operation.operationId.startsWith("push")
        || operation.operationId.startsWith("pull")
      ) {
        expect(operation.security).toEqual([{ bearerAuth: [] }]);
      }
      const schema = operation.requestBody?.content["application/json"].schema;
      if (schema) {
        expect(schema).not.toEqual({ type: "object" });
        expect(
          "$ref" in schema
          || "properties" in schema
          || "oneOf" in schema
          || "allOf" in schema,
        ).toBe(true);
      }
    }
  });

  it("is stored at the expected package path", () => {
    expect(fileURLToPath(fixtureUrl)).toMatch(
      /sync-contract[\\/]openapi[\\/]simple-cloud-reader-v1\.json$/,
    );
  });
});
