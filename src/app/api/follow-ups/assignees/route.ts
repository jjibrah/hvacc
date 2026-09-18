import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/modules/authentication/http";
import { listFollowUpAssignees } from "@/modules/follow-ups/server/service";

export async function GET(request: Request) {
  try {
    const hospitalId = z
      .string()
      .uuid()
      .parse(new URL(request.url).searchParams.get("hospitalId"));
    return NextResponse.json({ data: await listFollowUpAssignees(hospitalId) });
  } catch (error) {
    return authErrorResponse(error);
  }
}
