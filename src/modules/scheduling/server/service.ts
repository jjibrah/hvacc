import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { and, asc, eq, gte, ilike, lt, or, sql } from "drizzle-orm";
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
  appointmentHistory,
  appointments,
  auditEvents,
  callers,
  callAppointments,
  calls,
  callerPatientLinks,
  departments,
  doctors,
  idempotencyRecords,
  patients,
  schedules,
  sessionExceptions,
  sessions,
} from "@/modules/database/schema";

const uuid = z.string().uuid();
const operationKey = z.string().trim().min(8).max(200);
const weekdayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const bookingInput = z.object({
  hospitalId: uuid,
  sessionId: uuid,
  patientId: uuid,
  callerId: uuid.optional(),
  callId: uuid.optional(),
  capacityUnits: z.number().int().positive().max(10).default(1),
  source: z.enum(["voice", "staff", "import"]).default("staff"),
  idempotencyKey: operationKey,
  confirmed: z.literal(true),
});

const cancellationInput = z.object({
  hospitalId: uuid,
  appointmentId: uuid,
  reason: z.string().trim().min(2).max(500),
  idempotencyKey: operationKey,
  confirmed: z.literal(true),
});

const rescheduleInput = z.object({
  hospitalId: uuid,
  appointmentId: uuid,
  destinationSessionId: uuid,
  reason: z.string().trim().min(2).max(500),
  idempotencyKey: operationKey,
  confirmed: z.literal(true),
});

const scheduleInput = z
  .object({
    hospitalId: uuid,
    doctorId: uuid,
    departmentId: uuid,
    weekday: z.number().int().min(0).max(6),
    localStartTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    localEndTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    effectiveFrom: z.string().date(),
    effectiveUntil: z.string().date().optional(),
    defaultCapacity: z.number().int().positive().max(100),
  })
  .refine(
    ({ localStartTime, localEndTime }) => localEndTime > localStartTime,
    "Schedule end time must be after start time.",
  );

const recurringScheduleInput = z
  .object({
    hospitalId: uuid,
    doctorId: uuid,
    departmentId: uuid,
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    localStartTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    localEndTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    effectiveFrom: z.string().date(),
    effectiveUntil: z.string().date().optional(),
    defaultCapacity: z.number().int().positive().max(100),
  })
  .refine(
    ({ localStartTime, localEndTime }) => localEndTime > localStartTime,
    "Schedule end time must be after start time.",
  )
  .refine(
    ({ weekdays }) => new Set(weekdays).size === weekdays.length,
    "Each weekday can only be selected once.",
  );

const exceptionInput = z
  .object({
    hospitalId: uuid,
    scheduleId: uuid,
    exceptionDate: z.string().date(),
    isClosed: z.boolean().default(false),
    replacementStartsAt: z.coerce.date().optional(),
    replacementEndsAt: z.coerce.date().optional(),
    capacityOverride: z.number().int().positive().max(100).optional(),
    reason: z.string().trim().min(2).max(500),
  })
  .refine(
    ({ replacementStartsAt, replacementEndsAt }) =>
      (!replacementStartsAt && !replacementEndsAt) ||
      (replacementStartsAt &&
        replacementEndsAt &&
        replacementEndsAt > replacementStartsAt),
    "Replacement times must be provided together and ordered.",
  );

const closeSessionInput = z.object({
  hospitalId: uuid,
  sessionId: uuid,
  reason: z.string().trim().min(2).max(500),
  confirmed: z.literal(true),
});

type IdempotencyResult = {
  id: string;
  status: "processing" | "succeeded" | "failed";
  requestHash: string;
  responseBody: Record<string, unknown> | null;
  created: boolean;
};

function requestHash(input: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(input, Object.keys(input as object).sort()))
    .digest("hex");
}

function dateInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  ) as Record<string, string>;
}

function localDateTimeToUtc(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = time.split(":").map(Number);
  const wallClock = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = wallClock;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = localParts(new Date(guess), timeZone);
    const displayed = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    guess += wallClock - displayed;
  }
  return new Date(guess);
}

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function weekday(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

async function requireAppointmentsPermission(hospitalId: string) {
  const actor = await requireAuthorizationActor();
  const decision = evaluateAuthorization(actor, {
    hospitalId,
    permission: "appointments.manage",
    scope: { kind: "hospital" },
  });
  if (!decision.allowed) throw new AuthorizationDeniedError();
  return actor;
}

async function requireSessionsPermission(hospitalId: string) {
  const actor = await requireAuthorizationActor();
  const decision = evaluateAuthorization(actor, {
    hospitalId,
    permission: "sessions.manage",
    scope: { kind: "hospital" },
  });
  if (!decision.allowed) throw new AuthorizationDeniedError();
  return actor;
}

async function writeAudit(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    hospitalId: string;
    actorProfileId?: string;
    actorProviderId?: string;
    action: string;
    targetType: string;
    targetId?: string;
    reason?: string;
    safeBefore?: Record<string, unknown>;
    safeAfter?: Record<string, unknown>;
  },
) {
  await tx.insert(auditEvents).values({
    hospitalId: input.hospitalId,
    actorKind: input.actorProfileId ? "profile" : "provider",
    actorProfileId: input.actorProfileId,
    actorProviderId: input.actorProviderId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    result: "succeeded",
    reason: input.reason,
    safeBefore: input.safeBefore,
    safeAfter: input.safeAfter,
  });
}

