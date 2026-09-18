import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/modules/authentication/http";
import { updateHospitalMembershipStatus } from "@/modules/hospital-administration/server/service";

const bodySchema = z.object({
  hospitalId: z.string().uuid(),
  status: z.enum(["active", "disabled"]),
  expectedUpdatedAt: z.coerce.date().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  try {
    const { membershipId } = await params;
    const body = bodySchema.parse(await request.json());
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
