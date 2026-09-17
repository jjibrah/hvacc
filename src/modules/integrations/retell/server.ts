import "server-only";

import { createHash } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/modules/database/client";
import { auditEvents, providerEvents } from "@/modules/database/schema";

const retellEventInput = z.object({
  hospitalId: z.string().uuid(),
  providerEventId: z.string().trim().min(1).max(255),
  eventType: z.string().trim().min(1).max(120),
  callId: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()),
  occurredAt: z.coerce.date().optional(),
});

export type RetellEventResult =
  | { accepted: true; duplicate: false; eventId: string }
  | { accepted: true; duplicate: true; eventId: string };

/**
 * Stores provider evidence without interpreting it. Domain-specific event
 * projection belongs in a later worker, after the raw event is durable.
 */
export async function ingestRetellEvent(
  input: unknown,
): Promise<RetellEventResult> {
  const parsed = retellEventInput.parse(input);
  const payloadHash = createHash("sha256")
    .update(JSON.stringify(parsed.payload))
    .digest("hex");

  const [created] = await db
    .insert(providerEvents)
    .values({
      hospitalId: parsed.hospitalId,
      provider: "retell",
      providerEventId: parsed.providerEventId,
      eventType: parsed.eventType,
      callId: parsed.callId,
      payload: parsed.payload,
      payloadHash,
      occurredAt: parsed.occurredAt,
    })
    .onConflictDoNothing()
    .returning({ id: providerEvents.id });

  if (!created) {
    const existing = await db.query.providerEvents.findFirst({
      where: and(
        eq(providerEvents.hospitalId, parsed.hospitalId),
        eq(providerEvents.provider, "retell"),
        eq(providerEvents.providerEventId, parsed.providerEventId),
      ),
    });
    if (!existing)
      throw new Error("Retell event could not be read after deduplication.");
    return { accepted: true, duplicate: true, eventId: existing.id };
  }

  await db.insert(auditEvents).values({
    hospitalId: parsed.hospitalId,
    actorKind: "provider",
    actorProviderId: "retell",
    action: "provider.event_received",
    targetType: "provider_event",
    targetId: created.id,
    result: "succeeded",
    safeAfter: { provider: "retell", event_type: parsed.eventType },
  });

  return { accepted: true, duplicate: false, eventId: created.id };
}
