import {
  pullResponseSchema,
  pushResponseSchema,
  syncChangeSchema,
} from "@simple-cloud-reader/sync-contract";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import type { Database } from "../db/client.js";
import { changeLog } from "../db/schema.js";
import { applyMutation } from "./applyMutation.js";
import { createCursorCodec } from "./cursor.js";
import { type SyncStore, SyncError } from "./syncStore.js";

interface ChangeEnvelope {
  operationId: string;
  baseVersion: number | null;
  clientTimestamp: string;
  deletedAt: string | null;
  payload: unknown;
}

export class PostgresSyncStore implements SyncStore {
  private readonly cursorCodec;
  private readonly now;

  constructor(input: {
    db: Database;
    cursorSecret: string;
    now?: () => Date;
  }) {
    this.db = input.db;
    this.cursorCodec = createCursorCodec(input.cursorSecret);
    this.now = input.now ?? (() => new Date());
  }

  private readonly db: Database;

  async push(input: Parameters<SyncStore["push"]>[0]) {
    if (input.batch.deviceId !== input.authenticatedDeviceId) {
      throw new SyncError(403, "device_mismatch");
    }

    const { results, sequence } = await this.db.transaction(
      async (transaction) => {
        const serverTimestamp = this.now();
        const results = [];
        for (const operation of input.batch.operations) {
          results.push(await applyMutation({
            transaction,
            userId: input.userId,
            deviceId: input.authenticatedDeviceId,
            operation,
            serverTimestamp,
          }));
        }
        const [latest] = await transaction
          .select({ sequence: changeLog.sequence })
          .from(changeLog)
          .where(eq(changeLog.userId, input.userId))
          .orderBy(desc(changeLog.sequence))
          .limit(1);
        return { results, sequence: latest?.sequence ?? 0 };
      },
    );

    return pushResponseSchema.parse({
      results,
      cursor: await this.cursorCodec.encode(input.userId, sequence),
    });
  }

  async pull(input: Parameters<SyncStore["pull"]>[0]) {
    const limit = Math.min(Math.max(input.limit, 1), 500);
    const sequence = await this.cursorCodec.decode(
      input.userId,
      input.cursor,
    );
    const rows = await this.db
      .select()
      .from(changeLog)
      .where(and(
        eq(changeLog.userId, input.userId),
        gt(changeLog.sequence, sequence),
      ))
      .orderBy(asc(changeLog.sequence))
      .limit(limit + 1);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const finalSequence = page.at(-1)?.sequence ?? sequence;

    const changes = page.map((row) => {
      const envelope = row.payload as ChangeEnvelope;
      return syncChangeSchema.parse({
        operationId: envelope.operationId,
        entityType: row.entityType,
        entityId: row.entityId,
        action: row.action,
        baseVersion: envelope.baseVersion,
        clientTimestamp: envelope.clientTimestamp,
        deletedAt: envelope.deletedAt,
        payload: envelope.payload,
        deviceId: row.originatingDeviceId,
        serverVersion: row.serverVersion,
        serverTimestamp: row.serverTimestamp.toISOString(),
      });
    });

    return pullResponseSchema.parse({
      cursor: await this.cursorCodec.encode(input.userId, finalSequence),
      hasMore,
      changes,
    });
  }
}
