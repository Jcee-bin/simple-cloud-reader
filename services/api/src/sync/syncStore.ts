import type {
  MutationBatch,
  PullResponse,
  PushResponse,
} from "@simple-cloud-reader/sync-contract";

export interface SyncStore {
  push(input: {
    userId: string;
    authenticatedDeviceId: string;
    batch: MutationBatch;
  }): Promise<PushResponse>;
  pull(input: {
    userId: string;
    cursor?: string;
    limit: number;
  }): Promise<PullResponse>;
}

export class SyncError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
  ) {
    super(code);
  }
}
