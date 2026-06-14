# Checkpoint 1 — Quiet Slate Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Thorium's first-run catalog (`/` and `/home`) with a calm, cover-first "Quiet Slate" Library rendered over the books already in Thorium's local database — no backend, account, or managed storage.

**Architecture:** A new `SimpleLibrary` route component reads local publications through the existing renderer API (`apiAction("publication/findAll")` + `apiSubscribe`), classifies each book's reading state with a pure, unit-tested model module, and renders a full-width auto-fit cover grid, a "Continue reading" resume hero, in-place search, four filter pills, and a textual sync-status pill. It reuses the existing `PublicationCard` (so the open-into-reader path and per-book menu are untouched), `PublicationAddButton` (import entry point), `LibraryLayout` (app chrome), and `Cover`. Quiet Slate visuals are applied additively by overriding Thorium's existing CSS token layer, not by forking it.

**Tech Stack:** TypeScript, React (function components + hooks), Redux (read-only via existing hooks), SCSS modules, Jest (ts-jest) for the pure model.

**Authoritative contracts:** `PRODUCT.md` and `DESIGN.md` (repo root, approved Checkpoint 0) and `FRONTEND_HANDOFF.md`.

**Safety rails (do not violate):**
- Do **not** revert, reformat, or commit the uncommitted Windows OpenAPI generation work (`apps/windows/src/common/simpleCloud/api.types.ts`, `tools/openapi-codegen/*`, etc.). Run `git status` before starting; leave that work as-is.
- No secrets, tokens, signed URLs, personal emails, or book files in code or commits.
- No backend/account/network/managed-storage in this checkpoint.
- Do not copy ReadEra branding/assets.
- This checkpoint ships **only** Checkpoint 1. Stop at the end for user review before Checkpoint 2.

**How to run commands (important):** `apps/windows` is the vendored Thorium app and is **NOT** an npm workspace. Run all scripts from inside `apps/windows` using the CI-matched package manager:
```bash
# from repo root:
cd apps/windows
corepack npm@11.17.0 run <script>
```
The local `npm` (11.14.1) fails the `devEngines` gate (`EBADDEVENGINES`); always use `corepack npm@11.17.0`.

**Paths in this plan** are relative to `apps/windows/` unless prefixed with `src/` shown in full. The renderer import alias `readium-desktop/...` maps to `src/...`.

---

## File Structure

**Create:**
- `src/renderer/library/components/simpleLibrary/libraryModel.ts` — pure reading-state / filter / search / resume / progress logic (no React, no Redux).
- `src/renderer/library/components/simpleLibrary/SimpleLibrary.tsx` — route component (replaces `Catalog` at `/` and `/home`).
- `src/renderer/library/components/simpleLibrary/ResumeHero.tsx` — "Continue reading" card.
- `src/renderer/library/components/simpleLibrary/LibraryFilters.tsx` — All / Reading / To read / Finished pills + search field.
- `src/renderer/library/components/simpleLibrary/SyncStatusPill.tsx` — textual sync-status pill (static "Offline / local" for this checkpoint).
- `src/renderer/assets/styles/components/simpleLibrary.scss` — SCSS module for the Library.
- `src/renderer/assets/styles/partials/_simpleCloudTheme.scss` — Quiet Slate token overrides (additive).
- `test/library/libraryModel.test.ts` — Jest tests for the pure model.

**Modify:**
- `src/renderer/library/routing.ts` — point `/` and `/home` at `SimpleLibrary` instead of `Catalog`.
- `src/renderer/assets/styles/global.scss` — `@use` the Slate token partial after `variables`.

**Reuse unchanged:** `PublicationCard`, `PublicationAddButton`, `LibraryLayout`, `Cover`, `apiAction`, `apiSubscribe`, `readerActions`, `convertMultiLangStringToString`.

---

## Reference: shapes this plan relies on (already verified)

`PublicationView` (`src/common/views/publication.ts`) fields used:
`identifier` (from `Identifiable`), `readingFinished: boolean`, `lastReadTimeStamp?: number`, `documentTitle: string`, `publicationTitle: string | IStringMap`, `authorsLangString: (string | IStringMap)[]`, `lastReadingLocation?.locator?.locations?.progression?: number`.

Data access (from `AllPublicationPage.tsx`): `apiAction("publication/findAll")` resolves to `PublicationView[]`; `apiSubscribe([...channels], cb)` returns an `Unsubscribe`. Open a book: `dispatch(readerActions.openRequest.build(identifier))` (already done inside `PublicationCard`).