async function ensureIdempotency(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    hospitalId: string;
    operation: "book" | "cancel" | "reschedule";
    idempotencyKey: string;
    requestHash: string;
    patientId?: string;
    sessionId?: string;
  },
) {
  const [created] = await tx
    .insert(idempotencyRecords)
    .values({
      hospitalId: input.hospitalId,
      operation: input.operation,
      idempotencyKey: input.idempotencyKey,
      requestHash: input.requestHash,
      patientId: input.patientId,
      sessionId: input.sessionId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    .onConflictDoNothing()
    .returning({ id: idempotencyRecords.id });

  const existing = created
    ? await tx.query.idempotencyRecords.findFirst({
        where: eq(idempotencyRecords.id, created.id),
      })
    : await tx.query.idempotencyRecords.findFirst({
        where: and(
          eq(idempotencyRecords.hospitalId, input.hospitalId),
          eq(idempotencyRecords.operation, input.operation),
          eq(idempotencyRecords.idempotencyKey, input.idempotencyKey),
        ),
      });
  if (!existing) throw new Error("Idempotency record could not be created.");
  if (existing.requestHash !== input.requestHash) {
    throw new BookingConflictError(
      "The idempotency key was reused differently.",
    );
  }
  return { ...existing, created: Boolean(created) } as IdempotencyResult;
}

async function materializeSessions(
  hospitalId: string,
  from: Date,
  to: Date,
  timeZone: string,
) {
  const fromDate = dateInZone(from, timeZone);
  const toDate = dateInZone(to, timeZone);
  const scheduleRows = await db
    .select()
    .from(schedules)
    .where(
      and(eq(schedules.hospitalId, hospitalId), eq(schedules.status, "active")),
    );
  if (!scheduleRows.length) return;
  const exceptions = await db
    .select()
    .from(sessionExceptions)
    .where(eq(sessionExceptions.hospitalId, hospitalId));

  await db.transaction(async (tx) => {
    for (const schedule of scheduleRows) {
      let current = fromDate;
      while (current <= toDate) {
        if (
          weekday(current) === schedule.weekday &&
          current >= schedule.effectiveFrom &&
          (!schedule.effectiveUntil || current <= schedule.effectiveUntil)
        ) {
          const exception = exceptions.find(
            (item) =>
              item.scheduleId === schedule.id && item.exceptionDate === current,
          );
          if (!exception?.isClosed) {
            const startsAt =
              exception?.replacementStartsAt ??
              localDateTimeToUtc(current, schedule.localStartTime, timeZone);
            const endsAt =
              exception?.replacementEndsAt ??
              localDateTimeToUtc(current, schedule.localEndTime, timeZone);
            await tx
              .insert(sessions)
              .values({
                hospitalId,
                scheduleId: schedule.id,
                doctorId: schedule.doctorId,
                departmentId: schedule.departmentId,
                startsAt,
                endsAt,
                capacity:
                  exception?.capacityOverride ?? schedule.defaultCapacity,
              })
              .onConflictDoNothing();
          }
        }
        current = addDays(current, 1);
      }
    }
  });
}

export async function listAvailability(input: unknown) {
  const parsed = z
    .object({
      hospitalId: uuid,
      from: z.coerce.date(),
      to: z.coerce.date(),
      timeZone: z.string().min(1).max(80).default("UTC"),
      doctorId: uuid.optional(),
      departmentId: uuid.optional(),
    })
    .refine(({ from, to }) => to > from, "The availability range is invalid")
    .parse(input);
  await requireAppointmentsPermission(parsed.hospitalId);
  await materializeSessions(
    parsed.hospitalId,
    parsed.from,
    parsed.to,
    parsed.timeZone,
  );
  const rows = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.hospitalId, parsed.hospitalId),
        eq(sessions.status, "open"),
        gte(sessions.startsAt, parsed.from),
        lt(sessions.startsAt, parsed.to),
        ...(parsed.doctorId ? [eq(sessions.doctorId, parsed.doctorId)] : []),
        ...(parsed.departmentId
          ? [eq(sessions.departmentId, parsed.departmentId)]
          : []),
        sql`${sessions.bookedUnits} < ${sessions.capacity}`,
        sql`exists (select 1 from doctors where doctors.hospital_id = ${parsed.hospitalId} and doctors.id = ${sessions.doctorId} and doctors.status = 'active')`,
        sql`exists (select 1 from departments where departments.hospital_id = ${parsed.hospitalId} and departments.id = ${sessions.departmentId} and departments.status = 'active')`,
      ),
    )
    .orderBy(asc(sessions.startsAt));
  return rows.map((row) => ({
    ...row,
    availableUnits: row.capacity - row.bookedUnits,
    localStartsAt: new Intl.DateTimeFormat("sv-SE", {
      timeZone: parsed.timeZone,
      dateStyle: "short",
      timeStyle: "short",
    }).format(row.startsAt),
  }));
}

