# Phase 1 Backend Proof

**Branch:** `phase-0-technical-foundation`  
**Updated:** 2026-06-12

| Proof | Status | Evidence |
| --- | --- | --- |
| Authentication | PASS | PostgreSQL magic links are single-use; HTTP tests redeem links for Android and Windows devices and use real bearer verification. |
| Migrations | PASS | PostgreSQL 16 CI applies every checked-in Drizzle migration to isolated schemas; `drizzle-kit check` passes. |
| Per-user file isolation | PASS | Managed file tests prove user-scoped object keys and prevent cross-user hash reuse from exposing another user's file. |
| Two-device sync | PASS | The Phase 1 HTTP journey syncs a book, progress, managed-file availability, and a highlight between Android and Windows identities. |
| Duplicate retries | PASS | Replayed progress and highlight operation IDs return their stored `duplicate` results. |
| Conflict handling | PASS | A stale offline highlight resurrection returns `version_conflict` with the current server version. |
| Tombstones | PASS | Highlight and book deletion tests publish ordered tombstones and cascade owned reading-state deletion. |
| Railway readiness | PASS | `/health/live` and dependency-aware `/health/ready` are tested; the Railway config runs migrations before traffic. |
| Live Railway transfer | PENDING | Requires creating the Railway project, reaching deployed `/health/ready`, and exercising one signed upload/download. |

The `contract-and-api` job passed for commit `47de9ff` in
[GitHub Actions run 27401749346](https://github.com/Jcee-bin/simple-cloud-reader/actions/runs/27401749346).
It runs PostgreSQL 16 and executes the full contract and API suite, strict
typecheck, production builds, and migration consistency checks.

## Automated evidence

Local verification:

```text
npm run typecheck
  passed

npm test
  design tokens: 4 passed
  sync contract: 22 passed
  API: 33 passed, 11 PostgreSQL-only tests skipped

npm run build
  passed

npm run db:check --workspace=@simple-cloud-reader/api
  passed
```

CI enables `TEST_DATABASE_URL`, so all 44 API tests execute against PostgreSQL.
The end-to-end proof uses the actual Fastify routes, access tokens, repositories,
transactional sync store, and managed file service. Only the S3 network calls
are replaced with a deterministic private object-store fake.

## Remaining gate

Do not describe the backend as live-deployed until the Railway service has:

1. Returned `200` from `/health/ready`.
2. Issued a signed upload URL against its private Bucket.
3. Completed and downloaded that object through the authenticated API.
