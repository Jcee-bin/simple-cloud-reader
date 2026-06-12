# Sync protocol

The API is the authoritative merge point; each client keeps an offline local
database and exchanges typed mutations and ordered changes.

## Push transaction

For each authenticated user and device, the server:

1. Acquires the operation lock and checks the mutation receipt.
2. Returns the stored result when the operation ID is a retry.
3. Validates entity ownership, base version, and deletion state.
4. Applies the mutation or records a typed conflict.
5. Appends an ordered change, stores the receipt, and commits atomically.

Operation IDs make retries idempotent. A client must reuse the same operation
ID after a timeout; creating a new ID represents a new intent.

## Pull and cursors

Cursors are opaque, signed, and scoped to one user. The signature and user
binding are verified before reading changes. Pull results are ordered by the
server sequence and limited to 500 changes per page.

Clients apply a page in one local transaction. They advance their saved cursor
only after every change in that page commits locally. If a page fails, they
retry from the previous cursor. A response with `hasMore` must be followed
until the server reports no remaining changes.

## Conflicts

Progress accepts a newer valid update and rejects stale base versions with the
current server entity. Highlights, bookmarks, and other versioned records use
the same explicit conflict result. Conflict responses are data, not transport
failures, so clients can preserve local work and offer recovery.

Concurrent note edits must retain enough history for a later recovery UI. The
server never silently discards a losing note body.

## Deletions

Deletion appends a tombstone rather than erasing sync history. A tombstone
prevents an offline client from recreating an entity with an older version.
Deleting a book also emits deletion changes for its user-owned relationships,
file metadata, progress, highlights, bookmarks, and collection membership.

Managed file state is server-owned. Clients use file reservation, completion,
download, and deletion routes; they cannot push `fileObject` mutations through
the generic sync endpoint.