export async function listScheduleCalendar(input: unknown) {
  const parsed = z
    .object({
      hospitalId: uuid,
      from: z.coerce.date(),
      to: z.coerce.date(),
      timeZone: z.string().min(1).max(80).default("UTC"),
      doctorId: uuid.optional(),
      departmentId: uuid.optional(),
      status: z
        .enum(["open", "full", "closed", "cancelled", "completed", "all"])
        .default("all"),
    })
    .refine(({ from, to }) => to > from, "The calendar range is invalid")
    .parse(input);
  await requireSessionsPermission(parsed.hospitalId);
  await materializeSessions(
    parsed.hospitalId,
    parsed.from,
    parsed.to,
    parsed.timeZone,
  );

  const rows = await db
    .select({
      id: sessions.id,
      scheduleId: sessions.scheduleId,
      doctorId: sessions.doctorId,
      doctorName: doctors.displayName,
      departmentId: sessions.departmentId,
      departmentName: departments.name,
      startsAt: sessions.startsAt,
      endsAt: sessions.endsAt,
      capacity: sessions.capacity,
      bookedUnits: sessions.bookedUnits,
      status: sessions.status,
      closureReason: sessions.closureReason,
    })
    .from(sessions)
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
    .where(
      and(
        eq(sessions.hospitalId, parsed.hospitalId),
        gte(sessions.startsAt, parsed.from),
        lt(sessions.startsAt, parsed.to),
        ...(parsed.doctorId ? [eq(sessions.doctorId, parsed.doctorId)] : []),
        ...(parsed.departmentId
          ? [eq(sessions.departmentId, parsed.departmentId)]
          : []),
        ...(parsed.status === "all"
          ? []
          : parsed.status === "full"
            ? [sql`${sessions.bookedUnits} >= ${sessions.capacity}`]
            : [eq(sessions.status, parsed.status)]),
      ),
    )
    .orderBy(asc(sessions.startsAt), asc(doctors.displayName));

  return rows.map((row) => ({
    ...row,
    availableUnits: Math.max(0, row.capacity - row.bookedUnits),
    effectiveStatus:
      row.status === "open" && row.bookedUnits >= row.capacity
        ? "full"
        : row.status,
  }));
}

export async function listAvailabilityForVoice(input: {
  hospitalId: string;
  from: Date;
  to: Date;
  timeZone: string;
  doctorId?: string;
  departmentId?: string;
  limit?: number;
}) {
  await materializeSessions(
    input.hospitalId,
    input.from,
    input.to,
    input.timeZone,
  );
  const rows = await db
    .select({
      id: sessions.id,
      startsAt: sessions.startsAt,
      endsAt: sessions.endsAt,
      capacity: sessions.capacity,
      bookedUnits: sessions.bookedUnits,
      doctorName: doctors.displayName,
      departmentName: departments.name,
    })
    .from(sessions)
    .innerJoin(
      doctors,
      and(
        eq(doctors.hospitalId, sessions.hospitalId),
        eq(doctors.id, sessions.doctorId),
        eq(doctors.status, "active"),
      ),
    )
    .innerJoin(
      departments,
      and(
        eq(departments.hospitalId, sessions.hospitalId),
        eq(departments.id, sessions.departmentId),
        eq(departments.status, "active"),
      ),
    )
    .where(
      and(
        eq(sessions.hospitalId, input.hospitalId),
        eq(sessions.status, "open"),
        gte(sessions.startsAt, input.from),
        lt(sessions.startsAt, input.to),
        ...(input.doctorId ? [eq(sessions.doctorId, input.doctorId)] : []),
        ...(input.departmentId
          ? [eq(sessions.departmentId, input.departmentId)]
          : []),
        sql`${sessions.bookedUnits} < ${sessions.capacity}`,
      ),
    )
    .orderBy(asc(sessions.startsAt))
    .limit(input.limit ?? 5);
  return rows.map((row) => ({
    sessionId: row.id,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    displayDate: new Intl.DateTimeFormat("en-US", {
      timeZone: input.timeZone,
      dateStyle: "full",
    }).format(row.startsAt),
    displayTime: new Intl.DateTimeFormat("en-US", {
      timeZone: input.timeZone,
      timeStyle: "short",
    }).format(row.startsAt),
    doctorName: row.doctorName,
    departmentName: row.departmentName,
    availableUnits: row.capacity - row.bookedUnits,
  }));
}

export type AppointmentListRow = {
  id: string;
  reference: string;
  hospitalId: string;
  sessionId: string;
  startsAt: Date;
  endsAt: Date;
  patientId: string;
  patientName: string;
  callerName: string | null;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  source: "voice" | "staff" | "import";
  capacityUnits: number;
};

