import { generateOpenApiDocument } from "@simple-cloud-reader/sync-contract";
import type { HTTPMethods } from "fastify";
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

describe("GET /openapi.json", () => {
  it("serves the deterministic versioned API contract", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/openapi.json",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.json()).toEqual(generateOpenApiDocument());
    await app.close();
  });

  it("documents every registered Phase 1 route with the correct method", async () => {
    const app = buildApp({
      authService: {} as never,
      authenticate: async () => undefined,
      fileService: {} as never,
      syncStore: {} as never,
    });
    await app.ready();

    for (const [openApiPath, pathItem] of Object.entries(
      generateOpenApiDocument().paths,
    )) {
      const fastifyPath = openApiPath.replaceAll(
        /\{([^}]+)\}/g,
        ":$1",
      );
      for (const method of Object.keys(pathItem)) {
        expect(app.hasRoute({
          method: method.toUpperCase() as HTTPMethods,
          url: fastifyPath,
        }), `${method.toUpperCase()} ${fastifyPath}`).toBe(true);
      }
    }

    await app.close();
  });
});