---

## Task 1: Quiet Slate token partial (additive theme)

**Files:**
- Create: `src/renderer/assets/styles/partials/_simpleCloudTheme.scss`
- Modify: `src/renderer/assets/styles/global.scss` (after line 3 `@use './partials/variables';`)

- [ ] **Step 1: Create the token partial**

Create `src/renderer/assets/styles/partials/_simpleCloudTheme.scss`:

```scss
// Quiet Slate — Simple Cloud Reader theme overrides (additive; see DESIGN.md).
// Anchored onto Thorium's existing token layer in partials/variables.scss.
// The --theme-*_light/_dark custom properties are consumed via var() inside
// variables.scss, so setting them here re-skins without forking Thorium.

:root {
    // Override layer consumed by variables.scss (slate accent + cool neutrals)
    --theme-primary_light: #5b6b8c;
    --theme-secondary_light: #eef1f5;
    --theme-background_light: #f7f8fa;
    --theme-neutral_light: #ffffff;
    --theme-border_light: #e1e5ec;
    --theme-buttonsBorder_light: #5b6b8c;

    --theme-primary_dark: #93a4c7;
    --theme-secondary_dark: #20242b;
    --theme-background_dark: #15181d;
    --theme-neutral_dark: #1c2027;
    --theme-border_dark: #2a2f37;
    --theme-buttonsBorder_dark: #93a4c7;

    // New product tokens (not present in Thorium) used by simpleLibrary.scss
    --sc-accent: #5b6b8c;
    --sc-accent-hover: #4c5b79;
    --sc-accent-soft: #e6ebf3;
    --sc-canvas: #f7f8fa;
    --sc-surface: #ffffff;
    --sc-surface-muted: #eef1f5;
    --sc-ink: #2b2f36;
    --sc-ink-muted: #6b7280;
    --sc-outline: #e1e5ec;
    --sc-focus: #2e6f9a;

    // Sync-status tokens (text / background)
    --sc-status-synced-text: #0b8454;
    --sc-status-synced-bg: #e4efe4;
    --sc-status-syncing-text: #5b6b8c;
    --sc-status-syncing-bg: #e6ebf3;
    --sc-status-offline-text: #6b7280;
    --sc-status-offline-bg: #eceef1;
    --sc-status-attention-text: #9a6f24;
    --sc-status-attention-bg: #f7ead0;
}
```

- [ ] **Step 2: Load the partial globally**

In `src/renderer/assets/styles/global.scss`, add the import immediately after the existing `@use './partials/variables';` line (Sass requires `@use` rules at the top of the file):

```scss
@use './partials/variables';
@use './partials/simpleCloudTheme';
```

- [ ] **Step 3: Verify SCSS lints**

Run: `corepack npm@11.17.0 run lint:css`
Expected: PASS (no stylelint errors for the new partial).

- [ ] **Step 4: Commit**

```bash
git add src/renderer/assets/styles/partials/_simpleCloudTheme.scss src/renderer/assets/styles/global.scss
git commit -m "feat(library): add Quiet Slate theme token overrides"
```

---

## Task 2: Pure library model — failing tests first

**Files:**
- Create: `test/library/libraryModel.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/library/libraryModel.test.ts`:

