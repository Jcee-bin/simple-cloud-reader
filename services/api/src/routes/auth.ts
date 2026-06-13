import type { FastifyInstance, FastifyReply } from "fastify";
import type { AuthService } from "../auth/authService.js";
import {
  createRateLimitHook,
  type FixedWindowRateLimiter,
} from "../security/rateLimiter.js";

export interface AuthRouteDependencies {
  authService: AuthService;
  rateLimiter: FixedWindowRateLimiter;
}

async function sendAuthResponse(
  reply: FastifyReply,
  callback: () => Promise<unknown>,
): Promise<unknown> {
  try {
    return await callback();
  } catch (error) {
    if (
      error
      && typeof error === "object"
      && "statusCode" in error
      && "code" in error
      && typeof error.statusCode === "number"
      && typeof error.code === "string"
    ) {
      return reply.code(error.statusCode).send({ error: error.code });
    }
    throw error;
  }
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  dependencies: AuthRouteDependencies,
): Promise<void> {
  app.post("/v1/auth/magic-link", {
    preHandler: createRateLimitHook({
      limiter: dependencies.rateLimiter,
      scope: "auth:magic-link",
      policy: { limit: 20, windowMs: 15 * 60_000 },
    }),
  }, async (request, reply) => {
    const body = request.body as { email?: unknown };
    await dependencies.authService.requestMagicLink({
      email: typeof body?.email === "string" ? body.email : "",
      requestIp: request.ip,
    });
    return reply.code(202).send({ accepted: true });
  });

  app.post("/v1/auth/redeem", {
    preHandler: createRateLimitHook({
      limiter: dependencies.rateLimiter,
      scope: "auth:redeem",
      policy: { limit: 30, windowMs: 15 * 60_000 },
    }),
  }, async (request, reply) =>
    sendAuthResponse(
      reply,
      () => dependencies.authService.redeemMagicLink(request.body),
    )
  );

  app.post("/v1/auth/refresh", {
    preHandler: createRateLimitHook({
      limiter: dependencies.rateLimiter,
      scope: "auth:refresh",
      policy: { limit: 60, windowMs: 15 * 60_000 },
    }),
  }, async (request, reply) =>
    sendAuthResponse(
      reply,
      () => dependencies.authService.refresh(request.body),
    )
  );

  app.post("/v1/auth/sign-out", {
    preHandler: createRateLimitHook({
      limiter: dependencies.rateLimiter,
      scope: "auth:sign-out",
      policy: { limit: 60, windowMs: 15 * 60_000 },
    }),
  }, async (request, reply) =>
    sendAuthResponse(reply, async () => {
      await dependencies.authService.signOut(request.body);
      return reply.code(204).send();
    })
  );
}
