import Fastify, { type FastifyInstance } from "fastify";
import {
  registerFileRoutes,
  type FileRouteDependencies,
} from "./routes/files.js";
import { registerHealthRoute } from "./routes/health.js";
import {
  registerSyncRoutes,
  type SyncRouteDependencies,
} from "./routes/sync.js";

type AppDependencies =
  & Partial<Pick<FileRouteDependencies, "objectStore">>
  & Partial<Pick<SyncRouteDependencies, "syncStore">>
  & Pick<FileRouteDependencies, "authenticate">;

export function buildApp(
  dependencies?: AppDependencies,
): FastifyInstance {
  const app = Fastify({ logger: false });
  void app.register(registerHealthRoute);
  if (dependencies?.objectStore) {
    void app.register(registerFileRoutes, {
      authenticate: dependencies.authenticate,
      objectStore: dependencies.objectStore,
    });
  }
  if (dependencies?.syncStore) {
    void app.register(registerSyncRoutes, {
      authenticate: dependencies.authenticate,
      syncStore: dependencies.syncStore,
    });
  }
  return app;
}
