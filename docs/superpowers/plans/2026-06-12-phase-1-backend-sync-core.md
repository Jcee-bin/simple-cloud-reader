# Phase 1 Backend and Synchronization Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Phase 0 in-memory proof with a Railway-deployable,
authenticated PostgreSQL API that durably synchronizes one user's library,
files, positions, annotations, collections, and deletion tombstones.

**Architecture:** Fastify remains the HTTP boundary. Drizzle ORM owns explicit
PostgreSQL migrations and transaction-scoped repositories. Magic links and
opaque rotating refresh tokens are stored only as SHA-256 hashes; short-lived
access tokens are signed with `jose`. Every accepted mutation writes its domain
record, operation receipt, and ordered change-log row in one database
transaction. S3-compatible book objects stay private and are transferred only
through short-lived signed URLs.

**Tech Stack:** Node.js 22, TypeScript 6, Fastify 5, Zod 4, Drizzle ORM,
PostgreSQL 16, `jose`, AWS SDK v3, Vitest, OpenAPI 3.1, Railway.

---

## File Map

```text
packages/sync-contract/
  src/
    auth.ts                  request/redeem/refresh contracts
    entities.ts              book, progress, annotation, collection payloads
    files.ts                 upload, completion, and download contracts
    sync.ts                  typed mutation/result/pull envelopes
  test/
    auth.test.ts
    entities.test.ts
    files.test.ts
    sync.test.ts
services/api/
  drizzle.config.ts
  migrations/
    0001_phase_one_core.sql
  src/
    app.ts
    config.ts
    server.ts
    auth/
      authenticate.ts
      magicLinks.ts
      tokens.ts
    db/
      client.ts
      schema.ts
      testDatabase.ts
    email/
      emailSender.ts
    files/
      fileService.ts
    routes/
      auth.ts
      files.ts
      sync.ts
    sync/
      applyMutation.ts
      postgresSyncStore.ts
      syncStore.ts
  test/
    auth.test.ts
    files.integration.test.ts
    migration.test.ts
    sync.integration.test.ts
infra/
  railway/
    README.md
    railway.json
docs/
  architecture/
    sync-protocol.md
    threat-model.md
```

## Task 1: Expand the Shared Domain Contract

**Files:**
- Create: `packages/sync-contract/src/auth.ts`
- Create: `packages/sync-contract/src/entities.ts`
- Create: `packages/sync-contract/src/files.ts`
- Modify: `packages/sync-contract/src/sync.ts`
- Modify: `packages/sync-contract/src/index.ts`
- Test: `packages/sync-contract/test/auth.test.ts`
- Test: `packages/sync-contract/test/entities.test.ts`
- Test: `packages/sync-contract/test/files.test.ts`
- Test: `packages/sync-contract/test/sync.test.ts`

- [ ] **Step 1: Write failing auth and entity contract tests**

```typescript
import { describe, expect, it } from "vitest";
import {
  highlightPayloadSchema,
  magicLinkRequestSchema,
  refreshRequestSchema,
} from "../src/index.js";

describe("phase one contracts", () => {
  it("normalizes a magic-link email address", () => {
    expect(magicLinkRequestSchema.parse({ email: " Reader@Example.COM " }))
      .toEqual({ email: "reader@example.com" });
  });

  it("requires a refresh token and device identifier", () => {
    expect(refreshRequestSchema.parse({
      refreshToken: "token-value",
      deviceId: "device-a",
    })).toEqual({
      refreshToken: "token-value",
      deviceId: "device-a",
    });
  });

  it("accepts exactly one approved highlight role", () => {
    expect(highlightPayloadSchema.parse({
      bookId: crypto.randomUUID(),
      selectedText: "The selected sentence",
      prefix: "Before ",
      suffix: " after",
      colorRole: "quote",
      note: null,
      locator: {
        format: "epub",
        progression: 0.42,
        engine: "readium",
        engineLocation: {},
      },
    }).colorRole).toBe("quote");
  });

  it("rejects arbitrary highlight colors", () => {
    expect(() => highlightPayloadSchema.parse({
      bookId: crypto.randomUUID(),
      selectedText: "Text",
      prefix: "",
      suffix: "",
      colorRole: "orange",
      note: null,
      locator: {
        format: "epub",
        progression: 0.1,
        engine: "readium",
        engineLocation: {},
      },
    })).toThrow();
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```powershell
npm exec --workspace=@simple-cloud-reader/sync-contract vitest run `
  test/auth.test.ts test/entities.test.ts
```

