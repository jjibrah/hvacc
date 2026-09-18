import { NextResponse } from "next/server";

import { authErrorResponse } from "@/modules/authentication/http";
import { listScheduleCalendar } from "@/modules/scheduling/server/service";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    return NextResponse.json({
      data: await listScheduleCalendar({
        hospitalId: params.get("hospitalId") ?? "",
        from: params.get("from") ?? "",
        to: params.get("to") ?? "",
        timeZone: params.get("timeZone") ?? "Asia/Kuala_Lumpur",
        doctorId: params.get("doctorId") || undefined,
        departmentId: params.get("departmentId") || undefined,
        status: params.get("status") || "all",
      }),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
