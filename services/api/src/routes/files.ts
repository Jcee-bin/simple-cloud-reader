import type {
  FastifyInstance,
  preHandlerHookHandler,
} from "fastify";
import { z } from "zod";
import type { ObjectStore } from "../storage/objectStore.js";

const uploadUrlRequestSchema = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  contentType: z.string().min(1),
});

export interface FileRouteDependencies {
  objectStore: ObjectStore;
  authenticate: preHandlerHookHandler;
}

export async function registerFileRoutes(
  app: FastifyInstance,
  dependencies: FileRouteDependencies,
): Promise<void> {
  app.post<{ Params: { bookId: string } }>(
    "/v1/files/:bookId/upload-url",
    { preHandler: dependencies.authenticate },
    async (request, reply) => {
      const body = uploadUrlRequestSchema.parse(request.body);
      const key =
        `users/${request.auth.userId}/books/${request.params.bookId}/${body.sha256}`;

      return reply.send(
        await dependencies.objectStore.createUploadUrl(key, body.contentType),
      );
    },
  );
}
