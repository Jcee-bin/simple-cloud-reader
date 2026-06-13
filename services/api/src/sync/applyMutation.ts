import {
  bookmarkPayloadSchema,
  bookPayloadSchema,
  collectionMembershipPayloadSchema,
  collectionPayloadSchema,
  highlightPayloadSchema,
  libraryMembershipPayloadSchema,
  type MutationOperation,
  progressPayloadSchema,
  type PushOperationResult,
  pushOperationResultSchema,
} from "@simple-cloud-reader/sync-contract";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../db/client.js";
import {
  bookmarks,
  books,
  changeLog,
  collectionMemberships,
  collections,
  entityHistory,
  fileObjects,
  highlights,
  libraryMemberships,
  mutationReceipts,
  readingPositions,
} from "../db/schema.js";

type SyncTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

interface EntityVersion {
  userId: string;
  version: number;
  deletedAt: Date | null;
}

async function readEntityVersion(
  transaction: SyncTransaction,
  operation: MutationOperation,
): Promise<EntityVersion | null> {
  const selectVersion = async (
    table:
      | typeof books
      | typeof libraryMemberships
      | typeof readingPositions
      | typeof highlights
      | typeof bookmarks
      | typeof collections
      | typeof collectionMemberships,
  ) => {
    const [record] = await transaction
      .select({
        userId: table.userId,
        version: table.version,
        deletedAt: table.deletedAt,
      })
      .from(table)
      .where(eq(table.id, operation.entityId))
      .limit(1);
    return record ?? null;
  };

  switch (operation.entityType) {
    case "book":
      return selectVersion(books);
    case "libraryMembership":
      return selectVersion(libraryMemberships);
    case "progress":
      return selectVersion(readingPositions);
    case "highlight":
      return selectVersion(highlights);
    case "bookmark":
      return selectVersion(bookmarks);
    case "collection":
      return selectVersion(collections);
    case "collectionMembership":
      return selectVersion(collectionMemberships);
    case "fileObject":
      return null;
  }
}

async function ownsBook(
  transaction: SyncTransaction,
  userId: string,
  bookId: string,
): Promise<boolean> {
  const [book] = await transaction
    .select({ id: books.id })
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);
  return Boolean(book);
}

async function ownsCollection(
  transaction: SyncTransaction,
  userId: string,
  collectionId: string,
): Promise<boolean> {
  const [collection] = await transaction
    .select({ id: collections.id })
    .from(collections)
    .where(and(
      eq(collections.id, collectionId),
      eq(collections.userId, userId),
    ))
    .limit(1);
  return Boolean(collection);
}