```ts
import {
    getReadingState,
    matchesFilter,
    matchesSearch,
    filterPublications,
    selectContinueReading,
    getProgress,
} from "readium-desktop/renderer/library/components/simpleLibrary/libraryModel";
import { PublicationView } from "readium-desktop/common/views/publication";

const pub = (over: Partial<PublicationView>): PublicationView => ({
    identifier: "id",
    isOpenable: true,
    readingFinished: false,
    documentTitle: "Untitled",
    publicationTitle: "Untitled",
    publicationSubTitle: "",
    authorsLangString: [],
    ...over,
} as PublicationView);

describe("getReadingState", () => {
    it("returns finished when readingFinished is true", () => {
        expect(getReadingState(pub({ readingFinished: true }))).toBe("finished");
    });
    it("returns reading when started but not finished", () => {
        expect(getReadingState(pub({ lastReadTimeStamp: 123 }))).toBe("reading");
    });
    it("returns toRead when never opened", () => {
        expect(getReadingState(pub({}))).toBe("toRead");
    });
    it("treats a zero timestamp as never opened", () => {
        expect(getReadingState(pub({ lastReadTimeStamp: 0 }))).toBe("toRead");
    });
});

describe("matchesFilter", () => {
    it("'all' matches everything", () => {
        expect(matchesFilter(pub({ readingFinished: true }), "all")).toBe(true);
    });
    it("matches the exact reading state", () => {
        expect(matchesFilter(pub({ lastReadTimeStamp: 9 }), "reading")).toBe(true);
        expect(matchesFilter(pub({ lastReadTimeStamp: 9 }), "finished")).toBe(false);
    });
});

describe("matchesSearch", () => {
    it("empty query matches all", () => {
        expect(matchesSearch(pub({ publicationTitle: "Dune" }), "  ", "en")).toBe(true);
    });
    it("matches title case-insensitively", () => {
        expect(matchesSearch(pub({ publicationTitle: "Dune" }), "dun", "en")).toBe(true);
    });
    it("matches author", () => {
        expect(matchesSearch(
            pub({ publicationTitle: "Dune", authorsLangString: ["Frank Herbert"] }),
            "herbert", "en")).toBe(true);
    });
    it("non-match returns false", () => {
        expect(matchesSearch(pub({ publicationTitle: "Dune" }), "sapiens", "en")).toBe(false);
    });
});

describe("filterPublications", () => {
    const list = [
        pub({ identifier: "a", publicationTitle: "Dune", lastReadTimeStamp: 100 }),
        pub({ identifier: "b", publicationTitle: "Sapiens", readingFinished: true }),
        pub({ identifier: "c", publicationTitle: "Educated" }),
    ];
    it("filters by state then search", () => {
        const res = filterPublications(list, "reading", "", "en");
        expect(res.map((p) => p.identifier)).toEqual(["a"]);
    });
    it("combines filter and query", () => {
        const res = filterPublications(list, "all", "edu", "en");
        expect(res.map((p) => p.identifier)).toEqual(["c"]);
    });
});

describe("selectContinueReading", () => {
    it("returns the most recently read in-progress book", () => {
        const list = [
            pub({ identifier: "a", lastReadTimeStamp: 100 }),
            pub({ identifier: "b", lastReadTimeStamp: 300 }),
            pub({ identifier: "c", readingFinished: true, lastReadTimeStamp: 999 }),
        ];
        expect(selectContinueReading(list)?.identifier).toBe("b");
    });
    it("returns undefined when nothing is in progress", () => {
        expect(selectContinueReading([pub({ readingFinished: true })])).toBeUndefined();
    });
});

describe("getProgress", () => {
    it("reads progression from the last reading location", () => {
        const p = pub({ lastReadingLocation: { locator: { href: "x", locations: { progression: 0.42 } } } } as Partial<PublicationView>);
        expect(getProgress(p)).toBeCloseTo(0.42);
    });
    it("returns undefined when absent or out of range", () => {
        expect(getProgress(pub({}))).toBeUndefined();
        const bad = pub({ lastReadingLocation: { locator: { href: "x", locations: { progression: 5 } } } } as Partial<PublicationView>);
        expect(getProgress(bad)).toBeUndefined();
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `corepack npm@11.17.0 run testFile -- test/library/libraryModel.test.ts`
Expected: FAIL — cannot resolve module `.../simpleLibrary/libraryModel` (not created yet).

---

## Task 3: Pure library model — implementation

**Files:**
- Create: `src/renderer/library/components/simpleLibrary/libraryModel.ts`

- [ ] **Step 1: Implement the model**

Create `src/renderer/library/components/simpleLibrary/libraryModel.ts`:

```ts
// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import { PublicationView } from "readium-desktop/common/views/publication";
import { convertMultiLangStringToString } from "readium-desktop/common/language-string";

export type ReadingState = "reading" | "toRead" | "finished";
export type LibraryFilter = "all" | ReadingState;

export const getReadingState = (
    pub: Pick<PublicationView, "readingFinished" | "lastReadTimeStamp">,
): ReadingState => {
    if (pub.readingFinished) {
        return "finished";
    }
    if (pub.lastReadTimeStamp && pub.lastReadTimeStamp > 0) {
        return "reading";
    }
    return "toRead";
};

export const matchesFilter = (pub: PublicationView, filter: LibraryFilter): boolean =>
    filter === "all" || getReadingState(pub) === filter;

export const publicationSearchText = (pub: PublicationView, locale: string): string => {
    const title = convertMultiLangStringToString(
        pub.publicationTitle || pub.documentTitle, locale) || "";
    const authors = (pub.authorsLangString || [])
        .map((a) => convertMultiLangStringToString(a, locale) || "")
        .join(" ");
    return `${title} ${authors}`.toLowerCase();
};

