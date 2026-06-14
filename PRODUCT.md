# Product

> Checkpoint 0 product contract. Pairs with `DESIGN.md` (visual system) and
> `FRONTEND_HANDOFF.md` (functional behavior contract). This document defines
> *what* the product is and how it behaves; `DESIGN.md` defines *how* it looks.

## Register

product

## Users

People who keep personal books and documents on an Android phone, Android
tablet, and Windows computer. The main devices in practice are a **laptop** and
a **tablet held vertically**, with an Android phone later. They want to import a
file once, find it again without navigating folders, and continue reading or
annotating from whichever device is nearby.

The primary workflow is quiet and repetitive: open the library, recognize a
cover, continue reading, occasionally highlight or bookmark, then leave. The
interface must remain understandable for readers who never want to learn the
underlying rendering engine, sync protocol, or storage layout.

Primary jobs:

- "Open the app and keep reading the book I was on."
- "Add a book I already have and read it immediately."
- "Find a book by title or author without digging."
- "Mark passages while I read and find them again later."
- "Have my place and notes follow me to my other device."

## Product Purpose

Simple Cloud Reader is a calm, cover-first personal reading library with
automatic cross-device synchronization and durable offline reading. It exists to
make a personally owned reading library feel like one place across a Windows
laptop, an Android tablet, and an Android phone.

Success means users can import, open, continue, annotate, organize, and remove
downloads without encountering file-browser-first navigation, cloud-folder
management, or specialist reader settings.

## Product boundaries

**In scope:** a personal Library, a focused Reading experience, EPUB (and
qualified PDF) reading, four-role highlights with optional notes, bookmarks,
collections, automatic cross-device sync, and account/session management.

**Out of scope:** iOS / macOS / Linux / web / Kindle / Kobo clients; a bookstore
or OPDS catalog browsing as a product surface; social or collaboration features;
DRM; OCR. We do **not** replace the Readium (Windows) or KOReader (Android)
rendering engines, and we do **not** copy ReadEra source, branding, icons,
screenshots, or assets.

**Platform order:** Windows ships and is validated first and becomes the
behavioral reference. Android follows as one responsive app for phone and
tablet. The two clients are never built in parallel.

## The two surfaces (information architecture)

The whole product is two primary surfaces. Everything else appears *in context*,
never as a competing permanent destination.

1. **Library** — the home. A quiet, cover-first shelf of the user's books.
2. **Reading** — the book itself, with controls that stay out of the way.

Account, settings, search, filters, collections, annotations, and sync status
are reached *from within* these two surfaces (a header control, a filter chip, a
selection menu) rather than living as top-level tabs. Navigation stays shallow:
a user is never more than one step from their books or their place in a book.

### Terminology

| Term | Meaning |
|---|---|
| Library | The cover-first home view of all the user's books. |
| Continue reading | The most recent unfinished book, surfaced for one-tap resume. |
| Reading | The in-book reading experience (Readium underneath on Windows). |
| Highlight | A colored marked passage, in one of four roles. |
| Note | Optional text attached to a highlight. |
| Bookmark | A saved location, no text. |
| Collection | A user-named grouping of books. |
| Sync status | The current cloud state: Synced / Syncing / Offline / Needs attention. |

## Key flows

- **Launch → resume.** App opens directly into Library (never onboarding or a
  catalog). If an unfinished book exists, a **Continue reading** card offers
  one-tap resume. Opening any cover enters Reading.
- **Add a book.** One clear add action (file picker or drag-and-drop on Windows;
  storage / share sheet on Android) brings an EPUB into the Library and it is
  immediately readable. (Copying into app-managed storage with dedup is a later
  checkpoint; the *entry point* exists from the first shell.)
- **Find a book.** Search by title or author and filter by reading state — both
  in place, without leaving Library.
- **Mark while reading.** Select text → Highlight / Note / Copy / Define. The
  last-used highlight role repeats for quick marking.
- **Remove / delete.** Three explicit, clearly-distinguished levels (below).
- **Account.** Sign in via magic link, reachable from one clear control; the app
  keeps working — and keeps reading — without an account.

## Non-negotiable behaviors

These hold regardless of visual design (see `FRONTEND_HANDOFF.md`):

- **Cover-first launch.** First run is the Library, not Thorium onboarding or
  catalog browsing.
