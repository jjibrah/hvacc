import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/modules/authentication/http";
import { listCalls } from "@/modules/calls/server/service";

export async function GET(request: Request) {
  try {
    const query = z
      .object({
        hospitalId: z.string().uuid(),
        search: z.string().optional(),
        status: z.string().optional(),
      })
      .parse(Object.fromEntries(new URL(request.url).searchParams));
    return NextResponse.json({ data: await listCalls(query) });
  } catch (error) {
    return authErrorResponse(error);
  }
}
