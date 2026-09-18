import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/modules/authentication/http";
import { listHospitalAuditEvents } from "@/modules/hospital-administration/server/service";

export async function GET(request: Request) {
  try {
    const { hospitalId } = z
      .object({ hospitalId: z.string().uuid() })
      .parse(Object.fromEntries(new URL(request.url).searchParams));
    return NextResponse.json({
      data: await listHospitalAuditEvents(hospitalId),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