export async function listAppointments(input: unknown) {
  const parsed = z
    .object({
      hospitalId: uuid,
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
      status: z
        .enum(["pending", "confirmed", "cancelled", "completed", "no_show"])
        .optional(),
    })
    .parse(input);
  await requireAppointmentsPermission(parsed.hospitalId);
  const rows = await db
    .select({
      id: appointments.id,
      reference: appointments.reference,
      hospitalId: appointments.hospitalId,
      sessionId: appointments.sessionId,
      startsAt: sessions.startsAt,
      endsAt: sessions.endsAt,
      patientId: appointments.patientId,
      patientName: patients.displayName,
      callerName: callers.displayName,
      status: appointments.status,
      source: appointments.source,
      capacityUnits: appointments.capacityUnits,
    })
    .from(appointments)
    .innerJoin(
      sessions,
      and(
        eq(sessions.hospitalId, appointments.hospitalId),
        eq(sessions.id, appointments.sessionId),
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
        eq(appointments.hospitalId, parsed.hospitalId),
        ...(parsed.from ? [gte(sessions.startsAt, parsed.from)] : []),
        ...(parsed.to ? [lt(sessions.startsAt, parsed.to)] : []),
        ...(parsed.status ? [eq(appointments.status, parsed.status)] : []),
      ),
    )
    .orderBy(asc(sessions.startsAt));
  return rows as AppointmentListRow[];
}

export async function listAppointmentPeople(input: unknown) {
  const parsed = z
    .object({
      hospitalId: uuid,
      search: z.string().trim().max(120).optional(),
    })
    .parse(input);
  await requireAppointmentsPermission(parsed.hospitalId);
  const search = parsed.search ? `%${parsed.search}%` : undefined;
  const [patientRows, callerRows] = await Promise.all([
    db
      .select({
        id: patients.id,
        displayName: patients.displayName,
        phoneE164: patients.phoneE164,
        stableKey: patients.stableKey,
      })
      .from(patients)
      .where(
        and(
          eq(patients.hospitalId, parsed.hospitalId),
          ...(search
            ? [
                or(
                  ilike(patients.displayName, search),
                  ilike(patients.stableKey, search),
                  ilike(patients.phoneE164, search),
                ),
              ]
            : []),
        ),
      )
      .orderBy(asc(patients.displayName))
      .limit(50),
    db
      .select({
        id: callers.id,
        displayName: callers.displayName,
        phoneE164: callers.phoneE164,
      })
      .from(callers)
      .where(
        and(
          eq(callers.hospitalId, parsed.hospitalId),
          ...(search
            ? [
                or(
                  ilike(callers.displayName, search),
                  ilike(callers.phoneE164, search),
                ),
              ]
            : []),
        ),
      )
      .orderBy(asc(callers.displayName))
      .limit(50),
  ]);
  return { patients: patientRows, callers: callerRows };
}

export async function createSchedule(input: unknown) {
  const parsed = scheduleInput.parse(input);
  const actor = await requireSessionsPermission(parsed.hospitalId);
  if (parsed.effectiveUntil && parsed.effectiveUntil < parsed.effectiveFrom) {
    throw new BookingConflictError("The schedule date range is invalid.");
  }
  const [doctor, department] = await Promise.all([
    db.query.doctors.findFirst({
      where: and(
        eq(doctors.hospitalId, parsed.hospitalId),
        eq(doctors.id, parsed.doctorId),
        eq(doctors.status, "active"),
      ),
    }),
    db.query.departments.findFirst({
      where: and(
        eq(departments.hospitalId, parsed.hospitalId),
        eq(departments.id, parsed.departmentId),
        eq(departments.status, "active"),
      ),
    }),
  ]);
  if (!doctor || !department) throw new ResourceNotFoundError();
  const existingSchedules = await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.hospitalId, parsed.hospitalId),
        eq(schedules.doctorId, parsed.doctorId),
        eq(schedules.weekday, parsed.weekday),
        eq(schedules.status, "active"),
      ),
    );
  const effectiveUntil = parsed.effectiveUntil ?? "9999-12-31";
  const overlaps = existingSchedules.some((schedule) => {
    const datesOverlap =
      schedule.effectiveFrom <= effectiveUntil &&
      (schedule.effectiveUntil ?? "9999-12-31") >= parsed.effectiveFrom;
    const timesOverlap =
      parsed.localStartTime < schedule.localEndTime &&
      parsed.localEndTime > schedule.localStartTime;
    return datesOverlap && timesOverlap;
  });
  if (overlaps) {
    throw new BookingConflictError(
      "This schedule overlaps an existing schedule for the doctor.",
    );
  }
  return db.transaction(async (tx) => {
    const [schedule] = await tx.insert(schedules).values(parsed).returning();
    if (!schedule) throw new Error("Schedule could not be created.");
    await writeAudit(tx, {
      hospitalId: parsed.hospitalId,
      actorProfileId: actor.profileId,
      action: "schedule.created",
      targetType: "schedule",
      targetId: schedule.id,
      safeAfter: { doctorId: parsed.doctorId, weekday: parsed.weekday },
    });
    return schedule;
  });
}

