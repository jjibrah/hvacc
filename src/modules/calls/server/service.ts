import "server-only";

import { and, asc, desc, eq, ilike, or } from "drizzle-orm";

import { requireAuthorizationActor } from "@/modules/authentication/actor";
import { evaluateAuthorization } from "@/modules/authentication/authorization";
import {
  AuthorizationDeniedError,
  ResourceNotFoundError,
} from "@/modules/authentication/errors";
import { db } from "@/modules/database/client";
import {
  auditEvents,
  callAnalyses,
  callAppointments,
  callParticipants,
  callProviderSnapshots,
  callRecordings,
  calls,
  callTranscripts,
  callers,
  appointments,
  departments,
  doctors,
  patients,
  sessions,
} from "@/modules/database/schema";

async function requireCallsPermission(hospitalId: string) {
  const actor = await requireAuthorizationActor();
  const decision = evaluateAuthorization(actor, {
    hospitalId,
    permission: "calls.read",
    scope: { kind: "hospital" },
  });
  if (!decision.allowed) throw new AuthorizationDeniedError();
  return {
    actor,
    canReadTranscript:
      decision.membership.permissionCodes.has("transcripts.read"),
    canPlayRecording:
      decision.membership.permissionCodes.has("recordings.play"),
  };
}

export type CallListItem = {
  id: string;
  providerCallId: string;
  direction: "inbound" | "outbound";
  status: "received" | "in_progress" | "ended" | "failed";
  startedAt: Date | null;
  endedAt: Date | null;
  durationSeconds: number | null;
  summary: string | null;
  outcome: string | null;
  sentiment: string | null;
  bookingIntent: boolean | null;
  callerName: string | null;
  callerPhone: string | null;
};

export async function listCalls(input: {
  hospitalId: string;
  search?: string;
  status?: string;
}) {
  await requireCallsPermission(input.hospitalId);
  const rows = await db
    .select({
      id: calls.id,
      providerCallId: calls.providerCallId,
      direction: calls.direction,
      status: calls.status,
      startedAt: calls.startedAt,
      endedAt: calls.endedAt,
      summary: callAnalyses.summary,
      outcome: callAnalyses.outcome,
      sentiment: callAnalyses.sentiment,
      bookingIntent: callAnalyses.bookingIntent,
    })
    .from(calls)
    .leftJoin(callAnalyses, eq(callAnalyses.callId, calls.id))
    .where(
      and(
        eq(calls.hospitalId, input.hospitalId),
        ...(input.status
          ? [
              eq(
                calls.status,
                input.status as "received" | "in_progress" | "ended" | "failed",
              ),
            ]
          : []),
        ...(input.search
          ? [
              or(
                ilike(calls.providerCallId, `%${input.search}%`),
                ilike(callAnalyses.summary, `%${input.search}%`),
              ),
            ]
          : []),
      ),
    )
    .orderBy(desc(calls.startedAt), desc(calls.createdAt));
  const participantRows = await db
    .select({
      callId: callParticipants.callId,
      callerName: callers.displayName,
      callerPhone: callers.phoneE164,
    })
    .from(callParticipants)
    .leftJoin(
      callers,
      and(
        eq(callers.hospitalId, callParticipants.hospitalId),
        eq(callers.id, callParticipants.callerId),
      ),
    )
    .where(eq(callParticipants.hospitalId, input.hospitalId));
  const linkedCallerRows = await db
    .select({
      callId: callAppointments.callId,
      callerName: callers.displayName,
      callerPhone: callers.phoneE164,
    })
    .from(callAppointments)
    .innerJoin(
      appointments,
      and(
        eq(appointments.hospitalId, callAppointments.hospitalId),
        eq(appointments.id, callAppointments.appointmentId),
      ),
    )
    .leftJoin(
      callers,
      and(
        eq(callers.hospitalId, appointments.hospitalId),
        eq(callers.id, appointments.bookedByCallerId),
      ),
    )
    .where(eq(callAppointments.hospitalId, input.hospitalId));
  return rows.map((row) => ({
    ...row,
    callerName:
      participantRows.find((participant) => participant.callId === row.id)
        ?.callerName ??
      linkedCallerRows.find((participant) => participant.callId === row.id)
        ?.callerName ??
      null,
    callerPhone:
      participantRows.find((participant) => participant.callId === row.id)
        ?.callerPhone ??
      linkedCallerRows.find((participant) => participant.callId === row.id)
        ?.callerPhone ??
      null,
    durationSeconds:
      row.startedAt && row.endedAt
        ? Math.round((row.endedAt.getTime() - row.startedAt.getTime()) / 1000)
        : null,
  })) as CallListItem[];
}

