import { NextResponse } from "next/server";

import { authErrorResponse } from "@/modules/authentication/http";
import {
  bookAppointment,
  listAppointments,
} from "@/modules/scheduling/server/service";

export async function GET(request: Request) {
  try {
    return NextResponse.json({
      data: await listAppointments(
        Object.fromEntries(new URL(request.url).searchParams),
      ),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(
      { data: await bookAppointment(await request.json()) },
      { status: 201 },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