Expected: FAIL because the new modules and exports do not exist.

- [ ] **Step 3: Implement typed auth, entity, and file schemas**

Define:

```typescript
export const highlightRoleSchema = z.enum([
  "important",
  "question",
  "quote",
  "review",
]);

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
```

Use UUID schemas for user-owned entity IDs, ISO datetimes for event times, the
existing canonical locator for positions, nullable notes, and a 64-character
lowercase SHA-256 schema for file hashes. Export explicit payload schemas for
every entity type and a discriminated mutation union keyed by `entityType`.

Auth responses must contain:

```typescript
{
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  user: { id: string; email: string };
}
```

- [ ] **Step 4: Tighten synchronization envelopes**

Replace the untyped record payload with the discriminated entity payload union.
Add `baseVersion`, `deviceId`, and `deletedAt` semantics. Define push results
per operation:

```typescript
{
  operationId: string;
  status: "accepted" | "duplicate" | "conflict" | "rejected";
  serverVersion?: number;
  errorCode?: string;
}
```

Pull responses must contain a user-scoped opaque cursor, `hasMore`, and no more
than 500 changes.

- [ ] **Step 5: Run contract verification**

Run:

```powershell
npm test --workspace=@simple-cloud-reader/sync-contract
npm run typecheck --workspace=@simple-cloud-reader/sync-contract
npm run build --workspace=@simple-cloud-reader/sync-contract
```

Expected: all contract tests pass and TypeScript exits `0`.

- [ ] **Step 6: Commit**

```powershell
git add packages/sync-contract
git commit -m "feat(contract): define phase one domain schemas"
```

## Task 2: Add PostgreSQL Schema and Migration Verification

**Files:**
- Create: `services/api/drizzle.config.ts`
- Create: `services/api/src/db/schema.ts`
- Create: `services/api/src/db/client.ts`
- Create: `services/api/src/db/testDatabase.ts`
- Create: `services/api/migrations/0001_phase_one_core.sql`
- Modify: `services/api/package.json`
- Modify: `services/api/src/config.ts`
- Test: `services/api/test/migration.test.ts`

- [ ] **Step 1: Add database dependencies and scripts**

Install:

```powershell
npm install --workspace=@simple-cloud-reader/api drizzle-orm pg
npm install --workspace=@simple-cloud-reader/api --save-dev `
  drizzle-kit @types/pg
