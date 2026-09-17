import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClientForCredentials(
  url: string,
  key: string,
) {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
