# Simple Cloud Reader — Frontend Architecture

A calm, offline-first reading app for Windows (Electron) with cross-device sync coming to Android (KOReader). This document explains how the frontend is structured, how data moves through it, and the decisions behind the design. Written so a developer can understand the whole thing without running the app.

---

## What this is, in one paragraph

Simple Cloud Reader layers a new UI on top of Thorium Reader (an open-source Electron EPUB app built by EDRLab on Readium). Rather than forking Thorium, we swap the library route and inject a design token override. Thorium handles the heavy lifting — EPUB parsing, DRM, text rendering, audio overlays. We own the library screen, the reading controls, sync state surfacing, and the design system. The backend (Railway + Turso) is a separate service; the frontend talks to it only through a typed OpenAPI client. Reading always works offline.

---

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Electron 41 (Chromium renderer + Node main process) |
| UI framework | React 18 (class components in Thorium, function components in our code) |
| State | Redux + redux-saga (Thorium's existing store, we dispatch into it) |
| Routing | redux-first-history + custom route table (not React Router) |
| Styling | SCSS modules — every `.scss` file needs a paired `.scss.d.ts` for TypeScript |
| EPUB engine | Readium (r2-shared-js, r2-streamer-js, r2-navigator-js) |
| Build | webpack 5, three separate configs (library renderer, reader renderer, main process) |
| Type checking | TypeScript, `fork-ts-checker-webpack-plugin` per build target |
| Tests | Jest, `corepack npm@11.17.0 run testFile -- <path>` |

---

## Process architecture

Electron splits the app into processes that communicate over IPC. Thorium uses three renderer processes and one main process.

```
┌──────────────────────────────────────────────────────────────────┐
│  Main process (Node.js)                                          │
│  src/main/                                                       │
│                                                                  │
│  Redux store + redux-saga                                        │
│  ├── publication sagas  (import, findAll, delete, export…)       │
│  ├── reader sagas       (open, close, position sync)             │
│  └── IPC bridge         (exposes API to renderers)               │
│                                                                  │
│  PublicationStorage → userData/publications/                     │
│  PublicationRepository → PouchDB (userData/db-publications/)     │
└──────────┬──────────────────────┬──────────────────────┬─────────┘
           │ IPC                  │ IPC                  │ IPC
┌──────────▼──────────┐ ┌────────▼────────┐ ┌───────────▼─────────┐
│  Library renderer   │ │ Reader renderer │ │   PDF/Preload       │
│  port :8090 (dev)   │ │ port :8191(dev) │ │   renderers         │
│                     │ │                 │ │                     │
│  Our code lives     │ │  Thorium's      │ │  Untouched          │
│  here (Cp1+)        │ │  reader UI      │ │                     │
└─────────────────────┘ └─────────────────┘ └─────────────────────┘
```

The library renderer is where all our Checkpoint 1 work lives. The reader renderer opens when a user opens a book — we haven't touched it yet (Checkpoint 4).

---

## Library renderer internals

### Route table

`src/renderer/library/routing.ts`

```
/              → SimpleLibrary   ← our Cp1 swap
/home          → SimpleLibrary   ← our Cp1 swap
/library       → AllPublicationPage  (Thorium's full list, untouched)
/opds          → Opds            (OPDS catalog browser, untouched)
/opds/:id/...  → Browser         (OPDS feed browser, untouched)
```

We replaced the two user-facing entry routes and left everything else alone. No new routing infrastructure — just a component swap at the route table level.

### Component tree

```
LibraryLayout  (Thorium — provides sidebar nav, header shell)
└── SimpleLibrary                         src/renderer/library/components/simpleLibrary/SimpleLibrary.tsx
    ├── SyncStatusPill                    SyncStatusPill.tsx
    ├── ResumeHero  (when in-progress book exists)
    │   └── Cover  (Thorium component — renders cover art or colored fallback)
    ├── LibraryFilters
    │   ├── <input>  (search)
    │   └── <button> × 4  (All / In Progress / Not Started / Finished)
    └── cover grid
        └── PublicationCard × N  (Thorium component — renders one book tile)
```

`SimpleLibrary` is the only stateful component. The rest are pure presentational — they receive props and render. `libraryModel.ts` contains all the logic as plain functions so it can be unit tested without React.

---

## Data flow: books appearing on screen

This is the full path from app load to cover grid rendering.

```
1. SimpleLibrary mounts
        │
        ▼
2. useEffect fires
   apiAction("publication/findAll")
        │  IPC call to main process
        ▼
3. Main process saga: publication/findAll
   PublicationRepository.findAll()  →  PouchDB query
        │  returns PublicationDocument[]
        ▼
4. Converter: PublicationDocument → PublicationView
   (adds cover URL, formats metadata for renderer)
        │  IPC response
        ▼
5. setPubs(views)  →  React re-render
   libraryModel.filterPublications(pubs, filter, query, locale)
        │
        ▼
6. cover grid renders <PublicationCard> for each visible pub
```

After the initial load, `apiSubscribe` keeps the list live. It registers callbacks on these channels:

```ts
"publication/importFromFs"    // new book imported
"publication/delete"          // book removed
"publication/importFromLink"  // OPDS import
"publication/updateTags"      // tags changed
"publication/findAllRefresh"  // manual refresh signal
"publication/recover"         // import recovery
```

Any of these firing triggers a fresh `findAll` call. The UI stays in sync with the local database without polling.

---

## Data flow: opening a book

```
User clicks cover card (PublicationCard)
        │
        ▼
PublicationCard dispatches:
readerActions.openRequest.build(identifier)
        │  Redux action → main process saga
        ▼
main/redux/sagas/reader.ts
Opens the reader window, loads the EPUB via Readium streamer
        │
        ▼
Reader renderer (port :8191) opens in a new Electron window
Thorium's existing reader UI renders the book
```

We don't intercept or modify this path. `openRequest` is a stable Thorium action — dispatching it from our components is safe and forward-compatible.

---

## Reading-state model

`src/renderer/library/components/simpleLibrary/libraryModel.ts`

Every `PublicationView` carries two relevant fields:

| Field | Type | Meaning |
|---|---|---|
| `lastReadTimeStamp` | `number \| undefined` | Unix ms of last reading session; `0` or absent means never opened |
| `readingFinished` | `boolean` | User explicitly marked as finished |
| `lastReadingLocation.locator.locations.progression` | `number 0–1` | Reading progress as a fraction |

We derive state from these without any new fields:

```ts
function getReadingState(pub): "reading" | "toRead" | "finished" {
    if (pub.readingFinished)               return "finished";
    if (pub.lastReadTimeStamp > 0)         return "reading";
    return "toRead";
}
```

Progress percentage:

```ts
function getProgress(pub): number | undefined {
    const p = pub.lastReadingLocation?.locator?.locations?.progression;
    if (typeof p !== "number" || p < 0 || p > 1) return undefined;
    return p;  // multiply by 100 for display
}
```

Resume hero selects the most recently opened in-progress book:

```ts
function selectContinueReading(pubs): PublicationView | undefined {
    return pubs
        .filter(p => getReadingState(p) === "reading")
        .sort((a, b) => (b.lastReadTimeStamp || 0) - (a.lastReadTimeStamp || 0))[0];
}
```

All of this is pure logic — no React, no Redux. 16 unit tests in `test/library/libraryModel.test.ts`.

---

## Sync status model

`src/renderer/library/components/simpleLibrary/SyncStatusPill.tsx`

Four states, always shown as text (never icon-only):

| Status | Glyph | Meaning |
|---|---|---|
| `synced` | ● | All changes uploaded, nothing pending |
| `syncing` | ◍ | Upload or download in progress |
| `offline` | ○ | No network; reads fine, changes queue locally |
| `attention` | ▲ | Conflict or error that needs user action |

Checkpoint 1 hardcodes `status="offline"` — the pill is a real component, the state wire-up to the backend comes in Checkpoint 8.

---

## Design token layering

We don't fork Thorium's SCSS. Instead we inject two layers on top of it:

### Layer 1 — Thorium override variables

`src/renderer/assets/styles/partials/_simpleCloudTheme.scss`

Thorium's `partials/variables.scss` reads theme from CSS custom properties with a `_light` / `_dark` suffix:

```scss
--theme-primary_light   → used as link color, button fill in light mode
--theme-background_light → page canvas in light mode
// etc.
```

We set these in `:root` before `variables.scss` consumes them, which re-skins the whole app without touching a single Thorium file:

```scss
:root {
    --theme-primary_light:    #5b6b8c;  // slate instead of Thorium blue
    --theme-background_light: #f7f8fa;  // cool off-white canvas
    --theme-neutral_light:    #fff;
    // ...dark variants too
}
```

### Layer 2 — product tokens

Also in `_simpleCloudTheme.scss`. These don't exist in Thorium — we add them for our own components:

```scss
--sc-canvas:        #f7f8fa   // page background
--sc-surface:       #fff      // card/input background
--sc-surface-muted: #eef1f5   // resume card, subdued surfaces
--sc-ink:           #2b2f36   // body text
--sc-ink-muted:     #6b7280   // secondary text, labels
--sc-accent:        #5b6b8c   // active filter pills, buttons, progress fill
--sc-outline:       #e1e5ec   // borders
--sc-focus:         #2e6f9a   // keyboard focus ring
```

Status pill tokens follow the same pattern: `--sc-status-synced-text`, `--sc-status-synced-bg`, etc.

All our SCSS files use only `--sc-*` tokens. Thorium's components use only `--theme-*` tokens (via `variables.scss`). The two layers don't cross.

### SCSS module `.d.ts` files

Thorium's webpack config treats `.scss` imports as CSS modules but doesn't auto-generate type declarations. Every `.scss` file consumed as `import * as styles from "...scss"` needs a manually maintained sibling `.scss.d.ts`:

```ts
// simpleLibrary.scss.d.ts
export declare const library_root: string;
export declare const resume_card: string;
// one line per class name
```

If you add a class to the `.scss` and forget the `.d.ts`, the renderer build will crash with `TS2339: Property '...' does not exist`.

---

## Build configuration

Three separate webpack configs, each with its own tsconfig:

| Config | tsconfig | Entry | Output |
|---|---|---|---|
| `webpack.config.renderer-library.js` | `tsconfig_renderer.json` | `src/renderer/library/index.tsx` | library renderer bundle |
| `webpack.config.renderer-reader.js` | `tsconfig_renderer.json` | `src/renderer/reader/index.tsx` | reader renderer bundle |
| `webpack.config.main.js` | `tsconfig_main.json` | `src/main/index.ts` | Electron main process |

`tsconfig_renderer.json` and `tsconfig_main.json` both extend the root `tsconfig.json`, which includes `test/**/*`. We exclude test files explicitly in each build config to prevent Jest globals (`describe`, `it`, `expect`) from leaking into the app bundle:

```json
{
    "extends": "./tsconfig",
    "exclude": ["./node_modules", "./test/**/*"]
}
```

In development, each renderer runs as a webpack-dev-server (HMR). The main process runs as a regular webpack watch. `start:dev:quick` runs all three concurrently:

```
library dev server  → http://localhost:8090
reader dev server   → http://localhost:8191
main process        → dist/main.js (Electron loads this)
```

`npm run start:dev` and sub-commands require npm ≥ 11.15.0 due to `devEngines.packageManager` in `package.json`. Run everything with `corepack npm@11.17.0 run <script>` to bypass the local npm version.

---

## File map

```
apps/windows/src/
├── main/                          Electron main process (Node.js)
│   ├── di.ts                      Dependency injection — storage paths, repositories
│   ├── redux/sagas/api/
│   │   └── publication/
│   │       ├── import/            Import pipeline (hash, dedup, convert, store)
│   │       ├── findAll.ts         Publication list query
│   │       └── delete.ts          Removal logic
│   └── db/document/publication.ts PublicationDocument shape (stored form)
│
└── renderer/
    ├── assets/styles/
    │   ├── global.scss            Imports all partials including simpleCloudTheme
    │   ├── partials/
    │   │   ├── variables.scss     Thorium's token consumer (reads --theme-* vars)
    │   │   └── _simpleCloudTheme.scss  ← our token injection layer
    │   └── components/
    │       ├── simpleLibrary.scss       ← our component styles
    │       └── simpleLibrary.scss.d.ts  ← required type declarations
    │
    └── library/
        ├── routing.ts             Route table — / and /home → SimpleLibrary
        └── components/
            └── simpleLibrary/     ← everything we built in Checkpoint 1
                ├── SimpleLibrary.tsx    Route component, data wiring
                ├── LibraryFilters.tsx   Search + filter pills
                ├── ResumeHero.tsx       Continue-reading card
                ├── SyncStatusPill.tsx   Sync state indicator
                └── libraryModel.ts      Pure logic (reading state, filter, search)

test/
└── library/
    └── libraryModel.test.ts       16 unit tests for libraryModel
```

---

## Cross-device sync (Checkpoint 8)

The backend is already built and deployed (Railway + Turso). The frontend sync loop will work like this:

```
Windows app                    Backend (Railway/Turso)         Android (KOReader)
     │                                   │                              │
     │── POST /sync/position ───────────►│                              │
     │                                   │◄── GET /sync/position ───────│
     │◄── GET /sync/position ────────────│                              │
     │                                   │── POST /sync/position ──────►│
```

Both clients push their latest reading position, highlights, and bookmarks. The backend resolves conflicts by last-write-wins on position (further-along wins for highlights). The `SyncStatusPill` surfaces the current state — already wired as a component, just needs the real status fed in.

---

## What's next

| Checkpoint | Scope |
|---|---|
| 4 | Reader UI — Quiet Slate controls bar, progress indicator, appearance panel |
| 5 | Custom book cover — set cover art for books with no embedded image |
| 6 | Dark mode — `--sc-*` dark token variants |
| 7 | Annotations — 4-role highlights, bookmarks, notes (local storage) |
| 8 | Account + sync — sign-in, real sync status, Railway/Turso wire-up |
| 9 | Android KOReader integration |
