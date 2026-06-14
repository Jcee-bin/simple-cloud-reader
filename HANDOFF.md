# Simple Cloud Reader Handoff

- **Last updated:** 2026-06-13
- **Repository:** https://github.com/Jcee-bin/simple-cloud-reader
- **Working branch:** `phase-0-technical-foundation`
- **Pull request:** https://github.com/Jcee-bin/simple-cloud-reader/pull/1
- **Live API:** https://simple-cloud-reader-production.up.railway.app

## Read This First

Public and continuation documents:

- `README.md`: concise project landing page and current status.
- `docs/BACKEND.md`: detailed human explanation of every backend subsystem.
- `docs/API.md`: endpoint catalog, authentication, limits, and errors.
- `docs/architecture/backend-schema.md`: deployment, ER, and flow diagrams.
- `docs/PORTFOLIO.md`: truthful resume bullets and interview talking points.
- `CLAUDE.md`: repository rules for a coding agent.
- `NEXT_STEPS.md`: Windows-first milestones and ready-to-paste Claude prompt.

Simple Cloud Reader is a source-available, ReadEra-inspired reader with a calm
library UI and automatic cloud synchronization. It is not a ReadEra code fork.

The supported product targets are:

1. One Android application responsive across phones and tablets.
2. One Windows desktop application.

There is no iOS, macOS, Linux, web, Kindle, or Kobo client in scope.

The user strongly prefers:

- Simple navigation and low cognitive load.
- A cover-first library rather than a file browser.
- Offline reading on every supported device.
- Cloud synchronization that stays mostly invisible.
- Four highlight roles with optional notes.
- Practical progress updates in plain language.

Do not call this three separate products. It is one product delivered through
an Android app and a Windows app, used across three device classes: phone,
tablet, and Windows computer.

## Product Architecture

### Android

Android derives from KOReader at pinned revision:

```text
5598a6ee4488bf88fd0ab15b24dce2cdee61d508
```

Retain KOReader rendering engines, broad format support, and reading
capabilities. Replace its file-browser-first experience with a managed visual
library and simplified controls.

### Windows

Windows derives from Thorium Reader / Readium Desktop at pinned revision:

```text
c19a45f1cc2d352c88952e8da4f1794d9dfe6c29
```

KOReader is not the Windows foundation. Thorium already provides the correct
Electron, Readium, Windows installer, import, and locator infrastructure.

### Backend

The backend is TypeScript on Railway:

- Node.js
- Fastify
- PostgreSQL 16
- Drizzle ORM and migrations
- Railway S3-compatible Storage Bucket
- JWT access tokens
- Rotating hashed refresh tokens
- Resend magic-link email
- Zod validation
- Generated OpenAPI 3.1
- Vitest and GitHub Actions

PostgreSQL stores accounts, book metadata, sync state, progress, highlights,
notes, bookmarks, collections, receipts, history, and tombstones. The Railway
bucket stores EPUB/PDF and other large book files.

## Approved Product Behavior

The complete product specification is:

```text
docs/superpowers/specs/2026-06-12-simple-cloud-reader-design.md
```

Key decisions:

- App opens directly to **Library**.
- No permanent bottom navigation in the MVP.
- Main places are Library, Reading, and Settings.
- Import copies files into app-managed private storage and leaves the source
  untouched.
- Book files synchronize through short-lived signed URLs.
- Android and Windows maintain local libraries and mutation queues for offline
  use.
- Progress, highlights, notes, bookmarks, collections, and metadata sync.
- Deletes create tombstones so stale offline devices cannot resurrect content.

### Highlights

Exactly four roles:

| Color  | Role      |
| ------ | --------- |
| Yellow | Important |
| Blue   | Question  |
| Pink   | Quote     |
| Green  | Review    |

Highlights have stable IDs, selected text, prefix/suffix context, canonical
locator, role, optional note, timestamps, and originating device.

### Sync Conflict Rules

- Separate entities merge independently.
- Concurrent edits to the same highlight note use server acceptance order.
- The overwritten note is retained in `entity_history`.
- Latest intentional progress is accepted by server order.
- A backward progress jump greater than 10 percentage points within 24 hours
  returns a structured conflict containing both locators.
- Deleted entities cannot be resurrected by stale mutations.
- Operation IDs are idempotent; duplicate requests return the stored result.

## Backend Status

The backend implementation is code-complete for the approved small public
beta, and it is live on Railway.

### Implemented