```

Add scripts:

```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:check": "drizzle-kit check"
}
```

- [ ] **Step 2: Write the failing migration test**

The test connects through `TEST_DATABASE_URL`, applies all checked-in
migrations to a fresh schema, and asserts these tables exist:

```text
users
devices
magic_links
refresh_sessions
books
library_memberships
file_objects
reading_positions
highlights
bookmarks
collections
collection_memberships
mutation_receipts
change_log
entity_history
```

It must also assert unique constraints on:

```text
users.normalized_email
(refresh_sessions.user_id, refresh_sessions.token_hash)
(library_memberships.user_id, library_memberships.book_id)
(file_objects.user_id, file_objects.sha256)
(mutation_receipts.user_id, mutation_receipts.operation_id)
change_log.sequence
```

- [ ] **Step 3: Run the migration test and verify RED**

Run:

```powershell
$env:TEST_DATABASE_URL="postgres://reader:reader@localhost:5432/simple_cloud_reader"
npm exec --workspace=@simple-cloud-reader/api vitest run test/migration.test.ts
```

Expected: FAIL because the migration and database helpers do not exist.

- [ ] **Step 4: Implement the schema**

Use UUID primary keys, `timestamptz`, JSONB canonical locators/payloads, and
`bigserial` for `change_log.sequence`. Every user-owned table includes
`user_id`; every synchronizable entity includes `version`, `updated_at`, and
nullable `deleted_at`. Foreign keys use `ON DELETE CASCADE` only where account
deletion should remove the child automatically.

`change_log` stores:

```text
sequence, user_id, entity_type, entity_id, action, payload,
server_version, server_timestamp, originating_device_id
```

`mutation_receipts` stores the complete operation result JSON so retries can
return the original response exactly.

- [ ] **Step 5: Generate and inspect the SQL migration**

Run:

```powershell
npm run db:generate --workspace=@simple-cloud-reader/api
npm run db:check --workspace=@simple-cloud-reader/api
```

Expected: one deterministic migration and no schema drift.

- [ ] **Step 6: Verify GREEN and commit**

Run the migration test twice against a recreated test schema. Expected: both
runs pass.

```powershell
git add services/api package-lock.json
git commit -m "feat(api): add durable phase one database schema"
```

## Task 3: Implement Magic-Link Authentication and Token Rotation

**Files:**
- Create: `services/api/src/email/emailSender.ts`
- Create: `services/api/src/auth/magicLinks.ts`
- Create: `services/api/src/auth/tokens.ts`
- Create: `services/api/src/routes/auth.ts`
- Test: `services/api/test/auth.test.ts`

- [ ] **Step 1: Write failing authentication integration tests**

Cover:

1. Requesting a link always returns `202`, whether or not the user exists.
2. The sender receives one URL containing the opaque token.
3. The database stores only a SHA-256 token hash.
4. Redeeming once creates the user/device/session and returns tokens.
5. Redeeming the same link again returns `401 magic_link_used`.
6. Refreshing rotates the refresh token and revokes the prior token.
7. Reusing a rotated token revokes that device's session family.
8. Access tokens expire after 15 minutes.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm exec --workspace=@simple-cloud-reader/api vitest run test/auth.test.ts
```

Expected: FAIL because auth routes and services do not exist.

- [ ] **Step 3: Implement secure token primitives**

Use `crypto.randomBytes(32).toString("base64url")` for magic and refresh
tokens. Hash opaque tokens with SHA-256 before persistence. Sign access tokens
with `jose` using `JWT_SECRET`, issuer `simple-cloud-reader`, audience
`simple-cloud-reader-clients`, subject `userId`, and a 15-minute expiration.

Magic links expire after 15 minutes and are single-use. Refresh tokens expire
after 30 days, rotate on every use, and are grouped by a session-family UUID.

- [ ] **Step 4: Implement auth routes**

Add:

```text
POST /v1/auth/magic-link
POST /v1/auth/redeem
POST /v1/auth/refresh
POST /v1/auth/sign-out
```

Rate-limit magic-link requests by normalized email and IP without revealing
account existence. The email sender is an injected interface in tests and a
provider-backed implementation in production.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```powershell
npm exec --workspace=@simple-cloud-reader/api vitest run test/auth.test.ts
npm run typecheck --workspace=@simple-cloud-reader/api
```

Expected: all authentication scenarios pass.

```powershell
git add services/api package-lock.json
git commit -m "feat(api): add magic-link authentication"
```

## Task 4: Replace Injected Authentication with a Fastify Boundary

**Files:**
- Create: `services/api/src/auth/authenticate.ts`
- Modify: `services/api/src/app.ts`
- Modify: `services/api/src/routes/files.ts`
- Modify: `services/api/src/routes/sync.ts`
- Test: `services/api/test/authentication-boundary.test.ts`

- [ ] **Step 1: Write failing authorization tests**

Verify protected routes reject:

