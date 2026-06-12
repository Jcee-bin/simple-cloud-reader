import { buildApp } from "./app.js";
import { createAuthService } from "./auth/authService.js";
import { createAuthenticate } from "./auth/authenticate.js";
import { PostgresAuthRepository } from "./auth/postgresAuthRepository.js";
import { loadConfig } from "./config.js";
import { createDatabase } from "./db/client.js";
import { createResendEmailSender } from "./email/resendEmailSender.js";
import { createFileService } from "./files/fileService.js";
import { PostgresFileRepository } from "./files/postgresFileRepository.js";
import { createObjectStore } from "./storage/objectStore.js";
import { PostgresSyncStore } from "./sync/postgresSyncStore.js";

const config = loadConfig();
const database = createDatabase(config.DATABASE_URL);
const objectStore = createObjectStore(config);
const authRepository = new PostgresAuthRepository(database.db);
const authService = createAuthService({
  repository: authRepository,
  emailSender: createResendEmailSender({
    apiKey: config.RESEND_API_KEY,
    fromEmail: config.AUTH_FROM_EMAIL,
  }),
  publicAppUrl: config.PUBLIC_APP_URL,
  jwtSecret: config.JWT_SECRET,
});
const fileService = createFileService({
  repository: new PostgresFileRepository(database.db),
  objectStore,
});
const syncStore = new PostgresSyncStore({
  db: database.db,
  cursorSecret: config.CURSOR_SECRET,
});
const app = buildApp({
  authService,
  fileService,
  syncStore,
  authenticate: createAuthenticate({
    jwtSecret: config.JWT_SECRET,
    accessRepository: authRepository,
  }),
});
app.addHook("onClose", async () => {
  await database.pool.end();
});

await app.listen({ host: "0.0.0.0", port: config.PORT });
