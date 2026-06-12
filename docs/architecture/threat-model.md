# Threat model

The service protects private reading files, library metadata, progress,
highlights, bookmarks, and account credentials. PostgreSQL, the private object
bucket, email provider, and Railway environment variables are trusted server
components. Android and Windows clients are untrusted at the API boundary.

## Authentication

- Magic links expire quickly, are single-use, and must be redeemed over HTTPS.
  Email compromise or link interception can still grant access, so redemption
  should notify the user and avoid placing tokens in logs or analytics.
- Login requests return a neutral response to reduce user enumeration.
- Access tokens are short-lived. Refresh tokens rotate, and replay revokes the
  token family. Clients store refresh tokens in OS-protected credential stores.
- Every protected route verifies the bearer token, user, and registered device.

## Tenant and file isolation

- Every query, cursor, mutation receipt, object key, and signed URL is scoped to
  the authenticated user. Content hashes are never globally searchable because
  that could disclose whether another user owns a particular book.
- Upload and download URLs are short-lived capabilities. Anyone holding a
  leaked URL can use it until expiry, so URLs must not enter logs, telemetry,
  clipboard history, or crash reports.
- Clients cannot choose arbitrary object keys. The server creates user-scoped
  keys and verifies uploaded size before marking a file ready.

## Replay, conflicts, and deletion

- Signed cursors prevent clients from forging another user's change position.
- Operation receipts make network retries safe while preserving the original
  result. Reusing an operation ID for different content is rejected.
- Tombstones and version checks stop stale offline devices from resurrecting
  deleted records. Conflict history preserves recoverable note text.
- Account deletion must revoke sessions, tombstone or remove user records, and
  delete every user-scoped object. Partial deletion must be observable and
  retryable rather than reported as complete.

## Operations

- Readiness responses expose component names only. Errors, connection strings,
  tokens, object keys, signed URLs, and email links are redacted from logs.
- Secrets live only in Railway variables or local ignored environment files.
  They never belong in Git, mobile resources, desktop installers, generated
  clients, screenshots, or support tickets.
- Database migrations run before a new deployment receives traffic. Backups and
  restore procedures remain required before production use.