async function upsertEntity(
  transaction: SyncTransaction,
  userId: string,
  operation: Extract<MutationOperation, { action: "upsert" }>,
  nextVersion: number,
  serverTimestamp: Date,
): Promise<boolean> {
  switch (operation.entityType) {
    case "book": {
      const payload = bookPayloadSchema.parse(operation.payload);
      await transaction.insert(books).values({
        id: operation.entityId,
        userId,
        ...payload,
        authors: payload.authors,
        version: nextVersion,
        updatedAt: serverTimestamp,
        deletedAt: null,
      }).onConflictDoUpdate({
        target: books.id,
        set: {
          ...payload,
          authors: payload.authors,
          version: nextVersion,
          updatedAt: serverTimestamp,
          deletedAt: null,
        },
      });
      return true;
    }
    case "libraryMembership": {
      const payload = libraryMembershipPayloadSchema.parse(operation.payload);
      if (!await ownsBook(transaction, userId, payload.bookId)) return false;
      await transaction.insert(libraryMemberships).values({
        id: operation.entityId,
        userId,
        ...payload,
        addedAt: new Date(payload.addedAt),
        version: nextVersion,
        updatedAt: serverTimestamp,
        deletedAt: null,
      }).onConflictDoUpdate({
        target: libraryMemberships.id,
        set: {
          state: payload.state,
          addedAt: new Date(payload.addedAt),
          version: nextVersion,
          updatedAt: serverTimestamp,
          deletedAt: null,
        },
      });
      return true;
    }
    case "progress": {
      const payload = progressPayloadSchema.parse(operation.payload);
      if (!await ownsBook(transaction, userId, payload.bookId)) return false;
      await transaction.insert(readingPositions).values({
        id: operation.entityId,
        userId,
        bookId: payload.bookId,
        locator: payload.locator,
        version: nextVersion,
        updatedAt: serverTimestamp,
        deletedAt: null,
      }).onConflictDoUpdate({
        target: readingPositions.id,
        set: {
          bookId: payload.bookId,
          locator: payload.locator,
          version: nextVersion,
          updatedAt: serverTimestamp,
          deletedAt: null,
        },
      });
      return true;
    }
    case "highlight": {
      const payload = highlightPayloadSchema.parse(operation.payload);
      if (!await ownsBook(transaction, userId, payload.bookId)) return false;
      await transaction.insert(highlights).values({
        id: operation.entityId,
        userId,
        ...payload,
        locator: payload.locator,
        version: nextVersion,
        updatedAt: serverTimestamp,
        deletedAt: null,
      }).onConflictDoUpdate({
        target: highlights.id,
        set: {
          ...payload,
          locator: payload.locator,
          version: nextVersion,
          updatedAt: serverTimestamp,
          deletedAt: null,
        },
      });
      return true;
    }
    case "bookmark": {
      const payload = bookmarkPayloadSchema.parse(operation.payload);
      if (!await ownsBook(transaction, userId, payload.bookId)) return false;
      await transaction.insert(bookmarks).values({
        id: operation.entityId,
        userId,
        ...payload,
        locator: payload.locator,
        version: nextVersion,
        updatedAt: serverTimestamp,
        deletedAt: null,
      }).onConflictDoUpdate({
        target: bookmarks.id,
        set: {
          ...payload,
          locator: payload.locator,
          version: nextVersion,
          updatedAt: serverTimestamp,
          deletedAt: null,
        },
      });
      return true;
    }
    case "collection": {
      const payload = collectionPayloadSchema.parse(operation.payload);
      await transaction.insert(collections).values({
        id: operation.entityId,
        userId,
        name: payload.name,
        version: nextVersion,
        updatedAt: serverTimestamp,
        deletedAt: null,
      }).onConflictDoUpdate({
        target: collections.id,
        set: {
          name: payload.name,
          version: nextVersion,
          updatedAt: serverTimestamp,
          deletedAt: null,
        },
      });
      return true;
    }
    case "collectionMembership": {
      const payload = collectionMembershipPayloadSchema.parse(
        operation.payload,
      );
      if (
        !await ownsBook(transaction, userId, payload.bookId)
        || !await ownsCollection(transaction, userId, payload.collectionId)
      ) {
        return false;
      }
      await transaction.insert(collectionMemberships).values({
        id: operation.entityId,
        userId,
        ...payload,
        version: nextVersion,
        updatedAt: serverTimestamp,
        deletedAt: null,
      }).onConflictDoUpdate({
        target: collectionMemberships.id,
        set: {
          ...payload,
          version: nextVersion,
          updatedAt: serverTimestamp,
          deletedAt: null,
        },
      });
      return true;
    }
    case "fileObject":
      return false;
  }
}

