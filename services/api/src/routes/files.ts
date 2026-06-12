import type {
  FastifyInstance,
  FastifyReply,
  preHandlerHookHandler,
} from "fastify";
import {
  entityIdSchema,
  fileUploadCompleteSchema,
  fileUploadRequestSchema,
} from "@simple-cloud-reader/sync-contract";
import { ZodError } from "zod";
import type { FileService } from "../files/fileService.js";

export interface FileRouteDependencies {
  fileService: FileService;
  authenticate: preHandlerHookHandler;
}

async function sendFileResponse(
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

export async function registerFileRoutes(
  app: FastifyInstance,
  dependencies: FileRouteDependencies,
): Promise<void> {
  app.post<{ Params: { bookId: string } }>(
    "/v1/books/:bookId/files",
    { preHandler: dependencies.authenticate },
    async (request, reply) =>
      sendFileResponse(reply, async () => {
        const body = fileUploadRequestSchema.parse(request.body);
        const bookId = entityIdSchema.parse(request.params.bookId);
        return dependencies.fileService.reserveUpload({
          userId: request.auth.userId,
          deviceId: request.auth.deviceId,
          bookId,
          ...body,
        });
      })
  );

  app.post<{ Params: { fileId: string } }>(
    "/v1/files/:fileId/complete",
    { preHandler: dependencies.authenticate },
    async (request, reply) =>
      sendFileResponse(reply, async () => {
        const body = fileUploadCompleteSchema.parse(request.body);
        const fileId = entityIdSchema.parse(request.params.fileId);
        const file = await dependencies.fileService.complete({
          userId: request.auth.userId,
          deviceId: request.auth.deviceId,
          fileId,
          byteSize: body.byteSize,
        });
        return { fileId: file.id, state: file.state };
      })
  );

  app.get<{ Params: { fileId: string } }>(
    "/v1/files/:fileId/download-url",
    { preHandler: dependencies.authenticate },
    async (request, reply) =>
      sendFileResponse(
        reply,
        () => {
          const fileId = entityIdSchema.parse(request.params.fileId);
          return dependencies.fileService.download({
            userId: request.auth.userId,
            fileId,
          });
        },
      )
  );

  app.delete<{ Params: { fileId: string } }>(
    "/v1/files/:fileId",
    { preHandler: dependencies.authenticate },
    async (request, reply) =>
      sendFileResponse(reply, async () => {
        const fileId = entityIdSchema.parse(request.params.fileId);
        await dependencies.fileService.remove({
          userId: request.auth.userId,
          deviceId: request.auth.deviceId,
          fileId,
        });
        return reply.code(204).send();
      })
  );
}