export const matchesSearch = (pub: PublicationView, query: string, locale: string): boolean => {
    const q = (query || "").trim().toLowerCase();
    if (!q) {
        return true;
    }
    return publicationSearchText(pub, locale).includes(q);
};

export const filterPublications = (
    pubs: PublicationView[],
    filter: LibraryFilter,
    query: string,
    locale: string,
): PublicationView[] =>
    pubs.filter((p) => matchesFilter(p, filter) && matchesSearch(p, query, locale));

export const selectContinueReading = (
    pubs: PublicationView[],
): PublicationView | undefined =>
    pubs
        .filter((p) => getReadingState(p) === "reading")
        .sort((a, b) => (b.lastReadTimeStamp || 0) - (a.lastReadTimeStamp || 0))[0];

export const getProgress = (pub: PublicationView): number | undefined => {
    const progression = pub.lastReadingLocation?.locator?.locations?.progression;
    if (typeof progression !== "number" || progression < 0 || progression > 1) {
        return undefined;
    }
    return progression;
};
```

- [ ] **Step 2: Run the tests to verify they pass**

Run: `corepack npm@11.17.0 run testFile -- test/library/libraryModel.test.ts`
Expected: PASS — all describe blocks green.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/library/components/simpleLibrary/libraryModel.ts test/library/libraryModel.test.ts
git commit -m "feat(library): add pure reading-state/filter/resume model with tests"
```

---

## Task 4: Sync-status pill

**Files:**
- Create: `src/renderer/library/components/simpleLibrary/SyncStatusPill.tsx`

For Checkpoint 1 there is no account or sync engine, so the honest, always-textual status is **Offline (local)**. The component is written to accept a status so later checkpoints swap in live state without restructuring.

- [ ] **Step 1: Create the component**

Create `src/renderer/library/components/simpleLibrary/SyncStatusPill.tsx`:

```tsx
// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import * as React from "react";
import * as styles from "readium-desktop/renderer/assets/styles/components/simpleLibrary.scss";
import classNames from "classnames";

export type SyncStatus = "synced" | "syncing" | "offline" | "attention";

const GLYPH: Record<SyncStatus, string> = {
    synced: "●",     // ●
    syncing: "◍",    // ◍
    offline: "○",    // ○
    attention: "▲",  // ▲
};

const CLASS: Record<SyncStatus, string> = {
    synced: styles.sync_synced,
    syncing: styles.sync_syncing,
    offline: styles.sync_offline,
    attention: styles.sync_attention,
};

interface IProps {
    status: SyncStatus;
    label: string;
}

const SyncStatusPill: React.FC<IProps> = ({ status, label }) => (
    <span className={classNames(styles.sync_pill, CLASS[status])} role="status">
        <span aria-hidden>{GLYPH[status]}</span>
        <span>{label}</span>
    </span>
);

export default SyncStatusPill;
```

- [ ] **Step 2: Commit** (compiles with the SCSS module added in Task 7; commit together after Task 7, or stage now and verify at Task 8.)

```bash
git add src/renderer/library/components/simpleLibrary/SyncStatusPill.tsx
git commit -m "feat(library): add textual sync-status pill"
```

---

## Task 5: Filters + search row

**Files:**
- Create: `src/renderer/library/components/simpleLibrary/LibraryFilters.tsx`

- [ ] **Step 1: Create the component**

Create `src/renderer/library/components/simpleLibrary/LibraryFilters.tsx`:

```tsx
// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import * as React from "react";
import * as styles from "readium-desktop/renderer/assets/styles/components/simpleLibrary.scss";
import classNames from "classnames";
import { LibraryFilter } from "./libraryModel";

interface IProps {
    filter: LibraryFilter;
    onFilter: (f: LibraryFilter) => void;
    query: string;
    onQuery: (q: string) => void;
    labels: Record<LibraryFilter, string>;
    searchLabel: string;
    searchPlaceholder: string;
    inputRef?: React.RefObject<HTMLInputElement>;
}

const ORDER: LibraryFilter[] = ["all", "reading", "toRead", "finished"];

const LibraryFilters: React.FC<IProps> = (props) => (
    <div className={styles.filters_row}>
        <div className={styles.search_field}>
            <label htmlFor="sc-library-search">{props.searchLabel}</label>
            <input
                id="sc-library-search"
                ref={props.inputRef}
                type="search"
                value={props.query}
                placeholder={props.searchPlaceholder}
                onChange={(e) => props.onQuery(e.target.value)}
            />
        </div>
        <div className={styles.filter_pills} role="group" aria-label={props.searchLabel}>
            {ORDER.map((f) => (
                <button
                    key={f}
                    type="button"
                    aria-pressed={props.filter === f}
                    className={classNames(
                        styles.filter_pill,
                        { [styles.filter_pill_on]: props.filter === f },
                    )}
                    onClick={() => props.onFilter(f)}
                >
                    {props.labels[f]}
                </button>
            ))}
        </div>
    </div>
);

export default LibraryFilters;
```

