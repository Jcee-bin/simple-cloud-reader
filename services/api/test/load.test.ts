import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

describe("bounded sustained API traffic", () => {
  it("serves the policy allowance and then returns 429", async () => {
    const app = buildApp({
      authenticate: async (request) => {
        request.auth = {
          userId: "6cf8c51d-45b9-4c7f-bf58-bab0a80e18ef",
          deviceId: "93f39cf5-d988-49d9-9cc0-a857d13ac1d6",
        };
      },
      syncStore: {
        push: async () => ({ cursor: "unused", results: [] }),
        pull: async () => ({
          cursor: "cursor",
          hasMore: false,
          changes: [],
        }),
      },
    });

    const statuses: number[] = [];
    for (let index = 0; index < 121; index += 1) {
      statuses.push((await app.inject({
        method: "GET",
        url: "/v1/sync/pull?limit=1",
        headers: { authorization: "Bearer test" },
      })).statusCode);
    }

    expect(statuses.slice(0, 120).every((status) => status === 200)).toBe(true);
    expect(statuses[120]).toBe(429);
  });
});