- Single-use magic-link request and redemption.
- Short-lived JWT access tokens.
- Rotating refresh tokens with replay-family revocation.
- Bearer authentication and active-device validation.
- PostgreSQL migrations for 15 core tables.
- Private per-user object keys.
- Signed upload and download URLs.
- Upload completion verified using object metadata.
- Per-user SHA-256 file deduplication without cross-user disclosure.
- Transactional idempotent sync push.
- Signed, user-scoped, ordered sync cursors.
- Pull pagination capped at 500 changes.
- Push batches capped at 100 operations.
- Books, memberships, files, progress, highlights, bookmarks, collections,
  collection memberships, history, receipts, and tombstones.
- Cascading book deletion tombstones all owned reading state.
- Same-note recovery history.
- Backward-progress conflict payload.
- OpenAPI parity and deterministic generated schema.
- Dependency-aware liveness and readiness endpoints.
- Account deletion that removes bucket objects before cascading the user row.
- Expired authentication artifact maintenance command.
- Structured production logs with credential redaction.
- One MiB JSON body limit, request timeouts, and security headers.
- Bounded IP and per-user rate limits.
- 250 MiB maximum individual file.
- Transactionally serialized 2 GiB active/pending storage quota per user.
- Backup, restore, monitoring, spending-limit, and launch documentation.

### Live Railway Deployment

Railway project components:

- API service: `simple-cloud-reader`
- PostgreSQL service: currently named similar to `Postgres-eWaH`
- Storage bucket: `reader-books`
- Deployment region: Southeast Asia / Singapore
- Connected branch: `phase-0-technical-foundation`
- Config-as-code path: `/infra/railway/railway.json`
- Public domain target port: `8080`

Verified live:

```text
GET https://simple-cloud-reader-production.up.railway.app/health/ready
HTTP 200
```

Response:

```json
{
  "status": "ready",
  "components": {
    "database": "ready",
    "objectStore": "ready"
  }
}
```

Railway injects `PORT=8080` in this deployment. Do not hard-code port 3000 in
the public-domain target.

### Railway Variables

These names must exist on the API service. Never place their values in source,
chat, screenshots, client builds, or logs.

```text
DATABASE_URL
JWT_SECRET
CURSOR_SECRET
PUBLIC_APP_URL
RESEND_API_KEY
AUTH_FROM_EMAIL
S3_ENDPOINT
S3_REGION
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
S3_BUCKET
S3_FORCE_PATH_STYLE
MAX_FILE_BYTES
MAX_USER_STORAGE_BYTES
```

Current non-secret settings:

```text
PUBLIC_APP_URL=https://simple-cloud-reader-production.up.railway.app
S3_FORCE_PATH_STYLE=true
MAX_FILE_BYTES=262144000
MAX_USER_STORAGE_BYTES=2147483648
```

`DATABASE_URL` references the current Singapore PostgreSQL service.
The five S3 variables reference the `reader-books` bucket.

### Security Follow-up

During guided setup, `JWT_SECRET` and `CURSOR_SECRET` appeared in a screenshot.
The user chose to continue. Rotate both Railway variables before sharing the
service publicly or onboarding real users.

The in-process rate limiter is correct only for the current one-replica
deployment. Replace it with shared Redis or PostgreSQL-backed limiting before
running multiple API replicas.

### Backend Verification

Latest backend hardening commit:

```text
3513cbc04 feat(api): harden backend for public beta
```

Conflict semantics commit:

```text
50d7ca781 feat(sync): complete conflict resolution semantics
```

Authoritative CI run:

```text
https://github.com/Jcee-bin/simple-cloud-reader/actions/runs/27470211525
```

All jobs passed:

- `contract-and-api`
- `android-locator`
- `windows-locator`

Useful local commands:

```powershell
npm run build --workspace=@simple-cloud-reader/sync-contract
npm run test --workspace=@simple-cloud-reader/sync-contract
npm run typecheck --workspace=@simple-cloud-reader/sync-contract

npm run test --workspace=@simple-cloud-reader/api
npm run typecheck --workspace=@simple-cloud-reader/api
npm run build --workspace=@simple-cloud-reader/api
npm run db:check --workspace=@simple-cloud-reader/api
```

PostgreSQL-only tests run in CI through `TEST_DATABASE_URL`.

### Remaining Live Backend Proof

Readiness is verified live. Still perform before declaring the complete
production launch checklist closed:

1. Request and redeem a real magic link using the configured Resend account.
2. Exercise one authenticated signed upload, completion, download, and delete.
3. Delete a disposable account and confirm its rows and bucket objects vanish.
4. Rotate the exposed JWT and cursor secrets.
5. Configure Railway usage alerts and a spending limit.
6. Configure a daily maintenance run or run it operationally:

```powershell
npm run build --workspace=@simple-cloud-reader/api
npm run maintenance --workspace=@simple-cloud-reader/api
```

`onboarding@resend.dev` is acceptable for early testing but normally only
sends to the email address associated with the Resend account. Public email
login requires a verified sender domain.

## Repository State

Current branch:

```text
phase-0-technical-foundation
```

The default `main` branch was initially docs-only. Railway must remain on
`phase-0-technical-foundation` until this branch is merged or the default
branch is updated.

### Important Dirty Worktree Warning

There is unfinished, uncommitted Windows API-code-generation work:

```text
M  .github/workflows/phase-0.yml
M  apps/windows/package.json
M  docs/superpowers/plans/2026-06-12-phase-2-windows-vertical-slice.md
M  package.json
M  package-lock.json
?? apps/windows/src/common/simpleCloud/api.types.ts
?? apps/windows/test/simpleCloud/apiContract.test.ts
?? tools/
```

These edits were started before backend hardening and intentionally kept out of
backend commits. Do not discard them. Review and complete them as Windows Phase
2 Task 1.

The generated API approach isolates `openapi-typescript` and TypeScript 5.9
under `tools/openapi-codegen` because Thorium currently uses TypeScript 6 and
has peer-version conflicts.

Targeted generation/test/build worked during exploration. Broad upstream
Thorium typechecks are noisy due to existing upstream TypeScript 6/ESM issues;
use the targeted checks specified in the Windows plan.

## What to Do Next

The visible app is not built yet. The user has not seen the reader UI because
most completed work is backend and shared foundation.

Use `NEXT_STEPS.md` as the operational checklist and `CLAUDE.md` as the agent
rules. Do not reconstruct the sequence from this handoff alone.

Recommended next sequence:

1. Finish and commit Windows Phase 2 Task 1, the generated API contract.
2. Implement the Windows vertical slice from the existing detailed plan.
3. Produce and visually verify the Quiet Bookshelf library.
4. Add secure Windows authentication, managed EPUB import, upload/download,
   progress, and highlight sync.
5. Package an unsigned Windows test installer.
6. Build the Android vertical slice against KOReader.
7. Complete shared UI, offline recovery, accessibility, formats, and releases.

Windows plan:

```text
docs/superpowers/plans/2026-06-12-phase-2-windows-vertical-slice.md
```

Overall roadmap:

```text
docs/superpowers/plans/2026-06-12-simple-cloud-reader-roadmap.md
```

Backend plan and hardening design:

```text
docs/superpowers/plans/2026-06-12-phase-1-backend-sync-core.md
docs/superpowers/specs/2026-06-13-backend-production-hardening-design.md
docs/superpowers/plans/2026-06-13-backend-production-hardening.md
```

Architecture references:

```text
docs/architecture/sync-protocol.md
docs/architecture/threat-model.md
docs/spikes/phase-0-results.md
docs/spikes/phase-1-results.md
```

## UI Direction

Before implementing visual screens, use the Impeccable/design workflow and
produce `PRODUCT.md` and `DESIGN.md`.

Design principles:

- Quiet warm-neutral visual system.
- Covers provide most color.
- No decorative gradients, glass effects, or heavy card shadows.
- Shallow navigation.
- 48 dp minimum Android touch targets.
- Visible keyboard focus on Windows.
- No hover-only essential actions.
- Tablet layouts must expose touch-visible actions.
- Clear distinction among remove local download, remove cloud file, and delete
  everywhere.

The intended Windows first screen is **Quiet Bookshelf**, not Thorium
onboarding, OPDS, or catalog browsing.

## Licensing

- KOReader derivative: AGPL-3.0 obligations apply.
- Thorium derivative: preserve BSD-3-Clause notices and attribution.
- Do not copy ReadEra source, branding, icons, screenshots, or assets.
- Keep per-component licenses and perform a dependency/asset license review
  before public distribution.

## Rules for the Next LLM

1. Read the approved product spec and current phase plan before editing.
2. Treat the live backend contract and checked-in OpenAPI document as
   authoritative.
3. Do not rewrite or replace working upstream engines.
4. Keep product additions localized behind `simpleCloud` adapters.
5. Do not revert the uncommitted Windows Task 1 work.
6. Use test-first changes and targeted verification.
7. Keep Android phone and tablet as one responsive Android app.
8. Never expose Railway, Resend, JWT, cursor, database, or bucket credentials.
9. Verify mobile/touch behavior on an emulator or physical Android device.
10. Explain progress to the user in simple terms and distinguish backend work
    from visible app work.
