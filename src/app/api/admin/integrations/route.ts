import { NextResponse } from "next/server";

import { authErrorResponse } from "@/modules/authentication/http";
import {
  checkRetellIntegration,
  getIntegrationHealth,
} from "@/modules/voice-agents/server/service";

export async function GET(request: Request) {
  try {
    return NextResponse.json({
      data: await getIntegrationHealth(
        new URL(request.url).searchParams.get("hospitalId") ?? "",
      ),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const hospitalId =
      new URL(request.url).searchParams.get("hospitalId") ?? "";
    return NextResponse.json({
      data: await checkRetellIntegration(hospitalId),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
