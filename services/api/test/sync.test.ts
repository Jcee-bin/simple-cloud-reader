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
        operationId: "3dd3a569-5994-4ce4-a3c7-38123ecb15c5",
        entityType: "progress",
        entityId: "17d24783-4be7-4857-94de-1e78ab58db60",
        action: "upsert",
        baseVersion: 0,
        clientTimestamp: "2026-06-12T00:00:00.000Z",
        deletedAt: null,
        payload: {
          bookId: "d1822de7-f117-4910-96d2-e8a07fb7455f",
          locator: {
            format: "epub",
            progression: 0.42,
            engine: "readium",
            engineLocation: {},
          },
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
    expect(first.json().results).toEqual([{
      operationId: batch.operations[0]?.operationId,
      status: "accepted",
      serverVersion: 1,
    }]);
    expect(pull.json().changes).toHaveLength(1);
    expect(pull.json().changes[0].deviceId).toBe("device-a");
    expect(pull.json().cursor).toBe("1");
    await app.close();
  });
});
