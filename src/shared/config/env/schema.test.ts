import { describe, expect, it } from "vitest";

import { parseEnv } from "./parse-env";
import { publicEnvSchema, serverEnvSchema } from "./schema";

describe("environment schemas", () => {
  it("accepts a complete server configuration", () => {
    const result = parseEnv(
      serverEnvSchema,
      {
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://example.invalid/database",
        DATABASE_MIGRATION_URL: "postgresql://example.invalid/database",
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_ANON_KEY: "synthetic-anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role-key",
        RETELL_API_KEY: "synthetic-retell-key",
      },
      "server",
    );

    expect(result.NODE_ENV).toBe("test");
  });

  it("reports missing public fields without revealing values", () => {
    expect(() => parseEnv(publicEnvSchema, {}, "public")).toThrow(
      "Invalid public environment configuration: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  });
});
