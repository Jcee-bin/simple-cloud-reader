import { buildApp } from "./app.js";
import { createAuthService } from "./auth/authService.js";
import { PostgresAuthRepository } from "./auth/postgresAuthRepository.js";
import { loadConfig } from "./config.js";
import { createDatabase } from "./db/client.js";
import { createResendEmailSender } from "./email/resendEmailSender.js";
import { createObjectStore } from "./storage/objectStore.js";

const config = loadConfig();
const database = createDatabase(config.DATABASE_URL);
const objectStore = createObjectStore(config);
const authService = createAuthService({
  repository: new PostgresAuthRepository(database.db),
  emailSender: createResendEmailSender({
    apiKey: config.RESEND_API_KEY,
    fromEmail: config.AUTH_FROM_EMAIL,
  }),
  publicAppUrl: config.PUBLIC_APP_URL,
  jwtSecret: config.JWT_SECRET,
});
const app = buildApp({
  authService,
  objectStore,
  authenticate: async () => {
    throw new Error("Bearer authentication is not implemented yet");
  },
});
app.addHook("onClose", async () => {
  await database.pool.end();
});

await app.listen({ host: "0.0.0.0", port: config.PORT });
