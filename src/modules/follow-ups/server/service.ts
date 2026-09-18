import "server-only";

import { and, asc, desc, eq, gte, ilike, lt, or, sql } from "drizzle-orm";
import { z } from "zod";

import { requireAuthorizationActor } from "@/modules/authentication/actor";
import { evaluateAuthorization } from "@/modules/authentication/authorization";
import {
  AuthorizationDeniedError,
  BookingConflictError,
  ResourceNotFoundError,
} from "@/modules/authentication/errors";
import { db } from "@/modules/database/client";
import {
  appointments,
  auditEvents,
  callParticipants,
  calls,
  callers,
  followUpActivities,
  followUpAssignments,
  followUps,
  hospitalMemberships,
  patients,
  profiles,
  sessions,
} from "@/modules/database/schema";

const uuid = z.string().uuid();
const priority = z.enum(["p1", "p2", "p3", "p4"]);
const status = z.enum([
  "open",
  "assigned",
  "in_progress",
  "resolved",
  "cancelled",
]);

const priorityLabels = { p1: "Urgent", p2: "High", p3: "Normal", p4: "Low" };
const reasonLabels: Record<string, string> = {
  human_contact_request: "Human callback requested",
  non_bookable_service: "Requested service unavailable",
  failed_booking: "Appointment booking failed",
  unresolved_enquiry: "Unresolved enquiry",
  technical_failure: "Technical failure",
  provider_failure: "Provider failure",
  appointment_confirmation: "Appointment confirmation required",
};

async function requirePermission(hospitalId: string) {
  const actor = await requireAuthorizationActor();
  const decision = evaluateAuthorization(actor, {
    hospitalId,
    permission: "follow_ups.manage",
    scope: { kind: "hospital" },
  });
  if (!decision.allowed) throw new AuthorizationDeniedError();
  return actor;
}

function labelReason(code: string) {
  return reasonLabels[code] ?? code.replaceAll("_", " ");
}

function labelPriority(value: keyof typeof priorityLabels) {
  return priorityLabels[value];
}

function isOverdue(dueAt: Date, current = new Date()) {
  return dueAt < current;
}

function activeStatus(value: string) {
  return value !== "resolved" && value !== "cancelled";
}

async function writeActivity(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    hospitalId: string;
    followUpId: string;
    actorProfileId: string;
    activityType: string;
    note?: string;
    evidence?: Record<string, unknown>;
  },
) {
  await tx.insert(followUpActivities).values({
    hospitalId: input.hospitalId,
    followUpId: input.followUpId,
    actorProfileId: input.actorProfileId,
    activityType: input.activityType,
    note: input.note,
    evidence: input.evidence,
  });
  await tx.insert(auditEvents).values({
    hospitalId: input.hospitalId,
    actorKind: "profile",
    actorProfileId: input.actorProfileId,
    action: `follow_up.${input.activityType}`,
    targetType: "follow_up",
    targetId: input.followUpId,
    result: "succeeded",
    safeAfter: input.evidence,
  });
}

async function getScopedFollowUp(hospitalId: string, followUpId: string) {
  const row = await db.query.followUps.findFirst({
    where: and(
      eq(followUps.hospitalId, hospitalId),
      eq(followUps.id, followUpId),
    ),
  });
  if (!row) throw new ResourceNotFoundError();
  return row;
}

