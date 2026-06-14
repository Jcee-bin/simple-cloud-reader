import { mutationBatchSchema } from "@simple-cloud-reader/sync-contract";
import type {
  FastifyInstance,
  FastifyReply,
  preHandlerHookHandler,
} from "fastify";
import { ZodError } from "zod";
import type { SyncStore } from "../sync/syncStore.js";
import {
  createRateLimitHook,
  type FixedWindowRateLimiter,
} from "../security/rateLimiter.js";

export interface SyncRouteDependencies {
  syncStore: SyncStore;
  authenticate: preHandlerHookHandler;
  rateLimiter: FixedWindowRateLimiter;
}

async function sendSyncResponse(
  reply: FastifyReply,
  callback: () => Promise<unknown>,
): Promise<unknown> {
  try {
    return await callback();
  } catch (error) {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: "invalid_request" });
    }
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

export async function registerSyncRoutes(
  app: FastifyInstance,
  dependencies: SyncRouteDependencies,
): Promise<void> {
  app.post(
    "/v1/sync/push",
    { preHandler: [
      dependencies.authenticate,
      createRateLimitHook({
        limiter: dependencies.rateLimiter,
        scope: "sync:push",
        policy: { limit: 120, windowMs: 60_000 },
        authenticated: true,
      }),
    ] },
    async (request, reply) =>
      sendSyncResponse(reply, () => {
        const batch = mutationBatchSchema.parse(request.body);
        return dependencies.syncStore.push({
          userId: request.auth.userId,
          authenticatedDeviceId: request.auth.deviceId,
          batch,
        });
      })
  );

  app.get<{
    Querystring: { cursor?: string; limit?: string };
  }>(
    "/v1/sync/pull",
    { preHandler: [
      dependencies.authenticate,
      createRateLimitHook({
        limiter: dependencies.rateLimiter,
        scope: "sync:pull",
        policy: { limit: 120, windowMs: 60_000 },
        authenticated: true,
      }),
    ] },
    async (request, reply) =>
      sendSyncResponse(reply, () => {
        const parsedLimit = Number.parseInt(request.query.limit ?? "500", 10);
        return dependencies.syncStore.pull({
          userId: request.auth.userId,
          ...(request.query.cursor
            ? { cursor: request.query.cursor }
            : {}),
          limit: Number.isFinite(parsedLimit) ? parsedLimit : 500,
        });
      })
  );
}
