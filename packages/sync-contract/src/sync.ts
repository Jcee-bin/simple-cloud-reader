import { z } from "zod";
import { canonicalLocatorSchema } from "./locator.js";

export const entityTypeSchema = z.enum([
  "book",
  "progress",
  "highlight",
  "note",
  "bookmark",
  "collection",
  "collectionMembership",
]);

export const mutationOperationSchema = z.object({
  operationId: z.string().min(1),
  entityType: entityTypeSchema,
  entityId: z.string().min(1),
  action: z.enum(["upsert", "delete"]),
  clientTimestamp: z.iso.datetime(),
  payload: z.union([
    canonicalLocatorSchema,
    z.record(z.string(), z.unknown()),
  ]),
});

export const mutationBatchSchema = z.object({
  deviceId: z.string().min(1),
  operations: z.array(mutationOperationSchema).max(100),
}).superRefine(({ operations }, context) => {
  const seen = new Set<string>();
  operations.forEach((operation, index) => {
    if (seen.has(operation.operationId)) {
      context.addIssue({
        code: "custom",
        path: ["operations", index, "operationId"],
        message: "operationId must be unique within a batch",
      });
    }
    seen.add(operation.operationId);
  });
});

export const syncChangeSchema = mutationOperationSchema.extend({
  serverVersion: z.number().int().positive(),
  serverTimestamp: z.iso.datetime(),
});

export const pullResponseSchema = z.object({
  cursor: z.string().min(1),
  hasMore: z.boolean(),
  changes: z.array(syncChangeSchema),
});

export type MutationBatch = z.infer<typeof mutationBatchSchema>;
export type SyncChange = z.infer<typeof syncChangeSchema>;
