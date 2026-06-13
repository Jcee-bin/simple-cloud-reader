import Fastify, { type FastifyInstance } from "fastify";
import { FixedWindowRateLimiter } from "./security/rateLimiter.js";
import {
  registerAccountRoutes,
  type AccountRouteDependencies,
} from "./routes/account.js";
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
  & Partial<Pick<AccountRouteDependencies, "accountService">>
  & Partial<Pick<FileRouteDependencies, "fileService" | "authenticate">>
  & Partial<Pick<SyncRouteDependencies, "syncStore">>
  & {
    readiness?: ReadinessDependencies;
    logger?: false | {
      level: string;
      redact: { paths: string[]; censor: string };
    };
  };

export function buildApp(
  dependencies?: AppDependencies,
): FastifyInstance {
  const app = Fastify({
    logger: dependencies?.logger ?? false,
    bodyLimit: 1024 * 1024,
    connectionTimeout: 10_000,
    requestTimeout: 15_000,
    trustProxy: true,
  });
  const rateLimiter = new FixedWindowRateLimiter();
  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("content-security-policy", "default-src 'none'");
    reply.header("referrer-policy", "no-referrer");
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("permissions-policy", "camera=(), microphone=(), geolocation=()");
    return payload;
  });
  void app.register(
    registerHealthRoute,
    dependencies?.readiness ? { readiness: dependencies.readiness } : {},
  );
  void app.register(registerOpenApiRoute);
  if (dependencies?.authService) {
    void app.register(registerAuthRoutes, {
      authService: dependencies.authService,
      rateLimiter,
    });
  }
  if (dependencies?.accountService && dependencies.authenticate) {
    void app.register(registerAccountRoutes, {
      accountService: dependencies.accountService,
      authenticate: dependencies.authenticate,
      rateLimiter,
    });
  }
  if (dependencies?.fileService && dependencies.authenticate) {
    void app.register(registerFileRoutes, {
      authenticate: dependencies.authenticate,
      fileService: dependencies.fileService,
      rateLimiter,
    });
  }
  if (dependencies?.syncStore && dependencies.authenticate) {
    void app.register(registerSyncRoutes, {
      authenticate: dependencies.authenticate,
      syncStore: dependencies.syncStore,
      rateLimiter,
    });
  }
  return app;
}
