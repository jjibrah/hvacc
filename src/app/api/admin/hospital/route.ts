import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/modules/authentication/http";
import {
  getHospitalAdministration,
  updateHospitalConfiguration,
} from "@/modules/hospital-administration/server/service";

const query = z.object({ hospitalId: z.string().uuid() });

export async function GET(request: Request) {
  try {
    const parsed = query.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const data = await getHospitalAdministration(parsed.hospitalId);
    return NextResponse.json({
      data: { hospital: data.hospital, configuration: data.configuration },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await updateHospitalConfiguration(await request.json());
    return NextResponse.json({ data: { updated: true } });
  } catch (error) {
    return authErrorResponse(error);
  }
}
