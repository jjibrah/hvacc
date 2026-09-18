import { NextResponse } from "next/server";

import { authErrorResponse } from "@/modules/authentication/http";
import { getOverviewMetrics } from "@/modules/reports/server/service";

export async function GET(request: Request) {
  try {
    return NextResponse.json({
      data: await getOverviewMetrics(
        Object.fromEntries(new URL(request.url).searchParams),
      ),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
