# Backend Architecture and Schema

## Deployment

```mermaid
flowchart TB
    subgraph Clients["Untrusted client boundary"]
        Android["Android phone/tablet<br/>KOReader derivative"]
        Windows["Windows desktop<br/>Thorium/Readium derivative"]
    end

    subgraph Railway["Railway - Singapore"]
        Edge["Railway public edge"]
        API["Fastify API<br/>one stateless replica"]
        PG[("PostgreSQL 16")]
        Bucket[("Private S3-compatible bucket")]
        Edge --> API
        API --> PG
        API --> Bucket
    end

    Resend["Resend email API"]

    Android -->|HTTPS JSON| Edge
    Windows -->|HTTPS JSON| Edge
    API -->|magic-link request| Resend
    Android -. short-lived signed URL .-> Bucket
    Windows -. short-lived signed URL .-> Bucket
```

Permanent credentials exist only in Railway variables. Clients receive
short-lived JWTs, opaque refresh tokens, and temporary signed object URLs.

## Database ER Diagram

```mermaid
erDiagram
    USERS ||--o{ DEVICES : registers
    USERS ||--o{ REFRESH_SESSIONS : owns
    USERS ||--o{ BOOKS : owns
    USERS ||--o{ LIBRARY_MEMBERSHIPS : owns
    USERS ||--o{ FILE_OBJECTS : owns
    USERS ||--o{ READING_POSITIONS : owns
    USERS ||--o{ HIGHLIGHTS : owns
    USERS ||--o{ BOOKMARKS : owns
    USERS ||--o{ COLLECTIONS : owns
    USERS ||--o{ COLLECTION_MEMBERSHIPS : owns
    USERS ||--o{ MUTATION_RECEIPTS : deduplicates
    USERS ||--o{ CHANGE_LOG : receives
    USERS ||--o{ ENTITY_HISTORY : recovers

    DEVICES ||--o{ REFRESH_SESSIONS : authenticates
    DEVICES ||--o{ CHANGE_LOG : originates

    BOOKS ||--o{ LIBRARY_MEMBERSHIPS : appears_in
    BOOKS ||--o{ FILE_OBJECTS : stores
    BOOKS ||--o{ READING_POSITIONS : tracks
    BOOKS ||--o{ HIGHLIGHTS : contains
    BOOKS ||--o{ BOOKMARKS : contains
    BOOKS ||--o{ COLLECTION_MEMBERSHIPS : grouped_by

    COLLECTIONS ||--o{ COLLECTION_MEMBERSHIPS : contains

    USERS {
        uuid id PK
        text normalized_email UK
        timestamp deleted_at
    }
    DEVICES {
        uuid id PK
        uuid user_id FK
        text name
        text platform
        timestamp last_seen_at
    }
    MAGIC_LINKS {
        uuid id PK
        text normalized_email
        text token_hash UK
        text requested_ip_hash
        timestamp expires_at
        timestamp used_at
    }
    REFRESH_SESSIONS {
        uuid id PK
        uuid user_id FK
        uuid device_id FK
        uuid family_id
        text token_hash
        timestamp expires_at
        timestamp revoked_at
        uuid replaced_by_id
    }
    BOOKS {
        uuid id PK
        uuid user_id FK
        text title
        jsonb authors
        text format
        int version
        timestamp deleted_at
    }
    LIBRARY_MEMBERSHIPS {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        text state
        int version
        timestamp deleted_at
    }
    FILE_OBJECTS {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        text sha256
        text object_key UK
        bigint byte_size
        text state
        int version
        timestamp deleted_at
    }
    READING_POSITIONS {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        jsonb locator
        int version
        timestamp deleted_at
    }
    HIGHLIGHTS {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        jsonb locator
        text selected_text
        text color_role
        text note
        int version
        timestamp deleted_at
    }
    BOOKMARKS {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        jsonb locator
        text label
        int version
        timestamp deleted_at
    }
    COLLECTIONS {
        uuid id PK
        uuid user_id FK
        text name
        int version
        timestamp deleted_at
    }
    COLLECTION_MEMBERSHIPS {
        uuid id PK
        uuid user_id FK
        uuid collection_id FK
        uuid book_id FK
        int version
        timestamp deleted_at
    }
    MUTATION_RECEIPTS {
        uuid id PK
        uuid user_id FK
        uuid operation_id
        jsonb result
    }
    CHANGE_LOG {
        uuid id PK
        bigint sequence UK
        uuid user_id FK
        text entity_type
        uuid entity_id
        text action
        jsonb payload
        int server_version
        uuid originating_device_id FK
    }
    ENTITY_HISTORY {
        uuid id PK
        uuid user_id FK
        text entity_type
        uuid entity_id
        int version
        jsonb payload
    }
```

