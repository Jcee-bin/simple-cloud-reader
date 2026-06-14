---
name: Simple Cloud Reader
description: A quiet cross-device library that keeps the page in focus.
colors:
  canvas: "#F7F8FA"
  surface: "#FFFFFF"
  surface-muted: "#EEF1F5"
  ink: "#2B2F36"
  ink-muted: "#6B7280"
  outline: "#E1E5EC"
  accent: "#5B6B8C"
  accent-hover: "#4C5B79"
  accent-soft: "#E6EBF3"
  focus: "#2E6F9A"
  danger: "#D52A54"
  success: "#0B8454"
  warning: "#9A6F24"
  status-synced-bg: "#E4EFE4"
  status-syncing-bg: "#E6EBF3"
  status-offline-bg: "#ECEEF1"
  status-attention-bg: "#F7EAD0"
  highlight-important: "#F2D66D"
  highlight-question: "#84B9DB"
  highlight-quote: "#E9A6B8"
  highlight-review: "#9FCB9A"
typography:
  headline:
    fontFamily: "Segoe UI, Inter, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Segoe UI, Inter, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Segoe UI, Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Segoe UI, Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.01em"
rounded:
  control: "10px"
  panel: "14px"
  cover: "8px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
breakpoints:
  phone: "< 600px (and narrow Windows windows)"
  tablet-portrait: "600px – 1024px (primary)"
  laptop: ">= 1024px (laptop, desktop, landscape tablet)"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.surface}"
  button-quiet:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "48px"
  filter-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  filter-unselected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent}"
    border: "1px solid {colors.outline}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
---

# Design System: Simple Cloud Reader

## Overview

**Creative North Star: "Quiet Slate."**

The interface should feel like a calm, modern shelf — cool, airy, and
uncluttered, so that book covers carry almost all of the color and the chrome
recedes. It is gallery-quiet rather than cozy-warm: generous whitespace, a
single low-chroma slate-blue accent, and crisp neutral surfaces. Application
chrome supports recognition and continuation, then gets out of the way.

This is a restrained product system. It rejects file-browser density, generic
dashboard cards, decorative gradients, glass effects, and expert controls that
compete with reading. Responsive layouts change structure rather than merely
shrinking: phone uses one focused plane, portrait tablet fills with a roomy
cover grid, and laptop/landscape layouts add a wide cover grid and contextual
side panels.

**Primary devices:** a Windows **laptop** and a **tablet held vertically**.
Layouts are designed to look right at those two shapes first, then scale up
(landscape/desktop) and down (phone).

**Key characteristics:**

- Cool neutral surfaces with one low-chroma slate-blue accent.
- Shallow Library, Reading, and Settings information architecture.
- Covers are content, not decoration — the grid fills the window.
- Controls are familiar, explicit, and comfortably sized.
- Motion is limited to state feedback between 150ms and 220ms.

Both **light and dark** themes ship; Quiet Slate is the **default light**
personality and the system designed around. A Soft Dark variant mirrors it for
night reading (see Token Integration).

## Colors

The palette is cool-neutral and low glare. The slate-blue accent is reserved for
primary actions, current selection, and the calm synced state; covers remain the
dominant source of varied color.

### Primary