async function deleteEntity(
  transaction: SyncTransaction,
  userId: string,
  deviceId: string,
  operation: Extract<MutationOperation, { action: "delete" }>,
  nextVersion: number,
  serverTimestamp: Date,
): Promise<boolean> {
  const values = {
    version: nextVersion,
    updatedAt: serverTimestamp,
    deletedAt: new Date(operation.deletedAt),
  };
  switch (operation.entityType) {
    case "book": {
      const childTombstones: Array<{
        entityType:
          | "libraryMembership"
          | "fileObject"
          | "progress"
          | "highlight"
          | "bookmark"
          | "collectionMembership";
        entityId: string;
        serverVersion: number;
      }> = [];
      const membershipRows = await transaction
        .update(libraryMemberships)
        .set({
          version: sql`${libraryMemberships.version} + 1`,
          updatedAt: serverTimestamp,
          deletedAt: new Date(operation.deletedAt),
        })
        .where(and(
          eq(libraryMemberships.userId, userId),
          eq(libraryMemberships.bookId, operation.entityId),
          isNull(libraryMemberships.deletedAt),
        ))
        .returning({
          entityId: libraryMemberships.id,
          serverVersion: libraryMemberships.version,
        });
      childTombstones.push(...membershipRows.map((row) => ({
        entityType: "libraryMembership" as const,
        ...row,
      })));

      const fileRows = await transaction
        .update(fileObjects)
        .set({
          state: "deleted",
          version: sql`${fileObjects.version} + 1`,
          updatedAt: serverTimestamp,
          deletedAt: new Date(operation.deletedAt),
        })
        .where(and(
          eq(fileObjects.userId, userId),
          eq(fileObjects.bookId, operation.entityId),
          isNull(fileObjects.deletedAt),
        ))
        .returning({
          entityId: fileObjects.id,
          serverVersion: fileObjects.version,
        });
      childTombstones.push(...fileRows.map((row) => ({
        entityType: "fileObject" as const,
        ...row,
      })));

      const positionRows = await transaction
        .update(readingPositions)
        .set({
          version: sql`${readingPositions.version} + 1`,
          updatedAt: serverTimestamp,
          deletedAt: new Date(operation.deletedAt),
        })
        .where(and(
          eq(readingPositions.userId, userId),
          eq(readingPositions.bookId, operation.entityId),
          isNull(readingPositions.deletedAt),
        ))
        .returning({
          entityId: readingPositions.id,
          serverVersion: readingPositions.version,
        });
      childTombstones.push(...positionRows.map((row) => ({
        entityType: "progress" as const,
        ...row,
      })));

      const highlightRows = await transaction
        .update(highlights)
        .set({
          version: sql`${highlights.version} + 1`,
          updatedAt: serverTimestamp,
          deletedAt: new Date(operation.deletedAt),
        })
        .where(and(
          eq(highlights.userId, userId),
          eq(highlights.bookId, operation.entityId),
          isNull(highlights.deletedAt),
        ))
        .returning({
          entityId: highlights.id,
          serverVersion: highlights.version,
        });
      childTombstones.push(...highlightRows.map((row) => ({
        entityType: "highlight" as const,
        ...row,
      })));

      const bookmarkRows = await transaction
        .update(bookmarks)
        .set({
          version: sql`${bookmarks.version} + 1`,
          updatedAt: serverTimestamp,
          deletedAt: new Date(operation.deletedAt),
        })
        .where(and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.bookId, operation.entityId),
          isNull(bookmarks.deletedAt),
        ))
        .returning({
          entityId: bookmarks.id,
          serverVersion: bookmarks.version,
        });
      childTombstones.push(...bookmarkRows.map((row) => ({
        entityType: "bookmark" as const,
        ...row,
      })));

      const collectionRows = await transaction
        .update(collectionMemberships)
        .set({
          version: sql`${collectionMemberships.version} + 1`,
          updatedAt: serverTimestamp,
          deletedAt: new Date(operation.deletedAt),
        })
        .where(and(
          eq(collectionMemberships.userId, userId),
          eq(collectionMemberships.bookId, operation.entityId),
          isNull(collectionMemberships.deletedAt),
        ))
        .returning({
          entityId: collectionMemberships.id,
          serverVersion: collectionMemberships.version,
        });
      childTombstones.push(...collectionRows.map((row) => ({
        entityType: "collectionMembership" as const,
        ...row,
      })));

      for (const child of childTombstones) {
        await transaction.insert(changeLog).values({
          userId,
          entityType: child.entityType,
          entityId: child.entityId,
          action: "delete",
          payload: {
            operationId: randomUUID(),
            baseVersion: child.serverVersion - 1,
            clientTimestamp: operation.clientTimestamp,
            deletedAt: operation.deletedAt,
            payload: null,
          },
          serverVersion: child.serverVersion,
          serverTimestamp,
          originatingDeviceId: deviceId,
        });
      }

      await transaction.update(books).set(values).where(and(
        eq(books.id, operation.entityId),
        eq(books.userId, userId),
      ));
      return true;
    }
    case "libraryMembership":
      await transaction.update(libraryMemberships).set(values).where(and(
        eq(libraryMemberships.id, operation.entityId),
        eq(libraryMemberships.userId, userId),
      ));
      return true;
    case "progress":
      await transaction.update(readingPositions).set(values).where(and(
        eq(readingPositions.id, operation.entityId),
        eq(readingPositions.userId, userId),
      ));
      return true;
    case "highlight":
      await transaction.update(highlights).set(values).where(and(
        eq(highlights.id, operation.entityId),
        eq(highlights.userId, userId),
      ));
      return true;
    case "bookmark":
      await transaction.update(bookmarks).set(values).where(and(
        eq(bookmarks.id, operation.entityId),
        eq(bookmarks.userId, userId),
      ));
      return true;
    case "collection":
      await transaction.update(collections).set(values).where(and(
        eq(collections.id, operation.entityId),
        eq(collections.userId, userId),
      ));
      return true;
    case "collectionMembership":
      await transaction.update(collectionMemberships).set(values).where(and(
        eq(collectionMemberships.id, operation.entityId),
        eq(collectionMemberships.userId, userId),
      ));
      return true;
    case "fileObject":
      return false;
  }
}

