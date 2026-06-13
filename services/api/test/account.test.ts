import { describe, expect, it, vi } from "vitest";
import { createAccountService } from "../src/account/accountService.js";
import { buildApp } from "../src/app.js";
import type { ObjectStore } from "../src/storage/objectStore.js";

const userId = "6cf8c51d-45b9-4c7f-bf58-bab0a80e18ef";

describe("account deletion", () => {
  it("deletes bucket objects before deleting the database user", async () => {
    const order: string[] = [];
    const objectStore = {
      deleteObject: vi.fn(async (key: string) => {
        order.push(`object:${key}`);
      }),
    } as unknown as ObjectStore;
    const service = createAccountService({
      objectStore,
      repository: {
        listObjectKeys: async () => ["one", "two"],
        deleteUser: async () => {
          order.push("user");
        },
      },
    });

    await service.remove(userId);
    expect(order).toEqual(["object:one", "object:two", "user"]);
  });

  it("requires bearer authentication on the deletion route", async () => {
    const remove = vi.fn(async () => undefined);
    const app = buildApp({
      accountService: { remove },
      authenticate: async (request, reply) => {
        if (!request.headers.authorization) {
          return reply.code(401).send({ error: "missing_access_token" });
        }
        request.auth = {
          userId,
          deviceId: "93f39cf5-d988-49d9-9cc0-a857d13ac1d6",
        };
      },
    });
    expect((await app.inject({
      method: "DELETE",
      url: "/v1/account",
    })).statusCode).toBe(401);

    expect((await app.inject({
      method: "DELETE",
      url: "/v1/account",
      headers: { authorization: "Bearer test" },
    })).statusCode).toBe(204);
    expect(remove).toHaveBeenCalledWith(userId);
  });
});
