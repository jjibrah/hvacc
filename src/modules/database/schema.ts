import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const membershipRole = pgEnum("membership_role", [
  "reception_staff",
  "operations_manager",
  "quality_reviewer",
  "doctor",
  "hospital_admin",
  "platform_admin",
]);
export const recordStatus = pgEnum("record_status", ["active", "disabled"]);
export const sessionStatus = pgEnum("session_status", [
  "open",
  "closing",
  "closed",
  "cancelled",
  "completed",
]);
export const appointmentStatus = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);
export const appointmentSource = pgEnum("appointment_source", [
  "voice",
  "staff",
  "import",
]);
export const callStatus = pgEnum("call_status", [
  "received",
  "in_progress",
  "ended",
  "failed",
]);
export const callDirection = pgEnum("call_direction", ["inbound", "outbound"]);
export const analysisStatus = pgEnum("analysis_status", [
  "pending",
  "completed",
  "failed",
]);
export const recordingStatus = pgEnum("recording_status", [
  "pending",
  "available",
  "expired",
  "unavailable",
]);
export const followUpStatus = pgEnum("follow_up_status", [
  "open",
  "assigned",
  "in_progress",
  "resolved",
  "cancelled",
]);
export const followUpPriority = pgEnum("follow_up_priority", [
  "p1",
  "p2",
  "p3",
  "p4",
]);
export const assignmentKind = pgEnum("assignment_kind", [
  "queue",
  "membership",
]);
export const providerKind = pgEnum("provider_kind", ["retell"]);
export const integrationStatus = pgEnum("integration_status", [
  "draft",
  "active",
  "disabled",
  "error",
]);
export const eventProcessingStatus = pgEnum("event_processing_status", [
  "received",
  "processed",
  "ignored",
  "failed",
]);
export const idempotencyOperation = pgEnum("idempotency_operation", [
  "book",
  "cancel",
  "reschedule",
]);
export const idempotencyStatus = pgEnum("idempotency_status", [
  "processing",
  "succeeded",
  "failed",
]);
export const auditResult = pgEnum("audit_result", [
  "succeeded",
  "denied",
  "failed",
]);
export const actorKind = pgEnum("actor_kind", [
  "profile",
  "provider",
  "system",
]);

const identityColumns = {
  id: uuid("id").defaultRandom().primaryKey(),
};

const timestampColumns = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
};

const softDeleteColumn = {
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
};

