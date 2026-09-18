import { NextResponse } from "next/server";

import { authErrorResponse } from "@/modules/authentication/http";
import { closeSession } from "@/modules/scheduling/server/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    return NextResponse.json({
      data: await closeSession({
        ...(await request.json()),
        sessionId,
      }),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