export async function listFollowUps(input: unknown) {
  const parsed = z
    .object({
      hospitalId: uuid,
      search: z.string().trim().max(120).optional(),
      status: status.optional(),
      priority: priority.optional(),
      owner: z.string().trim().optional(),
      due: z.enum(["overdue", "today", "upcoming", "none"]).optional(),
    })
    .parse(input);
  const actor = await requirePermission(parsed.hospitalId);
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const conditions = [eq(followUps.hospitalId, parsed.hospitalId)];
  if (parsed.status) conditions.push(eq(followUps.status, parsed.status));
  if (parsed.priority) conditions.push(eq(followUps.priority, parsed.priority));
  if (parsed.search) {
    conditions.push(
      or(
        ilike(followUps.reasonCode, `%${parsed.search}%`),
        ilike(followUps.queue, `%${parsed.search}%`),
        ilike(followUps.resolutionCriterion, `%${parsed.search}%`),
      )!,
    );
  }
  if (parsed.due === "overdue") {
    conditions.push(
      sql`${followUps.dueAt} < ${now} and ${followUps.status} not in ('resolved', 'cancelled')`,
    );
  } else if (parsed.due === "today") {
    conditions.push(
      and(gte(followUps.dueAt, now), lt(followUps.dueAt, endOfToday))!,
    );
  } else if (parsed.due === "upcoming") {
    conditions.push(
      sql`${followUps.dueAt} >= ${endOfToday} and ${followUps.status} not in ('resolved', 'cancelled')`,
    );
  } else if (parsed.due === "none") {
    conditions.push(sql`${followUps.dueAt} is null`);
  }

  const [rows, assignments, appointmentLinks, participantRows] =
    await Promise.all([
      db
        .select()
        .from(followUps)
        .where(and(...conditions))
        .orderBy(
          sql`case when ${followUps.status} not in ('resolved', 'cancelled') and ${followUps.dueAt} < now() then 0 else 1 end`,
          asc(followUps.dueAt),
          desc(followUps.createdAt),
        ),
      db
        .select({
          followUpId: followUpAssignments.followUpId,
          membershipId: followUpAssignments.membershipId,
          queue: followUpAssignments.queue,
          ownerName: profiles.displayName,
        })
        .from(followUpAssignments)
        .leftJoin(
          hospitalMemberships,
          and(
            eq(hospitalMemberships.hospitalId, followUpAssignments.hospitalId),
            eq(hospitalMemberships.id, followUpAssignments.membershipId),
          ),
        )
        .leftJoin(profiles, eq(profiles.id, hospitalMemberships.profileId))
        .where(
          and(
            eq(followUpAssignments.hospitalId, parsed.hospitalId),
            sql`${followUpAssignments.endedAt} is null`,
          ),
        ),
      db
        .select({
          followUpId: followUps.id,
          appointmentId: appointments.id,
          reference: appointments.reference,
          patientName: patients.displayName,
          startsAt: sessions.startsAt,
        })
        .from(followUps)
        .innerJoin(
          appointments,
          and(
            eq(appointments.hospitalId, followUps.hospitalId),
            eq(appointments.id, followUps.appointmentId),
          ),
        )
        .innerJoin(
          patients,
          and(
            eq(patients.hospitalId, appointments.hospitalId),
            eq(patients.id, appointments.patientId),
          ),
        )
        .innerJoin(
          sessions,
          and(
            eq(sessions.hospitalId, appointments.hospitalId),
            eq(sessions.id, appointments.sessionId),
          ),
        )
        .where(eq(followUps.hospitalId, parsed.hospitalId)),
      db
        .select({
          followUpId: followUps.id,
          callId: calls.id,
          callerName: callers.displayName,
          callerPhone: callers.phoneE164,
        })
        .from(followUps)
        .innerJoin(
          calls,
          and(
            eq(calls.hospitalId, followUps.hospitalId),
            eq(calls.id, followUps.callId),
          ),
        )
        .leftJoin(
          callParticipants,
          and(
            eq(callParticipants.hospitalId, calls.hospitalId),
            eq(callParticipants.callId, calls.id),
          ),
        )
        .leftJoin(
          callers,
          and(
            eq(callers.hospitalId, callParticipants.hospitalId),
            eq(callers.id, callParticipants.callerId),
          ),
        )
        .where(eq(followUps.hospitalId, parsed.hospitalId)),
    ]);

  return rows
    .filter((row) => {
      const assignment = assignments.find((item) => item.followUpId === row.id);
      if (!parsed.owner) return true;
      if (parsed.owner === "unassigned") return !assignment;
      if (parsed.owner === "me")
        return actor.memberships.some(
          (membership) => membership.id === assignment?.membershipId,
        );
      return assignment?.membershipId === parsed.owner;
    })
    .map((row) => {
      const assignment = assignments.find((item) => item.followUpId === row.id);
      const appointment = appointmentLinks.find(
        (item) => item.followUpId === row.id,
      );
      const call = participantRows.find((item) => item.followUpId === row.id);
      return {
        ...row,
        reasonLabel: labelReason(row.reasonCode),
        priorityLabel: labelPriority(row.priority),
        ownerName: assignment?.ownerName ?? assignment?.queue ?? null,
        ownerMembershipId: assignment?.membershipId ?? null,
        patientName: appointment?.patientName ?? null,
        callerName: call?.callerName ?? null,
        callerPhone: call?.callerPhone ?? null,
        relatedAppointment: appointment
          ? {
              id: appointment.appointmentId,
              reference: appointment.reference,
              startsAt: appointment.startsAt,
            }
          : null,
        relatedCall: call ? { id: call.callId } : null,
        overdue: activeStatus(row.status) && isOverdue(row.dueAt, now),
      };
    });
}

