import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/modules/authentication/http";
import {
  getHospitalAdministration,
  saveDepartment,
} from "@/modules/hospital-administration/server/service";

const query = z.object({ hospitalId: z.string().uuid() });

export async function GET(request: Request) {
  try {
    const { hospitalId } = query.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const data = await getHospitalAdministration(hospitalId);
    return NextResponse.json({ data: data.departments });
  } catch (error) {
    return authErrorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    const id = await saveDepartment(await request.json());
    return NextResponse.json({ data: { id } }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
