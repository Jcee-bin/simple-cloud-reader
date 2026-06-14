import type { FastifyInstance } from "fastify";

export interface ReadinessDependencies {
  checkDatabase(): Promise<void>;
  checkObjectStore(): Promise<void>;
}

interface HealthRouteOptions {
  readiness?: ReadinessDependencies;
}

export async function registerHealthRoute(
  app: FastifyInstance,
  options: HealthRouteOptions,
): Promise<void> {
  const { readiness } = options;
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/health/live", async () => ({ status: "live" }));
  app.get("/health/ready", async (_request, reply) => {
    if (!readiness) {
      return reply.code(503).send({
        status: "unavailable",
        components: {
          database: "unavailable",
          objectStore: "unavailable",
        },
      });
    }

    const [database, objectStore] = await Promise.allSettled([
      readiness.checkDatabase(),
      readiness.checkObjectStore(),
    ]);
    const components = {
      database: database.status === "fulfilled" ? "ready" : "unavailable",
      objectStore: objectStore.status === "fulfilled" ? "ready" : "unavailable",
    };
    const ready = database.status === "fulfilled"
      && objectStore.status === "fulfilled";

    return reply.code(ready ? 200 : 503).send({
      status: ready ? "ready" : "unavailable",
      components,
    });
  });
}
