# Frontend Handoff for Claude

## Purpose

Build the complete user-facing Simple Cloud Reader experience for Windows and
Android. This document defines required product behavior, data flows, failure
handling, and review checkpoints. It intentionally does not dictate the visual
design.

Claude owns the visual direction and must create `PRODUCT.md` and `DESIGN.md`
before implementing visible screens. The user reviews each checkpoint before
the next one begins.

## Product Scope

Simple Cloud Reader is one product delivered as:

- A Windows application based on Thorium Reader / Readium Desktop.
- One responsive Android application for phones and tablets based on KOReader.

Windows is implemented and validated first. Android follows the approved
Windows product behavior, adapted for touch and tablet use. Do not build both
clients in parallel.

Not in scope:

- iOS, macOS, Linux, web, Kindle, or Kobo clients.
- A bookstore, OPDS catalog, social features, DRM, OCR, or collaboration.
- Replacing the Readium or KOReader rendering engines.
- Copying ReadEra source, branding, icons, screenshots, or assets.

## Start Here

Read:

1. `CLAUDE.md`
2. `HANDOFF.md`
3. `docs/superpowers/specs/2026-06-12-simple-cloud-reader-design.md`
4. `docs/superpowers/specs/2026-06-14-frontend-functional-handoff-design.md`
5. `NEXT_STEPS.md`
6. `docs/superpowers/plans/2026-06-12-phase-2-windows-vertical-slice.md`
7. `packages/sync-contract/openapi/simple-cloud-reader-v1.json`

Inspect `git status` before editing. Preserve the unfinished Windows API
generation work already in the worktree.

## Answer to the Current Claude Question

For "What should the FIRST frontend slice deliver?", choose:

> **Just the design docs first**

First produce `PRODUCT.md` and `DESIGN.md` through the Impeccable workflow.
After the user approves those documents, implement:

> **Calm shelf over existing data**

Do not combine the first visual slice with managed-storage rework. Prove the
product shell and existing-book opening behavior first.

## Non-Negotiable Product Behavior

- Launch opens to a cover-first Library.
- Opening a cover enters Reading.
- Account and settings are reachable from one clear control.
- Search, filters, collections, annotations, and sync status appear in context,
  not as permanent competing destinations.
- Reading remains usable without an account or network connection.
- Cloud synchronization is automatic and mostly invisible.
- Sync status always has text: `Synced`, `Syncing`, `Offline`, or
  `Needs attention`.
- No error silently loses a book, reading position, highlight, note, bookmark,
  or collection.
- Distinguish:
  - Remove download from this device.
  - Remove the cloud file but retain metadata and reading activity.
  - Delete the book and reading data everywhere.
- Essential actions cannot depend on hover.
- Windows must support keyboard navigation and visible focus.
- Android phone and tablet use one responsive app.

## Shared Frontend State

Both clients need local representations of:

- Current account and registered device.
- Local books and managed file availability.
- Cloud book and file identifiers.
- Reading state: to read, reading, finished, or archived.
- Exact engine locator plus normalized progression.
- Highlights, notes, and bookmarks.
- Collections and collection memberships.
- Pending mutations with stable operation IDs.
- Last successfully committed pull cursor.
- Entity versions and tombstones.
- Current sync status and actionable error information.

Refresh tokens belong in platform-protected storage. Access tokens remain
short-lived and should not be persisted as ordinary settings. Renderer/UI code
must not receive database, bucket, Resend, JWT, cursor, or permanent storage
credentials.

## Checkpoint Rules

At every checkpoint Claude must:

1. Implement only that checkpoint's approved scope.
2. Add focused automated tests.
3. Build the affected client surfaces.
4. Manually exercise the user flows.
5. Report changed files, commands, results, screenshots where relevant, and
   remaining limitations.
6. Stop and ask the user to approve or revise the checkpoint.

Do not begin the next checkpoint until approved.

## Checkpoint 0: Product and Design Contract

### Required work

- Create `PRODUCT.md` describing users, jobs, information architecture,
  terminology, key flows, accessibility, and product boundaries.
- Create `DESIGN.md` describing Claude's chosen visual system and responsive
  behavior.
- Define Windows desktop, narrow-window, Android phone, and Android tablet
  behavior.
- Include empty, loading, offline, syncing, error, and destructive-confirmation
  states.
- Keep the product calm, simple, cover-first, and reading-focused.

### Freedom

Claude may choose typography, palette, spacing, component shapes, imagery,
motion, and responsive composition. The result does not need to imitate
ReadEra visually.

### Gate

Stop after the documents. The user approves the product and visual direction
before UI code begins.

## Checkpoint 1: Windows Library Shell

### Required functions

