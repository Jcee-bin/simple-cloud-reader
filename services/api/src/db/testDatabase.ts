import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const migrationsDirectory = fileURLToPath(
  new URL("../../migrations", import.meta.url),
);

function requireTestDatabaseUrl(): string {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("TEST_DATABASE_URL is required for live migration tests");
  }
  return databaseUrl;
}

function validateSchemaName(schemaName: string): void {
  if (!/^[a-z][a-z0-9_]*$/.test(schemaName)) {
    throw new Error("Invalid PostgreSQL test schema name");
  }
}

async function withPool<T>(
  callback: (pool: Pool) => Promise<T>,
): Promise<T> {
  const pool = new Pool({ connectionString: requireTestDatabaseUrl() });
  try {
    return await callback(pool);
  } finally {
    await pool.end();
  }
}

export async function applyMigrationsToSchema(
  schemaName: string,
): Promise<void> {
  validateSchemaName(schemaName);
  await withPool(async (pool) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`CREATE SCHEMA "${schemaName}"`);
      await client.query(`SET LOCAL search_path TO "${schemaName}"`);

      const files = (await readdir(migrationsDirectory))
        .filter((file) => file.endsWith(".sql"))
        .sort();
      for (const file of files) {
        const migration = await readFile(
          `${migrationsDirectory}/${file}`,
          "utf8",
        );
        const sql = migration.replaceAll(
          'REFERENCES "public".',
          `REFERENCES "${schemaName}".`,
        );
        await client.query(sql);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });
}

export async function dropTestSchema(schemaName: string): Promise<void> {
  validateSchemaName(schemaName);
  await withPool(async (pool) => {
    await pool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  });
}

export async function listPublicTables(
  schemaName: string,
): Promise<string[]> {
  validateSchemaName(schemaName);
  return withPool(async (pool) => {
    const result = await pool.query<{ table_name: string }>({
      text: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `,
      values: [schemaName],
    });
    return result.rows.map(({ table_name }) => table_name);
  });
}

export async function listPublicConstraints(
  schemaName: string,
): Promise<string[]> {
  validateSchemaName(schemaName);
  return withPool(async (pool) => {
    const result = await pool.query<{ constraint_name: string }>({
      text: `
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = $1
          AND constraint_type = 'UNIQUE'
        ORDER BY constraint_name
      `,
      values: [schemaName],
    });
    return result.rows.map(({ constraint_name }) => constraint_name);
  });
}
