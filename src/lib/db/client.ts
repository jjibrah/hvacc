import "server-only";

import { createDatabaseConnection } from "./connection";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to connect to PostgreSQL.");
}

export const { client: databaseClient, db } =
  createDatabaseConnection(databaseUrl);

export type Database = typeof db;
