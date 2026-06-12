import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

export function createDatabase(
  databaseUrl: string,
  options: { searchPath?: string } = {},
) {
  if (
    options.searchPath
    && !/^[a-z][a-z0-9_]*$/.test(options.searchPath)
  ) {
    throw new Error("Invalid PostgreSQL search path");
  }
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    options: options.searchPath
      ? `-c search_path=${options.searchPath}`
      : undefined,
  });

  return {
    db: drizzle(pool, { schema }),
    pool,
  };
}

export type Database = ReturnType<typeof createDatabase>["db"];