- Missing `Authorization` header with `401 missing_access_token`.
- Malformed bearer headers with `401 invalid_access_token`.
- Expired tokens with `401 access_token_expired`.
- A token whose user no longer exists with `401 invalid_access_token`.

Verify valid tokens expose `{ userId, deviceId }` on the Fastify request and
that a user cannot request file URLs for another user's records.

- [ ] **Step 2: Implement the authentication plugin**

Use module augmentation for:

```typescript
declare module "fastify" {
  interface FastifyRequest {
    auth: { userId: string; deviceId: string };
  }
}
```

Register one `authenticate` pre-handler. Routes read `request.auth`; production
code no longer accepts an arbitrary `authenticate()` callback.

- [ ] **Step 3: Verify and commit**

```powershell
npm exec --workspace=@simple-cloud-reader/api vitest run `
  test/authentication-boundary.test.ts
npm run typecheck --workspace=@simple-cloud-reader/api
git add services/api
git commit -m "feat(api): enforce bearer authentication"
```

## Task 5: Implement the Managed File Lifecycle

**Files:**
- Create: `services/api/src/files/fileService.ts`
- Modify: `services/api/src/routes/files.ts`
- Test: `services/api/test/files.integration.test.ts`

- [ ] **Step 1: Write failing file lifecycle tests**

Test this exact sequence:

1. User A requests an upload for SHA-256 `H`.
2. The service creates one pending `file_objects` row and a user-scoped key.
3. Retrying returns the same file object, not a duplicate.
4. Completing the upload marks it `ready`.
5. A download URL is available only after completion.
6. User B uploading the same hash gets a different object key.
7. Removing the cloud file marks it deleted but keeps library metadata.
8. Deleting the library record creates sync tombstones for all owned entities.

- [ ] **Step 2: Implement routes**

Add:

```text
POST   /v1/books/:bookId/files
POST   /v1/files/:fileId/complete
GET    /v1/files/:fileId/download-url
DELETE /v1/files/:fileId
```

The server derives object keys from authenticated ownership. It never accepts
an object key from a client. Completion verifies the object exists and its
recorded size matches before setting `ready`.

- [ ] **Step 3: Verify and commit**

```powershell
npm exec --workspace=@simple-cloud-reader/api vitest run `
  test/files.integration.test.ts
git add services/api
git commit -m "feat(api): add managed private file lifecycle"
```

## Task 6: Implement the Transactional PostgreSQL Sync Store

**Files:**
- Create: `services/api/src/sync/syncStore.ts`
- Create: `services/api/src/sync/applyMutation.ts`
- Create: `services/api/src/sync/postgresSyncStore.ts`
- Delete: `services/api/src/sync/inMemorySyncStore.ts`
- Modify: `services/api/src/routes/sync.ts`
- Test: `services/api/test/sync.integration.test.ts`

- [ ] **Step 1: Write failing two-device integration tests**

Use two users and three devices to prove:

- Device A imports a book and writes progress.
- Device B pulls only the same user's changes.
- Device B creates a highlight and Device A receives it.
- Retrying an operation returns an identical stored receipt.
- Mixed batches accept new operations and report duplicates independently.
- Pagination at 500 changes advances an opaque user-scoped cursor.
- A cursor issued to User A cannot reveal User B's sequence.
- The transaction rolls back completely when any accepted mutation fails.

- [ ] **Step 2: Define the store interface**

```typescript
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
```

Reject batches where `batch.deviceId !== authenticatedDeviceId`.

- [ ] **Step 3: Implement one-transaction mutation application**

For each operation:

1. Lock or read its receipt by `(user_id, operation_id)`.
2. Return the stored result when present.
3. Validate ownership and `baseVersion`.
4. Save prior same-entity content to `entity_history` when required.
5. Upsert the domain table or set `deleted_at`.
6. Increment the entity version.
7. Append one `change_log` row.
8. Store the complete operation receipt.

Commit only after every operation has a deterministic result. Database and
validation failures roll back; business conflicts are stored as operation
results and do not roll back unrelated valid operations.