async function readHighlight(
  transaction: SyncTransaction,
  userId: string,
  entityId: string,
) {
  const [highlight] = await transaction
    .select({
      bookId: highlights.bookId,
      selectedText: highlights.selectedText,
      prefix: highlights.prefix,
      suffix: highlights.suffix,
      colorRole: highlights.colorRole,
      note: highlights.note,
      locator: highlights.locator,
      version: highlights.version,
      deletedAt: highlights.deletedAt,
    })
    .from(highlights)
    .where(and(
      eq(highlights.id, entityId),
      eq(highlights.userId, userId),
    ))
    .limit(1);
  return highlight ?? null;
}

async function readProgress(
  transaction: SyncTransaction,
  userId: string,
  entityId: string,
) {
  const [progress] = await transaction
    .select({
      bookId: readingPositions.bookId,
      locator: readingPositions.locator,
      updatedAt: readingPositions.updatedAt,
      deletedAt: readingPositions.deletedAt,
    })
    .from(readingPositions)
    .where(and(
      eq(readingPositions.id, entityId),
      eq(readingPositions.userId, userId),
    ))
    .limit(1);
  return progress ?? null;
}

function sameHighlightExceptNote(
  current: NonNullable<Awaited<ReturnType<typeof readHighlight>>>,
  proposed: ReturnType<typeof highlightPayloadSchema.parse>,
): boolean {
  return current.bookId === proposed.bookId
    && current.selectedText === proposed.selectedText
    && current.prefix === proposed.prefix
    && current.suffix === proposed.suffix
    && current.colorRole === proposed.colorRole
    && isDeepStrictEqual(current.locator, proposed.locator);
}

const RECENT_PROGRESS_WINDOW_MS = 24 * 60 * 60 * 1_000;
const BACKWARD_PROGRESS_THRESHOLD = 0.1;

