import Fastify, { type FastifyInstance } from "fastify";
import {
  registerFileRoutes,
  type FileRouteDependencies,
} from "./routes/files.js";
import { registerHealthRoute } from "./routes/health.js";

export function buildApp(
  dependencies?: FileRouteDependencies,
): FastifyInstance {
  const app = Fastify({ logger: false });
  void app.register(registerHealthRoute);
  if (dependencies) {
    void app.register(registerFileRoutes, dependencies);
  }
  return app;
}
