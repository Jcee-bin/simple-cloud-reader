import { z } from "zod";
import { canonicalLocatorSchema } from "./locator.js";

export const entityIdSchema = z.uuid();
export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

export const highlightRoleSchema = z.enum([
  "important",
  "question",
  "quote",
  "review",
]);

export const bookPayloadSchema = z.object({
  title: z.string().trim().min(1).max(500),
  authors: z.array(z.string().trim().min(1).max(300)).max(100),
  format: z.string().trim().min(1).max(32),
  mediaType: z.string().trim().min(1).max(255),
  originalFileName: z.string().trim().min(1).max(1024),
  coverImageUrl: z.url().nullable(),
}).strict();

export const libraryMembershipPayloadSchema = z.object({
  bookId: entityIdSchema,
  addedAt: z.iso.datetime(),
  state: z.enum(["active", "archived"]),
}).strict();

export const fileObjectPayloadSchema = z.object({
  bookId: entityIdSchema,
  sha256: sha256Schema,
  byteSize: z.number().int().nonnegative(),
  contentType: z.string().trim().min(1).max(255),
  originalFileName: z.string().trim().min(1).max(1024),
  state: z.enum(["pending", "ready", "deleted"]),
}).strict();

export const progressPayloadSchema = z.object({
  bookId: entityIdSchema,
  locator: canonicalLocatorSchema,
}).strict();

export const highlightPayloadSchema = z.object({
  bookId: entityIdSchema,
  selectedText: z.string().min(1).max(100_000),
  prefix: z.string().max(2_000),
  suffix: z.string().max(2_000),
  colorRole: highlightRoleSchema,
  note: z.string().max(100_000).nullable(),
  locator: canonicalLocatorSchema,
}).strict();

export const bookmarkPayloadSchema = z.object({
  bookId: entityIdSchema,
  locator: canonicalLocatorSchema,
  label: z.string().trim().max(500).nullable(),
}).strict();

export const collectionPayloadSchema = z.object({
  name: z.string().trim().min(1).max(200),
}).strict();

export const collectionMembershipPayloadSchema = z.object({
  collectionId: entityIdSchema,
  bookId: entityIdSchema,
}).strict();

export const syncEntityTypeSchema = z.enum([
  "book",
  "libraryMembership",
  "fileObject",
  "progress",
  "highlight",
  "bookmark",
  "collection",
  "collectionMembership",
]);

export const entityPayloadSchemas = {
  book: bookPayloadSchema,
  libraryMembership: libraryMembershipPayloadSchema,
  fileObject: fileObjectPayloadSchema,
  progress: progressPayloadSchema,
  highlight: highlightPayloadSchema,
  bookmark: bookmarkPayloadSchema,
  collection: collectionPayloadSchema,
  collectionMembership: collectionMembershipPayloadSchema,
} as const;

export type HighlightRole = z.infer<typeof highlightRoleSchema>;
export type SyncEntityType = z.infer<typeof syncEntityTypeSchema>;
export type BookPayload = z.infer<typeof bookPayloadSchema>;
export type ProgressPayload = z.infer<typeof progressPayloadSchema>;
export type HighlightPayload = z.infer<typeof highlightPayloadSchema>;