export async function getFollowUp(hospitalId: string, followUpId: string) {
  await requirePermission(hospitalId);
  const followUp = await getScopedFollowUp(hospitalId, followUpId);
  const [activities, assignment, appointment, call] = await Promise.all([
    db
      .select({
        id: followUpActivities.id,
        activityType: followUpActivities.activityType,
        note: followUpActivities.note,
        evidence: followUpActivities.evidence,
        occurredAt: followUpActivities.occurredAt,
        actorName: profiles.displayName,
      })
      .from(followUpActivities)
      .leftJoin(profiles, eq(profiles.id, followUpActivities.actorProfileId))
      .where(
        and(
          eq(followUpActivities.hospitalId, hospitalId),
          eq(followUpActivities.followUpId, followUpId),
        ),
      )
      .orderBy(desc(followUpActivities.occurredAt)),
    db
      .select({
        membershipId: followUpAssignments.membershipId,
        queue: followUpAssignments.queue,
        ownerName: profiles.displayName,
      })
      .from(followUpAssignments)
      .leftJoin(
        hospitalMemberships,
        and(
          eq(hospitalMemberships.hospitalId, followUpAssignments.hospitalId),
          eq(hospitalMemberships.id, followUpAssignments.membershipId),
        ),
      )
      .leftJoin(profiles, eq(profiles.id, hospitalMemberships.profileId))
      .where(
        and(
          eq(followUpAssignments.hospitalId, hospitalId),
          eq(followUpAssignments.followUpId, followUpId),
          sql`${followUpAssignments.endedAt} is null`,
        ),
      )
      .limit(1),
    followUp.appointmentId
      ? db
          .select({
            id: appointments.id,
            reference: appointments.reference,
            patientName: patients.displayName,
            startsAt: sessions.startsAt,
          })
          .from(appointments)
          .innerJoin(
            patients,
            and(
              eq(patients.hospitalId, hospitalId),
              eq(patients.id, appointments.patientId),
            ),
          )
          .innerJoin(
            sessions,
            and(
              eq(sessions.hospitalId, hospitalId),
              eq(sessions.id, appointments.sessionId),
            ),
          )
          .where(
            and(
              eq(appointments.hospitalId, hospitalId),
              eq(appointments.id, followUp.appointmentId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    followUp.callId
      ? db
          .select({
            id: calls.id,
            providerCallId: calls.providerCallId,
            callerName: callers.displayName,
            callerPhone: callers.phoneE164,
          })
          .from(calls)
          .leftJoin(
            callParticipants,
            and(
              eq(callParticipants.hospitalId, hospitalId),
              eq(callParticipants.callId, calls.id),
            ),
          )
          .leftJoin(
            callers,
            and(
              eq(callers.hospitalId, hospitalId),
              eq(callers.id, callParticipants.callerId),
            ),
          )
          .where(
            and(
              eq(calls.hospitalId, hospitalId),
              eq(calls.id, followUp.callId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);
  return {
    ...followUp,
    reasonLabel: labelReason(followUp.reasonCode),
    priorityLabel: labelPriority(followUp.priority),
    overdue: activeStatus(followUp.status) && isOverdue(followUp.dueAt),
    owner: assignment[0] ?? null,
    activities,
    appointment: appointment[0] ?? null,
    call: call[0] ?? null,
  };
}

export async function listFollowUpAssignees(hospitalId: string) {
  await requirePermission(hospitalId);
  return db
    .select({
      membershipId: hospitalMemberships.id,
      displayName: profiles.displayName,
      role: hospitalMemberships.role,
    })
    .from(hospitalMemberships)
    .innerJoin(profiles, eq(profiles.id, hospitalMemberships.profileId))
    .where(
      and(
        eq(hospitalMemberships.hospitalId, hospitalId),
        eq(hospitalMemberships.status, "active"),
      ),
    )
    .orderBy(asc(profiles.displayName));
}

export async function createFollowUp(input: unknown) {
  const parsed = z
    .object({
      hospitalId: uuid,
      callId: uuid.optional(),
      appointmentId: uuid.optional(),
      reasonCode: z.string().trim().min(2).max(120),
      priority: priority,
      queue: z.string().trim().min(1).max(120),
      resolutionCriterion: z.string().trim().min(2).max(1000),
      dueAt: z.coerce.date(),
    })
    .refine(
      ({ callId, appointmentId }) => callId || appointmentId,
      "A call or appointment relationship is required.",
    )
    .parse(input);
  const actor = await requirePermission(parsed.hospitalId);
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(followUps)
      .values({
        hospitalId: parsed.hospitalId,
        callId: parsed.callId,
        appointmentId: parsed.appointmentId,
        reasonCode: parsed.reasonCode,
        priority: parsed.priority,
        queue: parsed.queue,
        resolutionCriterion: parsed.resolutionCriterion,
        dueAt: parsed.dueAt,
      })
      .returning({ id: followUps.id });
    if (!created) throw new Error("Follow-up could not be created.");
    await writeActivity(tx, {
      hospitalId: parsed.hospitalId,
      followUpId: created.id,
      actorProfileId: actor.profileId,
      activityType: "created",
      evidence: {
        reasonCode: parsed.reasonCode,
        source: parsed.callId ? "call" : "appointment",
      },
    });
    return getFollowUp(parsed.hospitalId, created.id);
  });
}

const assignInput = z.object({
  hospitalId: uuid,
  followUpId: uuid,
  membershipId: uuid,
});

export async function assignFollowUp(input: unknown) {
  const parsed = assignInput.parse(input);
  const actor = await requirePermission(parsed.hospitalId);
  return db.transaction(async (tx) => {
    const followUp = await getScopedFollowUp(
      parsed.hospitalId,
      parsed.followUpId,
    );
    if (["resolved", "cancelled"].includes(followUp.status))
      throw new BookingConflictError("This follow-up is no longer active.");
    const membership = await tx.query.hospitalMemberships.findFirst({
      where: and(
        eq(hospitalMemberships.hospitalId, parsed.hospitalId),
        eq(hospitalMemberships.id, parsed.membershipId),
        eq(hospitalMemberships.status, "active"),
      ),
    });
    if (!membership) throw new ResourceNotFoundError();
    await tx
      .update(followUpAssignments)
      .set({ endedAt: new Date() })
      .where(
        and(
          eq(followUpAssignments.hospitalId, parsed.hospitalId),
          eq(followUpAssignments.followUpId, parsed.followUpId),
          sql`${followUpAssignments.endedAt} is null`,
        ),
      );
    await tx.insert(followUpAssignments).values({
      hospitalId: parsed.hospitalId,
      followUpId: parsed.followUpId,
      kind: "membership",
      membershipId: parsed.membershipId,
    });
    await tx
      .update(followUps)
      .set({ status: "assigned", updatedAt: new Date() })
      .where(eq(followUps.id, parsed.followUpId));
    await writeActivity(tx, {
      hospitalId: parsed.hospitalId,
      followUpId: parsed.followUpId,
      actorProfileId: actor.profileId,
      activityType: "assigned",
      evidence: { membershipId: parsed.membershipId },
    });
    return getFollowUp(parsed.hospitalId, parsed.followUpId);
  });
}

export async function startFollowUp(input: unknown) {
  const parsed = z.object({ hospitalId: uuid, followUpId: uuid }).parse(input);
  const actor = await requirePermission(parsed.hospitalId);
  return db.transaction(async (tx) => {
    const followUp = await getScopedFollowUp(
      parsed.hospitalId,
      parsed.followUpId,
    );
    if (followUp.status !== "assigned")
      throw new BookingConflictError(
        "Only assigned follow-ups can be started.",
      );
    await tx
      .update(followUps)
      .set({
        status: "in_progress",
        acknowledgedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(followUps.id, parsed.followUpId));
    await writeActivity(tx, {
      hospitalId: parsed.hospitalId,
      followUpId: parsed.followUpId,
      actorProfileId: actor.profileId,
      activityType: "started",
    });
    return getFollowUp(parsed.hospitalId, parsed.followUpId);
  });
}

export async function addFollowUpNote(input: unknown) {
  const parsed = z
    .object({
      hospitalId: uuid,
      followUpId: uuid,
      note: z.string().trim().min(2).max(4000),
    })
    .parse(input);
  const actor = await requirePermission(parsed.hospitalId);
  return db.transaction(async (tx) => {
    const followUp = await getScopedFollowUp(
      parsed.hospitalId,
      parsed.followUpId,
    );
    if (!activeStatus(followUp.status))
      throw new BookingConflictError("Closed follow-ups cannot receive notes.");
    await writeActivity(tx, {
      hospitalId: parsed.hospitalId,
      followUpId: parsed.followUpId,
      actorProfileId: actor.profileId,
      activityType: "note_added",
      note: parsed.note,
    });
    return getFollowUp(parsed.hospitalId, parsed.followUpId);
  });
}

export async function resolveFollowUp(input: unknown) {
  const parsed = z
    .object({
      hospitalId: uuid,
      followUpId: uuid,
      resolutionCode: z.string().trim().min(2).max(80),
      resolutionNote: z.string().trim().min(2).max(4000),
    })
    .parse(input);
  const actor = await requirePermission(parsed.hospitalId);
  return db.transaction(async (tx) => {
    const followUp = await getScopedFollowUp(
      parsed.hospitalId,
      parsed.followUpId,
    );
    if (followUp.status !== "in_progress")
      throw new BookingConflictError(
        "Only follow-ups in progress can be resolved.",
      );
    await tx
      .update(followUps)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
        resolutionCode: parsed.resolutionCode,
        resolutionNote: parsed.resolutionNote,
        updatedAt: new Date(),
      })
      .where(eq(followUps.id, parsed.followUpId));
    await writeActivity(tx, {
      hospitalId: parsed.hospitalId,
      followUpId: parsed.followUpId,
      actorProfileId: actor.profileId,
      activityType: "resolved",
      note: parsed.resolutionNote,
      evidence: { resolutionCode: parsed.resolutionCode },
    });
    return getFollowUp(parsed.hospitalId, parsed.followUpId);
  });
}

export async function cancelFollowUp(input: unknown) {
  const parsed = z
    .object({
      hospitalId: uuid,
      followUpId: uuid,
      reason: z.string().trim().min(2).max(500),
    })
    .parse(input);
  const actor = await requirePermission(parsed.hospitalId);
  return db.transaction(async (tx) => {
    const followUp = await getScopedFollowUp(
      parsed.hospitalId,
      parsed.followUpId,
    );
    if (!activeStatus(followUp.status))
      throw new BookingConflictError("This follow-up is already closed.");
    await tx
      .update(followUps)
      .set({
        status: "cancelled",
        resolutionCode: "cancelled",
        resolutionNote: parsed.reason,
        updatedAt: new Date(),
      })
      .where(eq(followUps.id, parsed.followUpId));
    await writeActivity(tx, {
      hospitalId: parsed.hospitalId,
      followUpId: parsed.followUpId,
      actorProfileId: actor.profileId,
      activityType: "cancelled",
      note: parsed.reason,
    });
    return getFollowUp(parsed.hospitalId, parsed.followUpId);
  });
}