- **Library Slate (`accent` #5B6B8C):** Primary actions, selected filters,
  active reading controls, resume affordance, and the calm synced state.
- **Focus Blue (`focus` #2E6F9A):** Keyboard and accessibility focus only. Focus
  never depends on the accent blending visibly with nearby surfaces.

### Neutral

- **Canvas (#F7F8FA):** The application background around library content.
- **Surface (#FFFFFF):** Headers, menus, sheets, cards, and controls.
- **Surface-muted (#EEF1F5):** Secondary toolbars, unselected controls, and
  skeletons.
- **Ink (#2B2F36):** Primary text and icons.
- **Muted Ink (#6B7280):** Metadata and supporting status copy.
- **Outline (#E1E5EC):** Dividers, field boundaries, and selected-item
  structure.

### Highlight roles (annotations)

- **Important Yellow (#F2D66D)** · **Question Blue (#84B9DB)** ·
  **Quote Pink (#E9A6B8)** · **Review Green (#9FCB9A).** Fixed meanings; always
  paired with a text label, never color alone.

### Sync status

| Status | Text color | Background | Glyph |
|---|---|---|---|
| Synced | `success` #0B8454 | #E4EFE4 | ● |
| Syncing | `accent` #5B6B8C | #E6EBF3 | ◍ |
| Offline | `ink-muted` #6B7280 | #ECEEF1 | ○ |
| Needs attention | `warning` #9A6F24 | #F7EAD0 | ▲ |

**The Cover Color Rule.** The interface accent occupies no more than ten percent
of a library screen. Book covers carry the visual variety.

**The State Has Words Rule.** Offline, syncing, warning, deletion, and highlight
meaning are never communicated by color alone — each carries a text label.

## Typography

**Display & Body Font:** Segoe UI, with Inter and system-sans fallbacks.

**Character:** Native, legible, and intentionally unsurprising. Product labels
should feel at home on Windows and remain clear on Android; book typography is
controlled separately by the reading engine and user preferences.

### Hierarchy

- **Headline** (600, 24px, 1.25): Library and settings screen titles.
- **Title** (600, 18px, 1.35): Book titles, panel headings, important empty-state
  copy.
- **Body** (400, 16px, 1.5): Explanations, metadata, settings, dialogs. Prose
  capped at 70ch.
- **Label** (600, 14px, 0.01em): Buttons, filters, field labels, compact status
  text.

**The Cover Title Rule.** Library titles use at most two lines. Full metadata
belongs in book details, not underneath every cover.

## Layout & responsive behavior

The Library is one full-width plane: a header, an optional Continue-reading
resume card, a filter row, and the cover grid. It **fills the window** — it is
never constrained to a narrow centered column.

### The cover grid (the load-bearing rule)

The cover grid uses CSS Grid with **`auto-fit` / `minmax(~180–200px, 1fr)`** so
it always fills the available width with comfortably large covers, and the
column count follows the window:

| Width | Columns | Gap | Cover ~width |
|---|---|---|---|
| Laptop / desktop / landscape tablet (≥1024px) | ~5–6 | 22px | ~200px |
| Portrait tablet (600–1024px) — *primary* | ~4 | 18px | ~190px |
| Phone / narrow window (<600px) | ~3 | 12px | ~150px |

Covers keep a 2:3 ratio with an 8px radius and the book-cover shadow. The grid
gutters and outer padding scale per breakpoint; the chrome (header, search,
resume card) scales up with the grid so nothing looks thin on a wide window.

### Structure by device

- **Laptop / landscape:** full-width header (title · search · sync status), a
  wide resume card, filter chips, and the wide cover grid. Contents/details may
  open as a persistent contextual **side panel** in Reading.
- **Portrait tablet (primary):** same single plane, ~4-up grid, controls sized
  for touch (≥48dp). Reading panels open as side sheets where width allows.
- **Phone / narrow Windows window:** one focused plane, ~3-up grid, search and
  filters collapse compactly, Reading panels become **bottom sheets**.

## Library anatomy

### Header

Left: `Library` title. Center: a single search field (title or author),
filtering in place with no route change. Right: the **sync status** pill. On
phone the search field drops to its own row beneath the title.

### Continue reading (resume card)

A full-width card above the grid, shown **only when an unfinished (Reading) book
exists**. Contains the cover thumbnail, title, `author · chapter · NN%`, a
progress bar, and a **Resume** primary button. Cover thumb scales by device
(~92px laptop, ~64px tablet, ~48px phone); on phone, tapping the card resumes.
The progress bar caps its own width on very wide windows so it never stretches
edge to edge.

### Filters

Compact pills: **All / Reading / To read / Finished**. Selected = Library Slate
fill with Surface text (plus the implicit text of the label); unselected =
Surface fill with a one-pixel Outline. Color alone never signals selection.

### Book tile

A cover, a two-line title, and one short metadata or progress line form a single
target — **no surrounding card**. Normal activation opens the book immediately
into the Readium reader; long-press / right-click opens contextual actions
(including the three removal levels).

## States

Every surface defines these explicitly:

- **Empty / first run:** a centered placeholder ("Your shelf is empty"), one
  short offline-friendly line, and **one clear primary action** (`＋ Add a
  book`). 32px internal padding.
- **Loading:** skeleton geometry that matches cover and text shapes (not
  spinners over the grid).
- **Offline:** the `○ Offline` status pill; reading and local actions remain
  fully available; cloud actions queue silently.
- **Syncing:** the `◍ Syncing…` status pill; never blocks interaction.
- **Error:** error text names the recovery action; a failed cloud or destructive
  action raises `▲ Needs attention` rather than failing silently.
- **Destructive confirmation:** text-first Danger styling until a final explicit
  confirm. The dialog **names the scope** — *this device*, *the cloud file*, or
  *the whole library* (the three removal levels) — and account deletion states
  its consequences before confirming.

## Elevation

Flat by default; tonal layering plus thin outlines give structure. A soft
ambient shadow is allowed only for temporary floating surfaces. Covers get a
subtle physical shadow because they represent objects.

- **Floating control** (`0 8px 24px rgba(40,50,70,0.16)`): menus, selection
  toolbars, transient side sheets, drag previews.
- **Book cover** (`0 3px 9px rgba(40,50,70,0.20)`): cover art only.

**The Flat-at-Rest Rule.** Persistent application surfaces never rely on shadows
to explain hierarchy.

## Components

### Buttons

- **Shape:** gently curved (10px), not pill-shaped.
- **Primary:** Library Slate fill, Surface text, ≥48px height, 12×18px padding.
- **Hover / Focus:** hover deepens to `accent-hover`; focus uses a 2px Focus Blue
  ring with 2px offset. Active feedback uses opacity/transform only.
- **Secondary / Ghost:** Surface-muted or transparent. Destructive actions use
  text-first Danger styling until final confirmation.

### Chips (filters)

Compact pills, no shadow. Selection uses the Slate fill plus the label text;
color alone never signals selection.

### Inputs / fields

Surface fill, one-pixel Outline, 10px radius, ≥48px height. Focus = Focus Blue
2px ring plus a persistent label / accessible name. Error text names the
recovery action.

### Navigation

Library is the home surface, not a permanent tab. Reading uses a transient
overlay revealed by one center tap/click; **Contents** holds **Chapters,
Highlights, and Bookmarks**. Wide laptop/tablet layouts may hold Contents in a
side panel; phone uses a bottom sheet. **Escape** closes temporary surfaces;
**Back** always returns to the previous understandable place. Settings open from
the account control.

### Compact reading controls (direction, detailed in Checkpoint 3)

Back to Library · Contents (Chapters/Highlights/Bookmarks) · progress navigation
· appearance · bookmark · more. Controls stay out of the page until summoned,
honor reduced-motion, keep visible keyboard focus, and persist/restore the exact
Readium locator (with normalized progression as fallback).

## Token Integration (mapping onto Thorium's SCSS)

Quiet Slate is applied by **overriding existing tokens, not forking Thorium**.
The renderer already defines a themed token system in
`apps/windows/src/renderer/assets/styles/partials/variables.scss`:

1. **Use the built-in override layer where it exists.** `variables.scss` reads
   "custom" CSS variables that default to Thorium values. Set the Slate values:
   - `--theme-primary_light: #5B6B8C`  → drives `--color-brand-primary`
   - `--theme-background_light: #F7F8FA` → drives `--color-gray-50`
   - `--theme-neutral_light: #FFFFFF` → drives `--color-neutral-base`
   - `--theme-border_light: #E1E5EC` → drives `--color-gray-300`
   - `--theme-secondary_light: #EEF1F5`, `--theme-buttonsBorder_light: #5B6B8C`
2. **Override remaining output tokens** that the layer doesn't cover, in a
   dedicated product partial (e.g. `_simpleCloud-theme.scss`) imported after
   `variables.scss`, set on `:root`, `[data-theme="light"]`, and the dark
   equivalents. These include `--color-text-primary: #2B2F36`,
   `--color-success-text/bg`, `--color-header-docked`, and the gray ramp tweaks.
3. **Add new product tokens** the base system lacks: `--color-warning-text`
   /`--color-warning-bg` (amber), the four `--sc-status-*` pairs, and the four
   `--sc-highlight-*` role colors.
4. **Keep the Soft Dark theme** by mirroring the same overrides in the `dark`
   map / `[data-theme="dark"]` block.

This keeps product styling additive and behind `simpleCloud` rather than editing
Thorium's palette in place.

### Focus & keyboard

Reuse the existing focus machinery in
`.../assets/styles/partials/focus.scss`: focus rings are gated by
`:root.R2_CSS_CLASS__KEYBOARD_INTERACT` and rendered via the
`R2_MIXIN_FOCUS_OUTLINE` mixin, so visible focus appears during keyboard
interaction and is suppressed for pointer use. Set the focus color to Focus Blue
(#2E6F9A) so it stays distinct from the slate accent and nearby surfaces. Do not
disable this mechanism.

## Implementation seams (where this lands in code)

So Checkpoint 1 is a clean swap, not a rewrite:

- **Replace the first-run view:** routes `/` and `/home` currently render
  `apps/windows/src/renderer/library/components/catalog/Catalog.tsx` (routing in
  `.../renderer/library/routing.ts`). The Quiet Slate Library replaces this view;
  `/library`, `/opds`, etc. remain.
- **Reuse book data:** the catalog Redux state and `PublicationView` model
  (`.../library/redux/reducers/catalog.ts`) already provide local covers/titles
  — no backend or secrets to render the shelf.
- **Preserve the reader path:** a cover dispatches `readerActions.openRequest`
  from `.../library/components/publication/PublicationCard.tsx` → main saga
  `.../main/redux/sagas/reader.ts`. Keep intact.
- **Import entry point:** `.../library/components/catalog/PublicationAddButton.tsx`
  → `apiAction("publication/selectFiles")` / `publication/importFromFs`.
- **Styling:** SCSS modules (the established approach), consuming the Slate token
  partial above.

## Do's and Don'ts

### Do

- Open directly to a recognizable cover library that fills the window.
- Keep touch targets ≥48dp and show visible keyboard focus.
- State whether removal affects this device, the cloud file, or the whole
  library.
- Let covers provide most of the color on Library.
- Use skeleton geometry that matches covers and text while loading.
- Provide text labels for all four highlight colors and all four sync states.

### Don't

- Recreate KOReader's / Thorium's file-browser- or catalog-first launch.
- Expose cloud folders, upload queues, or manual push/pull as the primary model.
- Use generic dashboard styling, decorative analytics, or identical card grids.
- Constrain the cover grid to a narrow centered column on wide windows.
- Use glassmorphism, gradients, heavy shadows, neon accents, or decorative
  motion.
- Use colored side-stripe borders, gradient text, or nested cards.
- Copy ReadEra branding, proprietary assets, icons, or screenshots.
