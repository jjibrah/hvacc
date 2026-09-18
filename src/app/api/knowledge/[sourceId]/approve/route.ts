import { NextResponse } from "next/server";
import { authErrorResponse } from "@/modules/authentication/http";
import { approveKnowledgeSource } from "@/modules/knowledge/server/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  try {
    const { sourceId } = await params;
    const hospitalId =
      new URL(request.url).searchParams.get("hospitalId") ?? "";
    return NextResponse.json({
      data: await approveKnowledgeSource(hospitalId, sourceId),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
