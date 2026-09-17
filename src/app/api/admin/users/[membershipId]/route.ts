import { NextResponse } from "next/server";

import { authErrorResponse } from "@/modules/authentication/http";
import { updateHospitalUserRole } from "@/modules/authentication/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  try {
    const { membershipId } = await params;
    const body = await request.json();
    await updateHospitalUserRole({
      hospitalId: body.hospitalId,
      membershipId,
      role: body.role,
    });
    return NextResponse.json({ data: { updated: true } });
  } catch (error) {
    return authErrorResponse(error);
  }
}
