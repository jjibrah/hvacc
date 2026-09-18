import { NextResponse } from "next/server";
import { authErrorResponse } from "@/modules/authentication/http";
import {
  createKnowledgeSource,
  listKnowledge,
} from "@/modules/knowledge/server/service";

export async function GET(request: Request) {
  try {
    return NextResponse.json({
      data: await listKnowledge(
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
      { data: await createKnowledgeSource(await request.json()) },
      { status: 201 },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
