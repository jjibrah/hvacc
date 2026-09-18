import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { verify as verifyRetellSignature } from "retell-sdk";

import { serverEnv } from "@/shared/config/env/server";
import { ingestRetellEvent } from "@/modules/integrations/retell/server";

function validSecret(received: string | null) {
  const configured = serverEnv.RETELL_WEBHOOK_SECRET;
  if (!configured || !received) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(received);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function validRetellRequest(rawBody: string, request: Request) {
  const signature = request.headers.get("x-retell-signature");
  if (signature) {
    try {
      return await verifyRetellSignature(
        rawBody,
        serverEnv.RETELL_API_KEY,
        signature,
      );
    } catch {
      return false;
    }
  }
  // Keep the previous static-secret path for local/manual simulations only.
  return (
    process.env.NODE_ENV !== "production" &&
    validSecret(request.headers.get("x-retell-webhook-secret"))
  );
}

export async function POST(request: Request) {
  let diagnostic: {
    eventType?: string;
    providerCallId?: string;
    agentId?: string;
  } = {};

  try {
    const rawBody = await request.text();
    if (!(await validRetellRequest(rawBody, request))) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const call = (
      body.call && typeof body.call === "object" ? body.call : body
    ) as Record<string, unknown>;
    const eventType = String(body.event_type ?? body.event ?? "unknown");
    const providerCallId = String(call.call_id ?? body.call_id ?? "");
    diagnostic = {
      eventType,
      providerCallId: providerCallId || undefined,
      agentId: String(call.agent_id ?? body.agent_id ?? "") || undefined,
    };

    // Retell's dashboard webhook test uses synthetic identities rather than a
    // real call or configured agent. Acknowledge that probe in development,
    // but never allow it to create HVA records or bypass production tenancy.
    if (
      process.env.NODE_ENV !== "production" &&
      eventType === "call_started" &&
      providerCallId === "test_call" &&
      diagnostic.agentId === "test_agent"
    ) {
      return NextResponse.json({ data: { accepted: true, test: true } });
    }

    const providerEventId = String(
      body.event_id ??
        body.id ??
        createHash("sha256")
          .update(`${eventType}:${providerCallId}:${JSON.stringify(body)}`)
          .digest("hex"),
    );
    const result = await ingestRetellEvent({
      hospitalId: request.headers.get("x-hospital-id"),
      providerEventId,
      eventType,
      providerCallId: providerCallId || undefined,
      payload: body,
      occurredAt: call.end_timestamp ?? call.start_timestamp ?? undefined,
    });
    return NextResponse.json(
      { data: result },
      { status: result.duplicate ? 200 : 202 },
    );
  } catch (error) {
    console.error("[retell webhook] request failed", {
      ...diagnostic,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Invalid provider event." },
      { status: 400 },
    );
  }
}
