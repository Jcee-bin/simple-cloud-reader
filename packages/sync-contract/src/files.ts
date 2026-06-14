import { z } from "zod";
import { entityIdSchema, sha256Schema } from "./entities.js";

export const fileUploadRequestSchema = z.object({
  sha256: sha256Schema,
  byteSize: z.number().int().positive(),
  contentType: z.string().trim().min(1).max(255),
  originalFileName: z.string().trim().min(1).max(1024),
}).strict();

export const fileUploadResponseSchema = z.object({
  fileId: entityIdSchema,
  state: z.literal("pending"),
  uploadUrl: z.url(),
  expiresAt: z.iso.datetime(),
}).strict();

export const fileUploadCompleteSchema = z.object({
  byteSize: z.number().int().positive(),
}).strict();

export const fileDownloadResponseSchema = z.object({
  fileId: entityIdSchema,
  downloadUrl: z.url(),
  expiresAt: z.iso.datetime(),
}).strict();

export type FileUploadRequest = z.infer<typeof fileUploadRequestSchema>;
export type FileUploadResponse = z.infer<typeof fileUploadResponseSchema>;
export type FileUploadComplete = z.infer<typeof fileUploadCompleteSchema>;
export type FileDownloadResponse = z.infer<typeof fileDownloadResponseSchema>;
