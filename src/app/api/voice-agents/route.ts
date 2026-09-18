import { NextResponse } from "next/server";
import { authErrorResponse } from "@/modules/authentication/http";
import {
  createAgentVersion,
  listVoiceAgents,
} from "@/modules/voice-agents/server/service";

export async function GET(request: Request) {
  try {
    return NextResponse.json({
      data: await listVoiceAgents(
        new URL(request.url).searchParams.get("hospitalId") ?? "",
      ),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    return NextResponse.json(
      { data: await createAgentVersion(await request.json()) },
      { status: 201 },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
