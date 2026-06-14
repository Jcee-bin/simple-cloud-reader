# API Guide

Base URL:

```text
https://simple-cloud-reader-production.up.railway.app
```

The authoritative machine-readable contract is
[`packages/sync-contract/openapi/simple-cloud-reader-v1.json`](../packages/sync-contract/openapi/simple-cloud-reader-v1.json).
The live document is available at `/openapi.json`.

Protected endpoints use:

```http
Authorization: Bearer <access-token>
```

## Health and Contract

| Method | Path            | Auth | Purpose                               |
| ------ | --------------- | ---- | ------------------------------------- |
| `GET`  | `/health`       | No   | Basic process response                |
| `GET`  | `/health/live`  | No   | Liveness probe                        |
| `GET`  | `/health/ready` | No   | PostgreSQL and object-store readiness |
| `GET`  | `/openapi.json` | No   | OpenAPI 3.1 document                  |

`/health/ready` returns `503` if either dependency is unavailable. It names the
failed component without exposing credentials.

## Authentication

### `POST /v1/auth/magic-link`

Requests a passwordless sign-in email.

```json
{
  "email": "reader@example.com"
}
```

Returns `202` with a neutral response:

```json
{ "accepted": true }
```

Rate policy: 20 requests per IP in 15 minutes. The auth service also silently
limits five recent requests per normalized email and 20 per hashed IP.

### `POST /v1/auth/redeem`

Consumes a single-use token and registers a device.

```json
{
  "token": "opaque-token-from-email",
  "deviceId": "93f39cf5-d988-49d9-9cc0-a857d13ac1d6",
  "deviceName": "My Windows PC",
  "platform": "windows"
}
```

Returns an access token, its expiration, a rotating refresh token, and user
identity. Common errors are `invalid_magic_link`, `magic_link_expired`, and
`magic_link_used`.

Rate policy: 30 requests per IP in 15 minutes.

### `POST /v1/auth/refresh`

Rotates a refresh token and returns a fresh session.

```json
{
  "refreshToken": "opaque-refresh-token",
  "deviceId": "93f39cf5-d988-49d9-9cc0-a857d13ac1d6"
}
```

A replayed token revokes its token family and returns
`refresh_token_reused`.

Rate policy: 60 requests per IP in 15 minutes.

### `POST /v1/auth/sign-out`

Revokes one refresh token. Returns `204`.

Rate policy: 60 requests per IP in 15 minutes.

## Managed Files

All file routes require bearer authentication and are limited to 60 requests
per authenticated user per minute.

### `POST /v1/books/{bookId}/files`

Reserves a user-scoped object and returns a signed upload URL.

```json
{
  "sha256": "64-character-lowercase-hex-digest",
  "byteSize": 123456,
  "contentType": "application/epub+zip",
  "originalFileName": "book.epub"
}
```

The book must already exist and belong to the user. The server enforces the
single-file and per-user storage limits.

### `POST /v1/files/{fileId}/complete`

Verifies that the uploaded object exists with the expected byte length, then
marks it ready.

```json
{ "byteSize": 123456 }
```

Common errors: `file_upload_missing`, `file_size_mismatch`, and
`file_not_found`.

### `GET /v1/files/{fileId}/download-url`

Returns a short-lived signed URL for a ready owned file.

Common errors: `file_not_found` and `file_not_ready`.

### `DELETE /v1/files/{fileId}`

Deletes the object and publishes a file tombstone. Returns `204`.

## Synchronization

Sync endpoints require bearer authentication. The device ID inside a push
batch must match the device ID in the access token.

### `POST /v1/sync/push`

Accepts up to 100 typed operations and returns one result per operation.

Operation metadata:

```json
{
  "operationId": "stable-retry-uuid",
  "entityType": "progress",
  "entityId": "entity-uuid",
  "action": "upsert",
  "baseVersion": 1,
  "clientTimestamp": "2026-06-13T12:00:00.000Z",
  "deletedAt": null,
  "payload": {}
}
```

Possible operation statuses:

- `accepted`: mutation committed.
- `duplicate`: operation ID was already processed.
- `conflict`: recoverable business conflict.
- `rejected`: invalid ownership or related entity.

Notable error codes:

- `version_conflict`
- `backward_progress`
- `entity_not_found`
- `related_entity_not_found`
- `managed_file_required`

`backward_progress` includes the current and proposed canonical locators.

Rate policy: 120 requests per user per minute.

### `GET /v1/sync/pull`

Query parameters:

- `cursor`: optional opaque signed cursor.
- `limit`: 1-500, default 500.

Returns:

```json
{
  "cursor": "opaque-signed-cursor",
  "hasMore": false,
  "changes": []
}
```

Changes are ordered by server sequence. A cursor belongs to one user and cannot
be reused across accounts.

Rate policy: 120 requests per user per minute.

## Account

### `DELETE /v1/account`

Requires bearer authentication. Deletes all user-owned bucket objects and then
hard-deletes the user, allowing PostgreSQL cascades to remove dependent state.

Returns `204`.

Rate policy: three attempts per user per hour.

## General Errors and Limits

Typical HTTP responses:

| Status | Meaning                                         |
| ------ | ----------------------------------------------- |
| `400`  | Invalid schema, cursor, or request state        |
| `401`  | Missing, invalid, or expired credentials        |
| `403`  | Authenticated device does not match the request |
| `404`  | Owned entity not found                          |
| `409`  | Business conflict or file/quota mismatch        |
| `413`  | JSON or file size is too large                  |
| `429`  | Rate policy exceeded                            |
| `503`  | Database or object store is unavailable         |

Global limits:

- JSON request body: 1 MiB.
- Individual file: 250 MiB.
- Active/pending files per user: 2 GiB.
- Push operations: 100.
- Pull changes: 500.
