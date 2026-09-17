import { NextResponse } from "next/server";

import { authErrorResponse } from "@/modules/authentication/http";
import { updateHospitalMembershipStatus } from "@/modules/authentication/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  try {
    const { membershipId } = await params;
    const body = await request.json();
    await updateHospitalMembershipStatus({
      hospitalId: body.hospitalId,
      membershipId,
      status: body.status,
      expectedUpdatedAt: body.expectedUpdatedAt,
    });
    return NextResponse.json({ data: { updated: true } });
  } catch (error) {
    return authErrorResponse(error);
  }
}
