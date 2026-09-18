import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";

import { requireAuthorizationActor } from "@/modules/authentication/actor";
import { evaluateAuthorization } from "@/modules/authentication/authorization";
import {
  AuthorizationDeniedError,
  ResourceNotFoundError,
} from "@/modules/authentication/errors";
import { db } from "@/modules/database/client";
import {
  appointments,
  auditEvents,
  callerPatientLinks,
  callAnalyses,
  callParticipants,
  calls,
  callers,
  departments,
  followUps,
  patients,
  sessions,
  doctors,
} from "@/modules/database/schema";

const uuid = z.string().uuid();

async function requirePatientsPermission(hospitalId: string) {
  const actor = await requireAuthorizationActor();
  const decision = evaluateAuthorization(actor, {
    hospitalId,
    permission: "patients.read",
    scope: { kind: "hospital" },
  });
  const legacyDecision = evaluateAuthorization(actor, {
    hospitalId,
    permission: "patients.contact.read",
    scope: { kind: "hospital" },
  });
  if (!decision.allowed && !legacyDecision.allowed) {
    throw new AuthorizationDeniedError();
  }
  const membership = decision.allowed
    ? decision.membership
    : legacyDecision.allowed
      ? legacyDecision.membership
      : null;
  if (!membership) throw new AuthorizationDeniedError();
  return {
    actor,
    canReadContact: membership.permissionCodes.has("patients.contact.read"),
  };
}

function maskContact(value: string | null, allowed: boolean) {
  if (!value || allowed) return value;
  return "Restricted";
}

