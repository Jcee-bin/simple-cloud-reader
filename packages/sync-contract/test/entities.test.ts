import { describe, expect, it } from "vitest";
import {
  bookPayloadSchema,
  highlightPayloadSchema,
  highlightRoleSchema,
  progressPayloadSchema,
} from "../src/index.js";

const bookId = "d1822de7-f117-4910-96d2-e8a07fb7455f";

describe("synchronized entity contracts", () => {
  it("accepts useful local book metadata without requiring cloud storage", () => {
    const value = {
      title: "The Left Hand of Darkness",
      authors: ["Ursula K. Le Guin"],
      format: "epub",
      mediaType: "application/epub+zip",
      originalFileName: "left-hand.epub",
      coverImageUrl: null,
    };

    expect(bookPayloadSchema.parse(value)).toEqual(value);
  });

  it("accepts canonical reading progress", () => {
    expect(progressPayloadSchema.parse({
      bookId,
      locator: {
        format: "epub",
        progression: 0.42,
        engine: "readium",
        engineLocation: {},
      },
    }).locator.progression).toBe(0.42);
  });

  it("accepts exactly one approved highlight role", () => {
    expect(highlightPayloadSchema.parse({
      bookId,
      selectedText: "The selected sentence",
      prefix: "Before ",
      suffix: " after",
      colorRole: "quote",
      note: null,
      locator: {
        format: "epub",
        progression: 0.42,
        engine: "readium",
        engineLocation: {},
      },
    }).colorRole).toBe("quote");

    expect(highlightRoleSchema.options).toEqual([
      "important",
      "question",
      "quote",
      "review",
    ]);
  });

  it("rejects arbitrary highlight colors", () => {
    expect(() => highlightPayloadSchema.parse({
      bookId,
      selectedText: "Text",
      prefix: "",
      suffix: "",
      colorRole: "orange",
      note: null,
      locator: {
        format: "epub",
        progression: 0.1,
        engine: "readium",
        engineLocation: {},
      },
    })).toThrow();
  });
});