export async function createRecurringSchedules(input: unknown) {
  const parsed = recurringScheduleInput.parse(input);
  const actor = await requireSessionsPermission(parsed.hospitalId);
  if (parsed.effectiveUntil && parsed.effectiveUntil < parsed.effectiveFrom) {
    throw new BookingConflictError("The schedule date range is invalid.");
  }
  const [doctor, department] = await Promise.all([
    db.query.doctors.findFirst({
      where: and(
        eq(doctors.hospitalId, parsed.hospitalId),
        eq(doctors.id, parsed.doctorId),
        eq(doctors.status, "active"),
      ),
    }),
    db.query.departments.findFirst({
      where: and(
        eq(departments.hospitalId, parsed.hospitalId),
        eq(departments.id, parsed.departmentId),
        eq(departments.status, "active"),
      ),
    }),
  ]);
  if (!doctor || !department) throw new ResourceNotFoundError();
  const existingSchedules = await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.hospitalId, parsed.hospitalId),
        eq(schedules.doctorId, parsed.doctorId),
        eq(schedules.status, "active"),
      ),
    );
  const effectiveUntil = parsed.effectiveUntil ?? "9999-12-31";
  for (const weekday of parsed.weekdays) {
    const overlaps = existingSchedules.some(
      (schedule) =>
        schedule.weekday === weekday &&
        schedule.effectiveFrom <= effectiveUntil &&
        (schedule.effectiveUntil ?? "9999-12-31") >= parsed.effectiveFrom &&
        parsed.localStartTime < schedule.localEndTime &&
        parsed.localEndTime > schedule.localStartTime,
    );
    if (overlaps) {
      throw new BookingConflictError(
        `This schedule overlaps an existing ${weekdayLabels[weekday]} schedule for the doctor.`,
      );
    }
  }
  return db.transaction(async (tx) => {
    const created = await tx
      .insert(schedules)
      .values(
        parsed.weekdays.map((weekday) => ({
          hospitalId: parsed.hospitalId,
          doctorId: parsed.doctorId,
          departmentId: parsed.departmentId,
          weekday,
          localStartTime: parsed.localStartTime,
          localEndTime: parsed.localEndTime,
          effectiveFrom: parsed.effectiveFrom,
          effectiveUntil: parsed.effectiveUntil,
          defaultCapacity: parsed.defaultCapacity,
        })),
      )
      .returning();
    for (const schedule of created) {
      await writeAudit(tx, {
        hospitalId: parsed.hospitalId,
        actorProfileId: actor.profileId,
        action: "schedule.created",
        targetType: "schedule",
        targetId: schedule.id,
        safeAfter: { doctorId: parsed.doctorId, weekday: schedule.weekday },
      });
    }
    return created;
  });
}

export async function listScheduleConfiguration(hospitalId: string) {
  await requireSessionsPermission(hospitalId);
  const [doctorRows, departmentRows, scheduleRows] = await Promise.all([
    db
      .select({
        id: doctors.id,
        displayName: doctors.displayName,
        departmentId: doctors.departmentId,
      })
      .from(doctors)
      .where(
        and(eq(doctors.hospitalId, hospitalId), eq(doctors.status, "active")),
      )
      .orderBy(asc(doctors.displayName)),
    db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(
        and(
          eq(departments.hospitalId, hospitalId),
          eq(departments.status, "active"),
        ),
      )
      .orderBy(asc(departments.name)),
    db
      .select({
        id: schedules.id,
        doctorId: schedules.doctorId,
        departmentId: schedules.departmentId,
        weekday: schedules.weekday,
        localStartTime: schedules.localStartTime,
        localEndTime: schedules.localEndTime,
        effectiveFrom: schedules.effectiveFrom,
        effectiveUntil: schedules.effectiveUntil,
        defaultCapacity: schedules.defaultCapacity,
        status: schedules.status,
      })
      .from(schedules)
      .where(eq(schedules.hospitalId, hospitalId))
      .orderBy(asc(schedules.weekday), asc(schedules.localStartTime)),
  ]);
  return {
    doctors: doctorRows,
    departments: departmentRows,
    schedules: scheduleRows,
  };
}

export async function createScheduleException(input: unknown) {
  const parsed = exceptionInput.parse(input);
  const actor = await requireSessionsPermission(parsed.hospitalId);
  const schedule = await db.query.schedules.findFirst({
    where: and(
      eq(schedules.hospitalId, parsed.hospitalId),
      eq(schedules.id, parsed.scheduleId),
    ),
  });
  if (!schedule) throw new ResourceNotFoundError();
  return db.transaction(async (tx) => {
    const [exception] = await tx
      .insert(sessionExceptions)
      .values(parsed)
      .returning();
    if (!exception) throw new Error("Schedule exception could not be created.");
    await writeAudit(tx, {
      hospitalId: parsed.hospitalId,
      actorProfileId: actor.profileId,
      action: parsed.isClosed
        ? "schedule.exception_closed"
        : "schedule.exception_created",
      targetType: "session_exception",
      targetId: exception.id,
      safeAfter: {
        scheduleId: parsed.scheduleId,
        exceptionDate: parsed.exceptionDate,
      },
    });
    return exception;
  });
}