- [ ] **Step 4: Implement opaque cursors**

Encode `{ userId, sequence }` as a signed base64url token. Verify its signature
and authenticated user before querying. Pull uses:

```sql
WHERE user_id = $1 AND sequence > $2
ORDER BY sequence ASC
LIMIT $3 + 1
```

Return `hasMore` from the extra row and advance the cursor only to the final
returned sequence.

- [ ] **Step 5: Verify, remove the proof store, and commit**

```powershell
npm exec --workspace=@simple-cloud-reader/api vitest run `
  test/sync.integration.test.ts
npm test --workspace=@simple-cloud-reader/api
npm run typecheck --workspace=@simple-cloud-reader/api
git add services/api
git commit -m "feat(api): persist idempotent cursor synchronization"
```

## Task 7: Add Conflict History and Tombstone Semantics

**Files:**
- Modify: `services/api/src/sync/applyMutation.ts`
- Modify: `packages/sync-contract/src/sync.ts`
- Test: `services/api/test/conflicts.integration.test.ts`
- Test: `services/api/test/tombstones.integration.test.ts`

- [ ] **Step 1: Write failing conflict tests**

Prove:

- Different highlights merge independently.
- Same-note concurrent edits use server-time last-write-wins.
- The losing note value remains in `entity_history`.
- Latest intentional progress event wins by server acceptance order.
- A backward jump exceeding 10 percentage points within 24 hours returns
  `conflict` with both locators instead of silently applying.

- [ ] **Step 2: Write failing tombstone tests**

Prove:

- Deleting a highlight produces a pullable tombstone.
- An older offline upsert cannot resurrect it.
- Deleting a book everywhere tombstones membership, position, annotations,
  bookmarks, collection membership, and file metadata in one transaction.
- Replaying the deletion is idempotent.

- [ ] **Step 3: Implement and verify**

Use `baseVersion` to reject stale resurrection. Keep tombstones for at least 90
days; compaction is explicitly deferred to Phase 5.

```powershell
npm exec --workspace=@simple-cloud-reader/api vitest run `
  test/conflicts.integration.test.ts test/tombstones.integration.test.ts
git add services/api packages/sync-contract
git commit -m "feat(sync): preserve conflicts and deletion tombstones"
```

## Task 8: Publish OpenAPI and Contract Fixtures

**Files:**
- Modify: `services/api/src/app.ts`
- Create: `services/api/src/openapi.ts`
- Create: `packages/sync-contract/openapi/simple-cloud-reader-v1.json`
- Create: `packages/sync-contract/test/openapi.test.ts`

- [ ] **Step 1: Write a failing OpenAPI parity test**

Assert the document contains all Phase 1 routes, bearer auth, request/response
schemas, stable `operationId` values, and no route with an untyped object body.

- [ ] **Step 2: Generate deterministically**

Register Fastify schema definitions from the shared Zod contracts. Add:

```text
GET /openapi.json
```

Generate and check in the sorted OpenAPI 3.1 document. Add a test that regenerates
it in memory and deep-compares it with the checked-in file.

- [ ] **Step 3: Verify and commit**

```powershell
npm exec --workspace=@simple-cloud-reader/sync-contract vitest run `
  test/openapi.test.ts
