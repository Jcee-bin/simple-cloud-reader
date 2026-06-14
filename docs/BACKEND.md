# How the Backend Works

This guide explains the Simple Cloud Reader backend as a system rather than a
list of libraries. The backend is the shared coordinator that lets a phone,
tablet, and Windows computer agree on the same library without requiring any
one device to stay online.

## The Backend's Job

The backend has five core responsibilities:

1. Prove who a user and device are.
2. Store structured reading data safely.
3. Grant temporary access to private book files.
4. Merge changes made by multiple offline-capable devices.
5. Remain observable and difficult to abuse when exposed publicly.

The API is stateless. Durable state lives in PostgreSQL and the private object
bucket, so the API process can restart without losing a user's library.

## Startup and Configuration

`services/api/src/server.ts` is the composition root. It:

1. Validates environment variables with Zod.
2. Opens the PostgreSQL connection pool.
3. Creates the S3-compatible object-store client.
4. Instantiates authentication, file, sync, and account services.
5. Registers Fastify routes and health checks.
6. Listens on Railway's injected `PORT`.

Invalid or missing configuration prevents startup. This is intentional: a
server should fail immediately instead of running with a missing secret,
unprotected route, or wrong storage bucket.

Important configuration includes:

- `DATABASE_URL`: PostgreSQL connection.
- `JWT_SECRET`: signs short-lived access tokens.
- `CURSOR_SECRET`: signs synchronization cursors independently.
- `RESEND_API_KEY` and `AUTH_FROM_EMAIL`: magic-link delivery.
- `S3_*`: private bucket connection.
- `MAX_FILE_BYTES`: individual upload ceiling.
- `MAX_USER_STORAGE_BYTES`: per-account storage quota.

## Fastify: The HTTP Boundary

Fastify receives requests, runs validation and authentication hooks, calls the
appropriate service, and serializes the response.

The server applies shared protections before business logic:

- One MiB JSON request-body limit.
- Ten-second connection timeout.
- Fifteen-second request timeout.
- Trusted proxy awareness for Railway.
- Security headers that disable framing, content sniffing, and unnecessary
  browser capabilities.
- Bounded fixed-window rate limiting.

Route modules remain thin. They parse input, obtain the authenticated identity,
and call a service. Database and storage behavior stays out of route handlers,
which makes it easier to test and change.

## PostgreSQL and Drizzle

PostgreSQL is the durable source of truth for structured data. Drizzle provides
typed queries and checked-in SQL migrations.

The schema is deliberately normalized:

- A user can own several registered devices.
- Book metadata is separate from library membership and physical file state.
- Reading positions, highlights, bookmarks, and collections are independently
  versioned sync entities.
- The change log records ordered events without replacing domain tables.
- Mutation receipts remember operation results for idempotency.
- Entity history preserves overwritten note content for recovery.

Transactions are used wherever several writes must succeed together. For
example, accepting a sync mutation updates the entity, appends a change-log
entry, and stores the operation receipt atomically. A crash cannot leave only
half of that result committed.

See [architecture/backend-schema.md](architecture/backend-schema.md) for the ER
diagram and table dictionary.

## Passwordless Authentication

### Requesting a magic link

The client sends an email to `POST /v1/auth/magic-link`.

The backend:

1. Normalizes and validates the email.
2. Hashes the request IP before storing it.
3. Counts recent requests by email and IP.
4. Silently stops if a limit is exceeded.
5. Generates a cryptographically random opaque token.
6. Stores only its SHA-256 hash with a 15-minute expiration.
7. Emails the raw token inside a redemption link through Resend.
8. Always returns the same neutral accepted response.

The neutral response avoids revealing whether an account already exists.

### Redeeming the link

The client sends the token and device information to
`POST /v1/auth/redeem`.

PostgreSQL locks the magic-link row, verifies that it exists, is unused, and
has not expired, then marks it consumed. The backend creates or finds the user,
registers the device, and returns:

- A 15-minute JWT access token.
- A 30-day opaque refresh token.
- Basic user information.

Only the hash of the refresh token is stored in PostgreSQL.

### Access-token checks

Protected routes require `Authorization: Bearer <token>`.

The authentication hook verifies:

- HS256 signature.
- Expected issuer and audience.
- Expiration.
- User ID in the subject claim.
- Device ID claim.
- That the device still belongs to an active user.

Deleting the user or device therefore invalidates future protected requests
even if an old JWT has not reached its expiry time.

### Refresh-token rotation

Every successful refresh replaces the presented token. The old session records
which new session replaced it.

If an already-used refresh token appears again, the backend treats it as a
possible stolen-token replay and revokes the entire token family. This limits
the value of copied credentials.

## Private Book File Storage

Book files do not travel through the API server. Railway's bucket implements
the S3 protocol, allowing the backend to issue short-lived signed capabilities.

### Reserving an upload

The client first creates the book record through sync, then calls:

```text
POST /v1/books/{bookId}/files
```

The backend verifies:

- The book belongs to the authenticated user.
- The declared metadata is valid.
- The file is no larger than 250 MiB.
- Active and pending storage will remain below 2 GiB for the user.

The quota calculation runs under a PostgreSQL advisory lock keyed by user.
Two simultaneous upload reservations cannot both observe stale free space and
push the account above quota.

The server creates an object key shaped like:

```text
users/{userId}/books/{bookId}/files/{fileId}/{sha256}
```

Clients cannot choose arbitrary object keys. The response contains a signed
upload URL that expires after approximately 15 minutes.

### Completing an upload

Uploading bytes does not automatically mark the database record ready. The
client calls:

```text
POST /v1/files/{fileId}/complete
```

The backend performs a bucket `HEAD` request and verifies that the object
exists with the expected byte length. Only then does it mark the file ready and
publish the change for other devices.

This prevents a client from claiming that a missing or truncated upload is
available.

### Downloading and deleting

Ready files receive short-lived signed download URLs. Permanent bucket
credentials never enter the clients.

File deletion is idempotent: removing a nonexistent S3 object is safe, and the
database records a tombstone so other devices learn that cloud availability
was removed.

Deduplication uses SHA-256 only within one user account. The system does not
perform global deduplication because that could reveal whether another user
owns a particular file.

## Offline-First Synchronization

The sync protocol separates **domain state** from an ordered **change stream**.

Clients create mutations while offline. Each mutation contains:

- Stable operation UUID.
- Entity type and entity UUID.
- `upsert` or `delete`.
- Base server version.
- Client timestamp.
- Typed entity payload.

### Push

`POST /v1/sync/push` accepts up to 100 operations.

For every operation, the backend:

1. Acquires a PostgreSQL advisory lock for the operation ID.
2. Looks for an existing mutation receipt.
3. Returns the stored result as `duplicate` when retrying.
4. Acquires an entity-level lock.
5. Verifies ownership, entity version, and deletion state.
6. Applies the mutation or creates a typed business conflict.
7. Increments the server entity version.
8. Appends one ordered change-log row.
9. Stores the complete operation result.

Steps 5-9 occur in a transaction. Network retries can safely reuse the same
operation ID without applying the change twice.

### Pull

`GET /v1/sync/pull` returns at most 500 ordered changes after a signed cursor.

A cursor contains a user ID and change sequence, authenticated with
`CURSOR_SECRET`. The server verifies its signature and user binding before
querying. A user cannot edit a cursor to read another account's stream.

Clients should apply one page in a local transaction and save the returned
cursor only after every change commits. If local application fails, the client
reuses the old cursor and receives the same page.

## Conflict Handling

Conflicts are normal data responses, not server crashes.

### Independent entities

Different highlight IDs, bookmarks, and collections merge without affecting
one another.

### Concurrent note edits

Two devices can edit the note on the same highlight from one base version.
The later server-accepted note becomes current. Before overwriting, the backend
saves the previous complete highlight payload in `entity_history`.

This is last-write-wins without silently discarding the losing note.

### Reading progress

Intentional progress events use server acceptance order, even when a client
started from a stale version.

If a new position would move the reader backward by more than ten percentage
points and the current position was updated within 24 hours, the operation
returns `backward_progress` with both canonical locators. The client can ask
which position the user wants instead of silently moving them.

### Stale resurrection

A stale update cannot overwrite a tombstone. The operation receives a version
conflict containing the current server version.

