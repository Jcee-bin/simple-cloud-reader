import { describe, expect, it } from "vitest";
import { mutationBatchSchema } from "../src/sync.js";

describe("mutationBatchSchema", () => {
  it("accepts an idempotent progress mutation", () => {
    const value = {
      deviceId: "device-a",
      operations: [{
        operationId: "op-1",
        entityType: "progress",
        entityId: "book-1",
        action: "upsert",
        clientTimestamp: "2026-06-12T00:00:00.000Z",
        payload: {
          format: "epub",
          progression: 0.42,
          engine: "readium",
          engineLocation: {},
        },
      }],
    };

    expect(mutationBatchSchema.parse(value)).toEqual(value);
  });

  it("rejects duplicate operation IDs in one batch", () => {
    const operation = {
      operationId: "op-1",
      entityType: "bookmark",
      entityId: "bookmark-1",
      action: "delete",
      clientTimestamp: "2026-06-12T00:00:00.000Z",
      payload: {},
    };

    expect(() => mutationBatchSchema.parse({
      deviceId: "device-a",
      operations: [operation, operation],
    })).toThrow();
  });
});