- [ ] **Step 2: Commit** (compiles after Task 7 SCSS; stage now)

```bash
git add src/renderer/library/components/simpleLibrary/LibraryFilters.tsx
git commit -m "feat(library): add in-place search and reading-state filter pills"
```

---

## Task 6: Continue-reading resume hero

**Files:**
- Create: `src/renderer/library/components/simpleLibrary/ResumeHero.tsx`

- [ ] **Step 1: Create the component**

Create `src/renderer/library/components/simpleLibrary/ResumeHero.tsx`:

```tsx
// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import * as React from "react";
import * as styles from "readium-desktop/renderer/assets/styles/components/simpleLibrary.scss";
import Cover from "readium-desktop/renderer/common/components/Cover";
import { PublicationView } from "readium-desktop/common/views/publication";
import { convertMultiLangStringToString } from "readium-desktop/common/language-string";
import { getProgress } from "./libraryModel";

interface IProps {
    publicationView: PublicationView;
    locale: string;
    sectionLabel: string;
    resumeLabel: string;
    onResume: (identifier: string) => void;
}

const ResumeHero: React.FC<IProps> = (props) => {
    const { publicationView: pub, locale } = props;
    const title = convertMultiLangStringToString(pub.publicationTitle || pub.documentTitle, locale);
    const authors = (pub.authorsLangString || [])
        .map((a) => convertMultiLangStringToString(a, locale))
        .filter(Boolean)
        .join(", ");
    const progress = getProgress(pub);
    const percent = progress !== undefined ? Math.round(progress * 100) : undefined;

    return (
        <section className={styles.resume_section} aria-label={props.sectionLabel}>
            <p className={styles.resume_kicker}>{props.sectionLabel}</p>
            <div className={styles.resume_card}>
                <div className={styles.resume_cover}>
                    <Cover publicationViewMaybeOpds={pub} />
                </div>
                <div className={styles.resume_meta}>
                    <h2 className={styles.resume_title}>{title}</h2>
                    <p className={styles.resume_sub}>
                        {[authors, percent !== undefined ? `${percent}%` : undefined]
                            .filter(Boolean).join(" · ")}
                    </p>
                    {percent !== undefined ? (
                        <div className={styles.resume_progress} aria-hidden>
                            <div
                                className={styles.resume_progress_fill}
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    ) : null}
                </div>
                <button
                    type="button"
                    className={styles.resume_button}
                    onClick={() => props.onResume(pub.identifier)}
                >
                    {props.resumeLabel}
                </button>
            </div>
        </section>
    );
};

export default ResumeHero;
```

- [ ] **Step 2: Commit** (compiles after Task 7 SCSS; stage now)

```bash
git add src/renderer/library/components/simpleLibrary/ResumeHero.tsx
git commit -m "feat(library): add Continue reading resume hero"
```

---

## Task 7: Library SCSS module (Quiet Slate)

**Files:**
- Create: `src/renderer/assets/styles/components/simpleLibrary.scss`

- [ ] **Step 1: Create the stylesheet**

Create `src/renderer/assets/styles/components/simpleLibrary.scss`:

