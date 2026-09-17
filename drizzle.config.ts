import "dotenv/config";

import { defineConfig } from "drizzle-kit";

const databaseUrl =
  process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/modules/database/schema.ts",
  out: "./drizzle",
  migrations: {
    schema: "drizzle",
    table: "migrations",
  },
  dbCredentials: databaseUrl ? { url: databaseUrl } : undefined,
  strict: true,
  verbose: true,
});
