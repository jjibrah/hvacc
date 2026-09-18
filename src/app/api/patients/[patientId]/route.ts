import { NextResponse } from "next/server";

import { authErrorResponse } from "@/modules/authentication/http";
import { getPatient } from "@/modules/patients/server/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> },
) {
  try {
    const { patientId } = await params;
    const hospitalId =
      new URL(request.url).searchParams.get("hospitalId") ?? "";
    return NextResponse.json({ data: await getPatient(hospitalId, patientId) });
  } catch (error) {
    return authErrorResponse(error);
  }
}
