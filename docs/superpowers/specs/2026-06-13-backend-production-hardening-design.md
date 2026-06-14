# Backend Production Hardening Design

## Goal

Finish the Simple Cloud Reader backend for a cautious public beta of roughly
the first 100 light users on one Railway API replica, PostgreSQL, and a Railway
Storage Bucket.

## Request Protection

Fastify enforces a 1 MiB JSON body limit, request and connection timeouts,
trusted Railway proxy handling, request IDs, and conservative security
headers. Native Android and Windows clients do not require permissive browser
CORS.

Every public route has a bounded fixed-window rate policy. Anonymous auth
routes are limited by the trusted client IP. Authenticated sync, file, and
account routes are limited by user ID. The limiter has bounded in-memory state,
which is appropriate for the initial single-replica deployment. Moving to
multiple replicas requires replacing its storage with Redis or PostgreSQL.

## Storage Safety

The API rejects a single file larger than 250 MiB and rejects reservations
that would take a user above 2 GiB of active plus pending storage. Quota checks
run under a PostgreSQL advisory lock so simultaneous uploads cannot bypass the
limit. Direct presigned uploads and downloads keep book bytes away from the
API process.

## Account Lifecycle

`DELETE /v1/account` requires a valid access token. It deletes every owned
object from the bucket, then hard-deletes the user row; PostgreSQL cascades
remove devices, sessions, books, sync records, and history. Object deletion is
idempotent, so a failed attempt can be retried before the user row is removed.

Expired authentication artifacts are removed by an idempotent maintenance
command suitable for manual execution or a Railway scheduled job on plans
that support cron. Destructive sync tombstones are retained for at least 90
days and are not compacted in this launch pass.

## Operations

Fastify emits structured JSON request logs with authorization headers and
token-bearing body fields redacted. Health endpoints continue to distinguish
process liveness from PostgreSQL and bucket readiness. Railway documentation
covers variables, spend limits, metrics, alerts, backup/restore, maintenance,
and a launch checklist.

## Verification

Tests prove route authentication, rate policies, body limits, quota races,
account deletion, maintenance, secret redaction configuration, and existing
sync behavior. CI runs all contract and API tests against PostgreSQL 16.
Artillery-style external load tooling is avoided; a deterministic Fastify
injection test exercises sustained bounded traffic without adding production
dependencies.
