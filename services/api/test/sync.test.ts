import { describe, expect, it, vi } from "vitest";
import type { MutationOperation } from "@simple-cloud-reader/sync-contract";
import { buildApp } from "../src/app.js";
import type { SyncStore } from "../src/sync/syncStore.js";

const userId = "6cf8c51d-45b9-4c7f-bf58-bab0a80e18ef";
const deviceId = "93f39cf5-d988-49d9-9cc0-a857d13ac1d6";

function createHarness() {
  const syncStore: SyncStore = {
    push: vi.fn(async ({ batch }) => ({
      cursor: "opaque-cursor",
      results: batch.operations.map((operation: MutationOperation) => ({
        operationId: operation.operationId,
        status: "accepted" as const,
        serverVersion: 1,
      })),
    })),
    pull: vi.fn(async () => ({
      cursor: "next-cursor",
      hasMore: false,
      changes: [],
    })),
  };
  const app = buildApp({
    authenticate: async (request) => {
      request.auth = { userId, deviceId };
    },
    syncStore,
  });
  return { app, syncStore };
}

describe("sync API", () => {
  it("passes authenticated identity into a validated push", async () => {
    const { app, syncStore } = createHarness();
    const batch = {
      deviceId,
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

    const response = await app.inject({
      method: "POST",
      url: "/v1/sync/push",
      payload: batch,
    });

    expect(response.statusCode).toBe(200);
    expect(syncStore.push).toHaveBeenCalledWith({
      userId,
      authenticatedDeviceId: deviceId,
      batch,
    });
    await app.close();
  });

  it("passes an opaque cursor and bounded page limit into pull", async () => {
    const { app, syncStore } = createHarness();
    const response = await app.inject({
      method: "GET",
      url: "/v1/sync/pull?cursor=opaque-cursor&limit=25",
    });

    expect(response.statusCode).toBe(200);
    expect(syncStore.pull).toHaveBeenCalledWith({
      userId,
      cursor: "opaque-cursor",
      limit: 25,
    });
    await app.close();
  });

  it("returns stable sync errors", async () => {
    const { app, syncStore } = createHarness();
    vi.mocked(syncStore.pull).mockRejectedValueOnce(
      Object.assign(new Error("invalid_cursor"), {
        statusCode: 400,
        code: "invalid_cursor",
      }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/v1/sync/pull?cursor=someone-elses-cursor",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "invalid_cursor" });
    await app.close();
  });
});