export async function applyMutation(input: {
  transaction: SyncTransaction;
  userId: string;
  deviceId: string;
  operation: MutationOperation;
  serverTimestamp: Date;
}): Promise<PushOperationResult> {
  await input.transaction.execute(sql`
    SELECT pg_advisory_xact_lock(
      hashtextextended(
        ${`${input.userId}:${input.operation.operationId}`},
        0
      )
    )
  `);
  const [receipt] = await input.transaction
    .select({ result: mutationReceipts.result })
    .from(mutationReceipts)
    .where(and(
      eq(mutationReceipts.userId, input.userId),
      eq(mutationReceipts.operationId, input.operation.operationId),
    ))
    .limit(1);
  if (receipt) {
    const prior = pushOperationResultSchema.parse(receipt.result);
    return { ...prior, status: "duplicate" };
  }

  await input.transaction.execute(sql`
    SELECT pg_advisory_xact_lock(
      hashtextextended(
        ${`${input.userId}:${input.operation.entityType}:${input.operation.entityId}`},
        0
      )
    )
  `);
  const current = await readEntityVersion(
    input.transaction,
    input.operation,
  );
  const versionMismatch = current
    ? input.operation.baseVersion !== current.version
    : ![null, 0].includes(input.operation.baseVersion);
  let acceptsStaleVersion = false;
  let highlightHistory:
    | NonNullable<Awaited<ReturnType<typeof readHighlight>>>
    | null = null;
  let result: PushOperationResult | undefined;
  if (current && current.userId !== input.userId) {
    result = {
      operationId: input.operation.operationId,
      status: "rejected",
      errorCode: "entity_not_found",
    };
  } else if (
    current
    && !current.deletedAt
    && input.operation.entityType === "progress"
    && input.operation.action === "upsert"
  ) {
    const proposed = progressPayloadSchema.parse(input.operation.payload);
    const progress = await readProgress(
      input.transaction,
      input.userId,
      input.operation.entityId,
    );
    if (!progress || progress.deletedAt) {
      result = {
        operationId: input.operation.operationId,
        status: "conflict",
        serverVersion: current.version,
        errorCode: "version_conflict",
      };
    } else {
      const currentLocator = progressPayloadSchema.parse({
        bookId: progress.bookId,
        locator: progress.locator,
      }).locator;
      const ageMs = input.serverTimestamp.getTime()
        - progress.updatedAt.getTime();
      const backwardDistance = currentLocator.progression
        - proposed.locator.progression;
      if (
        ageMs >= 0
        && ageMs <= RECENT_PROGRESS_WINDOW_MS
        && backwardDistance > BACKWARD_PROGRESS_THRESHOLD
      ) {
        result = {
          operationId: input.operation.operationId,
          status: "conflict",
          serverVersion: current.version,
          errorCode: "backward_progress",
          conflict: {
            kind: "backward_progress",
            currentLocator,
            proposedLocator: proposed.locator,
          },
        };
      } else {
        acceptsStaleVersion = true;
      }
    }
  } else if (
    versionMismatch
    && current
    && !current.deletedAt
    && input.operation.entityType === "highlight"
    && input.operation.action === "upsert"
  ) {
    const proposed = highlightPayloadSchema.parse(input.operation.payload);
    const highlight = await readHighlight(
      input.transaction,
      input.userId,
      input.operation.entityId,
    );
    if (
      highlight
      && !highlight.deletedAt
      && sameHighlightExceptNote(highlight, proposed)
    ) {
      acceptsStaleVersion = true;
      highlightHistory = highlight;
    } else {
      result = {
        operationId: input.operation.operationId,
        status: "conflict",
        serverVersion: current.version,
        errorCode: "version_conflict",
      };
    }
  } else if (versionMismatch) {
    result = {
      operationId: input.operation.operationId,
      status: "conflict",
      ...(current ? { serverVersion: current.version } : {}),
      errorCode: "version_conflict",
    };
  }

  if (!result && input.operation.entityType === "fileObject") {
    result = {
      operationId: input.operation.operationId,
      status: "rejected",
      errorCode: "managed_file_required",
    };
  } else if (!result) {
    const nextVersion = (current?.version ?? 0) + 1;
    if (highlightHistory && acceptsStaleVersion) {
      await input.transaction.insert(entityHistory).values({
        userId: input.userId,
        entityType: "highlight",
        entityId: input.operation.entityId,
        version: highlightHistory.version,
        payload: {
          bookId: highlightHistory.bookId,
          selectedText: highlightHistory.selectedText,
          prefix: highlightHistory.prefix,
          suffix: highlightHistory.suffix,
          colorRole: highlightHistory.colorRole,
          note: highlightHistory.note,
          locator: highlightHistory.locator,
        },
        recordedAt: input.serverTimestamp,
      });
    }
    const applied = input.operation.action === "upsert"
      ? await upsertEntity(
        input.transaction,
        input.userId,
        input.operation,
        nextVersion,
        input.serverTimestamp,
      )
      : current
      ? await deleteEntity(
        input.transaction,
        input.userId,
        input.deviceId,
        input.operation,
        nextVersion,
        input.serverTimestamp,
      )
      : false;

    if (!applied) {
      result = {
        operationId: input.operation.operationId,
        status: "rejected",
        errorCode: "related_entity_not_found",
      };
    } else {
      result = {
        operationId: input.operation.operationId,
        status: "accepted",
        serverVersion: nextVersion,
      };
      await input.transaction.insert(changeLog).values({
        userId: input.userId,
        entityType: input.operation.entityType,
        entityId: input.operation.entityId,
        action: input.operation.action,
        payload: {
          operationId: input.operation.operationId,
          baseVersion: input.operation.baseVersion,
          clientTimestamp: input.operation.clientTimestamp,
          deletedAt: input.operation.deletedAt,
          payload: input.operation.payload,
        },
        serverVersion: nextVersion,
        serverTimestamp: input.serverTimestamp,
        originatingDeviceId: input.deviceId,
      });
    }
  }

  await input.transaction.insert(mutationReceipts).values({
    userId: input.userId,
    operationId: input.operation.operationId,
    result,
  }).onConflictDoNothing();
  return result;
}
