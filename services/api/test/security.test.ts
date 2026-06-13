import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { FixedWindowRateLimiter } from "../src/security/rateLimiter.js";

describe("public API request protection", () => {
  it("rejects JSON bodies larger than one MiB", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/missing",
      headers: { "content-type": "application/json" },
      payload: { value: "x".repeat(1024 * 1024) },
    });
    expect(response.statusCode).toBe(413);
  });

  it("adds conservative browser security headers", async () => {
    const response = await buildApp().inject({
      method: "GET",
      url: "/health/live",
    });
    expect(response.headers).toMatchObject({
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'none'",
    });
  });

  it("bounds limiter memory while rejecting excess traffic", () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter({
      now: () => now,
      maxKeys: 2,
    });
    expect(limiter.consume("a", { limit: 1, windowMs: 1_000 }).allowed)
      .toBe(true);
    expect(limiter.consume("a", { limit: 1, windowMs: 1_000 }).allowed)
      .toBe(false);
    limiter.consume("b", { limit: 1, windowMs: 1_000 });
    limiter.consume("c", { limit: 1, windowMs: 1_000 });
    expect(limiter.size).toBe(2);
    now = 2_000;
    expect(limiter.consume("a", { limit: 1, windowMs: 1_000 }).allowed)
      .toBe(true);
  });
});
