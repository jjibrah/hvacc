import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { serverEnv } from "@/shared/config/env/server";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    serverEnv.SUPABASE_URL,
    serverEnv.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always write cookies. Proxy refreshes the
            // session; this catch keeps read-only render paths safe.
          }
        },
      },
    },
  );
}
