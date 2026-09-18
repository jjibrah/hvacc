import { NextResponse } from "next/server";

import { authErrorResponse } from "@/modules/authentication/http";
import {
  createSchedule,
  createRecurringSchedules,
  createScheduleException,
  listScheduleConfiguration,
} from "@/modules/scheduling/server/service";

export async function GET(request: Request) {
  try {
    const hospitalId =
      new URL(request.url).searchParams.get("hospitalId") ?? "";
    return NextResponse.json({
      data: await listScheduleConfiguration(hospitalId),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(
      {
        data: Array.isArray(body.weekdays)
          ? await createRecurringSchedules(body)
          : await createSchedule(body),
      },
      { status: 201 },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    return NextResponse.json(
      { data: await createScheduleException(await request.json()) },
      { status: 201 },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