`MAGIC_LINKS` is keyed by normalized email before a user necessarily exists,
so it intentionally has no user foreign key.

## Table Dictionary

| Table                    | Responsibility                                        |
| ------------------------ | ----------------------------------------------------- |
| `users`                  | Account identity and soft-deletion state              |
| `devices`                | Registered Android/Windows installations              |
| `magic_links`            | Hashed, expiring, single-use sign-in tokens           |
| `refresh_sessions`       | Rotating hashed refresh tokens and replay families    |
| `books`                  | User-owned bibliographic metadata                     |
| `library_memberships`    | Reading state such as active or archived              |
| `file_objects`           | Private object key, hash, size, type, and readiness   |
| `reading_positions`      | Current canonical location per user/book              |
| `highlights`             | Selection anchors, text context, color role, and note |
| `bookmarks`              | Stable saved reading locations                        |
| `collections`            | User-created organizational groups                    |
| `collection_memberships` | Book-to-collection relationships                      |
| `mutation_receipts`      | Original result for each user/operation UUID          |
| `change_log`             | Ordered per-user stream consumed by sync pull         |
| `entity_history`         | Recoverable prior payloads for same-entity conflicts  |

Most domain tables carry `version`, `created_at`, `updated_at`, and
`deleted_at`. Versions support optimistic sync; deletion timestamps represent
tombstones.

## Magic-Link Authentication

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Fastify API
    participant DB as PostgreSQL
    participant E as Resend

    C->>API: POST /v1/auth/magic-link
    API->>DB: count recent email/IP requests
    API->>DB: store token hash + 15 min expiry
    API->>E: send raw token in redemption URL
    API-->>C: 202 accepted

    C->>API: POST /v1/auth/redeem + device
    API->>DB: lock and consume token hash
    API->>DB: create/find user and register device
    API->>DB: store refresh-token hash
    API-->>C: JWT + opaque refresh token
```

## Signed File Upload

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Fastify API
    participant DB as PostgreSQL
    participant S3 as Private bucket

    C->>API: reserve file metadata
    API->>DB: verify owned book
    API->>DB: lock quota and reserve file row
    API->>S3: sign PUT for server-chosen key
    API-->>C: file ID + signed upload URL
    C->>S3: PUT book bytes directly
    C->>API: complete file with byte size
    API->>S3: HEAD object
    S3-->>API: object exists + size
    API->>DB: mark ready + append change
    API-->>C: ready
```

The API authorizes and tracks the transfer without proxying the large file.

## Sync Push and Pull

```mermaid
sequenceDiagram
    participant A as Device A
    participant API as Sync API
    participant DB as PostgreSQL
    participant B as Device B

    A->>API: push stable operation UUID
    API->>DB: operation + entity advisory locks
    API->>DB: receipt lookup and version validation
    API->>DB: update entity + change log + receipt
    API-->>A: accepted / duplicate / conflict

    B->>API: pull after signed cursor
    API->>DB: ordered user changes after sequence
    API-->>B: changes + new cursor + hasMore
    Note over B: save cursor only after local commit
```

## Book Deletion

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Sync API
    participant DB as PostgreSQL

    C->>API: delete book mutation
    API->>DB: validate base version and ownership
    API->>DB: tombstone memberships and files
    API->>DB: tombstone progress, highlights, bookmarks
    API->>DB: tombstone collection memberships
    API->>DB: append one ordered change per entity
    API->>DB: tombstone book + store receipt
    API-->>C: accepted with new version
```

An offline device later pulls every tombstone and removes local state instead
of recreating the book.

## Trust Boundaries

| Boundary          | Trusted information                                              |
| ----------------- | ---------------------------------------------------------------- |
| Client to API     | Nothing until schema, bearer token, user, and device checks pass |
| API to PostgreSQL | Parameterized typed queries and server-generated IDs             |
| API to bucket     | Server-owned credentials and object keys                         |
| Signed URL holder | Temporary permission only for one object/action                  |
| Railway variables | Database, JWT, cursor, Resend, and bucket secrets                |
| Logs              | Structured metadata with credentials redacted                    |

Clients are allowed to be offline and potentially modified by their owners.
The server therefore enforces ownership, versions, object keys, quotas, and
device identity independently of client behavior.
