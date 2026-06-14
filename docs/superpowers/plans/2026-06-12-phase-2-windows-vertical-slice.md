# Phase 2 Windows Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an unsigned Windows application that opens into the approved
Quiet Bookshelf library, authenticates with the Railway API, keeps an imported
EPUB in managed local storage, synchronizes its file, progress, and one
highlight, and restores the exact Readium location after restart.

**Architecture:** Preserve Thorium's Readium renderer, publication repository,
import pipeline, and Electron runtime boundaries. Add a localized
`src/common/simpleCloud`, `src/main/simpleCloud`, and
`src/renderer/*/simpleCloud` product layer. The Electron main process owns
credentials, network calls, managed-file synchronization, and durable sync
state; renderers communicate through Thorium's existing typed API and Redux
action bridge.

**Tech Stack:** Electron 41, React 19, Redux Saga, TypeScript, SCSS modules,
Readium Desktop, Electron `safeStorage`, OpenAPI 3.1, `openapi-typescript`,
Vitest/Jest, Playwright browser verification, NSIS.

---

## Scope Boundaries

This phase implements one Windows vertical slice:

- EPUB import through the existing file picker and drag-and-drop paths.
- Managed local copy through Thorium's existing publication storage.
- Magic-link sign-in and secure refresh-token persistence.
- Upload/download through signed URLs.
- Book, file availability, progress, and highlight synchronization.
- Quiet Bookshelf library and four visible sync states.
- Exact Readium locator and one highlight restored after restart.
- Unsigned NSIS installer.

Collections, full settings replacement, PDF qualification, note conflict UI,
resumable upload, account deletion, and complete offline queue recovery remain
in their later roadmap phases.

## File Structure

```text
apps/windows/
  scripts/generate-simple-cloud-api.mjs
  src/common/api/interface/simpleCloudApi.interface.ts
  src/common/simpleCloud/
    api.types.ts
    canonicalLocator.ts
    models.ts
    syncOperations.ts
  src/main/simpleCloud/
    api.ts
    client.ts
    credentialVault.ts
    managedFileSync.ts
    store.ts
    syncEngine.ts
  src/renderer/library/components/simpleCloud/
    AccountPanel.tsx
    BookTile.tsx
    EmptyLibrary.tsx
    LibraryHeader.tsx
    LibraryScreen.tsx
    SyncStatus.tsx
  src/renderer/library/redux/simpleCloud/
    actions.ts
    reducer.ts
    saga.ts
  src/renderer/reader/simpleCloud/
    captureReadingState.ts
    highlightRoles.ts
  src/renderer/assets/styles/simpleCloud/
    library.scss
    tokens.scss
  test/simpleCloud/
    apiClient.test.ts
    credentialVault.test.ts
    libraryScreen.test.tsx
    managedFileSync.test.ts
    syncEngine.test.ts
    readerState.test.ts
```

`src/common` contains runtime-neutral contracts. `src/main` owns Electron,
filesystem, credentials, and HTTP. Library and reader renderers never import
from each other or from `src/main`.

### Task 1: Generate the typed API contract

**Files:**
- Create: `apps/windows/scripts/generate-simple-cloud-api.mjs`
- Create: `apps/windows/src/common/simpleCloud/api.types.ts`
- Modify: `apps/windows/package.json`
- Modify: `.github/workflows/phase-0.yml`
- Test: `apps/windows/test/simpleCloud/apiContract.test.ts`

- [ ] **Step 1: Write the failing generated-contract test**

```ts
import type { paths } from "readium-desktop/common/simpleCloud/api.types";

type PushBody =
    paths["/v1/sync/push"]["post"]["requestBody"]["content"]["application/json"];

describe("Simple Cloud generated API", () => {
    it("contains the authenticated sync and file routes", () => {
        const body: PushBody = { deviceId: crypto.randomUUID(), operations: [] };
        expect(body.operations).toEqual([]);
    });
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
corepack npm@11.17.0 run testFile -- test/simpleCloud/apiContract.test.ts
```

Expected: FAIL because `api.types.ts` does not exist.

- [ ] **Step 3: Add deterministic generation**

