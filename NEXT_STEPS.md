# Next Steps

The backend is live. The next goal is to make the product visible by completing
the Windows vertical slice before starting Android product work.

## 1. Finish Windows API Contract Generation

Complete the existing uncommitted Phase 2 Task 1 work:

- Keep `openapi-typescript` isolated in `tools/openapi-codegen`.
- Generate `apps/windows/src/common/simpleCloud/api.types.ts` from the checked
  in OpenAPI document.
- Keep a contract test that proves important routes and schemas exist.
- Wire generation into the appropriate Windows and CI scripts.

Acceptance:

```powershell
npm run generate:simple-cloud-api --workspace=apps/windows
npm run testFile --workspace=apps/windows -- test/simpleCloud/apiContract.test.ts
npm run build:dev:main --workspace=apps/windows
```

The generated file must be reproducible and the task must be committed without
unrelated formatting or upstream refactors.

## 2. Establish the Windows Product Shell

Before changing visible screens:

- Create or update `PRODUCT.md`.
- Create or update `DESIGN.md`.
- Use the approved Impeccable/design workflow.
- Define the Quiet Bookshelf shell, spacing, typography, focus behavior, empty
  state, import entry point, and compact reading controls.

Acceptance:

- The first-run view is a simple bookshelf, not Thorium onboarding or catalog
  browsing.
- Essential actions work with mouse, keyboard, and touch.
- No secret-dependent backend work is required to open the local shell.

## 3. Managed Local Import

Implement EPUB import into application-managed storage:

- Copy the selected file into managed local storage.
- Calculate SHA-256.
- Store local book metadata.
- Render the imported cover in Quiet Bookshelf.
- Open the book through the existing Readium reader path.

Acceptance:

- The original source file can move or disappear after import.
- Restarting the app preserves the book.
- Importing the same bytes does not create an accidental duplicate.

## 4. Windows Authentication

Connect the Windows client to:

- `POST /v1/auth/magic-link`
- `POST /v1/auth/redeem`
- `POST /v1/auth/refresh`
- `POST /v1/auth/sign-out`

Store refresh credentials with the Windows secure credential mechanism. Keep
access tokens in memory and refresh them when needed.

Acceptance:

- A user can request and redeem a test login.
- Restarting the app restores a valid session without storing plaintext secrets
  in ordinary preferences.
- Signing out invalidates the active refresh session.

## 5. Book File Synchronization

Implement reserve, upload, complete, download, and delete using the generated
API types:

1. Reserve the upload.
2. Upload directly to the signed storage URL.
3. Confirm completion.
4. Download directly from a signed URL on another Windows installation.
5. Distinguish remove-local, remove-cloud-file, and delete-everywhere actions.

Acceptance:

- Permanent bucket credentials never enter the client.
- Failed transfers can retry safely.
- Quota and file-size errors have understandable UI.

## 6. Progress and Highlights

Add the local mutation queue and pull cursor:

- Reading progress.
- Four highlight roles.
- Optional highlight notes.
- Bookmarks and collections as the plan reaches them.
- Conflict and tombstone handling from the shared protocol.

Acceptance:

- Offline changes survive restart.
- Retrying an operation does not duplicate it.
- Progress and highlights appear after signing into another test client.
- A deleted item does not return from stale local data.

## 7. Package and Verify Windows

- Build an unsigned Windows test installer.
- Test install, import, read, restart, offline use, reconnect, and uninstall.
- Verify keyboard navigation and visible focus.
- Record remaining limitations honestly.

Android product implementation begins only after this vertical slice passes.

## Ready-to-Paste Claude Prompt

```text
Continue the Simple Cloud Reader repository as a senior engineer. Start by
reading CLAUDE.md, HANDOFF.md,
docs/superpowers/specs/2026-06-12-simple-cloud-reader-design.md,
NEXT_STEPS.md, and
docs/superpowers/plans/2026-06-12-phase-2-windows-vertical-slice.md.

Inspect git status before editing. There is unfinished Windows Phase 2 Task 1
work for OpenAPI code generation; do not revert or duplicate it. Finish that
task first, using the checked-in OpenAPI schema as authoritative. Run the
targeted generation, contract test, and Windows main-process build, then commit
the coherent Task 1 changes.

Continue the Windows vertical slice task by task. Windows comes before Android.
Keep Thorium/Readium as the Windows rendering foundation, localize additions
behind simpleCloud adapters, and do not refactor unrelated upstream code.
Before visible UI implementation, create or update PRODUCT.md and DESIGN.md
using the Impeccable design workflow. The first screen must be a calm,
cover-first Quiet Bookshelf with shallow navigation and visible keyboard focus.

Never expose or commit Railway, database, storage, Resend, JWT, cursor, token,
or signed-URL secrets. Use test-first focused changes and report verification
evidence, remaining risks, and exact files changed after each task.
```