export const hospitals = pgTable(
  "hospitals",
  {
    ...identityColumns,
    stableKey: text("stable_key").notNull(),
    displayName: text("display_name").notNull(),
    status: recordStatus("status").default("active").notNull(),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    uniqueIndex("hospitals_stable_key_unique").on(table.stableKey),
    unique("hospitals_scope_unique").on(table.id, table.stableKey),
    check(
      "hospitals_stable_key_format",
      sql`${table.stableKey} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
  ],
);

export const hospitalConfigurations = pgTable(
  "hospital_configurations",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id, { onDelete: "cascade" }),
    timezone: text("timezone").notNull(),
    currencyCode: text("currency_code").notNull(),
    syntheticContactEmail: text("synthetic_contact_email"),
    syntheticContactPhone: text("synthetic_contact_phone"),
    syntheticAddress: text("synthetic_address"),
    defaultLocale: text("default_locale").default("en-MY").notNull(),
    operatingHours: jsonb("operating_hours")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    appointmentPolicy: jsonb("appointment_policy")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    patientPolicy: jsonb("patient_policy")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    followUpPolicy: jsonb("follow_up_policy")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    voicePolicy: jsonb("voice_policy")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    notificationPolicy: jsonb("notification_policy")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    privacyPolicy: jsonb("privacy_policy")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    accessPolicy: jsonb("access_policy")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("hospital_configurations_hospital_unique").on(table.hospitalId),
    check(
      "hospital_configurations_currency_code",
      sql`${table.currencyCode} ~ '^[A-Z]{3}$'`,
    ),
  ],
);

export const profiles = pgTable(
  "profiles",
  {
    ...identityColumns,
    // Supabase Auth owns the referenced identity. It deliberately remains a
    // value rather than a generated FK because auth.users is provider-managed.
    authUserId: uuid("auth_user_id").notNull(),
    displayName: text("display_name").notNull(),
    email: text("email").notNull(),
    status: recordStatus("status").default("active").notNull(),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    uniqueIndex("profiles_auth_user_unique").on(table.authUserId),
    uniqueIndex("profiles_email_unique").on(sql`lower(${table.email})`),
  ],
);

export const hospitalMemberships = pgTable(
  "hospital_memberships",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    role: membershipRole("role").notNull(),
    status: recordStatus("status").default("active").notNull(),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    unique("hospital_memberships_profile_unique").on(
      table.hospitalId,
      table.profileId,
    ),
    unique("hospital_memberships_scope_unique").on(table.hospitalId, table.id),
    index("hospital_memberships_profile_idx").on(table.profileId),
  ],
);

export const permissions = pgTable("permissions", {
  code: text("code").primaryKey(),
  description: text("description").notNull(),
  sensitive: boolean("sensitive").default(false).notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    role: membershipRole("role").notNull(),
    permissionCode: text("permission_code")
      .notNull()
      .references(() => permissions.code, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.role, table.permissionCode] })],
);

export const membershipPermissions = pgTable(
  "membership_permissions",
  {
    hospitalId: uuid("hospital_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    permissionCode: text("permission_code")
      .notNull()
      .references(() => permissions.code, { onDelete: "cascade" }),
    granted: boolean("granted").notNull(),
    reason: text("reason").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.membershipId, table.permissionCode] }),
    foreignKey({
      columns: [table.hospitalId, table.membershipId],
      foreignColumns: [hospitalMemberships.hospitalId, hospitalMemberships.id],
      name: "membership_permissions_membership_scope_fk",
    }).onDelete("cascade"),
  ],
);

export const departments = pgTable(
  "departments",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    status: recordStatus("status").default("active").notNull(),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    unique("departments_scope_unique").on(table.hospitalId, table.id),
    uniqueIndex("departments_code_unique").on(table.hospitalId, table.code),
  ],
);

export const doctors = pgTable(
  "doctors",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id").notNull(),
    stableKey: text("stable_key").notNull(),
    displayName: text("display_name").notNull(),
    status: recordStatus("status").default("active").notNull(),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    unique("doctors_scope_unique").on(table.hospitalId, table.id),
    uniqueIndex("doctors_stable_key_unique").on(
      table.hospitalId,
      table.stableKey,
    ),
    foreignKey({
      columns: [table.hospitalId, table.departmentId],
      foreignColumns: [departments.hospitalId, departments.id],
      name: "doctors_department_scope_fk",
    }).onDelete("restrict"),
  ],
);

export const doctorProfileLinks = pgTable(
  "doctor_profile_links",
  {
    hospitalId: uuid("hospital_id").notNull(),
    doctorId: uuid("doctor_id").notNull(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.hospitalId, table.doctorId, table.profileId],
    }),
    unique("doctor_profile_links_one_profile_per_doctor").on(
      table.hospitalId,
      table.doctorId,
    ),
    foreignKey({
      columns: [table.hospitalId, table.doctorId],
      foreignColumns: [doctors.hospitalId, doctors.id],
      name: "doctor_profile_links_doctor_scope_fk",
    }).onDelete("cascade"),
  ],
);

export const schedules = pgTable(
  "schedules",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id").notNull(),
    doctorId: uuid("doctor_id").notNull(),
    departmentId: uuid("department_id").notNull(),
    weekday: integer("weekday").notNull(),
    localStartTime: time("local_start_time").notNull(),
    localEndTime: time("local_end_time").notNull(),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveUntil: date("effective_until", { mode: "string" }),
    defaultCapacity: integer("default_capacity").notNull(),
    status: recordStatus("status").default("active").notNull(),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    unique("schedules_scope_unique").on(table.hospitalId, table.id),
    foreignKey({
      columns: [table.hospitalId, table.doctorId],
      foreignColumns: [doctors.hospitalId, doctors.id],
      name: "schedules_doctor_scope_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.hospitalId, table.departmentId],
      foreignColumns: [departments.hospitalId, departments.id],
      name: "schedules_department_scope_fk",
    }).onDelete("restrict"),
    check("schedules_weekday_range", sql`${table.weekday} between 0 and 6`),
    check(
      "schedules_time_order",
      sql`${table.localEndTime} > ${table.localStartTime}`,
    ),
    check("schedules_capacity_positive", sql`${table.defaultCapacity} > 0`),
    check(
      "schedules_effective_date_order",
      sql`${table.effectiveUntil} is null or ${table.effectiveUntil} >= ${table.effectiveFrom}`,
    ),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id").notNull(),
    scheduleId: uuid("schedule_id"),
    doctorId: uuid("doctor_id").notNull(),
    departmentId: uuid("department_id").notNull(),
    startsAt: timestamp("starts_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    endsAt: timestamp("ends_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    capacity: integer("capacity").notNull(),
    bookedUnits: integer("booked_units").default(0).notNull(),
    status: sessionStatus("status").default("open").notNull(),
    closureReason: text("closure_reason"),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    unique("sessions_scope_unique").on(table.hospitalId, table.id),
    uniqueIndex("sessions_doctor_start_unique").on(
      table.hospitalId,
      table.doctorId,
      table.startsAt,
    ),
    index("sessions_availability_idx").on(
      table.hospitalId,
      table.status,
      table.startsAt,
    ),
    foreignKey({
      columns: [table.hospitalId, table.scheduleId],
      foreignColumns: [schedules.hospitalId, schedules.id],
      name: "sessions_schedule_scope_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.hospitalId, table.doctorId],
      foreignColumns: [doctors.hospitalId, doctors.id],
      name: "sessions_doctor_scope_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.hospitalId, table.departmentId],
      foreignColumns: [departments.hospitalId, departments.id],
      name: "sessions_department_scope_fk",
    }).onDelete("restrict"),
    check("sessions_time_order", sql`${table.endsAt} > ${table.startsAt}`),
    check("sessions_capacity_positive", sql`${table.capacity} > 0`),
    check(
      "sessions_booked_units_range",
      sql`${table.bookedUnits} >= 0 and ${table.bookedUnits} <= ${table.capacity}`,
    ),
    check(
      "sessions_closure_reason_required",
      sql`${table.status} not in ('closing', 'closed', 'cancelled') or ${table.closureReason} is not null`,
    ),
  ],
);

export const sessionExceptions = pgTable(
  "session_exceptions",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id").notNull(),
    scheduleId: uuid("schedule_id").notNull(),
    exceptionDate: date("exception_date", { mode: "string" }).notNull(),
    isClosed: boolean("is_closed").default(false).notNull(),
    replacementStartsAt: timestamp("replacement_starts_at", {
      withTimezone: true,
      mode: "date",
    }),
    replacementEndsAt: timestamp("replacement_ends_at", {
      withTimezone: true,
      mode: "date",
    }),
    capacityOverride: integer("capacity_override"),
    reason: text("reason").notNull(),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("session_exceptions_schedule_date_unique").on(
      table.scheduleId,
      table.exceptionDate,
    ),
    foreignKey({
      columns: [table.hospitalId, table.scheduleId],
      foreignColumns: [schedules.hospitalId, schedules.id],
      name: "session_exceptions_schedule_scope_fk",
    }).onDelete("cascade"),
    check(
      "session_exceptions_capacity_positive",
      sql`${table.capacityOverride} is null or ${table.capacityOverride} > 0`,
    ),
    check(
      "session_exceptions_replacement_pair",
      sql`(${table.replacementStartsAt} is null) = (${table.replacementEndsAt} is null)`,
    ),
    check(
      "session_exceptions_replacement_order",
      sql`${table.replacementStartsAt} is null or ${table.replacementEndsAt} > ${table.replacementStartsAt}`,
    ),
  ],
);

export const callers = pgTable(
  "callers",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id, { onDelete: "cascade" }),
    displayName: text("display_name"),
    phoneE164: text("phone_e164").notNull(),
    phoneHash: text("phone_hash").notNull(),
    preferredLocale: text("preferred_locale"),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    unique("callers_scope_unique").on(table.hospitalId, table.id),
    uniqueIndex("callers_phone_hash_unique").on(
      table.hospitalId,
      table.phoneHash,
    ),
    check(
      "callers_phone_e164_format",
      sql`${table.phoneE164} ~ '^\\+[1-9][0-9]{7,14}$'`,
    ),
  ],
);

export const patients = pgTable(
  "patients",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id, { onDelete: "cascade" }),
    stableKey: text("stable_key").notNull(),
    displayName: text("display_name").notNull(),
    dateOfBirth: date("date_of_birth", { mode: "string" }),
    phoneE164: text("phone_e164"),
    phoneHash: text("phone_hash"),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    unique("patients_scope_unique").on(table.hospitalId, table.id),
    uniqueIndex("patients_stable_key_unique").on(
      table.hospitalId,
      table.stableKey,
    ),
    check(
      "patients_phone_e164_format",
      sql`${table.phoneE164} is null or ${table.phoneE164} ~ '^\\+[1-9][0-9]{7,14}$'`,
    ),
  ],
);

export const callerPatientLinks = pgTable(
  "caller_patient_links",
  {
    hospitalId: uuid("hospital_id").notNull(),
    callerId: uuid("caller_id").notNull(),
    patientId: uuid("patient_id").notNull(),
    relationship: text("relationship").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.hospitalId, table.callerId, table.patientId],
    }),
    foreignKey({
      columns: [table.hospitalId, table.callerId],
      foreignColumns: [callers.hospitalId, callers.id],
      name: "caller_patient_links_caller_scope_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.hospitalId, table.patientId],
      foreignColumns: [patients.hospitalId, patients.id],
      name: "caller_patient_links_patient_scope_fk",
    }).onDelete("cascade"),
  ],
);

export const appointments = pgTable(
  "appointments",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id").notNull(),
    reference: text("reference").notNull(),
    sessionId: uuid("session_id").notNull(),
    patientId: uuid("patient_id").notNull(),
    bookedByCallerId: uuid("booked_by_caller_id"),
    status: appointmentStatus("status").default("pending").notNull(),
    source: appointmentSource("source").notNull(),
    capacityUnits: integer("capacity_units").default(1).notNull(),
    confirmedAt: timestamp("confirmed_at", {
      withTimezone: true,
      mode: "date",
    }),
    cancelledAt: timestamp("cancelled_at", {
      withTimezone: true,
      mode: "date",
    }),
    cancellationReason: text("cancellation_reason"),
    replacedAppointmentId: uuid("replaced_appointment_id"),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    unique("appointments_scope_unique").on(table.hospitalId, table.id),
    uniqueIndex("appointments_reference_unique").on(
      table.hospitalId,
      table.reference,
    ),
    index("appointments_session_status_idx").on(
      table.hospitalId,
      table.sessionId,
      table.status,
    ),
    foreignKey({
      columns: [table.hospitalId, table.sessionId],
      foreignColumns: [sessions.hospitalId, sessions.id],
      name: "appointments_session_scope_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.hospitalId, table.patientId],
      foreignColumns: [patients.hospitalId, patients.id],
      name: "appointments_patient_scope_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.hospitalId, table.bookedByCallerId],
      foreignColumns: [callers.hospitalId, callers.id],
      name: "appointments_caller_scope_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.hospitalId, table.replacedAppointmentId],
      foreignColumns: [table.hospitalId, table.id],
      name: "appointments_replacement_scope_fk",
    }).onDelete("restrict"),
    check(
      "appointments_capacity_units_positive",
      sql`${table.capacityUnits} > 0`,
    ),
    check(
      "appointments_confirmed_at_required",
      sql`${table.status} <> 'confirmed' or ${table.confirmedAt} is not null`,
    ),
    check(
      "appointments_cancellation_fields",
      sql`${table.status} <> 'cancelled' or (${table.cancelledAt} is not null and ${table.cancellationReason} is not null)`,
    ),
  ],
);

export const appointmentHistory = pgTable(
  "appointment_history",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id").notNull(),
    appointmentId: uuid("appointment_id").notNull(),
    fromStatus: appointmentStatus("from_status"),
    toStatus: appointmentStatus("to_status").notNull(),
    actorProfileId: uuid("actor_profile_id").references(() => profiles.id, {
      onDelete: "restrict",
    }),
    reason: text("reason"),
    evidence: jsonb("evidence").$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("appointment_history_timeline_idx").on(
      table.appointmentId,
      table.occurredAt,
    ),
    foreignKey({
      columns: [table.hospitalId, table.appointmentId],
      foreignColumns: [appointments.hospitalId, appointments.id],
      name: "appointment_history_appointment_scope_fk",
    }).onDelete("cascade"),
    check(
      "appointment_history_status_changes",
      sql`${table.fromStatus} is null or ${table.fromStatus} <> ${table.toStatus}`,
    ),
  ],
);

export const calls = pgTable(
  "calls",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id, { onDelete: "cascade" }),
    provider: providerKind("provider").default("retell").notNull(),
    providerCallId: text("provider_call_id").notNull(),
    direction: callDirection("direction").notNull(),
    status: callStatus("status").default("received").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
    lastProviderEventAt: timestamp("last_provider_event_at", {
      withTimezone: true,
      mode: "date",
    }),
    costAmount: numeric("cost_amount", { precision: 12, scale: 4 }),
    costCurrency: text("cost_currency"),
    ...timestampColumns,
  },
  (table) => [
    unique("calls_scope_unique").on(table.hospitalId, table.id),
    uniqueIndex("calls_provider_id_unique").on(
      table.hospitalId,
      table.provider,
      table.providerCallId,
    ),
    index("calls_started_at_idx").on(table.hospitalId, table.startedAt),
    check(
      "calls_time_order",
      sql`${table.endedAt} is null or ${table.startedAt} is null or ${table.endedAt} >= ${table.startedAt}`,
    ),
    check(
      "calls_cost_pair",
      sql`(${table.costAmount} is null) = (${table.costCurrency} is null)`,
    ),
  ],
);

export const callParticipants = pgTable(
  "call_participants",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id").notNull(),
    callId: uuid("call_id").notNull(),
    kind: text("kind").notNull(),
    callerId: uuid("caller_id"),
    profileId: uuid("profile_id").references(() => profiles.id, {
      onDelete: "restrict",
    }),
    providerParticipantId: text("provider_participant_id"),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "date" }),
    leftAt: timestamp("left_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    foreignKey({
      columns: [table.hospitalId, table.callId],
      foreignColumns: [calls.hospitalId, calls.id],
      name: "call_participants_call_scope_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.hospitalId, table.callerId],
      foreignColumns: [callers.hospitalId, callers.id],
      name: "call_participants_caller_scope_fk",
    }).onDelete("restrict"),
    check(
      "call_participants_time_order",
      sql`${table.leftAt} is null or ${table.joinedAt} is null or ${table.leftAt} >= ${table.joinedAt}`,
    ),
  ],
);

export const callTranscripts = pgTable(
  "call_transcripts",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id").notNull(),
    callId: uuid("call_id").notNull(),
    providerTranscriptId: text("provider_transcript_id"),
    language: text("language"),
    content: text("content").notNull(),
    isFinal: boolean("is_final").default(false).notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.hospitalId, table.callId],
      foreignColumns: [calls.hospitalId, calls.id],
      name: "call_transcripts_call_scope_fk",
    }).onDelete("cascade"),
    uniqueIndex("call_transcripts_provider_id_unique")
      .on(table.hospitalId, table.providerTranscriptId)
      .where(sql`${table.providerTranscriptId} is not null`),
  ],
);

export const callRecordings = pgTable(
  "call_recordings",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id").notNull(),
    callId: uuid("call_id").notNull(),
    status: recordingStatus("status").default("pending").notNull(),
    providerRecordingId: text("provider_recording_id"),
    storageReference: text("storage_reference"),
    durationSeconds: integer("duration_seconds"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    ...timestampColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.hospitalId, table.callId],
      foreignColumns: [calls.hospitalId, calls.id],
      name: "call_recordings_call_scope_fk",
    }).onDelete("cascade"),
    uniqueIndex("call_recordings_provider_id_unique")
      .on(table.hospitalId, table.providerRecordingId)
      .where(sql`${table.providerRecordingId} is not null`),
    check(
      "call_recordings_duration_nonnegative",
      sql`${table.durationSeconds} is null or ${table.durationSeconds} >= 0`,
    ),
  ],
);

export const callAnalyses = pgTable(
  "call_analyses",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id").notNull(),
    callId: uuid("call_id").notNull(),
    status: analysisStatus("status").default("pending").notNull(),
    providerAnalysisId: text("provider_analysis_id"),
    summary: text("summary"),
    sentiment: text("sentiment"),
    outcome: text("outcome"),
    bookingIntent: boolean("booking_intent"),
    rawSnapshot: jsonb("raw_snapshot").$type<Record<string, unknown>>(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("call_analyses_call_unique").on(table.callId),
    foreignKey({
      columns: [table.hospitalId, table.callId],
      foreignColumns: [calls.hospitalId, calls.id],
      name: "call_analyses_call_scope_fk",
    }).onDelete("cascade"),
    check(
      "call_analyses_completed_at_required",
      sql`${table.status} <> 'completed' or ${table.completedAt} is not null`,
    ),
  ],
);

export const callProviderSnapshots = pgTable(
  "call_provider_snapshots",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id").notNull(),
    callId: uuid("call_id").notNull(),
    snapshotType: text("snapshot_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.hospitalId, table.callId],
      foreignColumns: [calls.hospitalId, calls.id],
      name: "call_provider_snapshots_call_scope_fk",
    }).onDelete("cascade"),
    index("call_provider_snapshots_timeline_idx").on(
      table.callId,
      table.capturedAt,
    ),
  ],
);

export const callAppointments = pgTable(
  "call_appointments",
  {
    hospitalId: uuid("hospital_id").notNull(),
    callId: uuid("call_id").notNull(),
    appointmentId: uuid("appointment_id").notNull(),
    linkReason: text("link_reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.hospitalId, table.callId, table.appointmentId],
    }),
    foreignKey({
      columns: [table.hospitalId, table.callId],
      foreignColumns: [calls.hospitalId, calls.id],
      name: "call_appointments_call_scope_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.hospitalId, table.appointmentId],
      foreignColumns: [appointments.hospitalId, appointments.id],
      name: "call_appointments_appointment_scope_fk",
    }).onDelete("cascade"),
  ],
);

export const followUps = pgTable(
  "follow_ups",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id, { onDelete: "cascade" }),
    callId: uuid("call_id"),
    appointmentId: uuid("appointment_id"),
    reasonCode: text("reason_code").notNull(),
    priority: followUpPriority("priority").notNull(),
    status: followUpStatus("status").default("open").notNull(),
    queue: text("queue").notNull(),
    resolutionCriterion: text("resolution_criterion").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true, mode: "date" }).notNull(),
    acknowledgedAt: timestamp("acknowledged_at", {
      withTimezone: true,
      mode: "date",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
    resolutionCode: text("resolution_code"),
    resolutionNote: text("resolution_note"),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    unique("follow_ups_scope_unique").on(table.hospitalId, table.id),
    index("follow_ups_work_queue_idx").on(
      table.hospitalId,
      table.status,
      table.dueAt,
    ),
    foreignKey({
      columns: [table.hospitalId, table.callId],
      foreignColumns: [calls.hospitalId, calls.id],
      name: "follow_ups_call_scope_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.hospitalId, table.appointmentId],
      foreignColumns: [appointments.hospitalId, appointments.id],
      name: "follow_ups_appointment_scope_fk",
    }).onDelete("restrict"),
    check(
      "follow_ups_source_required",
      sql`${table.callId} is not null or ${table.appointmentId} is not null`,
    ),
    check(
      "follow_ups_resolution_fields",
      sql`${table.status} <> 'resolved' or (${table.resolvedAt} is not null and ${table.resolutionCode} is not null and ${table.resolutionNote} is not null)`,
    ),
  ],
);

export const followUpAssignments = pgTable(
  "follow_up_assignments",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id").notNull(),
    followUpId: uuid("follow_up_id").notNull(),
    kind: assignmentKind("kind").notNull(),
    membershipId: uuid("membership_id"),
    queue: text("queue"),
    assignedAt: timestamp("assigned_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    foreignKey({
      columns: [table.hospitalId, table.followUpId],
      foreignColumns: [followUps.hospitalId, followUps.id],
      name: "follow_up_assignments_follow_up_scope_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.hospitalId, table.membershipId],
      foreignColumns: [hospitalMemberships.hospitalId, hospitalMemberships.id],
      name: "follow_up_assignments_membership_scope_fk",
    }).onDelete("restrict"),
    check(
      "follow_up_assignments_target",
      sql`(${table.kind} = 'membership' and ${table.membershipId} is not null and ${table.queue} is null) or (${table.kind} = 'queue' and ${table.queue} is not null and ${table.membershipId} is null)`,
    ),
  ],
);

export const followUpActivities = pgTable(
  "follow_up_activities",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id").notNull(),
    followUpId: uuid("follow_up_id").notNull(),
    actorProfileId: uuid("actor_profile_id").references(() => profiles.id, {
      onDelete: "restrict",
    }),
    activityType: text("activity_type").notNull(),
    note: text("note"),
    evidence: jsonb("evidence").$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.hospitalId, table.followUpId],
      foreignColumns: [followUps.hospitalId, followUps.id],
      name: "follow_up_activities_follow_up_scope_fk",
    }).onDelete("cascade"),
    index("follow_up_activities_timeline_idx").on(
      table.followUpId,
      table.occurredAt,
    ),
  ],
);

export const handoffEvidence = pgTable(
  "handoff_evidence",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id").notNull(),
    callId: uuid("call_id").notNull(),
    followUpId: uuid("follow_up_id"),
    requestedAt: timestamp("requested_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "date" }),
    acceptedByMembershipId: uuid("accepted_by_membership_id"),
    providerReference: text("provider_reference"),
    evidence: jsonb("evidence").$type<Record<string, unknown>>().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.hospitalId, table.callId],
      foreignColumns: [calls.hospitalId, calls.id],
      name: "handoff_evidence_call_scope_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.hospitalId, table.followUpId],
      foreignColumns: [followUps.hospitalId, followUps.id],
      name: "handoff_evidence_follow_up_scope_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.hospitalId, table.acceptedByMembershipId],
      foreignColumns: [hospitalMemberships.hospitalId, hospitalMemberships.id],
      name: "handoff_evidence_membership_scope_fk",
    }).onDelete("restrict"),
    check(
      "handoff_evidence_acceptance_pair",
      sql`(${table.acceptedAt} is null) = (${table.acceptedByMembershipId} is null)`,
    ),
    check(
      "handoff_evidence_time_order",
      sql`${table.acceptedAt} is null or ${table.acceptedAt} >= ${table.requestedAt}`,
    ),
  ],
);

export const retellAgents = pgTable(
  "retell_agents",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id, { onDelete: "cascade" }),
    providerAgentId: text("provider_agent_id").notNull(),
    displayName: text("display_name").notNull(),
    agentType: text("agent_type").notNull(),
    voiceName: text("voice_name"),
    status: integrationStatus("status").default("draft").notNull(),
    ...timestampColumns,
  },
  (table) => [
    unique("retell_agents_scope_unique").on(table.hospitalId, table.id),
    uniqueIndex("retell_agents_provider_id_unique").on(
      table.hospitalId,
      table.providerAgentId,
    ),
  ],
);

export const retellAgentVersions = pgTable(
  "retell_agent_versions",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id").notNull(),
    agentId: uuid("agent_id").notNull(),
    providerVersion: text("provider_version").notNull(),
    responseEngineId: text("response_engine_id"),
    isPublished: boolean("is_published").default(false).notNull(),
    configurationSnapshot: jsonb("configuration_snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("retell_agent_versions_scope_unique").on(table.hospitalId, table.id),
    uniqueIndex("retell_agent_versions_provider_unique").on(
      table.agentId,
      table.providerVersion,
    ),
    foreignKey({
      columns: [table.hospitalId, table.agentId],
      foreignColumns: [retellAgents.hospitalId, retellAgents.id],
      name: "retell_agent_versions_agent_scope_fk",
    }).onDelete("cascade"),
  ],
);

export const retellPhoneNumbers = pgTable(
  "retell_phone_numbers",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id").notNull(),
    providerPhoneNumberId: text("provider_phone_number_id").notNull(),
    phoneE164: text("phone_e164"),
    nickname: text("nickname").notNull(),
    agentVersionId: uuid("agent_version_id"),
    status: integrationStatus("status").default("draft").notNull(),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("retell_phone_numbers_provider_unique").on(
      table.hospitalId,
      table.providerPhoneNumberId,
    ),
    foreignKey({
      columns: [table.hospitalId, table.agentVersionId],
      foreignColumns: [retellAgentVersions.hospitalId, retellAgentVersions.id],
      name: "retell_phone_numbers_agent_version_scope_fk",
    }).onDelete("restrict"),
  ],
);

export const retellRoutingSnapshots = pgTable(
  "retell_routing_snapshots",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id").notNull(),
    sourceAgentVersionId: uuid("source_agent_version_id").notNull(),
    destinationAgentVersionId: uuid("destination_agent_version_id"),
    routingRule: jsonb("routing_rule")
      .$type<Record<string, unknown>>()
      .notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.hospitalId, table.sourceAgentVersionId],
      foreignColumns: [retellAgentVersions.hospitalId, retellAgentVersions.id],
      name: "retell_routing_snapshots_source_scope_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.hospitalId, table.destinationAgentVersionId],
      foreignColumns: [retellAgentVersions.hospitalId, retellAgentVersions.id],
      name: "retell_routing_snapshots_destination_scope_fk",
    }).onDelete("restrict"),
  ],
);

export const integrations = pgTable(
  "integrations",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id, { onDelete: "cascade" }),
    provider: providerKind("provider").notNull(),
    kind: text("kind").notNull(),
    externalId: text("external_id"),
    status: integrationStatus("status").default("draft").notNull(),
    safeConfiguration: jsonb("safe_configuration")
      .$type<Record<string, unknown>>()
      .notNull(),
    lastVerifiedAt: timestamp("last_verified_at", {
      withTimezone: true,
      mode: "date",
    }),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("integrations_external_id_unique")
      .on(table.hospitalId, table.provider, table.kind, table.externalId)
      .where(sql`${table.externalId} is not null`),
  ],
);

export const knowledgeSources = pgTable(
  "knowledge_sources",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id, { onDelete: "cascade" }),
    providerKnowledgeBaseId: text("provider_knowledge_base_id").notNull(),
    providerSourceId: text("provider_source_id").notNull(),
    name: text("name").notNull(),
    sourceType: text("source_type").default("text").notNull(),
    content: text("content"),
    status: integrationStatus("status").default("draft").notNull(),
    checksum: text("checksum"),
    processedAt: timestamp("processed_at", {
      withTimezone: true,
      mode: "date",
    }),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("knowledge_sources_provider_unique").on(
      table.hospitalId,
      table.providerSourceId,
    ),
  ],
);

export const providerEvents = pgTable(
  "provider_events",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id, { onDelete: "restrict" }),
    provider: providerKind("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    eventType: text("event_type").notNull(),
    callId: uuid("call_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    payloadHash: text("payload_hash").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    processingStatus: eventProcessingStatus("processing_status")
      .default("received")
      .notNull(),
    processedAt: timestamp("processed_at", {
      withTimezone: true,
      mode: "date",
    }),
    safeError: text("safe_error"),
  },
  (table) => [
    uniqueIndex("provider_events_dedup_unique").on(
      table.hospitalId,
      table.provider,
      table.providerEventId,
    ),
    index("provider_events_replay_idx").on(
      table.hospitalId,
      table.processingStatus,
      table.receivedAt,
    ),
    foreignKey({
      columns: [table.hospitalId, table.callId],
      foreignColumns: [calls.hospitalId, calls.id],
      name: "provider_events_call_scope_fk",
    }).onDelete("restrict"),
  ],
);

export const idempotencyRecords = pgTable(
  "idempotency_records",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id, { onDelete: "restrict" }),
    operation: idempotencyOperation("operation").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    patientId: uuid("patient_id"),
    sessionId: uuid("session_id"),
    status: idempotencyStatus("status").default("processing").notNull(),
    responseStatus: integer("response_status"),
    responseBody: jsonb("response_body").$type<Record<string, unknown>>(),
    resourceType: text("resource_type"),
    resourceId: uuid("resource_id"),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("idempotency_records_key_unique").on(
      table.hospitalId,
      table.operation,
      table.idempotencyKey,
    ),
    index("idempotency_records_expiry_idx").on(table.expiresAt),
    foreignKey({
      columns: [table.hospitalId, table.patientId],
      foreignColumns: [patients.hospitalId, patients.id],
      name: "idempotency_records_patient_scope_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.hospitalId, table.sessionId],
      foreignColumns: [sessions.hospitalId, sessions.id],
      name: "idempotency_records_session_scope_fk",
    }).onDelete("restrict"),
    check(
      "idempotency_records_response_pair",
      sql`(${table.responseStatus} is null) = (${table.responseBody} is null)`,
    ),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    ...identityColumns,
    hospitalId: uuid("hospital_id").references(() => hospitals.id, {
      onDelete: "restrict",
    }),
    actorKind: actorKind("actor_kind").notNull(),
    actorProfileId: uuid("actor_profile_id").references(() => profiles.id, {
      onDelete: "restrict",
    }),
    actorProviderId: text("actor_provider_id"),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    result: auditResult("result").notNull(),
    reason: text("reason"),
    requestId: text("request_id"),
    safeBefore: jsonb("safe_before").$type<Record<string, unknown>>(),
    safeAfter: jsonb("safe_after").$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_events_target_idx").on(
      table.hospitalId,
      table.targetType,
      table.targetId,
      table.occurredAt,
    ),
    index("audit_events_actor_idx").on(table.actorProfileId, table.occurredAt),
    check(
      "audit_events_actor_identity",
      sql`(${table.actorKind} = 'profile' and ${table.actorProfileId} is not null and ${table.actorProviderId} is null) or (${table.actorKind} = 'provider' and ${table.actorProfileId} is null and ${table.actorProviderId} is not null) or (${table.actorKind} = 'system' and ${table.actorProfileId} is null)`,
    ),
  ],
);