Install `openapi-typescript` as a development dependency and create:

```js
import fs from "node:fs/promises";
import openapiTS, { astToString } from "openapi-typescript";

const input = new URL(
  "../../../packages/sync-contract/openapi/simple-cloud-reader-v1.json",
  import.meta.url,
);
const output = new URL(
  "../src/common/simpleCloud/api.types.ts",
  import.meta.url,
);
const schema = JSON.parse(await fs.readFile(input, "utf8"));
const ast = await openapiTS(schema);
await fs.writeFile(output, astToString(ast), "utf8");
```

Add:

```json
"generate:simple-cloud-api": "node scripts/generate-simple-cloud-api.mjs"
```

CI runs generation and `git diff --exit-code` before the Windows build.

- [ ] **Step 4: Generate and verify GREEN**

```powershell
corepack npm@11.17.0 run generate:simple-cloud-api
corepack npm@11.17.0 run testFile -- test/simpleCloud/apiContract.test.ts
git diff --exit-code -- src/common/simpleCloud/api.types.ts
```

- [ ] **Step 5: Commit**

```powershell
git add apps/windows .github/workflows/phase-0.yml
git commit -m "build(windows): generate the cloud API contract"
```

### Task 2: Add the durable local cloud store

**Files:**
- Create: `apps/windows/src/common/simpleCloud/models.ts`
- Create: `apps/windows/src/main/simpleCloud/store.ts`
- Test: `apps/windows/test/simpleCloud/store.test.ts`

- [ ] **Step 1: Write failing atomic-store tests**

Prove that a fresh store creates this durable state and that a write followed
by reopen preserves it:

```ts
export interface SimpleCloudState {
    deviceId: string;
    account: { userId: string; email: string } | null;
    cursor: string | null;
    books: Record<string, {
        cloudBookId: string;
        publicationIdentifier: string;
        fileId: string | null;
        sha256: string;
    }>;
    pendingOperations: MutationOperation[];
}
```

Also prove a truncated primary file recovers from the last valid `.backup`.

- [ ] **Step 2: Run the focused test and verify RED**

```powershell
corepack npm@11.17.0 run testFile -- test/simpleCloud/store.test.ts
```

- [ ] **Step 3: Implement atomic persistence**

`SimpleCloudStore` writes sorted JSON to `simple-cloud-state.tmp`, flushes it,
renames the current file to `.backup`, then renames the temp file to
`simple-cloud-state.json`. It validates loaded data and never stores access or
refresh tokens.

- [ ] **Step 4: Run the focused test and verify GREEN**

```powershell
corepack npm@11.17.0 run testFile -- test/simpleCloud/store.test.ts
```

- [ ] **Step 5: Commit**

```powershell
git add apps/windows/src/common/simpleCloud apps/windows/src/main/simpleCloud apps/windows/test/simpleCloud
git commit -m "feat(windows): persist local cloud reading state"
```

### Task 3: Add secure authentication and typed main-process API

**Files:**
- Create: `apps/windows/src/common/api/interface/simpleCloudApi.interface.ts`
- Modify: `apps/windows/src/common/api/api.type.ts`
- Modify: `apps/windows/src/common/api/methodApi.type.ts`
- Modify: `apps/windows/src/common/api/moduleApi.type.ts`
- Modify: `apps/windows/src/main/di.ts`
- Modify: `apps/windows/src/main/diSymbolTable.ts`
- Modify: `apps/windows/src/main/redux/sagas/api/index.ts`
- Create: `apps/windows/src/main/simpleCloud/credentialVault.ts`
- Create: `apps/windows/src/main/simpleCloud/client.ts`
- Create: `apps/windows/src/main/simpleCloud/api.ts`
- Test: `apps/windows/test/simpleCloud/credentialVault.test.ts`
- Test: `apps/windows/test/simpleCloud/apiClient.test.ts`

- [ ] **Step 1: Write failing credential-vault tests**

Test an injected `safeStorage` adapter:

```ts
interface SecureStorage {
    isEncryptionAvailable(): boolean;
    encryptString(value: string): Buffer;
    decryptString(value: Buffer): string;
}
```

