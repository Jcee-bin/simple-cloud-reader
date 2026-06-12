import { mutationBatchSchema } from "@simple-cloud-reader/sync-contract";
import type {
  FastifyInstance,
  preHandlerHookHandler,
} from "fastify";
import type { InMemorySyncStore } from "../sync/inMemorySyncStore.js";

export interface SyncRouteDependencies {
  syncStore: InMemorySyncStore;
  authenticate: preHandlerHookHandler;
}

export async function registerSyncRoutes(
  app: FastifyInstance,
  dependencies: SyncRouteDependencies,
): Promise<void> {
  app.post(
    "/v1/sync/push",
    { preHandler: dependencies.authenticate },
    async (request) =>
      dependencies.syncStore.push(
        request.auth.userId,
        mutationBatchSchema.parse(request.body),
      ),
  );

  app.get<{ Querystring: { cursor?: string } }>(
    "/v1/sync/pull",
    { preHandler: dependencies.authenticate },
    async (request) => {
      const cursor = Number.parseInt(request.query.cursor ?? "0", 10);
      return dependencies.syncStore.pull(
        request.auth.userId,
        Number.isFinite(cursor) ? cursor : 0,
      );
    },
  );
}
