import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { serverEnv } from "@/shared/config/env/server";
import { ingestRetellEvent } from "@/modules/integrations/retell/server";

function validSecret(received: string | null) {
  const configured = serverEnv.RETELL_WEBHOOK_SECRET;
  if (!configured || !received) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(received);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function POST(request: Request) {
  if (!validSecret(request.headers.get("x-retell-webhook-secret"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await ingestRetellEvent({
      hospitalId: request.headers.get("x-hospital-id"),
      providerEventId: body.event_id ?? body.id,
      eventType: body.event_type ?? body.event,
      callId: body.call_id,
      payload: body,
      occurredAt: body.occurred_at,
    });
    return NextResponse.json(
      { data: result },
      { status: result.duplicate ? 200 : 202 },
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid provider event." },
      { status: 400 },
    );
  }
}
