import type {
  MutationBatch,
  PushOperationResult,
  PushResponse,
  SyncChange,
} from "@simple-cloud-reader/sync-contract";

type UserChange = SyncChange & { userId: string };

export class InMemorySyncStore {
  private version = 0;
  private readonly operationResults = new Map<string, PushOperationResult>();
  private readonly changes: UserChange[] = [];

  push(userId: string, batch: MutationBatch): PushResponse {
    const results: PushOperationResult[] = [];
    for (const operation of batch.operations) {
      const operationKey = `${userId}:${operation.operationId}`;
      const priorResult = this.operationResults.get(operationKey);
      if (priorResult) {
        results.push(priorResult);
        continue;
      }

      this.version += 1;
      this.changes.push({
        ...operation,
        userId,
        deviceId: batch.deviceId,
        serverVersion: this.version,
        serverTimestamp: new Date().toISOString(),
      });
      const result: PushOperationResult = {
        operationId: operation.operationId,
        status: "accepted",
        serverVersion: this.version,
      };
      this.operationResults.set(operationKey, result);
      results.push(result);
    }

    return {
      results,
      cursor: `${this.version}`,
    };
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
