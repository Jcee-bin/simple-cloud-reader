import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  applyMigrationsToSchema,
  dropTestSchema,
  listPublicConstraints,
  listPublicTables,
} from "../src/db/testDatabase.js";

const migrationPath = fileURLToPath(
  new URL("../migrations/0001_phase_one_core.sql", import.meta.url),
);

const expectedTables = [
  "users",
  "devices",
  "magic_links",
  "refresh_sessions",
  "books",
  "library_memberships",
  "file_objects",
  "reading_positions",
  "highlights",
  "bookmarks",
  "collections",
  "collection_memberships",
  "mutation_receipts",
  "change_log",
  "entity_history",
];

describe("phase one database migration", () => {
  it("checks in every required table and uniqueness boundary", async () => {
    const migration = await readFile(migrationPath, "utf8");

    for (const table of expectedTables) {
      expect(migration).toMatch(
        new RegExp(`create\\s+table\\s+\"?${table}\"?`, "i"),
      );
    }

    expect(migration).toContain("users_normalized_email_unique");
    expect(migration).toContain("refresh_sessions_user_token_unique");
    expect(migration).toContain("library_memberships_user_book_unique");
    expect(migration).toContain("file_objects_user_sha256_unique");
    expect(migration).toContain("mutation_receipts_user_operation_unique");
    expect(migration).toContain("change_log_sequence_unique");
  });
});

describe.runIf(Boolean(process.env.TEST_DATABASE_URL))(
  "phase one live PostgreSQL migration",
  () => {
    const schemaName = `migration_${crypto.randomUUID().replaceAll("-", "")}`;

    beforeAll(async () => {
      await applyMigrationsToSchema(schemaName);
    });

    afterAll(async () => {
      await dropTestSchema(schemaName);
    });

    it("creates the complete schema in a fresh namespace", async () => {
      expect(await listPublicTables(schemaName)).toEqual(
        [...expectedTables].sort(),
      );
    });

    it("creates the required unique constraints", async () => {
      expect(await listPublicConstraints(schemaName)).toEqual(
        expect.arrayContaining([
          "users_normalized_email_unique",
          "refresh_sessions_user_token_unique",
          "library_memberships_user_book_unique",
          "file_objects_user_sha256_unique",
          "mutation_receipts_user_operation_unique",
          "change_log_sequence_unique",
        ]),
      );
    });
  },
);
