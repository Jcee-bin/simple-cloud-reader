import { describe, expect, it, vi } from "vitest";
import { productionLogger } from "../src/logging.js";
import { createMaintenanceService } from "../src/maintenance/maintenanceService.js";

describe("backend operations", () => {
  it("uses explicit retention windows for expired authentication artifacts", async () => {
    const cleanupAuthArtifacts = vi.fn(async () => ({
      magicLinks: 2,
      refreshSessions: 3,
    }));
    const now = new Date("2026-06-13T00:00:00.000Z");
    const result = await createMaintenanceService({
      repository: { cleanupAuthArtifacts },
      now: () => now,
    }).run();
    expect(result).toEqual({ magicLinks: 2, refreshSessions: 3 });
    expect(cleanupAuthArtifacts).toHaveBeenCalledWith({
      now,
      usedBefore: new Date("2026-06-12T00:00:00.000Z"),
      revokedBefore: new Date("2026-05-14T00:00:00.000Z"),
    });
  });

  it("redacts bearer and opaque authentication credentials", () => {
    expect(productionLogger.redact.paths).toEqual(expect.arrayContaining([
      "req.headers.authorization",
      "req.body.token",
      "req.body.refreshToken",
    ]));
  });
});
