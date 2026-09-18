import { NextResponse } from "next/server";

import { authErrorResponse } from "@/modules/authentication/http";
import { rescheduleAppointment } from "@/modules/scheduling/server/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  try {
    const { appointmentId } = await params;
    return NextResponse.json({
      data: await rescheduleAppointment({
        ...(await request.json()),
        appointmentId,
      }),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