The vault persists only encrypted refresh-token bytes, refuses plaintext
fallback, and removes the token on sign-out.

- [ ] **Step 2: Write failing API-client tests**

Mock `fetch` and prove:

- `requestMagicLink(email)` sends `POST /v1/auth/magic-link`.
- `redeemMagicLink(token, device)` stores the refresh token and returns only
  account/session metadata to the renderer.
- a `401` refreshes once, rotates the stored refresh token, and retries.
- a second `401` signs out and returns `session_expired`.
- response bodies and signed URLs are never logged.

- [ ] **Step 3: Implement the `simpleCloud` API module**

Expose:

```ts
export interface ISimpleCloudApi {
    getSession(): SagaGenerator<SimpleCloudSession>;
    requestMagicLink(email: string): SagaGenerator<{ accepted: true }>;
    redeemMagicLink(input: MagicLinkRedeem): SagaGenerator<SimpleCloudSession>;
    signOut(): SagaGenerator<void>;
    syncNow(): SagaGenerator<SimpleCloudSyncSummary>;
}
```

Bind `simpleCloudApi` under `simpleCloud-api` in `di.ts`, following the
existing publication API pattern.

- [ ] **Step 4: Run tests and main-process build**

```powershell
corepack npm@11.17.0 run testFile -- test/simpleCloud/credentialVault.test.ts test/simpleCloud/apiClient.test.ts
corepack npm@11.17.0 run build:dev:main
```

- [ ] **Step 5: Commit**

```powershell
git add apps/windows/src/common/api apps/windows/src/common/simpleCloud apps/windows/src/main apps/windows/test/simpleCloud
git commit -m "feat(windows): add secure cloud authentication"
```

### Task 4: Replace catalog-first launch with Quiet Bookshelf

**Files:**
- Create: `apps/windows/src/renderer/library/components/simpleCloud/LibraryScreen.tsx`
- Create: `apps/windows/src/renderer/library/components/simpleCloud/LibraryHeader.tsx`
- Create: `apps/windows/src/renderer/library/components/simpleCloud/BookTile.tsx`
- Create: `apps/windows/src/renderer/library/components/simpleCloud/EmptyLibrary.tsx`
- Create: `apps/windows/src/renderer/library/components/simpleCloud/SyncStatus.tsx`
- Create: `apps/windows/src/renderer/assets/styles/simpleCloud/tokens.scss`
- Create: `apps/windows/src/renderer/assets/styles/simpleCloud/library.scss`
- Modify: `apps/windows/src/renderer/library/routing.ts`
- Modify: `apps/windows/src/renderer/library/components/App.tsx`
- Modify: `apps/windows/package.json`
- Modify: `apps/windows/webpack.config-preprocessor-directives.js`
- Test: `apps/windows/test/simpleCloud/libraryScreen.test.tsx`

- [ ] **Step 1: Write failing behavior tests**

Render the screen with publication fixtures and prove:

- the root route shows `Library`, not Thorium onboarding or OPDS.
- `Continue reading` appears only when unfinished books exist.
- filters are `All`, `Reading`, `To read`, and `Finished`.
- search filters title and author without changing the route.
- activating a tile dispatches `readerActions.openRequest`.
- empty state says `Add your first book` and exposes one `Add book` action.
- sync state always includes visible text.

- [ ] **Step 2: Add the product token bridge**

Use CSS custom properties with the approved palette:

```scss
.simpleCloudRoot {
  --scr-canvas: oklch(97.2% 0.008 93);
  --scr-surface: oklch(98.8% 0.008 93);
  --scr-muted: oklch(94.3% 0.009 93);
  --scr-ink: oklch(27% 0.012 112);
  --scr-ink-muted: oklch(47% 0.014 112);
  --scr-outline: oklch(87% 0.012 102);
  --scr-accent: oklch(48% 0.045 185);
  --scr-focus: oklch(49% 0.105 240);
}
```

Use Segoe UI, 48px controls, visible 2px focus rings, no gradients, and no
persistent panel shadows. Covers use a 6px radius and one subtle physical
shadow.

