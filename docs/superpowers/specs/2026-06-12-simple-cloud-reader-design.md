# Simple Cloud Reader Product Design

**Status:** Approved for implementation planning  
**Date:** 2026-06-12  
**Working title:** Simple Cloud Reader

## 1. Product Summary

Simple Cloud Reader is an open-source reading application inspired by ReadEra's
calm library experience, with automatic cloud synchronization across Android
phones, Android tablets, and Windows computers.

The product is delivered as two installable applications:

1. One responsive Android app for phones and tablets.
2. One Windows desktop app.

Both applications present the same account, library, reading progress,
highlights, notes, and bookmarks. They remain fully useful offline and
synchronize through a shared backend hosted on Railway.

This is not a clone of ReadEra's proprietary code or visual assets. It adopts
the useful product principle: open into a simple visual library and make reading
the obvious primary action.

## 2. Goals

- Make importing, finding, opening, and continuing a book feel immediate.
- Hide the complexity associated with KOReader's file browser, plugins, and
  specialist menus.
- Preserve strong document rendering and broad format support on Android.
- Provide a proper installable Windows reading application.
- Keep each device useful offline.
- Synchronize book files and reading data automatically.
- Keep navigation shallow and understandable without setup instructions.
- Store all source code in a GitHub-first repository that Railway can deploy.

## 3. Non-Goals

The first release will not include:

- iPhone, iPad, macOS, Linux, Kindle, Kobo, or browser clients.
- A commercial ebook store or catalog.
- DRM-protected book support.
- Collaborative or public annotations.
- OCR-based text selection for scanned documents.
- Text-to-speech.
- Advanced KOReader plugins and specialist configuration menus.
- Perfect behavioral parity between unrelated rendering engines.

## 4. Product Foundations

### Android

