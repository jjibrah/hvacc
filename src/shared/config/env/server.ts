import "server-only";

import { parseEnv } from "./parse-env";
import { serverEnvSchema } from "./schema";

export const serverEnv = parseEnv(
  serverEnvSchema,
  {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RETELL_API_KEY: process.env.RETELL_API_KEY,
    RETELL_WEBHOOK_SECRET: process.env.RETELL_WEBHOOK_SECRET,
    RETELL_VOICE_TOOL_SECRET: process.env.RETELL_VOICE_TOOL_SECRET,
  },
  "server",
);
