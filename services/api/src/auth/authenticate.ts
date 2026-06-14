import type {
  FastifyReply,
  FastifyRequest,
  preHandlerHookHandler,
} from "fastify";
import { errors, jwtVerify } from "jose";

declare module "fastify" {
  interface FastifyRequest {
    auth: {
      userId: string;
      deviceId: string;
    };
  }
}

export interface AccessRepository {
  hasActiveDevice(input: {
    userId: string;
    deviceId: string;
  }): Promise<boolean>;
}

function reject(reply: FastifyReply, error: string) {
  return reply.code(401).send({ error });
}

export function createAuthenticate(input: {
  jwtSecret: string;
  accessRepository: AccessRepository;
}): preHandlerHookHandler {
  const key = new TextEncoder().encode(input.jwtSecret);

  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<unknown> => {
    const authorization = request.headers.authorization;
    if (!authorization) {
      return reject(reply, "missing_access_token");
    }
    if (!authorization.startsWith("Bearer ")) {
      return reject(reply, "invalid_access_token");
    }

    const token = authorization.slice("Bearer ".length);
    if (!token || token.includes(" ")) {
      return reject(reply, "invalid_access_token");
    }

    try {
      const { payload } = await jwtVerify(token, key, {
        issuer: "simple-cloud-reader",
        audience: "simple-cloud-reader-clients",
      });
      if (
        typeof payload.sub !== "string"
        || typeof payload.deviceId !== "string"
      ) {
        return reject(reply, "invalid_access_token");
      }

      const active = await input.accessRepository.hasActiveDevice({
        userId: payload.sub,
        deviceId: payload.deviceId,
      });
      if (!active) {
        return reject(reply, "invalid_access_token");
      }

      request.auth = {
        userId: payload.sub,
        deviceId: payload.deviceId,
      };
    } catch (error) {
      if (error instanceof errors.JWTExpired) {
        return reject(reply, "access_token_expired");
      }
      return reject(reply, "invalid_access_token");
    }
  };
}
