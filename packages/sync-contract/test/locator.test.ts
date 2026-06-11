import { describe, expect, it } from "vitest";
import fixtures from "../src/fixtures/locators.json" with { type: "json" };
import { canonicalLocatorSchema } from "../src/locator.js";

describe("canonicalLocatorSchema", () => {
  it.each(fixtures.valid)("accepts $name", ({ locator }) => {
    expect(canonicalLocatorSchema.parse(locator)).toEqual(locator);
  });

  it.each(fixtures.invalid)("rejects $name", ({ locator }) => {
    expect(() => canonicalLocatorSchema.parse(locator)).toThrow();
  });
});