```scss
// Quiet Slate Library — see DESIGN.md. Uses the --sc-* tokens from
// partials/_simpleCloudTheme.scss.

.library_root {
    padding: 16px 28px 40px;
    color: var(--sc-ink);
}

.top_row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 8px;
}

/* Sync status pill */
.sync_pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    padding: 6px 13px;
    border-radius: 999px;
    white-space: nowrap;
}
.sync_synced { color: var(--sc-status-synced-text); background: var(--sc-status-synced-bg); }
.sync_syncing { color: var(--sc-status-syncing-text); background: var(--sc-status-syncing-bg); }
.sync_offline { color: var(--sc-status-offline-text); background: var(--sc-status-offline-bg); }
.sync_attention { color: var(--sc-status-attention-text); background: var(--sc-status-attention-bg); }

/* Resume hero */
.resume_section { margin: 4px 0 22px; }
.resume_kicker {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.9px;
    color: var(--sc-ink-muted);
    margin: 0 0 10px;
}
.resume_card {
    display: flex;
    gap: 22px;
    align-items: center;
    background: var(--sc-surface);
    border: 1px solid var(--sc-outline);
    border-radius: 14px;
    padding: 22px;
}
.resume_cover {
    width: 92px;
    flex: 0 0 auto;
}
.resume_cover img {
    width: 100%;
    border-radius: 8px;
    box-shadow: 0 3px 9px rgba(40, 50, 70, 0.2);
}
.resume_meta { flex: 1 1 auto; min-width: 0; }
.resume_title { font-size: 21px; font-weight: 700; margin: 0; }
.resume_sub { font-size: 14px; color: var(--sc-ink-muted); margin: 5px 0 13px; }
.resume_progress {
    height: 8px;
    max-width: 520px;
    background: var(--sc-surface-muted);
    border-radius: 4px;
    overflow: hidden;
}
.resume_progress_fill { height: 100%; background: var(--sc-accent); }
.resume_button {
    flex: 0 0 auto;
    font-size: 15px;
    font-weight: 600;
    color: var(--sc-surface);
    background: var(--sc-accent);
    border: none;
    border-radius: 10px;
    padding: 13px 28px;
    cursor: pointer;
}
.resume_button:hover { background: var(--sc-accent-hover); }

/* Filters + search */
.filters_row {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 18px;
}
.search_field { flex: 1 1 280px; display: flex; flex-direction: column; gap: 4px; }
.search_field label { font-size: 13px; font-weight: 600; color: var(--sc-ink-muted); }
.search_field input {
    height: 44px;
    background: var(--sc-surface);
    border: 1px solid var(--sc-outline);
    border-radius: 10px;
    font-size: 15px;
    padding: 0 16px;
    color: var(--sc-ink);
}
.filter_pills { display: flex; gap: 11px; flex-wrap: wrap; }
.filter_pill {
    font-size: 14px;
    font-weight: 600;
    padding: 8px 18px;
    border-radius: 999px;
    background: var(--sc-surface);
    border: 1px solid var(--sc-outline);
    color: var(--sc-accent);
    cursor: pointer;
}
.filter_pill_on {
    background: var(--sc-accent);
    border-color: var(--sc-accent);
    color: var(--sc-surface);
}

/* Cover grid — fills the width (DESIGN.md auto-fit rule) */
.cover_grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 22px;
}
@media (max-width: 1024px) {
    .cover_grid { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 18px; }
    .library_root { padding: 16px 22px 32px; }
}
@media (max-width: 600px) {
    .cover_grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
    .resume_card { gap: 14px; padding: 16px; }
    .resume_cover { width: 56px; }
    .resume_title { font-size: 16px; }
}

/* Empty state */
.empty_state {
    text-align: center;
    padding: 64px 32px;
    color: var(--sc-ink-muted);
}
.empty_state h2 { color: var(--sc-ink); font-size: 18px; margin: 0 0 8px; }
.empty_actions { margin-top: 20px; display: flex; justify-content: center; }
```

- [ ] **Step 2: Verify SCSS lints**

Run: `corepack npm@11.17.0 run lint:css`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/assets/styles/components/simpleLibrary.scss
git commit -m "feat(library): add Quiet Slate library stylesheet"
```

---

## Task 8: SimpleLibrary route component + route swap

**Files:**
- Create: `src/renderer/library/components/simpleLibrary/SimpleLibrary.tsx`
- Modify: `src/renderer/library/routing.ts` (lines 88-97; imports near line 12)

- [ ] **Step 1: Create the route component**

Create `src/renderer/library/components/simpleLibrary/SimpleLibrary.tsx`:

```tsx
// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import * as React from "react";
import { useDispatch } from "react-redux";
import * as styles from "readium-desktop/renderer/assets/styles/components/simpleLibrary.scss";
import { PublicationView } from "readium-desktop/common/views/publication";
import { readerActions } from "readium-desktop/common/redux/actions";
import { apiAction } from "readium-desktop/renderer/library/apiAction";
import { apiSubscribe } from "readium-desktop/renderer/library/apiSubscribe";
import LibraryLayout from "readium-desktop/renderer/library/components/layout/LibraryLayout";
import { useTranslator } from "readium-desktop/renderer/common/hooks/useTranslator";
import { useSelector } from "readium-desktop/renderer/common/hooks/useSelector";
import { ICommonRootState } from "readium-desktop/common/redux/states/commonRootState";
import PublicationCard from "../publication/PublicationCard";
import PublicationAddButton from "../catalog/PublicationAddButton";
import {
    LibraryFilter, filterPublications, selectContinueReading,
} from "./libraryModel";
import ResumeHero from "./ResumeHero";
import LibraryFilters from "./LibraryFilters";
import SyncStatusPill from "./SyncStatusPill";

