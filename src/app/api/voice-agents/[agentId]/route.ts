import { NextResponse } from "next/server";
import { authErrorResponse } from "@/modules/authentication/http";
import {
  getVoiceAgent,
  syncVoiceAgent,
} from "@/modules/voice-agents/server/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> },
) {
  try {
    const { agentId } = await params;
    return NextResponse.json({
      data: await getVoiceAgent(
        new URL(request.url).searchParams.get("hospitalId") ?? "",
        agentId,
      ),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> },
) {
  try {
    const { agentId } = await params;
    const hospitalId =
      new URL(request.url).searchParams.get("hospitalId") ?? "";
    return NextResponse.json({
      data: await syncVoiceAgent(hospitalId, agentId),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
