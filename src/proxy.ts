import type { NextRequest } from "next/server";

import { updateSupabaseSession } from "@/modules/authentication/supabase/update-session";

export async function proxy(request: NextRequest) {
  const response = await updateSupabaseSession(request);

  if (request.nextUrl.pathname === "/login") {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