export async function closeSession(input: unknown) {
  const parsed = closeSessionInput.parse(input);
  const actor = await requireSessionsPermission(parsed.hospitalId);
  return db.transaction(async (tx) => {
    const rows = await tx.execute<{
      id: string;
      status: string;
      booked_units: number;
    }>(
      sql`select id, status, booked_units from sessions where hospital_id = ${parsed.hospitalId} and id = ${parsed.sessionId} for update`,
    );
    const session = rows[0];
    if (!session) throw new ResourceNotFoundError();
    if (["cancelled", "closed", "completed"].includes(session.status)) {
      return { sessionId: session.id, status: session.status };
    }
    if (session.booked_units > 0) {
      throw new BookingConflictError(
        "A session with active bookings needs to be resolved before closure.",
      );
    }
    await tx
      .update(sessions)
      .set({
        status: "cancelled",
        closureReason: parsed.reason,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, parsed.sessionId));
    await writeAudit(tx, {
      hospitalId: parsed.hospitalId,
      actorProfileId: actor.profileId,
      action: "session.closed",
      targetType: "session",
      targetId: parsed.sessionId,
      reason: parsed.reason,
    });
    return { sessionId: parsed.sessionId, status: "cancelled" };
  });
}

export type BookingActor = {
  profileId?: string;
  providerId?: string;
};

export async function executeBooking(
  parsed: z.infer<typeof bookingInput>,
  actor: BookingActor,
) {
  const hash = requestHash(parsed);
  return db.transaction(async (tx) => {
    const idempotency = await ensureIdempotency(tx, {
      hospitalId: parsed.hospitalId,
      operation: "book",
      idempotencyKey: parsed.idempotencyKey,
      requestHash: hash,
      patientId: parsed.patientId,
      sessionId: parsed.sessionId,
    });
    if (idempotency.status === "succeeded" && idempotency.responseBody) {
      return idempotency.responseBody;
    }
    if (idempotency.status === "processing" && !idempotency.created) {
      throw new BookingConflictError(
        "The booking request is already processing.",
      );
    }
    const patient = await tx.query.patients.findFirst({
      where: and(
        eq(patients.hospitalId, parsed.hospitalId),
        eq(patients.id, parsed.patientId),
      ),
    });
    if (!patient) throw new ResourceNotFoundError();
    if (parsed.callerId) {
      const caller = await tx.query.callers.findFirst({
        where: and(
          eq(callers.hospitalId, parsed.hospitalId),
          eq(callers.id, parsed.callerId),
        ),
      });
      const relationship = await tx.query.callerPatientLinks.findFirst({
        where: and(
          eq(callerPatientLinks.hospitalId, parsed.hospitalId),
          eq(callerPatientLinks.callerId, parsed.callerId),
          eq(callerPatientLinks.patientId, parsed.patientId),
        ),
      });
      if (!caller || !relationship) throw new ResourceNotFoundError();
    }
    const sessionRows = await tx.execute<{
      id: string;
      capacity: number;
      booked_units: number;
      status: string;
      starts_at: Date;
    }>(
      sql`select id, capacity, booked_units, status, starts_at from sessions where hospital_id = ${parsed.hospitalId} and id = ${parsed.sessionId} for update`,
    );
    const session = sessionRows[0];
    if (!session) throw new ResourceNotFoundError();
    if (session.status !== "open")
      throw new BookingConflictError("The session is closed.");
    if (session.starts_at <= new Date())
      throw new BookingConflictError("The session has already started.");
    if (session.booked_units + parsed.capacityUnits > session.capacity) {
      throw new BookingConflictError("The session has no remaining capacity.");
    }

    const [appointment] = await tx
      .insert(appointments)
      .values({
        hospitalId: parsed.hospitalId,
        reference: `APT-${randomUUID().slice(0, 8).toUpperCase()}`,
        sessionId: parsed.sessionId,
        patientId: parsed.patientId,
        bookedByCallerId: parsed.callerId,
        status: "confirmed",
        source: parsed.source,
        capacityUnits: parsed.capacityUnits,
        confirmedAt: new Date(),
      })
      .returning();
    if (!appointment) throw new Error("Appointment could not be created.");
    if (parsed.callId) {
      const originatingCall = await tx.query.calls.findFirst({
        where: and(
          eq(calls.hospitalId, parsed.hospitalId),
          eq(calls.id, parsed.callId),
        ),
      });
      if (!originatingCall) throw new ResourceNotFoundError();
      await tx
        .insert(callAppointments)
        .values({
          hospitalId: parsed.hospitalId,
          callId: parsed.callId,
          appointmentId: appointment.id,
          linkReason: "created_during_call",
        })
        .onConflictDoNothing();
    }
    await tx
      .update(sessions)
      .set({
        bookedUnits: sql`${sessions.bookedUnits} + ${parsed.capacityUnits}`,
      })
      .where(
        and(
          eq(sessions.hospitalId, parsed.hospitalId),
          eq(sessions.id, parsed.sessionId),
        ),
      );
    await tx.insert(appointmentHistory).values({
      hospitalId: parsed.hospitalId,
      appointmentId: appointment.id,
      toStatus: "confirmed",
      actorProfileId: actor.profileId,
      reason: "Appointment explicitly confirmed.",
      evidence: { source: parsed.source },
    });
    const response = { appointment };
    await tx
      .update(idempotencyRecords)
      .set({
        status: "succeeded",
        responseStatus: 201,
        responseBody: response,
        resourceType: "appointment",
        resourceId: appointment.id,
      })
      .where(eq(idempotencyRecords.id, idempotency.id));
    await writeAudit(tx, {
      hospitalId: parsed.hospitalId,
      actorProfileId: actor.profileId,
      actorProviderId: actor.providerId,
      action: "appointment.booked",
      targetType: "appointment",
      targetId: appointment.id,
      safeAfter: {
        sessionId: parsed.sessionId,
        patientId: parsed.patientId,
        callId: parsed.callId,
        source: parsed.source,
      },
    });
    return response;
  });
}