- [ ] **Step 3: Implement the responsive library**

The desktop layout is:

```text
Library                           Search  Add book  Synced  Account
All  Reading  To read  Finished

Continue reading
[large cover] title, author, progress

All books
[cover] [cover] [cover] [cover] ...
```

Use CSS grid `repeat(auto-fill, minmax(148px, 1fr))`, cap content at 1440px,
and keep book tiles unboxed. Titles clamp to two lines. The account button
opens an inline anchored panel, not a modal.

- [ ] **Step 4: Rebrand the development build**

Set `build.productName` to `Simple Cloud Reader`, update the package
description, and disable Thorium telemetry and update checks for this
derivative. Preserve BSD notices and upstream attribution.

- [ ] **Step 5: Run component, lint, and renderer builds**

```powershell
corepack npm@11.17.0 run testFile -- test/simpleCloud/libraryScreen.test.tsx
$env:ESLINT_USE_FLAT_CONFIG = "false"
corepack npm@11.17.0 exec -- eslint src/renderer/library/components/simpleCloud test/simpleCloud/libraryScreen.test.tsx
corepack npm@11.17.0 run build:dev:renderer:library
```

- [ ] **Step 6: Verify visually**

Run the library renderer at `http://localhost:8090` and inspect at:

- `390x844` for narrow-window behavior.
- `1024x768` for tablet-sized behavior.
- `1440x900` for desktop behavior.

Verify no clipped controls, no hover-only actions, keyboard focus visibility,
two-line titles, and accent usage below ten percent of the library surface.

- [ ] **Step 7: Commit**

```powershell
git add apps/windows
git commit -m "feat(windows): add the Quiet Bookshelf library"
```

### Task 5: Add account flow and sync status UI

**Files:**
- Create: `apps/windows/src/renderer/library/components/simpleCloud/AccountPanel.tsx`
- Create: `apps/windows/src/renderer/library/redux/simpleCloud/actions.ts`
- Create: `apps/windows/src/renderer/library/redux/simpleCloud/reducer.ts`
- Create: `apps/windows/src/renderer/library/redux/simpleCloud/saga.ts`
- Modify: `apps/windows/src/renderer/library/redux/reducers/index.ts`
- Modify: `apps/windows/src/renderer/library/redux/sagas/index.ts`
- Modify: `apps/windows/src/common/redux/states/renderer/libraryRootState.ts`
- Test: `apps/windows/test/simpleCloud/accountPanel.test.tsx`

- [ ] **Step 1: Write failing account-flow tests**

Prove the inline panel has these states:

1. Signed out: email field and `Email me a sign-in link`.
2. Link sent: plain confirmation plus token/deep-link redemption field for
   development.
3. Signed in: email, `Synced`, `Sync now`, and `Sign out`.
4. Expired: `Sign in again` with no technical token language.

- [ ] **Step 2: Implement Redux state and saga**

```ts
export interface SimpleCloudRendererState {
    session: "loading" | "signedOut" | "linkSent" | "signedIn" | "expired";
    email: string | null;
    sync: "synced" | "syncing" | "offline" | "needsAttention";
    lastSyncedAt: string | null;
    message: string | null;
}
```

The saga calls only the typed `simpleCloud/*` main API. It triggers sync on
startup, successful redemption, import completion, and application focus.

- [ ] **Step 3: Run focused tests and renderer build**

```powershell
corepack npm@11.17.0 run testFile -- test/simpleCloud/accountPanel.test.tsx
corepack npm@11.17.0 run build:dev:renderer:library
```

- [ ] **Step 4: Commit**

```powershell
git add apps/windows
git commit -m "feat(windows): add account and sync status"
```

### Task 6: Synchronize managed EPUB files

**Files:**
- Create: `apps/windows/src/main/simpleCloud/managedFileSync.ts`
- Modify: `apps/windows/src/main/simpleCloud/api.ts`
- Modify: `apps/windows/src/main/redux/sagas/api/publication/import/index.ts`
- Test: `apps/windows/test/simpleCloud/managedFileSync.test.ts`

- [ ] **Step 1: Write failing managed-file tests**

