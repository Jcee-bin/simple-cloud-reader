import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ObjectStore } from "../storage/objectStore.js";

const uploadUrlRequestSchema = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  contentType: z.string().min(1),
});

export interface AuthenticatedUser {
  userId: string;
}

export interface FileRouteDependencies {
  objectStore: ObjectStore;
  authenticate(): Promise<AuthenticatedUser>;
}

export async function registerFileRoutes(
  app: FastifyInstance,
  dependencies: FileRouteDependencies,
): Promise<void> {
  app.post<{ Params: { bookId: string } }>(
    "/v1/files/:bookId/upload-url",
    async (request, reply) => {
      const user = await dependencies.authenticate();
      const body = uploadUrlRequestSchema.parse(request.body);
      const key =
        `users/${user.userId}/books/${request.params.bookId}/${body.sha256}`;

      return reply.send(
        await dependencies.objectStore.createUploadUrl(key, body.contentType),
      );
    },
  );
}
