import "server-only";

import { and, asc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

import {
  BookingConflictError,
  ResourceNotFoundError,
} from "@/modules/authentication/errors";
import { db } from "@/modules/database/client";
import {
  appointments,
  callParticipants,
  callerPatientLinks,
  callers,
  calls,
  departments,
  doctors,
  hospitalConfigurations,
  patients,
  sessions,
} from "@/modules/database/schema";
import {
  executeBooking,
  listAvailabilityForVoice,
} from "@/modules/scheduling/server/service";

const uuid = z.string().uuid();

type VoiceCallContext = {
  id: string;
  providerCallId: string;
  hospitalId: string;
  status: "received" | "in_progress" | "ended" | "failed";
  callerId: string | null;
  callerPhone: string | null;
  patientId: string | null;
};

export type VoiceToolResult = {
  success: boolean;
  code?: string;
  message: string;
  [key: string]: unknown;
};

async function resolveCallContext(
  providerCallId: string,
): Promise<VoiceCallContext> {
  const call = await db.query.calls.findFirst({
    where: and(
      eq(calls.provider, "retell"),
      eq(calls.providerCallId, providerCallId),
    ),
  });
  if (!call) throw new ResourceNotFoundError();
  const [participant, patientRows] = await Promise.all([
    db
      .select({
        callerId: callers.id,
        callerPhone: callers.phoneE164,
      })
      .from(callParticipants)
      .innerJoin(
        callers,
        and(
          eq(callers.hospitalId, callParticipants.hospitalId),
          eq(callers.id, callParticipants.callerId),
        ),
      )
      .where(
        and(
          eq(callParticipants.hospitalId, call.hospitalId),
          eq(callParticipants.callId, call.id),
          eq(callParticipants.kind, "caller"),
        ),
      )
      .limit(1),
    db
      .select({ patientId: patients.id })
      .from(callParticipants)
      .innerJoin(
        callerPatientLinks,
        and(
          eq(callerPatientLinks.hospitalId, callParticipants.hospitalId),
          eq(callerPatientLinks.callerId, callParticipants.callerId),
        ),
      )
      .innerJoin(
        patients,
        and(
          eq(patients.hospitalId, callerPatientLinks.hospitalId),
          eq(patients.id, callerPatientLinks.patientId),
        ),
      )
      .where(
        and(
          eq(callParticipants.hospitalId, call.hospitalId),
          eq(callParticipants.callId, call.id),
          eq(callParticipants.kind, "caller"),
        ),
      )
      .orderBy(asc(patients.displayName)),
  ]);
  return {
    id: call.id,
    providerCallId: call.providerCallId,
    hospitalId: call.hospitalId,
    status: call.status,
    callerId: participant[0]?.callerId ?? null,
    callerPhone: participant[0]?.callerPhone ?? null,
    patientId:
      patientRows.length === 1 ? (patientRows[0]?.patientId ?? null) : null,
  };
}

async function resolveFilterId(
  hospitalId: string,
  args: Record<string, unknown>,
) {
  let departmentId = uuid.safeParse(args.departmentId).success
    ? String(args.departmentId)
    : undefined;
  let doctorId = uuid.safeParse(args.doctorId).success
    ? String(args.doctorId)
    : undefined;
  if (!departmentId && typeof args.department === "string") {
    const department = await db.query.departments.findFirst({
      where: and(
        eq(departments.hospitalId, hospitalId),
        or(
          ilike(departments.name, args.department),
          ilike(departments.code, args.department),
        ),
      ),
    });
    departmentId = department?.id;
  }
  if (!doctorId && typeof args.doctor === "string") {
    const doctor = await db.query.doctors.findFirst({
      where: and(
        eq(doctors.hospitalId, hospitalId),
        ilike(doctors.displayName, args.doctor),
      ),
    });
    doctorId = doctor?.id;
  }
  return { departmentId, doctorId };
}

function dateArgument(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function getVoiceAvailability(
  providerCallId: string,
  args: Record<string, unknown>,
): Promise<VoiceToolResult> {
  const context = await resolveCallContext(providerCallId);
  const config = await db.query.hospitalConfigurations.findFirst({
    where: eq(hospitalConfigurations.hospitalId, context.hospitalId),
  });
  const timeZone = config?.timezone ?? "UTC";
  const from = dateArgument(args.from) ?? new Date();
  const to = dateArgument(args.to) ?? new Date(from.getTime() + 14 * 86400000);
  if (to <= from) {
    return {
      success: false,
      code: "INVALID_DATE_RANGE",
      message: "The requested appointment date range is invalid.",
    };
  }
  const filters = await resolveFilterId(context.hospitalId, args);
  const slots = await listAvailabilityForVoice({
    hospitalId: context.hospitalId,
    from,
    to,
    timeZone,
    ...filters,
    limit: 5,
  });
  return {
    success: true,
    message: slots.length
      ? "Available appointment slots returned."
      : "No appointment slots are available in that range.",
    timeZone,
    slots,
  };
}

export async function bookVoiceAppointment(
  providerCallId: string,
  args: Record<string, unknown>,
): Promise<VoiceToolResult> {
  const context = await resolveCallContext(providerCallId);
  if (!(["received", "in_progress"] as string[]).includes(context.status)) {
    return {
      success: false,
      code: "INVALID_CALL_STATE",
      message: "Appointments can only be booked during an active call.",
    };
  }
  if (!context.callerId || !context.patientId) {
    return {
      success: false,
      code: "PATIENT_IDENTITY_REQUIRED",
      message:
        "The caller must be matched to exactly one patient before booking.",
    };
  }
  const sessionId = uuid.safeParse(args.sessionId);
  if (!sessionId.success) {
    return {
      success: false,
      code: "SESSION_REQUIRED",
      message: "A valid appointment session must be selected.",
    };
  }
  if (args.confirmed !== true) {
    return {
      success: false,
      code: "CONFIRMATION_REQUIRED",
      message: "The caller must explicitly confirm the selected appointment.",
    };
  }
  const idempotencyKey =
    typeof args.idempotencyKey === "string" && args.idempotencyKey.length >= 8
      ? args.idempotencyKey
      : `voice:${providerCallId}:${sessionId.data}`;
  try {
    const result = await executeBooking(
      {
        hospitalId: context.hospitalId,
        sessionId: sessionId.data,
        patientId: context.patientId,
        callerId: context.callerId,
        callId: context.id,
        capacityUnits: 1,
        source: "voice",
        idempotencyKey,
        confirmed: true,
      },
      { providerId: "retell" },
    );
    const appointmentId = (result as { appointment?: { id?: string } })
      .appointment?.id;
    if (!appointmentId) throw new Error("Appointment result was incomplete.");
    const [appointment] = await db
      .select({
        id: appointments.id,
        reference: appointments.reference,
        startsAt: sessions.startsAt,
        doctorName: doctors.displayName,
        departmentName: departments.name,
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
          eq(appointments.hospitalId, context.hospitalId),
          eq(appointments.id, appointmentId),
        ),
      )
      .limit(1);
    if (!appointment) throw new ResourceNotFoundError();
    const config = await db.query.hospitalConfigurations.findFirst({
      where: eq(hospitalConfigurations.hospitalId, context.hospitalId),
    });
    return {
      success: true,
      message: "Appointment booked successfully.",
      appointment: {
        ...appointment,
        startsAt: appointment.startsAt.toISOString(),
        displayDate: new Intl.DateTimeFormat("en-US", {
          timeZone: config?.timezone ?? "UTC",
          dateStyle: "full",
        }).format(appointment.startsAt),
        displayTime: new Intl.DateTimeFormat("en-US", {
          timeZone: config?.timezone ?? "UTC",
          timeStyle: "short",
        }).format(appointment.startsAt),
      },
    };
  } catch (error) {
    if (error instanceof BookingConflictError) {
      return {
        success: false,
        code: "SESSION_NO_LONGER_AVAILABLE",
        message: error.message,
      };
    }
    throw error;
  }
}
