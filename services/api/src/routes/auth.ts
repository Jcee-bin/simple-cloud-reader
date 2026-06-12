import type { FastifyInstance, FastifyReply } from "fastify";
import type { AuthService } from "../auth/authService.js";

export interface AuthRouteDependencies {
  authService: AuthService;
}

function requestIp(
  headers: Record<string, string | string[] | undefined>,
  fallback: string,
): string {
  const forwarded = headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",", 1)[0]!.trim();
  }
  return fallback;
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
  app.post("/v1/auth/magic-link", async (request, reply) => {
    const body = request.body as { email?: unknown };
    await dependencies.authService.requestMagicLink({
      email: typeof body?.email === "string" ? body.email : "",
      requestIp: requestIp(request.headers, request.ip),
    });
    return reply.code(202).send({ accepted: true });
  });

  app.post("/v1/auth/redeem", async (request, reply) =>
    sendAuthResponse(
      reply,
      () => dependencies.authService.redeemMagicLink(request.body),
    )
  );

  app.post("/v1/auth/refresh", async (request, reply) =>
    sendAuthResponse(
      reply,
      () => dependencies.authService.refresh(request.body),
    )
  );

  app.post("/v1/auth/sign-out", async (request, reply) =>
    sendAuthResponse(reply, async () => {
      await dependencies.authService.signOut(request.body);
      return reply.code(204).send();
    })
  );
}