The Android app will be derived from
[KOReader](https://github.com/koreader/koreader). It will retain KOReader's
document engines and proven reading capabilities while replacing its
file-browser-first navigation with a managed visual library and a deliberately
small set of controls.

KOReader officially supports Android but does not officially support native
Windows. Therefore, Windows will not be treated as another KOReader build.

### Windows

The Windows app will be derived from
[Thorium Reader](https://github.com/edrlab/thorium-reader), which is based on
Readium Desktop and already produces Windows installers. Its library and reader
interface will be simplified and restyled to match the Android product.

### Shared Product Contract

The clients use different rendering foundations but share:

- Domain identifiers and synchronization API.
- Library organization and reading states.
- Annotation colors and labels.
- Conflict-resolution rules.
- Design tokens, terminology, and navigation principles.
- Account, storage, privacy, and deletion behavior.

Platform adapters translate KOReader and Readium locations into a canonical
locator record. The canonical locator stores a format-specific serialized
location plus a normalized progression from `0.0` to `1.0`. Exact restoration
uses the engine-specific location when possible; normalized progression is the
fallback.

## 5. Information Architecture

### Primary Navigation

There is no permanent bottom navigation in the initial product.

- The application opens directly to **Library**.
- Opening a book enters **Reading**.
- A single account/settings control opens **Settings**.
- Search, collections, annotations, and sync state appear in context.

This creates three understandable places without turning them into three
competing tabs.

### Library

The default library contains:

- A compact **Continue reading** row when unfinished books exist.
- A cover grid for all books.
- Search in the header.
- An add/import action in the header.
- Lightweight filters for `All`, `Reading`, `To read`, and `Finished`.
- Optional user-created collections.
- A small sync-state indicator near the account control.

Tapping a cover opens the book. Long-pressing on Android or right-clicking on
Windows opens contextual actions:

- Book details.
- Add to collection.
- Mark as finished or unread.
- Download or remove the local copy.
- Delete from the library.

The library never exposes cloud folders or asks the user to push or pull files.

### Reading

The reading surface prioritizes the page. One center tap or mouse click reveals
the controls:

- Back to library.
- Contents.
- Current progress and navigation scrubber.
- Appearance.
- Bookmark.
- More.

**Contents** has three sections:

- Chapters.
- Highlights.
- Bookmarks.

**Appearance** exposes only common controls:

- Font family for reflowable books.
- Font size.
- Line spacing.
- Margins.
- Light, sepia, dark, and system themes.
- Brightness on Android where supported.
- Page or continuous reading mode where supported by the format.

Uncommon engine settings are omitted from the first release rather than placed
in an "advanced" maze.

### Windows Adaptation

The Windows application adds desktop conventions without changing the product
model:

- Resizable windows.
- Drag-and-drop book import.
- Native file picker.
- Keyboard navigation and shortcuts.
- Optional contents/annotations side panel on wide windows.
- Mouse selection and context menus.

### Tablet Adaptation

Tablets use a denser cover grid. In landscape orientation, Contents may appear
as a side sheet so the page remains visible.

## 6. Import and Managed Local Storage

Users can import supported files from Android storage, the Android share sheet,
the Windows file picker, or Windows drag-and-drop.

On import:

1. The client calculates a SHA-256 content hash.
2. It extracts title, author, cover, format, and other available metadata.
3. It creates or finds the matching library record.
4. It copies the file into an application-managed private library.
5. It leaves the source file untouched.
6. It queues cloud upload when cloud sync is enabled.

Managed copies prevent books from breaking when source files are moved,
renamed, disconnected, or deleted.

Three distinct actions must be clear:

- **Remove download:** delete only this device's managed copy.
- **Remove from device and cloud:** retain metadata and reading activity but
  delete the stored book file after confirmation.
- **Delete from library everywhere:** delete the book record, cloud file, and
  synced reading data after an explicit destructive confirmation.

Offline downloads are supported on Android phones, Android tablets, and
Windows.

## 7. Highlights, Notes, and Bookmarks

### Text Selection

Long-press and drag on Android, or drag with the mouse on Windows, selects text.
A compact contextual toolbar offers:

- Highlight.
- Note.
- Copy.
- Define.

`Define` uses an installed/local dictionary where available and otherwise opens
the configured dictionary provider. Dictionary lookup is not required to
synchronize.

### Four-Color Highlight System

The product includes exactly four highlight colors. Each color may have an
optional user-editable label. Defaults are:

- Yellow: Important.
- Blue: Question.
- Pink: Quote.
- Green: Review.

Tapping **Highlight** immediately applies the last-used color. Opening the color
control allows another color or label. Labels are optional and can be ignored.

Each highlight stores:

- Stable annotation ID.
- Book ID.
- Selected text.
- Prefix and suffix context.
- Canonical locator.
- Color role.
- Optional note.
- Created, updated, and deleted timestamps.
- Originating device ID.

Bookmarks save a reading location without requiring selected text.

Scanned PDFs without a selectable text layer cannot be highlighted in the MVP.
OCR highlighting is deferred.

## 8. Cloud and Account Architecture

### Railway Services

Railway hosts:

- A stateless TypeScript API service.
- PostgreSQL for structured user and library data.
- A private S3-compatible Railway Bucket for book files and generated covers.

The API service is deployed from GitHub. Database migrations run as an explicit
deployment step. Bucket credentials remain server-side and are never embedded
in either client.

### Authentication

Users sign in through an emailed magic link. The backend issues short-lived
access tokens and rotating refresh tokens after the link is verified. Email is
sent through a transactional email provider configured by environment
variables.

The clients store refresh credentials in Android Keystore-backed storage and
Windows Credential Manager respectively.

### Core Server Records

The backend stores:

- Users and sessions.
- Devices.
- Books and metadata.
- User-to-book library membership.
- File objects and upload state.
- Reading positions.
- Highlights and notes.
- Bookmarks.
- Collections and membership.
- Per-entity synchronization versions.
- Deletion tombstones.

### File Transfer

Clients request short-lived signed upload and download URLs from the API.
Clients never receive permanent bucket credentials.

Files are deduplicated within a user's account by content hash. Cross-user
deduplication is prohibited so the service never reveals whether another user
possesses a particular file.

## 9. Offline-First Synchronization

Each client maintains a local database and an append-only mutation queue.
Opening books, reading, annotating, organizing, and importing work without a
network connection.

Synchronization runs:

- Shortly after a local mutation.
- When the app opens.
- When a book closes or the app moves to the background.
- When connectivity returns.
- When the user explicitly chooses **Sync now** in Settings.

The sync protocol is incremental:

1. Client sends queued idempotent mutations with stable operation IDs.
2. Server applies or rejects each mutation and returns authoritative versions.
3. Client requests changes after its last server cursor.
4. Client applies remote changes locally.
5. Client advances its cursor only after the local transaction succeeds.

### Conflict Rules

- Highlights, notes, bookmarks, and collections merge by stable entity ID.
- Concurrent edits to different entities never overwrite one another.
- Concurrent edits to the same note use last-write-wins by server timestamp in
  the MVP, while preserving the losing value in server history for recovery.
- Deletions create tombstones so an offline device cannot resurrect deleted
  content accidentally.
- Reading progress accepts the latest intentional reading event.
- If an incoming position would move the user substantially backward from a
  recently read local position, the client asks whether to keep the current
  location or continue from the other device.

The UI communicates only four sync states:

- Synced.
- Syncing.
- Offline.
- Needs attention.

## 10. Supported Formats

### Android Target

The intended Android MVP formats are:

- EPUB.
- PDF.
- DJVU.
- MOBI.
- FB2.
- TXT.
- CBZ.

### Windows Target

Windows must support EPUB and PDF at launch. Additional formats are enabled
only when the chosen Readium/Thorium adapters provide reliable rendering,
location restoration, and annotation anchors.

The interface may show a book on all devices even when a device cannot render
that format. In that case, it clearly states that the format is not supported
on this device and does not corrupt or remove the cloud file.

Format parity is a goal, not a false launch requirement.

## 11. Visual Direction

The interface is a quiet product tool for people reading for long periods in
mixed lighting. It uses a restrained, warm-neutral palette with one low-chroma
accent and no decorative gradients, glass effects, or heavy shadows.

Design principles:

- Reading content has visual priority over application chrome.
- Covers supply most of the library's color.
- Text and controls meet WCAG AA contrast.
- Touch targets are at least 48 density-independent pixels on Android.
- Desktop controls remain keyboard reachable with visible focus states.
- Body text is never cramped against window edges.
- Motion is brief, functional, and disabled when reduced motion is requested.
- Destructive actions state whether they affect this device, the cloud file, or
  the entire library.
- Empty states explain one next action, usually **Add books**.

The eventual UI design phase must use the Impeccable product-design workflow
and produce `PRODUCT.md` and `DESIGN.md` before implementation of visual
screens.

## 12. Error Handling

- Failed imports leave the source untouched and explain the unsupported or
  damaged file.
- Interrupted uploads resume through multipart upload when available or safely
  restart without duplicate records.
- Failed sync operations remain queued with bounded exponential backoff.
- Authentication expiry pauses sync without blocking offline reading.
- Storage quota errors identify which files are not backed up.
- Rendering failures offer retry, book details, and export of the original
  managed file.
- A failed cloud deletion remains visible as **Needs attention** until resolved.

No error may silently discard a book, note, highlight, bookmark, or reading
position.

## 13. Repository and Delivery Shape

The project uses one GitHub monorepo:

```text
apps/
  android/          KOReader-derived Android client
  windows/          Thorium/Readium-derived Windows client
services/
  api/              Railway API and synchronization service
packages/
  sync-contract/    OpenAPI schema, fixtures, and generated client models
  design-tokens/    Platform-neutral design values
infra/
  railway/          Deployment configuration and operational documentation
docs/
  architecture/     Decisions, diagrams, and protocol documentation
```

GitHub Actions will:

- Test the backend and synchronization contract.
- Build the Android application.
- Build the Windows application.
- Verify database migrations.
- Produce signed release artifacts once signing credentials are configured.

Railway deploys only `services/api` and its supporting managed services.

## 14. Licensing

KOReader is AGPL-3.0. The Android derivative and modifications must remain
available under compatible open-source terms.

Thorium Reader is BSD-3-Clause. Its notices and attribution must be preserved in
the Windows derivative.

The monorepo will use per-component license files and a root licensing notice
rather than claiming every component has one identical license. Before public
distribution, a dependency and license review must verify the obligations of
the rendering engines, bundled fonts, dictionaries, icons, and other assets.

No ReadEra source code, branding, icons, screenshots, or proprietary assets
will be copied.

## 15. Testing Strategy

### Contract Tests

The same synchronization fixtures run against:

- The Railway API implementation.
- The Android sync adapter.
- The Windows sync adapter.

Fixtures cover progress, annotations, tombstones, retries, duplicate
operations, and conflicting offline edits.

### Client Tests

- Unit tests for local library and sync state transitions.
- Integration tests for import, managed storage, and offline mutation queues.
- Rendering-adapter tests for canonical locator round trips.
- UI tests for opening a book, changing appearance, highlighting, bookmarking,
  and removing downloads.
- Accessibility checks for screen-reader labels, keyboard navigation, focus,
  contrast, and text scaling.

### End-to-End Scenarios

- Import on Windows, sync, download, and continue on Android.
- Import on Android, sync, and open on Windows.
- Read offline on two devices and resolve a progress conflict.
- Add highlights and notes offline, reconnect, and observe a merged result.
- Remove only a local download without deleting the cloud copy.
- Delete a book everywhere while another device is offline, then reconnect it
  without resurrecting the book.
- Reinstall a client, sign in, and restore the cloud library.

## 16. Delivery Phases

### Phase 0: Technical Spikes

- Prove a KOReader Android build can open a supported document after replacing
  the launch path with a minimal library entry point.
- Prove a Thorium fork can open EPUB and PDF, expose locator changes, and apply
  an external locator.
- Prove canonical locator round trips across client restarts.
- Prove Railway signed uploads, downloads, and incremental sync.

Any failed spike changes the implementation plan before large UI work begins.

### Phase 1: Vertical Slice

Deliver one account with:

- Magic-link sign-in.
- EPUB import on Windows.
- Cloud upload.
- Android download.
- Reading-position synchronization.
- One highlight synchronized back to Windows.
- Offline reading on both clients.

### Phase 2: MVP Completion

Add the complete library, managed storage, supported formats, collections,
four-color annotations, settings, conflict handling, deletion behavior,
accessibility, installers, and release automation described above.

## 17. Acceptance Criteria

The MVP is complete when:

1. A user can install the Android app on a phone and tablet and install the
   Windows app on a Windows 10 or 11 computer.
2. All three device classes show the same signed-in cloud library.
3. A locally imported book is copied into managed storage and remains readable
   after the original is moved or deleted.
4. Downloaded books remain readable offline on every supported device class.
5. Progress, highlights, notes, bookmarks, collections, and library metadata
   synchronize automatically.
6. Four highlight colors and optional editable labels work on selectable text.
7. The application opens to a cover library rather than a file browser.
8. Common reading actions are reachable without navigating KOReader's original
   plugin or advanced-settings menus.
9. Removing a local download does not remove its cloud copy.
10. Destructive deletion propagates through tombstones and does not resurrect
    from an offline device.
11. The backend deploys from GitHub to Railway without client-embedded secrets.
12. Android and Windows release builds pass their automated tests and the
    cross-device end-to-end scenarios.

