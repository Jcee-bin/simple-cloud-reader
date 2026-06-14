import { generateOpenApiDocument } from "@simple-cloud-reader/sync-contract";
import type { FastifyInstance } from "fastify";

const openApiDocument = generateOpenApiDocument();

export async function registerOpenApiRoute(
  app: FastifyInstance,
): Promise<void> {
  app.get("/openapi.json", async (_request, reply) =>
    reply
      .type("application/json; charset=utf-8")
      .send(openApiDocument)
  );
}