- Replace Thorium's catalog/onboarding-first launch with Library.
- Display books already present in Thorium's local library.
- Open a book through the existing Readium path.
- Show an empty state with one clear add-book action.
- Search by title and author without route changes.
- Filter by All, Reading, To read, and Finished.
- Show Continue reading only when unfinished books exist.
- Show visible sync status, even before cloud wiring is complete.
- Expose mouse and keyboard operation for every action.

### Deferred

- Managed file copying.
- Authentication.
- Real upload/download.
- Collections.
- Full reader redesign.

### Gate

The user can launch the development app, see the intended product shell, import
through the existing Thorium mechanism, and open a book. Stop for visual and
navigation review.

## Checkpoint 2: Durable Local Foundation and Managed Import

### Required functions

- Generate and use typed API models from the checked-in OpenAPI schema.
- Create durable local cloud state with atomic writes and backup recovery.
- Maintain a stable device ID and pending operation queue.
- Import EPUB through file picker and drag-and-drop.
- Copy imported content into app-managed storage.
- Calculate SHA-256 from the managed copy.
- Extract available title, author, cover, and format metadata.
- Preserve readability if the original source is moved or deleted.
- Prevent accidental duplicate imports of identical content.
- Show import progress and clear unsupported/damaged-file errors.

### Offline behavior

Import and reading work without an account or network. Cloud work queues for
later.

### Gate

Delete or move the original file, restart Windows, and prove the managed copy
still appears and opens.

## Checkpoint 3: Windows Reading Experience

### Required functions

- Keep Readium rendering behavior underneath the product UI.
- Provide back to Library, contents, progress navigation, appearance,
  bookmark, and more actions.
- Contents includes Chapters, Highlights, and Bookmarks.
- Persist and restore the exact Readium locator after restart.
- Preserve normalized progression as fallback.
- Provide common appearance controls appropriate to the format.
- Support keyboard access, Escape-to-close temporary surfaces, visible focus,
  and reduced motion.
- Allow wide-window side panels and usable narrow-window overlays.

### Gate

Open an EPUB, navigate, change appearance, bookmark a location, restart
offline, and return to the same location.

## Checkpoint 4: Highlights, Notes, Bookmarks, and Collections

### Required functions

- Mouse text selection on Windows and touch selection on Android.
- Selection actions: Highlight, Note, Copy, and Define where available.
- Exactly four highlight roles:
  - Yellow: Important.
  - Blue: Question.
  - Pink: Quote.
  - Green: Review.
- Reuse the last highlight role for quick highlighting.
- Allow optional notes, editing, and deletion.
- Preserve selected text, context, locator, stable ID, and timestamps.
- Add, edit, and remove bookmarks.
- Create, rename, and delete collections.
- Add or remove books from collections.
- Keep annotation and collection changes functional offline.

### Gate

Create every highlight role, edit a note, add a bookmark, organize a book into
a collection, restart, and prove all local data remains.

## Checkpoint 5: Account and Session Experience

### Required functions

- Request a magic-link email.
- Explain that the link was sent without exposing technical token language.
- Redeem the link through the supported callback/development path.
- Display signed-in account identity and registered device.
- Encrypt refresh-token material with Windows `safeStorage`; use
  Keystore-backed storage on Android.
- Refresh sessions automatically.
- Sign out locally and revoke the current session.
- Allow offline reading when authentication expires.
- Offer Sign in again without blocking local books.

### Gate

Sign in, restart, restore the session securely, expire or revoke it, continue
reading offline, and sign in again.

## Checkpoint 6: Files and Automatic Synchronization

### Required functions

- Create cloud book metadata before reserving a file.
- Upload managed bytes directly through a signed URL.
- Complete the file only after upload succeeds.
- Restore missing local books from signed download URLs.
- Verify byte length and SHA-256 before accepting downloads.
- Never expose permanent bucket credentials.
- Push pending operations with stable operation IDs.
- Pull ordered changes from the last committed signed cursor.
- Advance the cursor only after local application succeeds.
- Trigger sync after mutations, startup, import, reader close/background,
  connectivity return, app focus, and explicit Sync now.
- Retry transient failures with bounded backoff.

### Required statuses

- `Synced`: all accepted and pulled.
- `Syncing`: active transfer or mutation exchange.
- `Offline`: local work continues and is queued.
- `Needs attention`: user action is required.

### Gate

Import and upload on Windows, remove the local copy, download it again, read
offline, reconnect, and return to Synced without duplicate entities.

## Checkpoint 7: Conflict, Deletion, and Recovery UX

### Required functions

- Merge independent entities by stable ID.
- Preserve overwritten same-note content for recovery.
- Show both locations when recent progress would jump backward by more than the
  backend conflict threshold.
- Let the user keep this device's location or continue from the other device.
- Apply tombstones so stale offline data does not reappear.
- Clearly implement the three removal/deletion levels.
- Keep failed destructive operations visible as Needs attention.
- Support account deletion with explicit consequences and confirmation.
- Never hide a recoverable local value solely because a server mutation was
  rejected.