git add services/api packages/sync-contract
git commit -m "docs(api): publish versioned OpenAPI contract"
```

## Task 9: Add Railway Deployment and Operational Documentation

**Files:**
- Create: `infra/railway/railway.json`
- Create: `infra/railway/README.md`
- Create: `docs/architecture/sync-protocol.md`
- Create: `docs/architecture/threat-model.md`
- Modify: `services/api/src/routes/health.ts`
- Modify: `services/api/src/server.ts`
- Test: `services/api/test/readiness.test.ts`

- [ ] **Step 1: Write failing readiness tests**

`/health/live` proves the process is running. `/health/ready` verifies a
database query and object-store configuration without writing data. It returns
`503` with component names when dependencies are unavailable and never exposes
credentials.

- [ ] **Step 2: Add Railway configuration**

Use:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "RAILPACK",
    "buildCommand": "npm ci && npm run build --workspace=@simple-cloud-reader/api"
  },
  "deploy": {
    "startCommand": "npm run db:migrate --workspace=@simple-cloud-reader/api && node services/api/dist/server.js",
    "healthcheckPath": "/health/ready",
    "healthcheckTimeout": 120,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

Document `DATABASE_URL`, JWT/cursor secrets, email-provider variables, and
Railway Bucket variables. State that no secret belongs in Git, Android
resources, Windows packaging, or generated client code.

- [ ] **Step 3: Document protocol and threat boundaries**

The sync document must explain transaction order, cursor verification,
idempotency, conflict outcomes, tombstone behavior, pagination, and client
cursor advancement. The threat model must cover magic-link interception,
refresh-token theft, user enumeration, cross-user hash disclosure, signed-URL
leakage, replay, log redaction, and account deletion.

- [ ] **Step 4: Verify and commit**

```powershell
npm exec --workspace=@simple-cloud-reader/api vitest run test/readiness.test.ts
git diff --check
git add infra/railway docs/architecture services/api
git commit -m "ops: add Railway deployment and readiness checks"
```

## Task 10: Validate the Phase 1 Working Proof

**Files:**
- Create: `services/api/test/phase-one.e2e.test.ts`
- Modify: `docs/spikes/phase-0-results.md`
- Create: `docs/spikes/phase-1-results.md`
- Modify: `.github/workflows/phase-0.yml`

- [ ] **Step 1: Write the end-to-end API proof**

The test must simulate two authenticated devices for one user:

1. Request and redeem a magic link.
2. Register Device A and Device B.
3. Create one book and user-scoped file upload.
4. Complete the upload.
5. Push progress from Device A.
6. Pull and advance the cursor on Device B.
7. Push one highlight from Device B.
8. Pull both entities on Device A.
9. Retry both operations and receive stored duplicate results.
10. Delete the highlight and verify the tombstone on Device A.
11. Attempt stale resurrection and receive a conflict.

- [ ] **Step 2: Extend CI**

Add a PostgreSQL 16 service, run migrations, run all contract/API tests, verify
the checked-in OpenAPI document, and run `drizzle-kit check`. Keep the existing
Android and Windows locator jobs.

- [ ] **Step 3: Run the complete verification**

```powershell
npm ci
npm run typecheck
npm test
npm run build
npm run db:check --workspace=@simple-cloud-reader/api
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 4: Record evidence**

`docs/spikes/phase-1-results.md` must link the CI run and list direct evidence
for authentication, migrations, per-user file isolation, two-device sync,
duplicate retries, conflict history, and tombstones. Do not mark live Railway
deployment as passed until a deployed `/health/ready` and one signed transfer
have been exercised.

- [ ] **Step 5: Commit**

```powershell
git add .github services/api packages/sync-contract docs/spikes
git commit -m "test: prove phase one backend vertical slice"
```

## Exit Gate

Phase 1 passes only when:

1. All production routes authenticate through bearer tokens.
2. Checked-in migrations build a fresh PostgreSQL database.
3. No opaque credential is stored in plaintext.
4. Same-user duplicate operations return their stored original result.
5. Cross-user data, hashes, cursors, and object keys remain isolated.
6. Pull pagination is ordered, user-scoped, and resumable.
7. Tombstones prevent stale offline resurrection.
8. Same-note conflicts preserve recovery history.
9. OpenAPI parity and the two-device end-to-end proof pass in CI.
10. Railway deployment documentation contains every required variable and no
    client-embedded secret.

Windows and Android client implementation starts only after the API contract,
migration, and two-device proof are green. The remaining Phase 0 manual
book-opening and live object-store checks remain tracked independently and are
not relabeled as complete by this plan.