export async function getCall(hospitalId: string, callId: string) {
  const permissions = await requireCallsPermission(hospitalId);
  const call = await db.query.calls.findFirst({
    where: and(eq(calls.hospitalId, hospitalId), eq(calls.id, callId)),
  });
  if (!call) throw new ResourceNotFoundError();
  const [
    analysis,
    recording,
    transcripts,
    participant,
    activity,
    linkedAppointments,
  ] = await Promise.all([
    db.query.callAnalyses.findFirst({
      where: eq(callAnalyses.callId, call.id),
    }),
    db.query.callRecordings.findFirst({
      where: eq(callRecordings.callId, call.id),
    }),
    permissions.canReadTranscript
      ? db
          .select()
          .from(callTranscripts)
          .where(eq(callTranscripts.callId, call.id))
          .orderBy(asc(callTranscripts.capturedAt))
      : Promise.resolve([]),
    db
      .select({
        name: callers.displayName,
        phone: callers.phoneE164,
        callerId: callers.id,
      })
      .from(callParticipants)
      .leftJoin(
        callers,
        and(
          eq(callers.hospitalId, callParticipants.hospitalId),
          eq(callers.id, callParticipants.callerId),
        ),
      )
      .where(
        and(
          eq(callParticipants.hospitalId, hospitalId),
          eq(callParticipants.callId, call.id),
        ),
      )
      .limit(1),
    db
      .select({
        eventType: callProviderSnapshots.snapshotType,
        capturedAt: callProviderSnapshots.capturedAt,
      })
      .from(callProviderSnapshots)
      .where(eq(callProviderSnapshots.callId, call.id))
      .orderBy(asc(callProviderSnapshots.capturedAt)),
    db
      .select({
        id: appointments.id,
        reference: appointments.reference,
        status: appointments.status,
        startsAt: sessions.startsAt,
        patientName: patients.displayName,
        callerName: callers.displayName,
        callerPhone: callers.phoneE164,
        doctorName: doctors.displayName,
        departmentName: departments.name,
      })
      .from(callAppointments)
      .innerJoin(
        appointments,
        and(
          eq(appointments.hospitalId, callAppointments.hospitalId),
          eq(appointments.id, callAppointments.appointmentId),
        ),
      )
      .innerJoin(
        sessions,
        and(
          eq(sessions.hospitalId, appointments.hospitalId),
          eq(sessions.id, appointments.sessionId),
        ),
      )
      .innerJoin(
        doctors,
        and(
          eq(doctors.hospitalId, sessions.hospitalId),
          eq(doctors.id, sessions.doctorId),
        ),
      )
      .innerJoin(
        departments,
        and(
          eq(departments.hospitalId, sessions.hospitalId),
          eq(departments.id, sessions.departmentId),
        ),
      )
      .innerJoin(
        patients,
        and(
          eq(patients.hospitalId, appointments.hospitalId),
          eq(patients.id, appointments.patientId),
        ),
      )
      .leftJoin(
        callers,
        and(
          eq(callers.hospitalId, appointments.hospitalId),
          eq(callers.id, appointments.bookedByCallerId),
        ),
      )
      .where(
        and(
          eq(callAppointments.hospitalId, hospitalId),
          eq(callAppointments.callId, call.id),
        ),
      ),
  ]);
  await db.insert(auditEvents).values({
    hospitalId,
    actorKind: "profile",
    actorProfileId: permissions.actor.profileId,
    action: "call.viewed",
    targetType: "call",
    targetId: call.id,
    result: "succeeded",
    safeAfter: {
      transcript: permissions.canReadTranscript,
      recording: permissions.canPlayRecording,
    },
  });
  return {
    call: {
      ...call,
      durationSeconds:
        call.startedAt && call.endedAt
          ? Math.round(
              (call.endedAt.getTime() - call.startedAt.getTime()) / 1000,
            )
          : null,
    },
    analysis,
    recording: permissions.canPlayRecording
      ? recording
      : recording
        ? { ...recording, storageReference: null }
        : null,
    transcripts,
    participant:
      participant[0] ??
      (linkedAppointments[0]?.callerName
        ? {
            name: linkedAppointments[0].callerName,
            phone: linkedAppointments[0].callerPhone,
            callerId: null,
          }
        : null),
    activity,
    appointments: linkedAppointments,
  };
}
