import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";

describe("health endpoints", () => {
  it("reports liveness without touching dependencies", async () => {
    const readiness = {
      checkDatabase: vi.fn(),
      checkObjectStore: vi.fn(),
    };
    const app = buildApp({ readiness });

    const response = await app.inject({
      method: "GET",
      url: "/health/live",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "live" });
    expect(readiness.checkDatabase).not.toHaveBeenCalled();
    expect(readiness.checkObjectStore).not.toHaveBeenCalled();
    await app.close();
  });

  it("reports ready only when PostgreSQL and object storage respond", async () => {
    const app = buildApp({
      readiness: {
        checkDatabase: vi.fn(async () => undefined),
        checkObjectStore: vi.fn(async () => undefined),
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/health/ready",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ready",
      components: {
        database: "ready",
        objectStore: "ready",
      },
    });
    await app.close();
  });

  it("returns component names without leaking dependency errors", async () => {
    const app = buildApp({
      readiness: {
        checkDatabase: vi.fn(async () => {
          throw new Error(
            "postgres://reader:secret@private.internal:5432/reader",
          );
        }),
        checkObjectStore: vi.fn(async () => {
          throw new Error("access-key=secret-object-key");
        }),
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/health/ready",
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      status: "unavailable",
      components: {
        database: "unavailable",
        objectStore: "unavailable",
      },
    });
    expect(response.body).not.toContain("secret");
    expect(response.body).not.toContain("private.internal");
    await app.close();
  });
});
