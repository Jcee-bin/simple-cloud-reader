import { describe, expect, it } from "vitest";
import {
  authSessionSchema,
  magicLinkRedeemSchema,
  magicLinkRequestSchema,
  refreshRequestSchema,
} from "../src/index.js";

describe("authentication contracts", () => {
  it("normalizes a magic-link email address", () => {
    expect(magicLinkRequestSchema.parse({
      email: " Reader@Example.COM ",
    })).toEqual({
      email: "reader@example.com",
    });
  });

  it("requires a refresh token and device identifier", () => {
    expect(refreshRequestSchema.parse({
      refreshToken: "token-value",
      deviceId: "93f39cf5-d988-49d9-9cc0-a857d13ac1d6",
    })).toEqual({
      refreshToken: "token-value",
      deviceId: "93f39cf5-d988-49d9-9cc0-a857d13ac1d6",
    });
  });

  it("requires an opaque magic-link token and device metadata", () => {
    expect(magicLinkRedeemSchema.parse({
      token: "opaque-token",
      deviceId: "93f39cf5-d988-49d9-9cc0-a857d13ac1d6",
      deviceName: "My Android phone",
      platform: "android",
    }).platform).toBe("android");
  });

  it("returns a complete authenticated session", () => {
    expect(authSessionSchema.parse({
      accessToken: "access-token",
      accessTokenExpiresAt: "2026-06-12T00:15:00.000Z",
      refreshToken: "refresh-token",
      user: {
        id: "6cf8c51d-45b9-4c7f-bf58-bab0a80e18ef",
        email: "reader@example.com",
      },
    }).user.email).toBe("reader@example.com");
  });
});
