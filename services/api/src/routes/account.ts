import type {
  FastifyInstance,
  preHandlerHookHandler,
} from "fastify";
import type { AccountService } from "../account/accountService.js";
import {
  createRateLimitHook,
  type FixedWindowRateLimiter,
} from "../security/rateLimiter.js";

export interface AccountRouteDependencies {
  accountService: AccountService;
  authenticate: preHandlerHookHandler;
  rateLimiter: FixedWindowRateLimiter;
}

export async function registerAccountRoutes(
  app: FastifyInstance,
  dependencies: AccountRouteDependencies,
): Promise<void> {
  app.delete("/v1/account", {
    preHandler: [
      dependencies.authenticate,
      createRateLimitHook({
        limiter: dependencies.rateLimiter,
        scope: "account:delete",
        policy: { limit: 3, windowMs: 60 * 60_000 },
        authenticated: true,
      }),
    ],
  }, async (request, reply) => {
    await dependencies.accountService.remove(request.auth.userId);
    return reply.code(204).send();
  });
}