export async function bookAppointment(input: unknown) {
  const parsed = bookingInput.parse(input);
  const actor = await requireAppointmentsPermission(parsed.hospitalId);
  return executeBooking(parsed, { profileId: actor.profileId });
}

export async function cancelAppointment(input: unknown) {
  const parsed = cancellationInput.parse(input);
  const actor = await requireAppointmentsPermission(parsed.hospitalId);
  const hash = requestHash(parsed);
  return db.transaction(async (tx) => {
    const idempotency = await ensureIdempotency(tx, {
      hospitalId: parsed.hospitalId,
      operation: "cancel",
      idempotencyKey: parsed.idempotencyKey,
      requestHash: hash,
    });
    if (idempotency.status === "succeeded" && idempotency.responseBody)
      return idempotency.responseBody;
    if (idempotency.status === "processing" && !idempotency.created)
      throw new BookingConflictError(
        "The cancellation request is already processing.",
      );
    const appointmentRows = await tx.execute<{
      id: string;
      session_id: string;
      patient_id: string;
      status: string;
      capacity_units: number;
    }>(
      sql`select id, session_id, patient_id, status, capacity_units from appointments where hospital_id = ${parsed.hospitalId} and id = ${parsed.appointmentId} for update`,
    );
    const appointment = appointmentRows[0];
    if (!appointment) throw new ResourceNotFoundError();
    if (appointment.status === "cancelled") {
      const response = { appointmentId: appointment.id, status: "cancelled" };
      await tx
        .update(idempotencyRecords)
        .set({
          status: "succeeded",
          responseStatus: 200,
          responseBody: response,
          resourceType: "appointment",
          resourceId: appointment.id,
        })
        .where(eq(idempotencyRecords.id, idempotency.id));
      return response;
    }
    if (!["pending", "confirmed"].includes(appointment.status))
      throw new BookingConflictError("This appointment cannot be cancelled.");
    await tx.execute(
      sql`select id from sessions where hospital_id = ${parsed.hospitalId} and id = ${appointment.session_id} for update`,
    );
    await tx
      .update(appointments)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationReason: parsed.reason,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointment.id));
    await tx
      .update(sessions)
      .set({
        bookedUnits: sql`${sessions.bookedUnits} - ${appointment.capacity_units}`,
      })
      .where(eq(sessions.id, appointment.session_id));
    await tx.insert(appointmentHistory).values({
      hospitalId: parsed.hospitalId,
      appointmentId: appointment.id,
      fromStatus: appointment.status as "pending" | "confirmed",
      toStatus: "cancelled",
      actorProfileId: actor.profileId,
      reason: parsed.reason,
    });
    const response = { appointmentId: appointment.id, status: "cancelled" };
    await tx
      .update(idempotencyRecords)
      .set({
        status: "succeeded",
        responseStatus: 200,
        responseBody: response,
        resourceType: "appointment",
        resourceId: appointment.id,
      })
      .where(eq(idempotencyRecords.id, idempotency.id));
    await writeAudit(tx, {
      hospitalId: parsed.hospitalId,
      actorProfileId: actor.profileId,
      action: "appointment.cancelled",
      targetType: "appointment",
      targetId: appointment.id,
      reason: parsed.reason,
    });
    return response;
  });
}

