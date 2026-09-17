import "dotenv/config";

import { createDatabaseConnection } from "./connection";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to check PostgreSQL.");
}

const { client } = createDatabaseConnection(databaseUrl);

async function checkDatabase() {
  const [catalog] = await client<
    {
      database_name: string;
      migrations_table_exists: boolean;
      public_tables: number;
      rls_tables: number;
    }[]
  >`
    select
      current_database() as database_name,
      to_regclass('drizzle.migrations') is not null as migrations_table_exists,
      count(*)::int as public_tables,
      count(*) filter (where c.relrowsecurity)::int as rls_tables
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  `;

  if (!catalog?.migrations_table_exists) {
    throw new Error(
      "Database is reachable, but the migration table is missing.",
    );
  }
  if (catalog.public_tables === 0) {
    throw new Error("Database is reachable, but no application tables exist.");
  }
  if (catalog.rls_tables !== catalog.public_tables) {
    throw new Error(
      `RLS is enabled on ${catalog.rls_tables}/${catalog.public_tables} public tables.`,
    );
  }

  const [{ migration_count: migrationCount }] = await client<
    { migration_count: number }[]
  >`select count(*)::int as migration_count from drizzle.migrations`;
  const [{ hospital_count: hospitalCount }] = await client<
    { hospital_count: number }[]
  >`select count(*)::int as hospital_count from public.hospitals`;

  console.log("Database connection: OK");
  console.log(`Database: ${catalog.database_name}`);
  console.log(`Applied migrations: ${migrationCount}`);
  console.log(`Application tables: ${catalog.public_tables}`);
  console.log(`RLS protected: ${catalog.rls_tables}/${catalog.public_tables}`);
  console.log(`Synthetic hospitals: ${hospitalCount}`);
}

checkDatabase()
  .then(async () => {
    await client.end();
  })
  .catch(async (error: unknown) => {
    console.error(
      "Database health check failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    await client.end();
    process.exitCode = 1;
  });
