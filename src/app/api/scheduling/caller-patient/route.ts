import { NextResponse } from "next/server";

import { authErrorResponse } from "@/modules/authentication/http";
import { linkCallerToPatient } from "@/modules/scheduling/server/service";

export async function POST(request: Request) {
  try {
    return NextResponse.json(
      { data: await linkCallerToPatient(await request.json()) },
      { status: 201 },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
