import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/modules/authentication/http";
import {
  addFollowUpNote,
  assignFollowUp,
  cancelFollowUp,
  getFollowUp,
  resolveFollowUp,
  startFollowUp,
} from "@/modules/follow-ups/server/service";

const paramsSchema = z.object({ followUpId: z.string().uuid() });

export async function GET(
  request: Request,
  context: { params: Promise<{ followUpId: string }> },
) {
  try {
    const params = paramsSchema.parse(await context.params);
    const hospitalId = z
      .string()
      .uuid()
      .parse(new URL(request.url).searchParams.get("hospitalId"));
    return NextResponse.json({
      data: await getFollowUp(hospitalId, params.followUpId),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ followUpId: string }> },
) {
  try {
    const params = paramsSchema.parse(await context.params);
    const body = (await request.json()) as Record<string, unknown>;
    const operation = z
      .enum(["assign", "start", "note", "resolve", "cancel"])
      .parse(body.operation);
    const input = { ...body, followUpId: params.followUpId };
    let data;
    if (operation === "assign") data = await assignFollowUp(input);
    if (operation === "start") data = await startFollowUp(input);
    if (operation === "note") data = await addFollowUpNote(input);
    if (operation === "resolve") data = await resolveFollowUp(input);
    if (operation === "cancel") data = await cancelFollowUp(input);
    return NextResponse.json({ data });
  } catch (error) {
    return authErrorResponse(error);
  }
}
