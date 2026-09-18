import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/modules/database/client";
import {
  auditEvents,
  callAnalyses,
  callParticipants,
  callProviderSnapshots,
  callRecordings,
  calls,
  callTranscripts,
  callers,
  providerEvents,
  retellAgents,
} from "@/modules/database/schema";

const retellEventInput = z.object({
  hospitalId: z.string().uuid().optional(),
  providerEventId: z.string().trim().min(1).max(255),
  eventType: z.string().trim().min(1).max(120),
  providerCallId: z.string().trim().min(1).max(255).optional(),
  payload: z.record(z.string(), z.unknown()),
  occurredAt: z.coerce.date().optional(),
});

export type RetellEventResult =
  | { accepted: true; duplicate: false; eventId: string; callId?: string }
  | { accepted: true; duplicate: true; eventId: string; callId?: string };

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberDate(value: unknown) {
  return typeof value === "number"
    ? new Date(value > 10_000_000_000 ? value : value * 1000)
    : undefined;
}

function eventStatus(eventType: string) {
  if (eventType === "call_started") return "in_progress" as const;
  if (eventType === "call_ended" || eventType === "call_analyzed")
    return "ended" as const;
  return "received" as const;
}

function callDirection(payload: Record<string, unknown>) {
  return payload.direction === "outbound"
    ? ("outbound" as const)
    : ("inbound" as const);
}

function analysisPayload(payload: Record<string, unknown>) {
  const analysis = (payload.call_analysis ?? payload.analysis) as
    Record<string, unknown> | undefined;
  if (!analysis || typeof analysis !== "object") return undefined;
  return {
    summary: stringValue(analysis.call_summary ?? analysis.summary),
    sentiment: stringValue(analysis.user_sentiment ?? analysis.sentiment),
    outcome:
      typeof analysis.call_successful === "boolean"
        ? analysis.call_successful
          ? "successful"
          : "unsuccessful"
        : stringValue(analysis.outcome),
    bookingIntent:
      typeof analysis.booking_intent === "boolean"
        ? analysis.booking_intent
        : undefined,
    rawSnapshot: analysis,
  };
}

async function projectCall(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: Omit<z.infer<typeof retellEventInput>, "hospitalId"> & {
    hospitalId: string;
  },
  providerCallId: string,
) {
  const payload = (
    input.payload.call && typeof input.payload.call === "object"
      ? input.payload.call
      : input.payload
  ) as Record<string, unknown>;
  const startedAt = numberDate(payload.start_timestamp);
  const endedAt = numberDate(payload.end_timestamp);
  const existing = await tx.query.calls.findFirst({
    where: and(
      eq(calls.hospitalId, input.hospitalId),
      eq(calls.provider, "retell"),
      eq(calls.providerCallId, providerCallId),
    ),
  });
  const call = existing
    ? (
        await tx
          .update(calls)
          .set({
            status: eventStatus(input.eventType),
            startedAt: startedAt ?? existing.startedAt,
            endedAt: endedAt ?? existing.endedAt,
            lastProviderEventAt: input.occurredAt ?? new Date(),
            updatedAt: new Date(),
          })
          .where(eq(calls.id, existing.id))
          .returning()
      )[0]
    : (
        await tx
          .insert(calls)
          .values({
            id: randomUUID(),
            hospitalId: input.hospitalId,
            provider: "retell",
            providerCallId,
            direction: callDirection(payload),
            status: eventStatus(input.eventType),
            startedAt,
            endedAt,
            lastProviderEventAt: input.occurredAt ?? new Date(),
          })
          .returning()
      )[0];
  if (!call) throw new Error("Retell call could not be projected.");

  const callerPhone = stringValue(
    payload.from_number ?? payload.caller_phone_number ?? payload.phone_number,
  );
  if (callerPhone) {
    const phoneHash = createHash("sha256").update(callerPhone).digest("hex");
    let caller = await tx.query.callers.findFirst({
      where: and(
        eq(callers.hospitalId, input.hospitalId),
        eq(callers.phoneHash, phoneHash),
      ),
    });
    if (!caller) {
      [caller] = await tx
        .insert(callers)
        .values({
          hospitalId: input.hospitalId,
          displayName: stringValue(payload.caller_name),
          phoneE164: callerPhone,
          phoneHash,
        })
        .onConflictDoNothing()
        .returning();
      caller ??= await tx.query.callers.findFirst({
        where: and(
          eq(callers.hospitalId, input.hospitalId),
          eq(callers.phoneHash, phoneHash),
        ),
      });
    }
    if (caller) {
      const participant = await tx.query.callParticipants.findFirst({
        where: and(
          eq(callParticipants.hospitalId, input.hospitalId),
          eq(callParticipants.callId, call.id),
          eq(callParticipants.callerId, caller.id),
        ),
      });
      if (!participant) {
        await tx.insert(callParticipants).values({
          hospitalId: input.hospitalId,
          callId: call.id,
          kind: "caller",
          callerId: caller.id,
          providerParticipantId: `${providerCallId}:caller`,
          joinedAt: startedAt ?? input.occurredAt,
        });
      }
    }
  }

  const transcript = stringValue(payload.transcript);
  if (transcript) {
    await tx
      .insert(callTranscripts)
      .values({
        hospitalId: input.hospitalId,
        callId: call.id,
        providerTranscriptId: `${input.providerEventId}:transcript`,
        content: transcript,
        language: stringValue(payload.language),
        isFinal: input.eventType !== "call_started",
        capturedAt: input.occurredAt ?? new Date(),
      })
      .onConflictDoNothing();
  }

  const recordingUrl = stringValue(
    payload.recording_url ?? payload.recordingUrl,
  );
  if (recordingUrl) {
    await tx
      .insert(callRecordings)
      .values({
        hospitalId: input.hospitalId,
        callId: call.id,
        status: "available",
        providerRecordingId: providerCallId,
        storageReference: recordingUrl,
        durationSeconds:
          startedAt && endedAt
            ? Math.max(
                0,
                Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
              )
            : undefined,
      })
      .onConflictDoUpdate({
        target: [callRecordings.hospitalId, callRecordings.providerRecordingId],
        set: {
          status: "available",
          storageReference: recordingUrl,
          updatedAt: new Date(),
        },
      });
  }

  const analysis = analysisPayload(payload);
  if (analysis) {
    await tx
      .insert(callAnalyses)
      .values({
        hospitalId: input.hospitalId,
        callId: call.id,
        status: "completed",
        summary: analysis.summary,
        sentiment: analysis.sentiment,
        outcome: analysis.outcome,
        bookingIntent: analysis.bookingIntent,
        rawSnapshot: analysis.rawSnapshot,
        completedAt: input.occurredAt ?? new Date(),
      })
      .onConflictDoUpdate({
        target: callAnalyses.callId,
        set: {
          status: "completed",
          summary: analysis.summary,
          sentiment: analysis.sentiment,
          outcome: analysis.outcome,
          bookingIntent: analysis.bookingIntent,
          rawSnapshot: analysis.rawSnapshot,
          completedAt: input.occurredAt ?? new Date(),
          updatedAt: new Date(),
        },
      });
  } else if (input.eventType === "call_ended") {
    await tx
      .insert(callAnalyses)
      .values({
        hospitalId: input.hospitalId,
        callId: call.id,
        status: "pending",
      })
      .onConflictDoNothing();
  }

  await tx.insert(callProviderSnapshots).values({
    hospitalId: input.hospitalId,
    callId: call.id,
    snapshotType: input.eventType,
    payload,
    capturedAt: input.occurredAt ?? new Date(),
  });
  return call.id;
}

