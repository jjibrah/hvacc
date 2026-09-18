import { NextResponse } from "next/server";

import { authErrorResponse } from "@/modules/authentication/http";
import { getCall } from "@/modules/calls/server/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ callId: string }> },
) {
  try {
    const { callId } = await params;
    const hospitalId = new URL(request.url).searchParams.get("hospitalId");
    return NextResponse.json({ data: await getCall(hospitalId ?? "", callId) });
  } catch (error) {
    return authErrorResponse(error);
  }
}