export async function listPatients(input: unknown) {
  const parsed = z
    .object({
      hospitalId: uuid,
      search: z.string().trim().max(120).optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(25),
    })
    .parse(input);
  const permissions = await requirePatientsPermission(parsed.hospitalId);
  const search = parsed.search ? `%${parsed.search}%` : null;
  const condition = and(
    eq(patients.hospitalId, parsed.hospitalId),
    sql`${patients.deletedAt} is null`,
    search
      ? or(
          ilike(patients.displayName, search),
          ilike(patients.stableKey, search),
          ilike(patients.phoneE164, search),
        )
      : undefined,
  );
  const offset = (parsed.page - 1) * parsed.pageSize;
  const [items, countRows] = await Promise.all([
    db
      .select({
        id: patients.id,
        displayName: patients.displayName,
        stableKey: patients.stableKey,
        dateOfBirth: patients.dateOfBirth,
        phoneE164: patients.phoneE164,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .where(condition)
      .orderBy(asc(patients.displayName))
      .limit(parsed.pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(patients)
      .where(condition),
  ]);
  const total = countRows[0]?.count ?? 0;
  return {
    items: items.map((item) => ({
      ...item,
      phoneE164: maskContact(item.phoneE164, permissions.canReadContact),
    })),
    pagination: {
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
      totalPages: Math.ceil(total / parsed.pageSize),
    },
  };
}

const createPatientInput = z.object({
  hospitalId: uuid,
  displayName: z.string().trim().min(2).max(160),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  phoneE164: z
    .string()
    .regex(/^\+[1-9][0-9]{7,14}$/)
    .nullable()
    .optional(),
});

export async function createPatient(input: unknown) {
  const parsed = createPatientInput.parse(input);
  const permissions = await requirePatientsPermission(parsed.hospitalId);
  const stableKey = `PAT-${randomUUID().slice(0, 8).toUpperCase()}`;
  const phone = parsed.phoneE164 ?? null;
  const [patient] = await db
    .insert(patients)
    .values({
      hospitalId: parsed.hospitalId,
      stableKey,
      displayName: parsed.displayName,
      dateOfBirth: parsed.dateOfBirth ?? null,
      phoneE164: phone,
      phoneHash: phone
        ? createHash("sha256").update(phone).digest("hex")
        : null,
    })
    .returning({
      id: patients.id,
      stableKey: patients.stableKey,
      displayName: patients.displayName,
      dateOfBirth: patients.dateOfBirth,
      phoneE164: patients.phoneE164,
      createdAt: patients.createdAt,
    });
  await db.insert(auditEvents).values({
    hospitalId: parsed.hospitalId,
    actorKind: "profile",
    actorProfileId: permissions.actor.profileId,
    action: "patient.created",
    targetType: "patient",
    targetId: patient.id,
    result: "succeeded",
    safeAfter: { stableKey: patient.stableKey },
  });
  return {
    ...patient,
    phoneE164: maskContact(patient.phoneE164, permissions.canReadContact),
  };
}

export async function getPatient(hospitalId: string, patientId: string) {
  const permissions = await requirePatientsPermission(hospitalId);
  const patient = await db.query.patients.findFirst({
    where: and(
      eq(patients.hospitalId, hospitalId),
      eq(patients.id, patientId),
      sql`${patients.deletedAt} is null`,
    ),
  });
  if (!patient) throw new ResourceNotFoundError();

  const [appointmentRows, callRows, followUpRows] = await Promise.all([
    db
      .select({
        id: appointments.id,
        reference: appointments.reference,
        status: appointments.status,
        source: appointments.source,
        createdAt: appointments.createdAt,
        startsAt: sessions.startsAt,
        endsAt: sessions.endsAt,
        doctorName: doctors.displayName,
        departmentName: departments.name,
      })
      .from(appointments)
      .innerJoin(
        sessions,
        and(
          eq(sessions.hospitalId, hospitalId),
          eq(sessions.id, appointments.sessionId),
        ),
      )
      .innerJoin(
        doctors,
        and(
          eq(doctors.hospitalId, hospitalId),
          eq(doctors.id, sessions.doctorId),
        ),
      )
      .innerJoin(
        departments,
        and(
          eq(departments.hospitalId, hospitalId),
          eq(departments.id, sessions.departmentId),
        ),
      )
      .where(
        and(
          eq(appointments.hospitalId, hospitalId),
          eq(appointments.patientId, patientId),
        ),
      )
      .orderBy(desc(sessions.startsAt)),
    db
      .select({
        id: calls.id,
        providerCallId: calls.providerCallId,
        status: calls.status,
        direction: calls.direction,
        startedAt: calls.startedAt,
        endedAt: calls.endedAt,
        summary: callAnalyses.summary,
        outcome: callAnalyses.outcome,
      })
      .from(calls)
      .innerJoin(
        callParticipants,
        and(
          eq(callParticipants.hospitalId, hospitalId),
          eq(callParticipants.callId, calls.id),
        ),
      )
      .innerJoin(
        callers,
        and(
          eq(callers.hospitalId, hospitalId),
          eq(callers.id, callParticipants.callerId),
        ),
      )
      .innerJoin(
        callerPatientLinks,
        and(
          eq(callerPatientLinks.hospitalId, hospitalId),
          eq(callerPatientLinks.callerId, callers.id),
          eq(callerPatientLinks.patientId, patientId),
        ),
      )
      .leftJoin(callAnalyses, eq(callAnalyses.callId, calls.id))
      .where(eq(calls.hospitalId, hospitalId))
      .orderBy(desc(calls.startedAt)),
    db
      .select({
        id: followUps.id,
        reasonCode: followUps.reasonCode,
        status: followUps.status,
        priority: followUps.priority,
        dueAt: followUps.dueAt,
        createdAt: followUps.createdAt,
        callId: followUps.callId,
        appointmentId: followUps.appointmentId,
      })
      .from(followUps)
      .innerJoin(
        appointments,
        and(
          eq(appointments.hospitalId, hospitalId),
          eq(appointments.id, followUps.appointmentId),
          eq(appointments.patientId, patientId),
        ),
      )
      .where(eq(followUps.hospitalId, hospitalId))
      .orderBy(desc(followUps.createdAt)),
  ]);

  const callFollowUps = callRows.length
    ? await db
        .select({
          id: followUps.id,
          reasonCode: followUps.reasonCode,
          status: followUps.status,
          priority: followUps.priority,
          dueAt: followUps.dueAt,
          createdAt: followUps.createdAt,
          callId: followUps.callId,
          appointmentId: followUps.appointmentId,
        })
        .from(followUps)
        .where(
          and(
            eq(followUps.hospitalId, hospitalId),
            inArray(
              followUps.callId,
              callRows.map((item) => item.id),
            ),
          ),
        )
        .orderBy(desc(followUps.createdAt))
    : [];

  // Include appointment-linked follow-ups and call-linked follow-ups without
  // duplicating records in the response.
  const appointmentIds = appointmentRows.map((item) => item.id);
  const relatedFollowUps = appointmentIds.length
    ? await db
        .select({
          id: followUps.id,
          reasonCode: followUps.reasonCode,
          status: followUps.status,
          priority: followUps.priority,
          dueAt: followUps.dueAt,
          createdAt: followUps.createdAt,
          callId: followUps.callId,
          appointmentId: followUps.appointmentId,
        })
        .from(followUps)
        .where(
          and(
            eq(followUps.hospitalId, hospitalId),
            inArray(followUps.appointmentId, appointmentIds),
          ),
        )
        .orderBy(desc(followUps.createdAt))
    : [];
  const mergedFollowUps = [
    ...followUpRows,
    ...relatedFollowUps,
    ...callFollowUps,
  ].filter(
    (item, index, all) =>
      all.findIndex((candidate) => candidate.id === item.id) === index,
  );
  const lastInteractionAt =
    [
      ...callRows.map((item) => item.startedAt),
      ...appointmentRows.map((item) => item.createdAt),
      ...mergedFollowUps.map((item) => item.createdAt),
    ]
      .filter((value): value is Date => value instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  return {
    patient: {
      ...patient,
      phoneE164: maskContact(patient.phoneE164, permissions.canReadContact),
    },
    appointments: appointmentRows,
    calls: callRows,
    followUps: mergedFollowUps,
    summary: {
      totalAppointments: appointmentRows.length,
      upcomingAppointments: appointmentRows.filter(
        (item) => item.startsAt > new Date() && item.status !== "cancelled",
      ).length,
      completedAppointments: appointmentRows.filter(
        (item) => item.status === "completed",
      ).length,
      totalCalls: callRows.length,
      pendingFollowUps: mergedFollowUps.filter(
        (item) => !["resolved", "cancelled"].includes(item.status),
      ).length,
      lastInteractionAt,
    },
  };
}
