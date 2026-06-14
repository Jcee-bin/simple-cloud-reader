# Simple Cloud Reader Delivery Roadmap

> **For agentic workers:** This roadmap coordinates the project. Each phase must
> receive its own detailed implementation plan before execution.

**Goal:** Deliver one coherent cloud-synced reading product as an Android app
for phones and tablets plus a Windows desktop app.

**Architecture:** Android derives from KOReader, Windows derives from
Thorium/Readium Desktop, and both communicate with a TypeScript API on Railway.
The clients share a versioned synchronization contract, canonical locator
fixtures, product language, and design tokens while retaining platform-specific
rendering adapters.

**Approved design:** `docs/superpowers/specs/2026-06-12-simple-cloud-reader-design.md`

---

## Dependency Order

```text
Phase 0: feasibility and repository foundation
  |
  v
Phase 1: sync contract, account, storage, and API core
  |
  +-----------------------+
  |                       |
  v                       v
Phase 2: Windows slice    Phase 3: Android slice
  |                       |
  +-----------+-----------+
              |
              v
Phase 4: shared product UI and managed library
              |
              v
Phase 5: full offline sync and conflict behavior
              |
              v
Phase 6: format coverage, accessibility, release, and operations
```

## Phase 0: Feasibility and Repository Foundation

**Plan:** `docs/superpowers/plans/2026-06-12-phase-0-technical-foundation.md`

Import pinned upstream source trees and prove the four architectural
assumptions:

1. A KOReader Android derivative can launch a library shell and open a local
   EPUB through `ReaderUI:showReader`.
2. A Thorium derivative can import/open an EPUB and observe/restore a Readium
   locator.
3. Both foundations can translate engine locations to and from the same
   canonical locator fixtures.
4. A local Railway-equivalent stack can issue signed object URLs and exchange
   cursor-based sync mutations.

**Exit gate:** all four spike reports are marked `PASS`, or the product design
is revised before feature implementation.

## Phase 1: Backend and Synchronization Core

**Plan:** `docs/superpowers/plans/2026-06-12-phase-1-backend-sync-core.md`

Create a separate detailed plan covering:

- Magic-link request and redemption.
- Access and rotating refresh tokens.
- User, device, book, file-object, library-membership, locator, annotation,
  collection, mutation, cursor, and tombstone tables.
- Private S3-compatible object operations through short-lived signed URLs.
- Idempotent mutation ingestion.
- Cursor-based change retrieval.
- Per-user content-hash deduplication.
- Server history for same-note conflict recovery.
- OpenAPI generation and contract publishing.
- Railway deployment, migrations, health checks, backups, and secret
  documentation.

**Working proof:** API tests demonstrate two simulated devices importing one
book, exchanging progress and annotations, retrying duplicate operations, and
honoring a deletion tombstone.

## Phase 2: Windows Vertical Slice

Create a separate detailed plan against the imported Thorium revision:

- Apply the Impeccable workflow to create `PRODUCT.md` and `DESIGN.md`.
- Replace Thorium onboarding/catalog emphasis with the approved cover library.
- Add magic-link account flow and Windows Credential Manager storage.
- Import EPUB into managed local storage.
- Upload/download through signed URLs.
- Map Readium locators and annotations to the shared contract.
- Read fully offline.
- Display the four sync states.
- Package an unsigned test NSIS installer.

**Working proof:** import an EPUB on Windows, upload it, read offline, create one
highlight, restart the app, and restore the exact location and annotation.

## Phase 3: Android Vertical Slice

Create a separate detailed plan against the imported KOReader revision:

- Add a managed-library launch shell in place of file-browser-first startup.
- Add magic-link account flow and Android Keystore-backed credential storage.
- Download the Windows-imported EPUB into private managed storage.
- Open it through KOReader's existing document registry and `ReaderUI`.
- Map KOReader progress and annotations to the shared contract.
- Read fully offline.
- Display the four sync states.
- Produce an unsigned Android APK for phone and tablet testing.

**Working proof:** sign into the same account, download the Windows-imported
book, restore its location, create a second highlight offline, reconnect, and
observe both highlights on Windows.

## Phase 4: Product UI and Managed Library

Create a separate detailed plan after both vertical slices pass:

- Implement the approved Library, Reading, and Settings information
  architecture.
- Implement responsive Android phone/tablet layouts.
- Implement responsive Windows layouts and keyboard behavior.
- Add Continue reading, cover grid, search, filters, and collections.
- Add four editable highlight labels and compact selection controls.
- Add Contents sections for chapters, highlights, and bookmarks.
- Implement explicit remove-download, remove-cloud-file, and delete-everywhere
  flows.
- Add empty, loading, offline, quota, and recovery states.
- Keep platform vocabulary and design tokens synchronized.

**Working proof:** usability checks confirm users can import, find, open,
annotate, and remove a download without encountering upstream specialist
menus.

## Phase 5: Complete Offline Synchronization

Create a separate detailed plan covering:

- Durable local mutation queues.
- Connectivity and application-lifecycle triggers.
- Retry with bounded exponential backoff.
- Highlight, note, bookmark, collection, and metadata merging.
- Same-entity last-write-wins plus recovery history.
- Progress backward-jump confirmation.
- Tombstone propagation and compaction.
- Resumable uploads.
- Quota and expired-session recovery.
- Reinstall and cloud-library restoration.

**Working proof:** the cross-device scenarios in the approved design pass under
forced network loss, retries, process termination, and clock skew.

## Phase 6: Formats, Quality, and Release

Create a separate detailed plan covering:

- Android EPUB, PDF, DJVU, MOBI, FB2, TXT, and CBZ qualification.
- Windows EPUB and PDF qualification.
- Clear unsupported-format behavior across devices.
- Accessibility checks, keyboard navigation, screen readers, contrast, text
  scaling, and reduced motion.
- Performance budgets for library startup, page open, page turn, and sync.
- License inventory and notices.
- Android and Windows signing.
- GitHub Actions release workflows.
- Railway production operations and restore drills.
- Public installation and privacy documentation.

**Release gate:** all acceptance criteria in the approved design have direct
automated or recorded manual evidence.

## Repository Strategy

Use one Git repository with imported upstream source under:

```text
apps/android/
apps/windows/
services/api/
packages/sync-contract/
packages/design-tokens/
infra/local/
infra/railway/
docs/architecture/
docs/spikes/
```

Import upstreams with `git subtree --squash`. Record the URL, branch, and exact
commit in `UPSTREAMS.md`. Never copy from the ignored `work/reference`
directories into release source without recording its origin.

Pinned planning revisions:

- KOReader: `5598a6ee4488bf88fd0ab15b24dce2cdee61d508`
- Thorium Reader: `c19a45f1cc2d352c88952e8da4f1794d9dfe6c29`

Upstream updates are deliberate maintenance work. They are not pulled
automatically into product branches.

## Planning Rules for Later Phases

- Start each phase with failing contract or behavior tests.
- Keep generated API clients reproducible from the checked-in OpenAPI schema.
- Do not add a feature to one client without defining its cross-device
  behavior.
- Do not promise exact location restoration unless a format adapter passes
  round-trip fixtures.
- Keep upstream code changes localized behind product adapters where feasible.
- Preserve AGPL and BSD notices and document every bundled asset license.
- Commit after each independently verifiable behavior.