const SUBSCRIBE_CHANNELS = [
    "publication/importFromFs",
    "publication/delete",
    "publication/importFromLink",
    "publication/updateTags",
    "publication/findAllRefresh",
    "publication/recover",
];

const SimpleLibrary: React.FC = () => {
    const [__] = useTranslator();
    const dispatch = useDispatch();
    const locale = useSelector((state: ICommonRootState) => state.i18n.locale);

    const [pubs, setPubs] = React.useState<PublicationView[] | undefined>(undefined);
    const [filter, setFilter] = React.useState<LibraryFilter>("all");
    const [query, setQuery] = React.useState("");

    React.useEffect(() => {
        const refresh = () => {
            apiAction("publication/findAll")
                .then((views) => setPubs(views))
                .catch((e) => console.error("simpleLibrary findAll error", e));
        };
        const unsubscribe = apiSubscribe(SUBSCRIBE_CHANNELS, refresh);
        return () => { if (unsubscribe) { unsubscribe(); } };
    }, []);

    const openReader = React.useCallback(
        (identifier: string) => dispatch(readerActions.openRequest.build(identifier)),
        [dispatch],
    );

    const filterLabels: Record<LibraryFilter, string> = {
        all: __("catalog.allBooks"),
        reading: __("catalog.bookshelf.continueReading"),
        toRead: __("catalog.bookshelf.allBooks"),
        finished: __("publication.read"),
    };

    const all = pubs || [];
    const resume = selectContinueReading(all);
    const visible = filterPublications(all, filter, query, locale);

    const secondaryHeader = (
        <span style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", height: "53px" }}>
            <PublicationAddButton />
        </span>
    );

    return (
        <LibraryLayout title={__("header.homeTitle")} secondaryHeader={secondaryHeader}>
            <div className={styles.library_root}>
                <div className={styles.top_row}>
                    <SyncStatusPill status="offline" label={__("catalog.bookshelf.noPublicationHelpL2")} />
                </div>

                {resume ? (
                    <ResumeHero
                        publicationView={resume}
                        locale={locale}
                        sectionLabel={__("catalog.entry.continueReading")}
                        resumeLabel={__("catalog.lastAdditions")}
                        onResume={openReader}
                    />
                ) : null}

                <LibraryFilters
                    filter={filter}
                    onFilter={setFilter}
                    query={query}
                    onQuery={setQuery}
                    labels={filterLabels}
                    searchLabel={__("header.searchTitle")}
                    searchPlaceholder={__("header.searchPlaceholder")}
                />

                {pubs === undefined ? null
                    : all.length === 0 ? (
                        <div className={styles.empty_state}>
                            <h2>{__("catalog.emptyTagList")}</h2>
                            <p>{__("catalog.bookshelf.noPublicationHelpL0")}</p>
                            <div className={styles.empty_actions}><PublicationAddButton /></div>
                        </div>
                    ) : (
                        <div className={styles.cover_grid}>
                            {visible.map((pub) => (
                                <PublicationCard
                                    key={pub.identifier}
                                    publicationViewMaybeOpds={pub}
                                    isReading={false}
                                />
                            ))}
                        </div>
                    )}
            </div>
        </LibraryLayout>
    );
};

