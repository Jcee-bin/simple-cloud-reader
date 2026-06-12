---
name: Simple Cloud Reader
description: A quiet cross-device library that keeps the page in focus.
colors:
  canvas: "#F8F6F1"
  surface: "#FDFBF7"
  surface-muted: "#EFEEE8"
  ink: "#252722"
  ink-muted: "#666A61"
  outline: "#D8D8CF"
  accent: "#496B67"
  accent-hover: "#3C5D59"
  accent-soft: "#DCE8E4"
  focus: "#2E6F9A"
  danger: "#A6433D"
  success: "#477153"
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
  cover: "6px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
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
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
    height: "48px"
  button-quiet:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "48px"
  filter-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
---

# Design System: Simple Cloud Reader

## Overview

**Creative North Star: "The Quiet Bookshelf"**

The interface should feel like returning to a familiar shelf: warm enough for
long reading sessions, orderly enough to scan without effort, and quiet enough
that book covers provide most of the color. Application chrome supports
recognition and continuation, then recedes.

This is a restrained product system. It rejects file-browser density, generic
dashboard cards, decorative gradients, glass effects, and expert controls that
compete with reading. Responsive layouts change structure rather than merely
shrinking: phone uses one focused plane, tablet can reveal a side sheet, and
Windows can support a persistent contextual panel at wide widths.

**Key Characteristics:**

- Warm neutral surfaces with one low-chroma sage-blue accent.
- Shallow Library, Reading, and Settings information architecture.
- Covers are content, not decoration.
- Controls are familiar, explicit, and comfortably sized.
- Motion is limited to state feedback between 150ms and 220ms.

## Colors

The palette is warm-neutral and low glare. The sage-blue accent is reserved for
primary actions, current selection, and sync state; covers remain the dominant
source of varied color.

### Primary

- **Library Sage:** Primary actions, selected filters, active reading controls,
  and the calm synced state.
- **Focus Blue:** Keyboard and accessibility focus only. Focus never depends on
  the accent blending visibly with nearby surfaces.

### Secondary

- **Important Yellow:** The default highlight role.
- **Question Blue:** Highlights that mark uncertainty or inquiry.
- **Quote Pink:** Highlights for language worth retaining.
- **Review Green:** Highlights intended for later study.

### Neutral

- **Paper Canvas:** The application background around library content.
- **Page Surface:** Headers, menus, sheets, and controls.
- **Quiet Shelf:** Secondary toolbars, unselected controls, and skeletons.
- **Reading Ink:** Primary text and icons.
- **Muted Ink:** Metadata and supporting status copy.
- **Soft Outline:** Dividers, field boundaries, and selected-item structure.

**The Cover Color Rule.** The interface accent occupies no more than ten
percent of a library screen. Book covers carry the visual variety.

**The State Has Words Rule.** Offline, syncing, warning, deletion, and
highlight meaning are never communicated by color alone.

## Typography

**Display Font:** Segoe UI (with Inter and system sans fallbacks)

**Body Font:** Segoe UI (with Inter and system sans fallbacks)

**Character:** Native, legible, and intentionally unsurprising. Product labels
should feel at home on Windows and remain clear on Android; book typography is
controlled separately by the reading engine and user preferences.

### Hierarchy

- **Headline** (600, 24px, 1.25): Library and settings screen titles.
- **Title** (600, 18px, 1.35): Book titles, panel headings, and important empty
  state copy.
- **Body** (400, 16px, 1.5): Explanations, metadata, settings descriptions, and
  dialogs. Prose is capped at 70ch.
- **Label** (600, 14px, 0.01em): Buttons, filters, field labels, and compact
  status text.

**The Cover Title Rule.** Library titles use at most two lines. Full metadata
belongs in book details, not underneath every cover.

## Elevation

The system is flat by default and uses tonal layering plus thin outlines for
structure. A soft ambient shadow is allowed only for temporary floating
surfaces such as selection toolbars, menus, and drag previews. Library covers
may use a subtle physical shadow because they represent objects, not generic
containers.

### Shadow Vocabulary

- **Floating control** (`0 8px 24px rgba(37, 39, 34, 0.14)`): Menus, selection
  toolbars, and transient side sheets.
- **Book cover** (`0 3px 10px rgba(37, 39, 34, 0.12)`): Cover art only.

**The Flat-at-Rest Rule.** Persistent application surfaces never rely on
shadows to explain hierarchy.

## Components

### Buttons

- **Shape:** Gently curved, not pill-shaped (10px radius).
- **Primary:** Library Sage fill with Page Surface text, 48px minimum height,
  and 12px by 18px padding.
- **Hover / Focus:** Hover deepens the fill. Focus uses a 2px Focus Blue ring
  with a 2px offset. Active feedback uses opacity or transform only.
- **Secondary / Ghost:** Quiet Shelf fill or transparent background. Destructive
  actions use text-first Danger styling until final confirmation.

### Chips

- **Style:** Filters are compact pills with no shadow. Unselected filters use a
  transparent or Quiet Shelf background.
- **State:** Selection uses Accent Soft plus a text or check indicator. Color
  alone never signals selection.

### Cards / Containers

- **Corner Style:** Panels use 14px; book covers use 6px.
- **Background:** Page Surface for temporary panels, no card behind each book.
- **Shadow Strategy:** Persistent containers remain flat.
- **Border:** One-pixel Soft Outline only where grouping would otherwise be
  ambiguous.
- **Internal Padding:** 16px compact, 24px standard, 32px for empty states.

### Inputs / Fields

- **Style:** Page Surface fill, one-pixel Soft Outline, 10px radius, and 48px
  minimum height.
- **Focus:** Focus Blue 2px ring plus persistent text label or accessible name.
- **Error / Disabled:** Error text names the recovery action. Disabled controls
  retain readable contrast and explain why when the reason is not obvious.

### Navigation

Library is the home surface, not a permanent tab. Reading uses a transient
overlay revealed by one center tap or click. Settings opens from the account
control. Wide Windows and tablet layouts may hold Contents in a side panel;
phone uses a bottom sheet. Back always returns to the previous understandable
place.

### Book Tile

A cover, a two-line title, and one short metadata or progress line form a
single target. There is no surrounding card. Long press or right click opens
contextual actions; a normal activation opens the book immediately.

## Do's and Don'ts

### Do:

- **Do** open directly to a recognizable cover library.
- **Do** keep touch targets at least 48dp and show visible keyboard focus.
- **Do** state whether removal affects this device, the cloud file, or the
  whole library.
- **Do** let covers provide most of the color on Library.
- **Do** use skeleton geometry that matches covers and text while loading.
- **Do** provide text labels for all four highlight colors and sync states.

### Don't:

- **Don't** recreate KOReader's file-browser-first launch experience, plugin
  surface, or dense specialist menus.
- **Don't** expose cloud folders, upload queues, or manual push/pull behavior as
  the primary model.
- **Don't** use generic dashboard styling, decorative analytics, or identical
  card grids.
- **Don't** use glassmorphism, gradients, heavy shadows, neon accents, or
  decorative motion.
- **Don't** use colored side-stripe borders, gradient text, or nested cards.
- **Don't** copy ReadEra branding, proprietary assets, icons, or screenshots.
