import { mutationBatchSchema } from "@simple-cloud-reader/sync-contract";
import type { FastifyInstance } from "fastify";
import type { InMemorySyncStore } from "../sync/inMemorySyncStore.js";
import type { AuthenticatedUser } from "./files.js";

export interface SyncRouteDependencies {
  syncStore: InMemorySyncStore;
  authenticate(): Promise<AuthenticatedUser>;
}

export async function registerSyncRoutes(
  app: FastifyInstance,
  dependencies: SyncRouteDependencies,
): Promise<void> {
  app.post("/v1/sync/push", async (request) => {
    const user = await dependencies.authenticate();
    return dependencies.syncStore.push(
      user.userId,
      mutationBatchSchema.parse(request.body),
    );
  });

  app.get<{ Querystring: { cursor?: string } }>(
    "/v1/sync/pull",
    async (request) => {
      const user = await dependencies.authenticate();
      const cursor = Number.parseInt(request.query.cursor ?? "0", 10);
      return dependencies.syncStore.pull(
        user.userId,
        Number.isFinite(cursor) ? cursor : 0,
      );
    },
  );
}
