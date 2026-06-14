import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL
      ?? "postgres://reader:reader@localhost:5432/simple_cloud_reader",
  },
  strict: true,
  verbose: true,
});
