import type {
  MutationBatch,
  SyncChange,
} from "@simple-cloud-reader/sync-contract";

interface UserChange extends SyncChange {
  userId: string;
}

interface PushResult {
  acceptedOperationIds: string[];
  cursor: string;
}

export class InMemorySyncStore {
  private version = 0;
  private readonly operationResults = new Map<string, PushResult>();
  private readonly changes: UserChange[] = [];

  push(userId: string, batch: MutationBatch): PushResult {
    const priorResults = batch.operations.map((operation) =>
      this.operationResults.get(`${userId}:${operation.operationId}`)
    );
    if (
      priorResults.length > 0
      && priorResults.every((result) => result !== undefined)
    ) {
      return priorResults.at(-1)!;
    }

    const acceptedOperationIds: string[] = [];
    for (const operation of batch.operations) {
      const operationKey = `${userId}:${operation.operationId}`;
      if (this.operationResults.has(operationKey)) {
        continue;
      }

      this.version += 1;
      this.changes.push({
        ...operation,
        userId,
        serverVersion: this.version,
        serverTimestamp: new Date().toISOString(),
      });
      acceptedOperationIds.push(operation.operationId);
    }

    const result = {
      acceptedOperationIds,
      cursor: `${this.version}`,
    };
    for (const operationId of acceptedOperationIds) {
      this.operationResults.set(`${userId}:${operationId}`, result);
    }
    return result;
  }

  pull(userId: string, cursor: number) {
    const changes = this.changes
      .filter(
        (change) =>
          change.userId === userId && change.serverVersion > cursor,
      )
      .map(({ userId: _, ...change }) => change);

    return {
      cursor: `${this.version}`,
      hasMore: false,
      changes,
    };
  }
}
