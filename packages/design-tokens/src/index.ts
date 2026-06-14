export const colors = {
  canvas: "#F8F6F1",
  surface: "#FDFBF7",
  surfaceMuted: "#EFEEE8",
  ink: "#252722",
  inkMuted: "#666A61",
  outline: "#D8D8CF",
  accent: "#496B67",
  accentHover: "#3C5D59",
  accentSoft: "#DCE8E4",
  focus: "#2E6F9A",
  danger: "#A6433D",
  success: "#477153",
  highlightImportant: "#F2D66D",
  highlightQuestion: "#84B9DB",
  highlightQuote: "#E9A6B8",
  highlightReview: "#9FCB9A",
} as const;

export const typography = {
  fontFamily: '"Segoe UI", Inter, system-ui, sans-serif',
  headline: {
    fontSize: 24,
    fontWeight: 600,
    lineHeight: 1.25,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1.35,
  },
  body: {
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.5,
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacingEm: 0.01,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  cover: 6,
  control: 10,
  panel: 14,
  pill: 999,
} as const;

export const touchTargets = {
  minimum: 48,
} as const;

export const breakpoints = {
  phone: 0,
  tablet: 720,
  desktop: 1024,
  wide: 1440,
} as const;

export const motion = {
  state: {
    durationMs: 150,
    easing: "cubic-bezier(0.25, 1, 0.5, 1)",
  },
  panel: {
    durationMs: 220,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
} as const;

export const highlightRoles = [
  {
    id: "important",
    label: "Important",
    color: colors.highlightImportant,
  },
  {
    id: "question",
    label: "Question",
    color: colors.highlightQuestion,
  },
  {
    id: "quote",
    label: "Quote",
    color: colors.highlightQuote,
  },
  {
    id: "review",
    label: "Review",
    color: colors.highlightReview,
  },
] as const;

export const syncStates = {
  synced: {
    label: "Synced",
    tone: "success",
  },
  syncing: {
    label: "Syncing",
    tone: "accent",
  },
  offline: {
    label: "Offline",
    tone: "neutral",
  },
  needsAttention: {
    label: "Needs attention",
    tone: "danger",
  },
} as const;

export type HighlightRole = (typeof highlightRoles)[number];
export type SyncState = keyof typeof syncStates;