## Deletion and Tombstones

Sync deletion does not immediately erase the fact that an entity existed.
The domain row receives `deleted_at`, its version increments, and the change log
publishes a deletion event.

When a book is deleted, the transaction tombstones:

- Library membership.
- File metadata.
- Reading position.
- Highlights.
- Bookmarks.
- Collection memberships.
- The book itself.

Every child deletion is published so offline devices can remove their local
state. Tombstones are retained long enough to prevent old clients from
reintroducing deleted content.

## Account Deletion

`DELETE /v1/account` is authenticated and heavily rate-limited.

The service:

1. Lists every bucket object owned by the user.
2. Deletes those objects idempotently.
3. Deletes the PostgreSQL user row.
4. Relies on foreign-key cascades to remove sessions, devices, books, sync
   records, receipts, and history.

Object deletion happens first. If storage deletion fails, the account remains
in PostgreSQL and the operation can be retried rather than reporting a false
success while leaving paid private data behind.

## Abuse and Cost Controls

Current single-replica rate policies:

| Scope                | Limit                  |
| -------------------- | ---------------------- |
| Magic-link request   | 20 per IP / 15 minutes |
| Magic-link redeem    | 30 per IP / 15 minutes |
| Refresh and sign-out | 60 per IP / 15 minutes |
| File routes          | 60 per user / minute   |
| Sync push            | 120 per user / minute  |
| Sync pull            | 120 per user / minute  |
| Account deletion     | 3 per user / hour      |

The limiter keeps at most 10,000 identities in process memory. This is suitable
for the current one-replica small launch. Multiple replicas require shared
limiter storage such as Redis or PostgreSQL.

Storage and request controls:

- One MiB API body limit.
- 250 MiB maximum file.
- 2 GiB active and pending storage per user.
- At most 100 sync operations per push.
- At most 500 changes per pull.

## Health, Logs, and Maintenance

Health routes serve different purposes:

- `/health`: basic compatibility endpoint.
- `/health/live`: proves the process responds.
- `/health/ready`: checks PostgreSQL and the bucket.

Railway routes traffic only after readiness succeeds.

Production logging is structured JSON. Authorization headers, magic-link
tokens, and refresh tokens are redacted. Readiness errors reveal component
names but never connection strings or credentials.

The maintenance command deletes expired magic links and old expired/revoked
refresh sessions:

```powershell
npm run maintenance --workspace=@simple-cloud-reader/api
```

## Deployment and CI

Railway runs:

1. `npm ci`
2. Shared contract build.
3. API build.
4. Database migrations as a pre-deploy command.
5. The compiled server.
6. `/health/ready` as the deployment health check.

GitHub Actions starts PostgreSQL 16 and verifies:

- Shared contract tests and deterministic OpenAPI.
- API unit, integration, and end-to-end tests.
- TypeScript typechecks.
- Production builds.
- Migration consistency.
- Android and Windows canonical locator adapters.

The live service currently runs in Singapore:

```text
https://simple-cloud-reader-production.up.railway.app
```

## Design Tradeoffs

### Why two rendering engines?

KOReader is strong on Android but is not the right native Windows base.
Thorium/Readium already supports Windows packaging and Readium locators. A
shared sync contract provides product consistency without pretending unrelated
engines are identical.

### Why PostgreSQL instead of a document database?

The system needs transactions, unique idempotency constraints, ordered
sequences, row locks, ownership joins, and relational cascades. PostgreSQL
matches those requirements directly.

### Why direct object transfers?

Routing large EPUB/PDF bytes through the API would consume memory, bandwidth,
and compute. Signed URLs let clients transfer directly while the API retains
authorization and metadata control.

### Why server acceptance order?

Device clocks are not trustworthy. Server acceptance order gives deterministic
conflict behavior while client timestamps remain useful context.

## Further Reading

- [API endpoint guide](API.md)
- [Backend schema and flows](architecture/backend-schema.md)
- [Sync protocol](architecture/sync-protocol.md)
- [Threat model](architecture/threat-model.md)
- [Railway operations](../infra/railway/README.md)
- [OpenAPI document](../packages/sync-contract/openapi/simple-cloud-reader-v1.json)
