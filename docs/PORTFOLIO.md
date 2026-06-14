# Portfolio Guide

This page turns the project into accurate resume and interview material. It
describes work that exists in the repository today without presenting the
unfinished Windows and Android clients as released products.

## Thirty-Second Explanation

Simple Cloud Reader is an offline-first ebook reader for Android phones,
tablets, and Windows. I designed and deployed its synchronization backend using
TypeScript, Fastify, PostgreSQL, and private S3-compatible storage on Railway.
The backend handles passwordless authentication, direct book transfers,
idempotent offline mutations, incremental change feeds, conflict recovery,
tombstones, quotas, and account deletion. The backend is live; the Windows and
Android reader interfaces are still in development.

## Resume Bullets

Choose two or three bullets that fit the role:

- Designed and deployed an offline-first synchronization API for a
  cross-platform ebook reader using TypeScript, Fastify, PostgreSQL, Drizzle,
  Railway, and S3-compatible object storage.
- Implemented idempotent mutation processing, signed user-scoped cursors,
  entity versioning, conflict history, and deletion tombstones for reliable
  synchronization across intermittently connected devices.
- Built passwordless magic-link authentication with short-lived JWT access
  tokens, registered device identities, rotating hashed refresh tokens, and
  replay-family revocation.
- Designed private direct-to-storage book uploads and downloads using
  short-lived signed URLs, server-side completion verification, per-user
  deduplication, and transactionally enforced storage quotas.
- Hardened a public API with request validation, bounded payloads, timeouts,
  rate limits, security headers, credential-redacted logs, dependency-aware
  health checks, migrations, and maintenance jobs.
- Modeled reading progress, highlights, notes, bookmarks, collections,
  operation receipts, ordered changes, history, and tombstones in PostgreSQL
  for an offline-capable client architecture.
- Created a generated OpenAPI 3.1 contract and PostgreSQL-backed integration
  tests in GitHub Actions to keep Android, Windows, and backend boundaries
  consistent.

## Longer Project Description

Many ebook readers either keep a user's library on one device or make cloud
behavior visible and complicated. Simple Cloud Reader is designed around a
quiet cover-first library: import a local book, read offline, and let progress
and annotations synchronize when a connection returns.

The project uses established rendering engines instead of attempting to write
EPUB and PDF renderers from scratch. Android is based on KOReader, while the
Windows client is based on Thorium Reader and Readium Desktop. A shared backend
owns identity, private file metadata, ordered synchronization changes, and
conflict policy.

The difficult backend problem is not basic CRUD. A phone can make changes,
lose connectivity, retry the same operation, and reconnect after another
device has edited or deleted the same entity. The API therefore gives every
mutation a stable operation ID, serializes writes per entity, records accepted
operations, assigns ordered change positions, retains overwritten notes for
recovery, and uses tombstones to prevent deleted data from reappearing.

## Technical Challenges

### Safe retries

Mobile connections fail at uncertain moments. A client may not know whether a
request reached the server, so it must retry. `mutation_receipts` make the
operation idempotent: the same operation ID returns its previous result instead
of creating a duplicate highlight or applying progress twice.

### Ordered incremental synchronization

Clients should not download an entire account after each reconnect. Accepted
mutations append to `change_log`; pull requests continue from a signed opaque
cursor. The signature prevents a client from forging another user's position.

### Human-friendly conflicts

Not every conflict deserves a blocking dialog. Independent entities merge
naturally. Concurrent note edits use server acceptance order while preserving
the overwritten payload in `entity_history`. A suspicious recent backward
progress jump returns both locators so the client can ask which location is
correct.

### Private large-file transfer

Sending a 250 MiB book through the API would waste memory and compute. The API
authorizes a user and reserves quota, but the client transfers bytes directly
to private object storage using a short-lived signed URL. Completion is only
accepted after the server verifies the stored object's size.

### Concurrent storage quotas

Two devices can reserve uploads simultaneously. A PostgreSQL advisory lock
serializes quota calculations per user so concurrent requests cannot both
claim the same remaining capacity.

## Interview Talking Points

**Why PostgreSQL?**

The domain needs transactions, uniqueness constraints, ordered change
positions, row locks, cascading ownership, and relational queries. PostgreSQL
supports those requirements in one durable system.

**Why not share one renderer across every platform?**

KOReader is mature on Android but is not the right Windows application base.
Thorium already has Windows packaging and Readium locator infrastructure.
Sharing the protocol and product behavior is more practical than forcing one
rendering engine onto unsuitable platforms.

**Why use signed object URLs?**

They keep permanent storage credentials off clients and large bytes out of the
API process while preserving authorization through short-lived capabilities.

**What happens when two devices edit the same note?**

Writes are serialized per entity. The later accepted payload becomes current,
and the replaced payload is stored in history so the user can recover it.

**How does deletion work offline?**

The server records a tombstone and includes it in the change feed. A stale
client receives the tombstone and cannot silently recreate the old entity.

**What would change at larger scale?**

Move rate limiting from process memory to Redis or PostgreSQL, add production
observability and restore drills, measure hot change-log queries, and scale API
replicas only after shared coordination is in place.

## Evidence

The following claims are directly supported:

- The backend is live:
  [readiness endpoint](https://simple-cloud-reader-production.up.railway.app/health/ready).
- The API contract is checked in:
  [`packages/sync-contract/openapi/simple-cloud-reader-v1.json`](../packages/sync-contract/openapi/simple-cloud-reader-v1.json).
- Backend and contract tests run in
  [GitHub Actions](https://github.com/Jcee-bin/simple-cloud-reader/actions/runs/27470211525).
- The database schema and synchronization behavior are documented in
  [backend-schema.md](architecture/backend-schema.md) and
  [BACKEND.md](BACKEND.md).

## Claims to Avoid

Do not claim:

- That the final Windows or Android interface has shipped.
- Production user counts, uptime, throughput, or cost savings that have not
  been measured.
- That the system is end-to-end encrypted.
- That it is a ReadEra fork or uses ReadEra source code.
- That it supports iOS, macOS, Linux, web, Kindle, or Kobo.
- That the current in-memory rate limiter supports multiple API replicas.
- That public launch operations are complete before secrets are rotated and
  authenticated live flows are exercised.
