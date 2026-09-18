import { NextResponse } from "next/server";

import { authErrorResponse } from "@/modules/authentication/http";
import { listAvailability } from "@/modules/scheduling/server/service";

export async function GET(request: Request) {
  try {
    return NextResponse.json({
      data: await listAvailability(
        Object.fromEntries(new URL(request.url).searchParams),
      ),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
