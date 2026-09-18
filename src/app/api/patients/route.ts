import { NextResponse } from "next/server";

import { authErrorResponse } from "@/modules/authentication/http";
import { listPatients } from "@/modules/patients/server/service";
import { createPatient } from "@/modules/patients/server/service";

export async function GET(request: Request) {
  try {
    return NextResponse.json({
      data: await listPatients(
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
      { data: await createPatient(await request.json()) },
      { status: 201 },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