export async function ingestRetellEvent(
  input: unknown,
): Promise<RetellEventResult> {
  const parsed = retellEventInput.parse(input);
  const payloadHash = createHash("sha256")
    .update(JSON.stringify(parsed.payload))
    .digest("hex");
  const nestedCall =
    parsed.payload.call && typeof parsed.payload.call === "object"
      ? (parsed.payload.call as Record<string, unknown>)
      : parsed.payload;
  const providerCallId =
    parsed.providerCallId ?? stringValue(nestedCall.call_id);

  return db.transaction(async (tx) => {
    const hospitalId =
      parsed.hospitalId ??
      (
        await tx.query.retellAgents.findFirst({
          where: eq(
            retellAgents.providerAgentId,
            stringValue(nestedCall.agent_id) ?? "",
          ),
          columns: { hospitalId: true },
        })
      )?.hospitalId;
    if (!hospitalId) {
      throw new Error("Retell event could not be mapped to a hospital.");
    }
    const existingEvent = await tx.query.providerEvents.findFirst({
      where: and(
        eq(providerEvents.hospitalId, hospitalId),
        eq(providerEvents.provider, "retell"),
        eq(providerEvents.providerEventId, parsed.providerEventId),
      ),
    });
    if (existingEvent) {
      return {
        accepted: true,
        duplicate: true,
        eventId: existingEvent.id,
        callId: existingEvent.callId ?? undefined,
      };
    }
    const [created] = await tx
      .insert(providerEvents)
      .values({
        hospitalId,
        provider: "retell",
        providerEventId: parsed.providerEventId,
        eventType: parsed.eventType,
        payload: parsed.payload,
        payloadHash,
        occurredAt: parsed.occurredAt,
      })
      .onConflictDoNothing()
      .returning({ id: providerEvents.id });

    if (!created) {
      const existing = await tx.query.providerEvents.findFirst({
        where: and(
          eq(providerEvents.hospitalId, hospitalId),
          eq(providerEvents.provider, "retell"),
          eq(providerEvents.providerEventId, parsed.providerEventId),
        ),
      });
      if (!existing)
        throw new Error("Retell event could not be read after deduplication.");
      return {
        accepted: true,
        duplicate: true,
        eventId: existing.id,
        callId: existing.callId ?? undefined,
      };
    }
    const internalCallId = providerCallId
      ? await projectCall(tx, { ...parsed, hospitalId }, providerCallId)
      : undefined;
    await tx
      .update(providerEvents)
      .set({
        callId: internalCallId,
        processingStatus: "processed",
        processedAt: new Date(),
      })
      .where(eq(providerEvents.id, created.id));
    await tx.insert(auditEvents).values({
      hospitalId,
      actorKind: "provider",
      actorProviderId: "retell",
      action: "provider.event_received",
      targetType: "provider_event",
      targetId: created.id,
      result: "succeeded",
      safeAfter: {
        provider: "retell",
        event_type: parsed.eventType,
        projected: Boolean(internalCallId),
      },
    });
    return {
      accepted: true,
      duplicate: false,
      eventId: created.id,
      callId: internalCallId,
    };
  });
}
