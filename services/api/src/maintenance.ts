import { z } from "zod";
import { PostgresAuthRepository } from "./auth/postgresAuthRepository.js";
import { createDatabase } from "./db/client.js";
import { createMaintenanceService } from "./maintenance/maintenanceService.js";

const { DATABASE_URL } = z.object({
  DATABASE_URL: z.url(),
}).parse(process.env);
const database = createDatabase(DATABASE_URL);
try {
  const result = await createMaintenanceService({
    repository: new PostgresAuthRepository(database.db),
  }).run();
  console.log(JSON.stringify({ event: "maintenance_complete", ...result }));
} finally {
  await database.pool.end();
}
