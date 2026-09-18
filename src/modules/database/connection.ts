import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export function createDatabaseConnection(databaseUrl: string) {
  // Supabase's transaction pooler does not support prepared statements. A
  // single application-side connection per warm serverless instance avoids
  // exhausting the shared pool.
  const client = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    // Do not let an unavailable Supabase project or blocked pooler make every
    // authenticated page wait for postgres.js's 30-second default.
    connect_timeout: 5,
    idle_timeout: 20,
    ssl: databaseUrl.includes("localhost") ? false : "require",
  });

  return { client, db: drizzle(client, { schema }) };
}