export async function rescheduleAppointment(input: unknown) {
  const parsed = rescheduleInput.parse(input);
  const actor = await requireAppointmentsPermission(parsed.hospitalId);
  const hash = requestHash(parsed);
  return db.transaction(async (tx) => {
    const idempotency = await ensureIdempotency(tx, {
      hospitalId: parsed.hospitalId,
      operation: "reschedule",
      idempotencyKey: parsed.idempotencyKey,
      requestHash: hash,
    });
    if (idempotency.status === "succeeded" && idempotency.responseBody)
      return idempotency.responseBody;
    if (idempotency.status === "processing" && !idempotency.created)
      throw new BookingConflictError(
        "The reschedule request is already processing.",
      );
    const appointmentRows = await tx.execute<{
      id: string;
      session_id: string;
      patient_id: string;
      booked_by_caller_id: string | null;
      source: "voice" | "staff" | "import";
      capacity_units: number;
      status: string;
    }>(
      sql`select id, session_id, patient_id, booked_by_caller_id, source, capacity_units, status from appointments where hospital_id = ${parsed.hospitalId} and id = ${parsed.appointmentId} for update`,
    );
    const appointment = appointmentRows[0];
    if (!appointment) throw new ResourceNotFoundError();
    if (appointment.status !== "confirmed")
      throw new BookingConflictError(
        "Only confirmed appointments can be rescheduled.",
      );
    const ids = [appointment.session_id, parsed.destinationSessionId].sort();
    const locked = await tx.execute<{
      id: string;
      capacity: number;
      booked_units: number;
      status: string;
      starts_at: Date;
    }>(
      sql`select id, capacity, booked_units, status, starts_at from sessions where hospital_id = ${parsed.hospitalId} and id in (${sql.join(
        ids.map((id) => sql`${id}`),
        sql`, `,
      )}) order by id for update`,
    );
    const destination = locked.find(
      (row) => row.id === parsed.destinationSessionId,
    );
    const source = locked.find((row) => row.id === appointment.session_id);
    if (!source || !destination) throw new ResourceNotFoundError();
    if (
      destination.status !== "open" ||
      destination.starts_at <= new Date() ||
      destination.booked_units + appointment.capacity_units >
        destination.capacity
    )
      throw new BookingConflictError("The destination session is unavailable.");
    await tx
      .update(sessions)
      .set({
        bookedUnits: sql`${sessions.bookedUnits} + ${appointment.capacity_units}`,
      })
      .where(eq(sessions.id, destination.id));
    const [replacement] = await tx
      .insert(appointments)
      .values({
        hospitalId: parsed.hospitalId,
        reference: `APT-${randomUUID().slice(0, 8).toUpperCase()}`,
        sessionId: destination.id,
        patientId: appointment.patient_id,
        bookedByCallerId: appointment.booked_by_caller_id ?? undefined,
        status: "confirmed",
        source: appointment.source,
        capacityUnits: appointment.capacity_units,
        confirmedAt: new Date(),
        replacedAppointmentId: appointment.id,
      })
      .returning();
    if (!replacement)
      throw new Error("Replacement appointment could not be created.");
    await tx
      .update(appointments)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationReason: `Rescheduled: ${parsed.reason}`,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointment.id));
    await tx
      .update(sessions)
      .set({
        bookedUnits: sql`${sessions.bookedUnits} - ${appointment.capacity_units}`,
      })
      .where(eq(sessions.id, source.id));
    await tx.insert(appointmentHistory).values([
      {
        hospitalId: parsed.hospitalId,
        appointmentId: appointment.id,
        fromStatus: "confirmed",
        toStatus: "cancelled",
        actorProfileId: actor.profileId,
        reason: parsed.reason,
      },
      {
        hospitalId: parsed.hospitalId,
        appointmentId: replacement.id,
        toStatus: "confirmed",
        actorProfileId: actor.profileId,
        reason: `Replacement for ${appointment.id}`,
        evidence: { replacedAppointmentId: appointment.id },
      },
    ]);
    const response = {
      appointment: replacement,
      replacedAppointmentId: appointment.id,
    };
    await tx
      .update(idempotencyRecords)
      .set({
        status: "succeeded",
        responseStatus: 200,
        responseBody: response,
        resourceType: "appointment",
        resourceId: replacement.id,
      })
      .where(eq(idempotencyRecords.id, idempotency.id));
    await writeAudit(tx, {
      hospitalId: parsed.hospitalId,
      actorProfileId: actor.profileId,
      action: "appointment.rescheduled",
      targetType: "appointment",
      targetId: replacement.id,
      reason: parsed.reason,
      safeAfter: { replacedAppointmentId: appointment.id },
    });
    return response;
  });
}

export async function linkCallerToPatient(input: unknown) {
  const parsed = z
    .object({
      hospitalId: uuid,
      callerId: uuid,
      patientId: uuid,
      relationship: z.string().trim().min(2).max(80),
    })
    .parse(input);
  const actor = await requireAppointmentsPermission(parsed.hospitalId);
  await db.transaction(async (tx) => {
    const caller = await tx.query.callers.findFirst({
      where: and(
        eq(callers.hospitalId, parsed.hospitalId),
        eq(callers.id, parsed.callerId),
      ),
    });
    const patient = await tx.query.patients.findFirst({
      where: and(
        eq(patients.hospitalId, parsed.hospitalId),
        eq(patients.id, parsed.patientId),
      ),
    });
    if (!caller || !patient) throw new ResourceNotFoundError();
    await tx.insert(callerPatientLinks).values(parsed).onConflictDoNothing();
    await writeAudit(tx, {
      hospitalId: parsed.hospitalId,
      actorProfileId: actor.profileId,
      action: "caller_patient.linked",
      targetType: "caller_patient_link",
      targetId: `${parsed.callerId}:${parsed.patientId}`,
      safeAfter: { relationship: parsed.relationship },
    });
  });
  return { callerId: parsed.callerId, patientId: parsed.patientId };
}