- **Reading works offline.** No account or network is required to open and read
  a downloaded book.
- **Sync is automatic and mostly invisible**, but its state is **always shown as
  text**, exactly one of: `Synced`, `Syncing`, `Offline`, `Needs attention`.
- **Nothing is ever silently lost.** No error may quietly discard a book,
  reading position, highlight, note, bookmark, or collection. A failed
  destructive or cloud action surfaces as `Needs attention`, never as silent
  data loss.
- **Essential actions never depend on hover.** Everything reachable by mouse,
  keyboard, and touch.
- **Visible keyboard focus on Windows.** Keyboard navigation throughout.

## Reading-state model

Every book is in exactly one state: **To read**, **Reading**, **Finished**, or
**Archived**. Library filters expose **All / Reading / To read / Finished**.
*Continue reading* surfaces only when at least one unfinished (Reading) book
exists.

## Highlights — four semantic roles

Exactly four roles, fixed meanings, used on both platforms:

| Color | Role |
|---|---|
| Yellow | Important |
| Blue | Question |
| Pink | Quote |
| Green | Review |

Highlights carry the selected text, surrounding context, an exact locator, a
stable ID, and timestamps, so they survive sync and re-rendering. Notes are
optional text on a highlight; both are editable and deletable, and work offline.
State is communicated by label as well as color (color-blind safe).

## Three removal / deletion levels

The product always distinguishes — and never conflates — these:

1. **Remove download from this device.** Frees local storage; the book and its
   reading activity remain in the cloud and on other devices.
2. **Remove the cloud file, keep metadata and reading activity.** The file is
   gone from the cloud but the book entry, progress, and highlights remain.
3. **Delete everywhere.** The book and all its reading data are removed across
   all devices (with tombstones so stale offline copies do not resurrect it).

Account deletion is a separate, explicit action with stated consequences and
confirmation.

## Sync status model

One status at a time, always textual, shown quietly in the Library header and
echoed where relevant:

- **Synced** — everything accepted and pulled.
- **Syncing** — an active transfer or mutation exchange.
- **Offline** — local work continues and is queued; reading is unaffected.
- **Needs attention** — a conflict, quota/size error, or failed action needs a
  decision.

## Brand Personality

Calm, familiar, trustworthy.

The product voice is plain and specific. It avoids technical language unless the
user is diagnosing a problem. It states clearly whether an action affects this
device, the cloud file, or the whole library.

## Anti-references

- KOReader's file-browser-first launch experience, plugin surface, and dense
  specialist menus.
- Cloud-drive interfaces that expose folders, upload queues, or manual push/pull
  behavior as the primary model.
- Generic dashboard styling, decorative analytics, and card grids that make a
  reading library feel like business software.
- Glassmorphism, gradients, heavy shadows, neon accents, and motion that
  competes with the page.
- Copying ReadEra branding, proprietary assets, icons, or screenshots.

## Design Principles

1. **The book is the destination.** Every screen should shorten the path from
   recognition to reading.
2. **One library, not three devices.** Sync is automatic infrastructure; the UI
   shows state and recovery actions without exposing transport mechanics.
3. **Common actions stay visible.** Import, search, continue, contents,
   appearance, bookmark, and highlight never hide behind expert menus.
4. **Consequences are explicit.** Removal and deletion language always names its
   device, cloud, and library scope.
5. **Quiet is earned through precision.** Fewer controls require stronger
   hierarchy, spacing, states, and accessibility rather than less design work.

## Accessibility & Inclusion

The product targets WCAG 2.2 AA for contrast and interaction behavior. Android
touch targets are at least 48dp. Windows controls are keyboard reachable with
visible focus, and Escape closes temporary surfaces. Text scaling, screen-reader
labels, reduced motion, color-blind-safe state communication, and non-color
annotation labels are required.

## Success criteria for Checkpoint 1 (next slice)

The first coded slice — a calm Windows Library over the books already in
Thorium's local library — succeeds when: the app opens to the cover-first
Library instead of Thorium's catalog; existing books show and open into the
reader; an empty shelf shows one clear add action; search and the four filters
work in place; Continue reading appears only with unfinished books; a textual
sync status is visible; and every action works by both mouse and keyboard. No
account, network, or managed-storage work is required for this slice.