export default SimpleLibrary;
```

> **i18n note for the implementer:** The `__("...")` keys above reuse existing Thorium translation keys to avoid adding strings in this checkpoint. Before finishing this task, verify each key resolves to sensible English by checking `src/resources/locales/en.json` (search the key path). If any key reads wrong in context (e.g. a filter label), pick a better existing key from that file — do **not** invent new keys here (string additions are a later checkpoint). Record any swapped keys in the commit message.

- [ ] **Step 2: Verify the i18n keys resolve**

Run a search of the English locale for each key used (example for one key):
Run: `corepack npm@11.17.0 run lint:ts` *(after Step 3 swap, the whole-renderer typecheck/lint also confirms imports resolve)*
Manual: open `src/resources/locales/en.json` and confirm `header.homeTitle`, `header.searchTitle`, `header.searchPlaceholder`, `catalog.entry.continueReading`, `catalog.allBooks`, `publication.read` exist. Replace any missing key with an existing nearby one.

- [ ] **Step 3: Swap the routes**

In `src/renderer/library/routing.ts`:

Replace the import on line 12:
```ts
import Catalog from "./components/catalog/Catalog";
```
with:
```ts
import SimpleLibrary from "./components/simpleLibrary/SimpleLibrary";
```

Change the `/home` and `/` route components (lines 88-97) from `component: Catalog` to `component: SimpleLibrary`:
```ts
    "/home": {
        path: "/home",
        component: SimpleLibrary,
    } as Route,
    "/": {
        path: "/",
        component: SimpleLibrary,
    } as Route,
```

(Leave `/library`, `/opds`, `/opds/browse` untouched.)

- [ ] **Step 4: Typecheck / lint the renderer**

Run: `corepack npm@11.17.0 run lint:ts`
Expected: PASS (no unresolved imports, no type errors in the new files). Fix any reported issues inline. Note: this lints the whole `src` tree and is slow; that is expected.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/library/components/simpleLibrary/SimpleLibrary.tsx src/renderer/library/routing.ts
git commit -m "feat(library): render Quiet Slate library at / and /home"
```

---

## Task 9: Manual verification (runtime)

No automated runtime harness exists for the Electron shell, so verify by hand.

- [ ] **Step 1: Launch the app in dev**

Run (from `apps/windows`): `corepack npm@11.17.0 run start:dev`
Expected: Electron opens directly to the Quiet Slate Library (cool slate accent, cover grid filling the width) instead of Thorium's catalog sliders.

- [ ] **Step 2: Walk the Checkpoint 1 success criteria**

Confirm each (from `PRODUCT.md` §"Success criteria for Checkpoint 1"):
- [ ] App opens to the cover-first Library at `/` (not Thorium's catalog).
- [ ] Existing local books appear as covers and open into the reader on click and on Enter (keyboard).
- [ ] With zero books, the empty state shows one clear add action.
- [ ] Typing in search filters by title/author in place (no route change).
- [ ] The four filters (All / Reading / To read / Finished) narrow the grid in place.
- [ ] "Continue reading" appears only when at least one in-progress book exists, and Resume opens it.
- [ ] A textual sync status (Offline/local) is visible in the header area.
- [ ] Tab/Shift-Tab reach search, filters, covers, and the add button with a visible focus ring; Escape closes any transient surface opened from a card menu.

- [ ] **Step 3: Confirm the preserved OpenAPI work is still untouched**

Run: `git status`
Expected: the only changes are this checkpoint's files; the previously-uncommitted `api.types.ts` / `tools/openapi-codegen` work is unchanged and uncommitted (not reverted, not committed by this plan).

- [ ] **Step 4: Final commit (if any manual fixes were made)**

```bash
git add -A
git commit -m "fix(library): checkpoint 1 manual-verification adjustments"
```

---

## Out of scope (later, gated checkpoints)

Managed import + SHA-256 dedup (Cp 2); reading redesign + annotations (Cp 3+); account/session + magic link; live sync engine and the real four-state status; conflict/deletion flows and the three removal levels UI; Android. The `SyncStatusPill` and reading-state model are written so these slot in without restructuring.

## Self-Review

- **Spec coverage:** cover-first launch (Task 8 route swap), offline reading (no network added), textual sync status (Task 4), reading-state model To read/Reading/Finished (Task 3; Archived is not derivable from local Thorium data and is deferred — noted), four filters + in-place search (Task 5/8), Continue reading only when in-progress (Task 6/8 via `selectContinueReading`), empty state with one add action (Task 8), keyboard + visible focus (reuses Thorium focus mechanism + native button/input/anchor semantics; verified Task 9), Quiet Slate tokens anchored to existing SCSS layer (Task 1/7), auto-fit grid (Task 7). No backend/secrets touched.
- **Placeholder scan:** none — all steps contain real code or concrete commands. The one judgement step (i18n key check) is explicit about what to verify and the rule (no new keys).
- **Type consistency:** `LibraryFilter` / `ReadingState` names, `getProgress`/`selectContinueReading`/`filterPublications` signatures, and the `SyncStatus` union are used identically across model, tests, and components. `styles.*` class names referenced in TSX all exist in `simpleLibrary.scss`.
