import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/modules/authentication/http";
import { getHospitalUserDetail, updateHospitalUserRole } from "@/modules/hospital-administration/server/service";

const bodySchema = z.object({
  hospitalId: z.string().uuid(),
  role: z.string(),
  expectedUpdatedAt: z.coerce.date().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  try {
    const { membershipId } = await params;
    const { hospitalId } = z.object({ hospitalId: z.string().uuid() }).parse(Object.fromEntries(new URL(request.url).searchParams));
    return NextResponse.json({ data: await getHospitalUserDetail(hospitalId, membershipId) });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  try {
    const { membershipId } = await params;
    const body = bodySchema.parse(await request.json());
    await updateHospitalUserRole({
      hospitalId: body.hospitalId,
      membershipId,
      role: body.role,
      expectedUpdatedAt: body.expectedUpdatedAt,
    });
    return NextResponse.json({ data: { updated: true } });
  } catch (error) {
    return authErrorResponse(error);
  }
}
