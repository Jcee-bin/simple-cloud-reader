import { z } from "zod";
import {
  entityIdSchema,
  entityPayloadSchemas,
  syncEntityTypeSchema,
} from "./entities.js";

export const entityTypeSchema = syncEntityTypeSchema;

const mutationMetadataShape = {
  operationId: z.uuid(),
  entityId: entityIdSchema,
  baseVersion: z.number().int().nonnegative().nullable(),
  clientTimestamp: z.iso.datetime(),
};

function createEntityMutationSchema<
  TEntityType extends keyof typeof entityPayloadSchemas,
>(
  entityType: TEntityType,
  payloadSchema: (typeof entityPayloadSchemas)[TEntityType],
) {
  const upsertSchema = z.object({
    ...mutationMetadataShape,
    entityType: z.literal(entityType),
    action: z.literal("upsert"),
    deletedAt: z.null(),
    payload: payloadSchema,
  }).strict();
  const deleteSchema = z.object({
    ...mutationMetadataShape,
    entityType: z.literal(entityType),
    action: z.literal("delete"),
    deletedAt: z.iso.datetime(),
    payload: z.null(),
  }).strict();

  return z.discriminatedUnion("action", [upsertSchema, deleteSchema]);
}

export const mutationOperationSchema = z.union(
  Object.entries(entityPayloadSchemas).map(([entityType, payloadSchema]) =>
    createEntityMutationSchema(
      entityType as keyof typeof entityPayloadSchemas,
      payloadSchema,
    )
  ) as [
    ReturnType<typeof createEntityMutationSchema>,
    ReturnType<typeof createEntityMutationSchema>,
    ...ReturnType<typeof createEntityMutationSchema>[],
  ],
);

export const mutationBatchSchema = z.object({
  deviceId: z.uuid(),
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

const syncChangeMetadataSchema = z.object({
  deviceId: z.uuid(),
  serverVersion: z.number().int().positive(),
  serverTimestamp: z.iso.datetime(),
}).strict();

export const syncChangeSchema = z.unknown().transform((value, context) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    context.addIssue({
      code: "custom",
      message: "Expected a synchronization change object",
    });
    return z.NEVER;
  }

  const {
    deviceId,
    serverVersion,
    serverTimestamp,
    ...operationInput
  } = value as Record<string, unknown>;
  const operation = mutationOperationSchema.safeParse(operationInput);
  const metadata = syncChangeMetadataSchema.safeParse({
    deviceId,
    serverVersion,
    serverTimestamp,
  });
  if (!operation.success || !metadata.success) {
    context.addIssue({
      code: "custom",
      message: "Invalid synchronization change",
    });
    return z.NEVER;
  }
  return {
    ...operation.data,
    ...metadata.data,
  };
});

export const pushOperationResultSchema = z.object({
  operationId: z.uuid(),
  status: z.enum(["accepted", "duplicate", "conflict", "rejected"]),
  serverVersion: z.number().int().positive().optional(),
  errorCode: z.string().min(1).max(120).optional(),
}).strict();

export const pushResponseSchema = z.object({
  cursor: z.string().min(1),
  results: z.array(pushOperationResultSchema).max(100),
}).strict();

export const pullResponseSchema = z.object({
  cursor: z.string().min(1),
  hasMore: z.boolean(),
  changes: z.array(syncChangeSchema).max(500),
}).strict();

export type MutationBatch = z.infer<typeof mutationBatchSchema>;
export type MutationOperation = z.infer<typeof mutationOperationSchema>;
export type SyncChange = z.infer<typeof syncChangeSchema>;
export type PushOperationResult = z.infer<typeof pushOperationResultSchema>;
export type PushResponse = z.infer<typeof pushResponseSchema>;
export type PullResponse = z.infer<typeof pullResponseSchema>;
