import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/modules/authentication/http";
import { listFollowUps } from "@/modules/follow-ups/server/service";

export async function GET(request: Request) {
  try {
    const query = Object.fromEntries(new URL(request.url).searchParams);
    return NextResponse.json({ data: await listFollowUps(query) });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = z
      .object({
        hospitalId: z.string().uuid(),
        callId: z.string().uuid().optional(),
        appointmentId: z.string().uuid().optional(),
        reasonCode: z.string().trim().min(2).max(120),
        priority: z.enum(["p1", "p2", "p3", "p4"]),
        queue: z.string().trim().min(1).max(120),
        resolutionCriterion: z.string().trim().min(2).max(1000),
        dueAt: z.coerce.date(),
      })
      .refine(({ callId, appointmentId }) => callId || appointmentId, {
        message: "A call or appointment relationship is required.",
      })
      .parse(await request.json());
    const { createFollowUp } =
      await import("@/modules/follow-ups/server/service");
    return NextResponse.json(
      { data: await createFollowUp(body) },
      { status: 201 },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
