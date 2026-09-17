import "server-only";

import { serverEnv } from "@/shared/config/env/server";

import { createSupabaseAdminClientForCredentials } from "./admin-connection";

export function createSupabaseAdminClient() {
  return createSupabaseAdminClientForCredentials(
    serverEnv.SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  );
}
