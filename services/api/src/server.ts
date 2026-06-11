import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createObjectStore } from "./storage/objectStore.js";

const config = loadConfig();
const objectStore = createObjectStore(config);
const app = buildApp({
  objectStore,
  authenticate: async () => {
    throw new Error("Authentication is not implemented in Phase 0");
  },
});

await app.listen({ host: "0.0.0.0", port: config.PORT });
