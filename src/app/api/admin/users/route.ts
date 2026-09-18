import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/modules/authentication/http";
import {
  inviteHospitalUser,
  listHospitalUsers,
} from "@/modules/hospital-administration/server/service";

const hospitalQuery = z.object({ hospitalId: z.string().uuid() });

export async function GET(request: Request) {
  try {
    const parsed = hospitalQuery.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    return NextResponse.json({
      data: await listHospitalUsers(parsed.data.hospitalId),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await inviteHospitalUser(await request.json());
    return NextResponse.json({ data: { invited: true } }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
