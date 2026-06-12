import { describe, expect, it } from "vitest";
import {
  breakpoints,
  colors,
  highlightRoles,
  motion,
  radii,
  spacing,
  syncStates,
  touchTargets,
  typography,
} from "../src/index.js";

describe("shared design tokens", () => {
  it("keeps the four approved highlight roles stable", () => {
    expect(highlightRoles).toEqual([
      { id: "important", label: "Important", color: colors.highlightImportant },
      { id: "question", label: "Question", color: colors.highlightQuestion },
      { id: "quote", label: "Quote", color: colors.highlightQuote },
      { id: "review", label: "Review", color: colors.highlightReview },
    ]);
  });

  it("defines every user-facing sync state with text", () => {
    expect(syncStates).toEqual({
      synced: { label: "Synced", tone: "success" },
      syncing: { label: "Syncing", tone: "accent" },
      offline: { label: "Offline", tone: "neutral" },
      needsAttention: { label: "Needs attention", tone: "danger" },
    });
  });

  it("preserves accessible sizing and responsive structure", () => {
    expect(touchTargets.minimum).toBe(48);
    expect(breakpoints).toEqual({
      phone: 0,
      tablet: 720,
      desktop: 1024,
      wide: 1440,
    });
    expect(spacing.md).toBe(16);
    expect(radii.control).toBe(10);
  });

  it("uses restrained product motion and typography", () => {
    expect(motion.panel.durationMs).toBeLessThanOrEqual(220);
    expect(motion.state.durationMs).toBeGreaterThanOrEqual(150);
    expect(typography.body.fontSize).toBe(16);
    expect(typography.body.lineHeight).toBe(1.5);
  });
});
