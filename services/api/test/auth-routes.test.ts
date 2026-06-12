import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";

describe("authentication routes", () => {
  it("always accepts a valid magic-link request without account disclosure", async () => {
    const requestMagicLink = vi.fn(async () => undefined);
    const app = buildApp({
      authService: {
        requestMagicLink,
        redeemMagicLink: vi.fn(),
        refresh: vi.fn(),
        signOut: vi.fn(),
      },
    } as never);

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/magic-link",
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
      payload: {
        email: "Reader@Example.com",
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ accepted: true });
    expect(requestMagicLink).toHaveBeenCalledWith({
      email: "Reader@Example.com",
      requestIp: "203.0.113.10",
    });
    await app.close();
  });

  it("returns stable authentication error codes", async () => {
    const app = buildApp({
      authService: {
        requestMagicLink: vi.fn(),
        redeemMagicLink: vi.fn(async () => {
          throw Object.assign(new Error("magic_link_used"), {
            statusCode: 401,
            code: "magic_link_used",
          });
        }),
        refresh: vi.fn(),
        signOut: vi.fn(),
      },
    } as never);

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/redeem",
      payload: {
        token: "used-token",
        deviceId: "93f39cf5-d988-49d9-9cc0-a857d13ac1d6",
        deviceName: "Android phone",
        platform: "android",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "magic_link_used" });
    await app.close();
  });
});
