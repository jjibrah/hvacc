import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/modules/authentication/http";
import {
  getHospitalUserDetail,
  removeMembershipPermissionOverride,
  setMembershipPermissionOverride,
} from "@/modules/hospital-administration/server/service";

const base = z.object({ hospitalId: z.string().uuid() });

export async function GET(request: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  try {
    const { membershipId } = await params;
    const { hospitalId } = base.parse(Object.fromEntries(new URL(request.url).searchParams));
    const detail = await getHospitalUserDetail(hospitalId, membershipId);
    return NextResponse.json({ data: detail.overrides });
  } catch (error) { return authErrorResponse(error); }
}

export async function PUT(request: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  try {
    const { membershipId } = await params;
    const body = z.object({ hospitalId: z.string().uuid(), permissionCode: z.string(), granted: z.boolean(), reason: z.string() }).parse(await request.json());
    await setMembershipPermissionOverride({ ...body, membershipId });
    return NextResponse.json({ data: { updated: true } });
  } catch (error) { return authErrorResponse(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  try {
    const { membershipId } = await params;
    const body = z.object({ hospitalId: z.string().uuid(), permissionCode: z.string() }).parse(await request.json());
    await removeMembershipPermissionOverride({ ...body, membershipId });
    return NextResponse.json({ data: { removed: true } });
  } catch (error) { return authErrorResponse(error); }
}