Using a temporary EPUB fixture, prove:

- SHA-256 is calculated from the managed copy, not the source path.
- import creates a book mutation before reserving a file.
- upload uses the returned signed URL with the exact byte length and content
  type.
- completion is sent only after a successful upload.
- retry reuses the existing per-user file reservation.
- source deletion does not break the managed copy.

- [ ] **Step 2: Implement the import hook**

After `publication/importFromFs` returns `PublicationView[]`, resolve each
managed publication path through `PublicationStorage`, enqueue a book
operation, and call `ManagedFileSync.ensureUploaded`.

- [ ] **Step 3: Implement cloud restore**

For a pulled ready `fileObject` without a local publication mapping:

1. Request `/v1/files/{fileId}/download-url`.
2. Download to a temporary file.
3. Verify byte length and SHA-256.
4. Import through Thorium's existing import service.
5. Atomically record the publication-to-cloud mapping.

- [ ] **Step 4: Run focused tests and main build**

```powershell
corepack npm@11.17.0 run testFile -- test/simpleCloud/managedFileSync.test.ts
corepack npm@11.17.0 run build:dev:main
```

- [ ] **Step 5: Commit**

```powershell
git add apps/windows
git commit -m "feat(windows): sync managed EPUB files"
```

### Task 7: Synchronize progress and highlights

**Files:**
- Create: `apps/windows/src/common/simpleCloud/syncOperations.ts`
- Create: `apps/windows/src/main/simpleCloud/syncEngine.ts`
- Create: `apps/windows/src/renderer/reader/simpleCloud/captureReadingState.ts`
- Create: `apps/windows/src/renderer/reader/simpleCloud/highlightRoles.ts`
- Modify: `apps/windows/src/renderer/reader/redux/sagas/index.ts`
- Modify: `apps/windows/src/renderer/reader/redux/sagas/note.ts`
- Test: `apps/windows/test/simpleCloud/syncEngine.test.ts`
- Test: `apps/windows/test/simpleCloud/readerState.test.ts`

- [ ] **Step 1: Write failing operation-mapping tests**

Prove:

- Readium location becomes a canonical `progress` operation.
- annotation selected text, prefix, suffix, locator, role, and optional note
  become a `highlight` operation.
- yellow, blue, pink, and green map to `important`, `question`, `quote`, and
  `review`.
- operation IDs remain stable across a retry.

- [ ] **Step 2: Write failing two-way sync tests**

With a fake HTTP client and durable store:

- push pending operations, then pull from the returned cursor.
- duplicate results remove the matching pending operation.
- pulled progress restores the exact Readium locator.
- pulled highlights merge by stable annotation ID.
- tombstones delete local highlights.
- `version_conflict` leaves the local value recoverable and marks sync
  `needsAttention`.

- [ ] **Step 3: Implement capture hooks**

Debounce progress capture to five seconds and flush on reader close. Enqueue
highlight changes after Thorium's note saga has persisted them locally. Do not
block page turns or annotation creation on network work.

- [ ] **Step 4: Implement pull application**

Apply one pull page in a local transaction-like store update. Save the new
cursor only after every change applies. Restore the pulled locator when opening
the publication and preserve normalized progression as fallback.

- [ ] **Step 5: Run reader tests and builds**

```powershell
corepack npm@11.17.0 run testFile -- test/simpleCloud/syncEngine.test.ts test/simpleCloud/readerState.test.ts test/simpleCloud/canonicalLocator.test.ts
corepack npm@11.17.0 run build:dev:renderer:reader
corepack npm@11.17.0 run build:dev:main
```

- [ ] **Step 6: Commit**

```powershell
git add apps/windows
git commit -m "feat(windows): sync progress and highlights"
```

### Task 8: Simplify the reader controls for the vertical slice

**Files:**
- Create: `apps/windows/src/renderer/assets/styles/simpleCloud/reader.scss`
- Modify: `apps/windows/src/renderer/reader/components/Reader.tsx`
- Modify: `apps/windows/src/renderer/reader/components/ReaderHeader.tsx`
- Modify: `apps/windows/src/renderer/reader/components/AnnotationEdit.tsx`
- Test: `apps/windows/test/simpleCloud/readerControls.test.tsx`

