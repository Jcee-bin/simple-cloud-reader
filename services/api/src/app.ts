import Fastify, { type FastifyInstance } from "fastify";
import { registerOpenApiRoute } from "./openapi.js";
import {
  registerAuthRoutes,
  type AuthRouteDependencies,
} from "./routes/auth.js";
import {
  registerFileRoutes,
  type FileRouteDependencies,
} from "./routes/files.js";
import {
  registerHealthRoute,
  type ReadinessDependencies,
} from "./routes/health.js";
import {
  registerSyncRoutes,
  type SyncRouteDependencies,
} from "./routes/sync.js";

type AppDependencies =
  & Partial<AuthRouteDependencies>
  & Partial<Pick<FileRouteDependencies, "fileService" | "authenticate">>
  & Partial<Pick<SyncRouteDependencies, "syncStore">>
  & { readiness?: ReadinessDependencies };

export function buildApp(
  dependencies?: AppDependencies,
): FastifyInstance {
  const app = Fastify({ logger: false });
  void app.register(
    registerHealthRoute,
    dependencies?.readiness ? { readiness: dependencies.readiness } : {},
  );
  void app.register(registerOpenApiRoute);
  if (dependencies?.authService) {
    void app.register(registerAuthRoutes, {
      authService: dependencies.authService,
    });
  }
  if (dependencies?.fileService && dependencies.authenticate) {
    void app.register(registerFileRoutes, {
      authenticate: dependencies.authenticate,
      fileService: dependencies.fileService,
    });
  }
  if (dependencies?.syncStore && dependencies.authenticate) {
    void app.register(registerSyncRoutes, {
      authenticate: dependencies.authenticate,
      syncStore: dependencies.syncStore,
    });
  }
  return app;
}
