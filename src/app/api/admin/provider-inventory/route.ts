import { NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse } from "@/modules/authentication/http";
import { getHospitalAdministration } from "@/modules/hospital-administration/server/service";

export async function GET(request: Request) {
  try {
    const { hospitalId } = z
      .object({ hospitalId: z.string().uuid() })
      .parse(Object.fromEntries(new URL(request.url).searchParams));
    const data = await getHospitalAdministration(hospitalId);
    return NextResponse.json({
      data: {
        agents: data.agents,
        versions: data.versions,
        phoneNumbers: data.phoneNumbers,
        integrations: data.integrations,
        knowledgeSources: data.knowledgeSources,
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