### Gate

Exercise a progress conflict, note recovery, local-download removal,
cloud-file removal, delete-everywhere, and account deletion with disposable
data.

## Checkpoint 8: Windows Completion

### Required functions

- App identifies as Simple Cloud Reader while preserving Thorium attribution.
- EPUB and qualified PDF behavior meets the approved scope.
- Native file picker and drag-and-drop work.
- Keyboard shortcuts and focus order are documented and verified.
- Window resize, narrow layout, high-DPI, light/dark/system theme, and reduced
  motion are tested.
- Produce an unsigned NSIS installer.
- Test install, upgrade, restart, offline reading, reconnect, and uninstall.

### Gate

Record build path, SHA-256, screenshots, automated results, manual checks, and
known limitations. Windows behavior becomes the reference contract for
Android.

## Checkpoint 9: Android Phone and Tablet Foundation

### Required functions

- Retain KOReader rendering engines and supported Android format strengths.
- Replace file-browser-first launch with the validated Library behavior.
- Use one responsive app for phones and tablets.
- Import from Android storage and the share sheet.
- Copy imports into app-managed private storage.
- Open local books and restore exact KOReader locations.
- Provide touch-visible controls with no hover dependency.
- Ensure essential organization has a non-drag fallback.
- Adapt layouts for portrait phone, portrait tablet, and landscape tablet.

### Gate

Verify on an Android emulator or physical device, not only a desktop preview.
Import, read, restart offline, and restore the exact location on phone and
tablet layouts.

## Checkpoint 10: Android Cloud and Feature Parity

### Required functions

- Implement secure magic-link authentication.
- Connect managed upload/download and the shared sync protocol.
- Synchronize progress, four highlight roles, notes, bookmarks, collections,
  metadata, and tombstones.
- Implement conflict and deletion behavior equivalent to Windows.
- Preserve Android-only format data even when Windows cannot render the file.
- Clearly state unsupported-on-this-device without deleting cloud content.
- Verify backgrounding, connectivity return, process death, and storage
  pressure behavior.

### Gate

Prove Windows-to-Android and Android-to-Windows import, download, progress,
highlight, offline, reconnect, and deletion scenarios.

## Checkpoint 11: Launch Readiness

### Required functions

- Accessibility: labels, keyboard, touch targets, focus, text scaling, contrast,
  and screen-reader paths.
- Privacy and security copy.
- Storage quota and transfer failure recovery.
- Export or recovery path for managed originals after rendering failure.
- Release icons, attribution, third-party notices, and license review.
- Windows installer and Android APK/AAB production configuration.
- Crash reporting and analytics remain opt-in or absent unless explicitly
  approved.
- Backup/restore and account-deletion operations are exercised.

### Final scenarios

- Same account library on Windows, Android phone, and Android tablet.
- Import on Windows, continue on Android.
- Import on Android, continue on Windows.
- Read and annotate offline on multiple devices, then reconnect.
- Remove one local copy without deleting cloud content.
- Delete everywhere while another device is offline without resurrection.
- Reinstall, sign in, and restore the cloud library.

## Testing Expectations

Use:

- Unit tests for reducers, state transitions, operation mapping, and conflict
  decisions.
- Integration tests for managed storage, secure credentials, API behavior, and
  offline queues.
- Contract tests against generated OpenAPI types and shared fixtures.
- UI tests for Library, Reading, annotations, account, sync, and deletion.
- Real Windows build verification.
- Real Android emulator or device verification for touch and lifecycle.
- Cross-device end-to-end scenarios before launch.

Do not claim a checkpoint passes from screenshots alone.

## Claude Execution Prompt

```text
Continue Simple Cloud Reader using FRONTEND_HANDOFF.md as the frontend behavior
contract. Read CLAUDE.md, HANDOFF.md, the approved product spec, the frontend
functional handoff design, NEXT_STEPS.md, and the Windows vertical-slice plan
before editing.

Windows comes first; Android follows the validated Windows behavior. Do not
work on both clients in parallel. Preserve the existing Readium and KOReader
rendering engines and localize product additions behind simpleCloud adapters.

Start with Checkpoint 0 only: use the Impeccable workflow to create PRODUCT.md
and DESIGN.md. You own the visual design, but must preserve the required
functions, offline behavior, accessibility, platform constraints, and four
sync states in FRONTEND_HANDOFF.md. Stop after the design documents and ask for
approval.

After approval, implement one checkpoint at a time. The first coded slice is
the calm Windows Library over existing Thorium data, not managed import. At the
end of every checkpoint, run focused tests and builds, manually verify the
flows, report evidence and limitations, then stop for user approval.

Inspect git status before editing. Do not discard the existing uncommitted
Windows API generation work. Never expose or commit credentials, tokens,
signed URLs, personal emails, or book files.
```
