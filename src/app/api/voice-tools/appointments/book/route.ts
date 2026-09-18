import { NextResponse } from "next/server";

import { ResourceNotFoundError } from "@/modules/authentication/errors";
import { bookVoiceAppointment } from "@/modules/integrations/retell/appointment-tools";
import { parseRetellToolRequest } from "@/modules/integrations/retell/voice-tools";

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    const toolRequest = await parseRetellToolRequest(rawBody, request);
    const result = await bookVoiceAppointment(
      String(toolRequest.call.call_id),
      toolRequest.args,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return NextResponse.json({
        success: false,
        code: "CALL_NOT_FOUND",
        message: "The Retell call is not known to HVA.",
      });
    }
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", message: "Unauthorized." },
        { status: 401 },
      );
    }
    return NextResponse.json({
      success: false,
      code: "BOOKING_FAILED",
      message: "The appointment could not be booked.",
    });
  }
}
