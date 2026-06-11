import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { InMemorySyncStore } from "../src/sync/inMemorySyncStore.js";

describe("sync API", () => {
  it("deduplicates retries and returns changes after a cursor", async () => {
    const syncStore = new InMemorySyncStore();
    const app = buildApp({
      authenticate: async () => ({ userId: "user-1" }),
      syncStore,
    });
    const batch = {
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

    const first = await app.inject({
      method: "POST",
      url: "/v1/sync/push",
      payload: batch,
    });
    const retry = await app.inject({
      method: "POST",
      url: "/v1/sync/push",
      payload: batch,
    });
    const pull = await app.inject({
      method: "GET",
      url: "/v1/sync/pull?cursor=0",
    });

    expect(first.statusCode).toBe(200);
    expect(retry.json()).toEqual(first.json());
    expect(pull.json().changes).toHaveLength(1);
    expect(pull.json().cursor).toBe("1");
    await app.close();
  });
});