- [ ] **Step 1: Write failing visible-control tests**

The default reader overlay exposes only:

- Back to library.
- Contents.
- Progress.
- Appearance.
- Bookmark.
- More.

The selection toolbar exposes Highlight, Note, Copy, and Define. Highlight
offers four labeled roles and immediately reuses the last role.

- [ ] **Step 2: Implement a product-mode presentation adapter**

Keep all Readium behavior underneath, but hide specialist controls from the
default product mode. Contents uses Chapters, Highlights, and Bookmarks. Wide
windows use a persistent side panel; narrow windows use an overlay sheet.

- [ ] **Step 3: Verify keyboard and reduced motion behavior**

Every action is reachable by Tab and has a visible focus ring. Escape closes
temporary surfaces. Motion uses transform/opacity for 150 to 220ms and is
disabled under `prefers-reduced-motion`.

- [ ] **Step 4: Run tests and reader build**

```powershell
corepack npm@11.17.0 run testFile -- test/simpleCloud/readerControls.test.tsx
corepack npm@11.17.0 run build:dev:renderer:reader
```

- [ ] **Step 5: Commit**

```powershell
git add apps/windows
git commit -m "feat(windows): simplify reader controls"
```

### Task 9: Prove restart, offline reading, and packaging

**Files:**
- Create: `apps/windows/test/simpleCloud/windowsVertical.e2e.test.ts`
- Create: `docs/spikes/phase-2-windows-results.md`
- Modify: `.github/workflows/phase-0.yml`
- Modify: `apps/windows/package.json`

- [ ] **Step 1: Add the automated vertical proof**

The test uses a fake API server and performs:

1. Request and redeem a magic link.
2. Import a non-DRM EPUB.
3. Verify the managed copy remains after deleting the source fixture.
4. Upload and complete the cloud file.
5. Open the book and capture an exact locator.
6. Create an Important highlight.
7. Restart the app services.
8. Reopen offline at the exact locator with the highlight present.
9. Reconnect and receive `Synced`.

- [ ] **Step 2: Run complete Windows verification**

```powershell
corepack npm@11.17.0 run generate:simple-cloud-api
corepack npm@11.17.0 run testFile -- test/simpleCloud
$env:ESLINT_USE_FLAT_CONFIG = "false"
corepack npm@11.17.0 exec -- eslint src/common/simpleCloud src/main/simpleCloud src/renderer/library/components/simpleCloud src/renderer/reader/simpleCloud test/simpleCloud
corepack npm@11.17.0 run build:dev:main
corepack npm@11.17.0 run build:dev:renderer:library
corepack npm@11.17.0 run build:dev:renderer:reader
corepack npm@11.17.0 run package:win
```

- [ ] **Step 3: Record manual evidence**

Document:

- installer path and SHA-256.
- exact EPUB fixture and license.
- signed upload/download evidence.
- offline restart evidence.
- restored locator and highlight IDs.
- screenshots at 1024x768 and 1440x900.
- any remaining upstream audit findings.

- [ ] **Step 4: Commit**

```powershell
git add .github apps/windows docs/spikes/phase-2-windows-results.md
git commit -m "test(windows): prove the cloud reader vertical slice"
```

## Exit Gate

Phase 2 passes only when:

1. The application identifies itself as Simple Cloud Reader while retaining
   upstream attribution and license notices.
2. Launch opens directly to Quiet Bookshelf without OPDS or onboarding.
3. Magic-link session refresh material is encrypted with Windows-protected
   Electron storage and never exposed to renderer code.
4. Imported EPUB content remains readable after the source file is removed.
5. A signed upload and signed download complete through the authenticated API.
6. Progress and one highlight survive restart and exact Readium restoration.
7. The same book remains fully readable with the network disabled.
8. Sync state always has visible text and actionable recovery copy.
9. Keyboard navigation, focus visibility, narrow-window layout, and reduced
   motion checks pass.
10. An unsigned NSIS installer is produced and its evidence is recorded.
