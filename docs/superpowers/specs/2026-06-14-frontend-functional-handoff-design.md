# Frontend Functional Handoff Design

**Status:** Approved
**Date:** 2026-06-14

## Goal

Give Claude a complete frontend behavior contract for Windows and Android while
leaving visual design decisions to Claude. Work is divided into explicit
checkpoints so the user can review and revise the product part by part.

## Decisions

- Cover both Windows and Android in one handoff.
- Implement Windows first and use it as the behavioral reference for Android.
- Describe the full intended frontend, including post-MVP capabilities.
- Stop for user approval after every checkpoint.
- Require design documents before visible implementation.
- Make the first coded slice the Windows Library over existing Thorium data.
- Defer managed import until the product shell has been reviewed.
- Specify functions, state, data flow, errors, offline behavior, tests, and
  acceptance gates.
- Do not prescribe typography, palette, layout composition, animation style, or
  component appearance.

## Checkpoint Structure

1. Product and design contract.
2. Windows Library shell.
3. Durable local foundation and managed import.
4. Windows Reading experience.
5. Highlights, notes, bookmarks, and collections.
6. Account and session experience.
7. Files and automatic synchronization.
8. Conflict, deletion, and recovery UX.
9. Windows completion and installer.
10. Android phone/tablet foundation.
11. Android cloud and feature parity.
12. Launch readiness.

Each checkpoint includes required functions, deferred scope where needed,
offline/error behavior, tests, an acceptance gate, and a mandatory pause for
review.

## Shared Product Contract

Both clients expose the same conceptual Library, Reading, account, sync,
annotation, organization, conflict, and deletion behaviors. They keep local
books and reading data usable offline and exchange operations through the
existing backend contract.

Platform adaptation is expected:

- Windows uses Readium, desktop input, resizable windows, native file picking,
  drag-and-drop, secure Electron storage, and an NSIS installer.
- Android uses KOReader, touch interaction, storage/share import, Android
  lifecycle handling, Keystore-backed credentials, and responsive phone/tablet
  layouts.

The two clients do not need identical pixels or rendering-engine settings.

## Design Ownership

Claude creates `PRODUCT.md` and `DESIGN.md` through the Impeccable workflow.
Those documents may define the visual system, responsive layouts, component
appearance, interaction motion, typography, and color. The user approves them
before code is written.

Visual freedom does not override:

- Cover-first launch.
- Shallow navigation.
- Offline reading.
- Visible textual sync state.
- Keyboard and touch accessibility.
- Clear destructive-action scope.
- Four semantic highlight roles.
- Platform security boundaries.

## Execution Safety

Claude must inspect the dirty worktree and preserve unfinished Windows OpenAPI
generation changes. It must use the checked-in OpenAPI schema as authoritative,
avoid renderer rewrites, keep secrets out of client/rendering code, and report
fresh verification evidence at each checkpoint.

## Deliverable

The operational handoff is `FRONTEND_HANDOFF.md`. It includes the complete
function list, checkpoint gates, testing expectations, and a ready-to-paste
Claude prompt.
