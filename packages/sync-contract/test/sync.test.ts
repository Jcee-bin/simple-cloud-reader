import { describe, expect, it } from "vitest";
import {
  mutationBatchSchema,
  pullResponseSchema,
  pushResponseSchema,
} from "../src/sync.js";

const operationId = "3dd3a569-5994-4ce4-a3c7-38123ecb15c5";
const entityId = "17d24783-4be7-4857-94de-1e78ab58db60";
const bookId = "d1822de7-f117-4910-96d2-e8a07fb7455f";
const deviceId = "93f39cf5-d988-49d9-9cc0-a857d13ac1d6";

describe("mutationBatchSchema", () => {
  it("accepts an idempotent progress mutation", () => {
    const value = {
      deviceId,
      operations: [{
        operationId,
        entityType: "progress",
        entityId,
        action: "upsert",
        baseVersion: 0,
        clientTimestamp: "2026-06-12T00:00:00.000Z",
        deletedAt: null,
        payload: {
          bookId,
          locator: {
            format: "epub",
            progression: 0.42,
            engine: "readium",
            engineLocation: {},
          },
        },
      }],
    };

    expect(mutationBatchSchema.parse(value)).toEqual(value);
  });

  it("rejects duplicate operation IDs in one batch", () => {
    const operation = {
      operationId,
      entityType: "bookmark",
      entityId,
      action: "delete",
      baseVersion: 3,
      clientTimestamp: "2026-06-12T00:00:00.000Z",
      deletedAt: "2026-06-12T00:00:00.000Z",
      payload: null,
    };

    expect(() => mutationBatchSchema.parse({
      deviceId,
      operations: [operation, operation],
    })).toThrow();
  });

  it("rejects an entity payload that does not match its discriminator", () => {
    expect(() => mutationBatchSchema.parse({
      deviceId,
      operations: [{
        operationId,
        entityType: "collection",
        entityId,
        action: "upsert",
        baseVersion: null,
        clientTimestamp: "2026-06-12T00:00:00.000Z",
        deletedAt: null,
        payload: {
          bookId,
          locator: {
            format: "epub",
            progression: 0.42,
            engine: "readium",
            engineLocation: {},
          },
        },
      }],
    })).toThrow();
  });

  it("requires explicit tombstone semantics for deletes", () => {
    expect(() => mutationBatchSchema.parse({
      deviceId,
      operations: [{
        operationId,
        entityType: "bookmark",
        entityId,
        action: "delete",
        baseVersion: 3,
        clientTimestamp: "2026-06-12T00:00:00.000Z",
        deletedAt: null,
        payload: null,
      }],
    })).toThrow();
  });

  it("models per-operation push results", () => {
    expect(pushResponseSchema.parse({
      cursor: "opaque-cursor",
      results: [{
        operationId,
        status: "accepted",
        serverVersion: 1,
      }],
    }).results[0]?.status).toBe("accepted");
  });

  it("limits pull pages to 500 changes", () => {
    const change = {
      operationId,
      entityType: "bookmark",
      entityId,
      action: "delete",
      baseVersion: 3,
      clientTimestamp: "2026-06-12T00:00:00.000Z",
      deletedAt: "2026-06-12T00:01:00.000Z",
      payload: null,
      deviceId,
      serverVersion: 4,
      serverTimestamp: "2026-06-12T00:01:01.000Z",
    };

    expect(() => pullResponseSchema.parse({
      cursor: "opaque-cursor",
      hasMore: true,
      changes: Array.from({ length: 501 }, () => change),
    })).toThrow();
  });
});
