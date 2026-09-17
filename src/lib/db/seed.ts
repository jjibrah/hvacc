import "dotenv/config";

import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";

import { createDatabaseConnection } from "./connection";
import {
  appointments,
  appointmentHistory,
  callerPatientLinks,
  callers,
  callAppointments,
  callAnalyses,
  calls,
  callTranscripts,
  departments,
  doctorProfileLinks,
  doctors,
  followUpAssignments,
  followUps,
  hospitalConfigurations,
  hospitalMemberships,
  hospitals,
  knowledgeSources,
  patients,
  permissions,
  profiles,
  retellAgents,
  rolePermissions,
  schedules,
  sessions,
} from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed PostgreSQL.");
}

const { client: databaseClient, db } = createDatabaseConnection(databaseUrl);

const ids = {
  hospital: "00000000-0000-4000-8000-000000000001",
  hospitalConfiguration: "00000000-0000-4000-8000-000000000002",
  profiles: {
    reception: "00000000-0000-4001-8000-000000000001",
    operations: "00000000-0000-4001-8000-000000000002",
    quality: "00000000-0000-4001-8000-000000000003",
    doctor: "00000000-0000-4001-8000-000000000004",
    hospitalAdmin: "00000000-0000-4001-8000-000000000005",
    platformAdmin: "00000000-0000-4001-8000-000000000006",
  },
  memberships: {
    reception: "00000000-0000-4002-8000-000000000001",
    operations: "00000000-0000-4002-8000-000000000002",
    quality: "00000000-0000-4002-8000-000000000003",
    doctor: "00000000-0000-4002-8000-000000000004",
    hospitalAdmin: "00000000-0000-4002-8000-000000000005",
    platformAdmin: "00000000-0000-4002-8000-000000000006",
  },
  departments: {
    cardiology: "00000000-0000-4003-8000-000000000001",
    dermatology: "00000000-0000-4003-8000-000000000002",
    generalMedicine: "00000000-0000-4003-8000-000000000003",
  },
  doctors: {
    amir: "00000000-0000-4004-8000-000000000001",
    li: "00000000-0000-4004-8000-000000000002",
    kavitha: "00000000-0000-4004-8000-000000000003",
  },
  schedules: {
    amir: "00000000-0000-4005-8000-000000000001",
    li: "00000000-0000-4005-8000-000000000002",
    kavitha: "00000000-0000-4005-8000-000000000003",
  },
  sessions: {
    one: "00000000-0000-4006-8000-000000000001",
    two: "00000000-0000-4006-8000-000000000002",
    three: "00000000-0000-4006-8000-000000000003",
    four: "00000000-0000-4006-8000-000000000004",
  },
  callers: {
    adam: "00000000-0000-4007-8000-000000000001",
    farah: "00000000-0000-4007-8000-000000000002",
    grace: "00000000-0000-4007-8000-000000000006",
  },
  patients: {
    adam: "00000000-0000-4008-8000-000000000001",
    hana: "00000000-0000-4008-8000-000000000002",
    haziq: "00000000-0000-4008-8000-000000000003",
  },
  appointments: {
    adam: "00000000-0000-4009-8000-000000000001",
    hana: "00000000-0000-4009-8000-000000000002",
    haziq: "00000000-0000-4009-8000-000000000003",
  },
  calls: {
    success: "00000000-0000-4010-8000-000000000001",
    family: "00000000-0000-4010-8000-000000000002",
    unresolved: "00000000-0000-4010-8000-000000000006",
  },
  followUp: "00000000-0000-4011-8000-000000000001",
  followUpAssignment: "00000000-0000-4011-8000-000000000002",
  retellAgents: {
    handler: "00000000-0000-4012-8000-000000000001",
    nadia: "00000000-0000-4012-8000-000000000002",
  },
  knowledgeSource: "00000000-0000-4013-8000-000000000001",
} as const;

const seededAt = new Date("2026-09-17T04:00:00.000Z");
const hashPhone = (phone: string) =>
  createHash("sha256").update(phone).digest("hex");

const permissionRows = [
  ["calls.read", "View call metadata", false],
  ["transcripts.read", "View call transcripts", true],
  ["recordings.play", "Play recordings", true],
  ["recordings.download", "Download recordings", true],
  ["patients.contact.read", "View patient contact details", true],
  ["appointments.manage", "Create, cancel, and reschedule appointments", true],
  ["sessions.manage", "Create, close, and reopen sessions", false],
  ["follow_ups.manage", "Assign, update, and resolve follow-ups", true],
  ["reports.read", "View operational reports", false],
  ["exports.create", "Export operational data", true],
  ["audits.read", "View audit history", true],
  ["diagnostics.read", "View technical diagnostics", true],
  ["hospital.manage", "Manage hospital configuration", true],
  ["memberships.manage", "Manage hospital users and roles", true],
] as const;

const rolePermissionRows = [
  ["reception_staff", "calls.read"],
  ["reception_staff", "transcripts.read"],
  ["reception_staff", "recordings.play"],
  ["reception_staff", "appointments.manage"],
  ["reception_staff", "follow_ups.manage"],
  ["operations_manager", "calls.read"],
  ["operations_manager", "transcripts.read"],
  ["operations_manager", "recordings.play"],
  ["operations_manager", "patients.contact.read"],
  ["operations_manager", "appointments.manage"],
  ["operations_manager", "sessions.manage"],
  ["operations_manager", "follow_ups.manage"],
  ["operations_manager", "reports.read"],
  ["operations_manager", "exports.create"],
  ["operations_manager", "audits.read"],
  ["quality_reviewer", "calls.read"],
  ["quality_reviewer", "transcripts.read"],
  ["quality_reviewer", "recordings.play"],
  ["quality_reviewer", "reports.read"],
  ["doctor", "calls.read"],
  ["doctor", "transcripts.read"],
  ["doctor", "recordings.play"],
  ["hospital_admin", "calls.read"],
  ["hospital_admin", "transcripts.read"],
  ["hospital_admin", "recordings.play"],
  ["hospital_admin", "recordings.download"],
  ["hospital_admin", "patients.contact.read"],
  ["hospital_admin", "appointments.manage"],
  ["hospital_admin", "sessions.manage"],
  ["hospital_admin", "follow_ups.manage"],
  ["hospital_admin", "reports.read"],
  ["hospital_admin", "exports.create"],
  ["hospital_admin", "audits.read"],
  ["hospital_admin", "hospital.manage"],
  ["hospital_admin", "memberships.manage"],
  ["platform_admin", "diagnostics.read"],
  ["platform_admin", "audits.read"],
] as const;

async function seed() {
  await db.transaction(async (tx) => {
    await tx
      .insert(hospitals)
      .values({
        id: ids.hospital,
        stableKey: "prince-court-synthetic",
        displayName: "Prince Court Synthetic Hospital",
        createdAt: seededAt,
        updatedAt: seededAt,
      })
      .onConflictDoNothing();

    await tx
      .insert(hospitalConfigurations)
      .values({
        id: ids.hospitalConfiguration,
        hospitalId: ids.hospital,
        timezone: "Asia/Kuala_Lumpur",
        currencyCode: "MYR",
        syntheticContactEmail: "hello@prince-court.example.test",
        syntheticContactPhone: "+12025550100",
        syntheticAddress:
          "1 Synthetic Health Avenue, 50000 Kuala Lumpur, Malaysia",
        createdAt: seededAt,
        updatedAt: seededAt,
      })
      .onConflictDoNothing();

    await tx
      .insert(permissions)
      .values(
        permissionRows.map(([code, description, sensitive]) => ({
          code,
          description,
          sensitive,
        })),
      )
      .onConflictDoNothing();
    await tx
      .insert(rolePermissions)
      .values(
        rolePermissionRows.map(([role, permissionCode]) => ({
          role,
          permissionCode,
        })),
      )
      .onConflictDoNothing();

    const staff = [
      [
        "reception",
        "Aina Reception",
        "aina.reception@example.test",
        "reception_staff",
      ],
      [
        "operations",
        "Daniel Operations",
        "daniel.operations@example.test",
        "operations_manager",
      ],
      [
        "quality",
        "Mei Quality",
        "mei.quality@example.test",
        "quality_reviewer",
      ],
      ["doctor", "Dr Amir Rahman", "amir.rahman@example.test", "doctor"],
      [
        "hospitalAdmin",
        "Siti Hospital Admin",
        "siti.admin@example.test",
        "hospital_admin",
      ],
      [
        "platformAdmin",
        "Alex Platform Admin",
        "alex.platform@example.test",
        "platform_admin",
      ],
    ] as const;

    await tx
      .insert(profiles)
      .values(
        staff.map(([key, displayName, email], index) => ({
          id: ids.profiles[key],
          authUserId: `10000000-0000-4001-8000-${String(index + 1).padStart(12, "0")}`,
          displayName,
          email,
          createdAt: seededAt,
          updatedAt: seededAt,
        })),
      )
      .onConflictDoNothing();
    await tx
      .insert(hospitalMemberships)
      .values(
        staff.map(([key, , , role]) => ({
          id: ids.memberships[key],
          hospitalId: ids.hospital,
          profileId: ids.profiles[key],
          role,
          createdAt: seededAt,
          updatedAt: seededAt,
        })),
      )
      .onConflictDoNothing();

    await tx
      .insert(departments)
      .values([
        {
          id: ids.departments.cardiology,
          hospitalId: ids.hospital,
          code: "CARD",
          name: "Cardiology",
          createdAt: seededAt,
          updatedAt: seededAt,
        },
        {
          id: ids.departments.dermatology,
          hospitalId: ids.hospital,
          code: "DERM",
          name: "Dermatology",
          createdAt: seededAt,
          updatedAt: seededAt,
        },
        {
          id: ids.departments.generalMedicine,
          hospitalId: ids.hospital,
          code: "GEN",
          name: "General Medicine",
          createdAt: seededAt,
          updatedAt: seededAt,
        },
      ])
      .onConflictDoNothing();
    await tx
      .insert(doctors)
      .values([
        {
          id: ids.doctors.amir,
          hospitalId: ids.hospital,
          departmentId: ids.departments.cardiology,
          stableKey: "doc-001",
          displayName: "Dr Amir Rahman",
          createdAt: seededAt,
          updatedAt: seededAt,
        },
        {
          id: ids.doctors.li,
          hospitalId: ids.hospital,
          departmentId: ids.departments.dermatology,
          stableKey: "doc-002",
          displayName: "Dr Li Wen",
          createdAt: seededAt,
          updatedAt: seededAt,
        },
        {
          id: ids.doctors.kavitha,
          hospitalId: ids.hospital,
          departmentId: ids.departments.generalMedicine,
          stableKey: "doc-003",
          displayName: "Dr Kavitha Nair",
          createdAt: seededAt,
          updatedAt: seededAt,
        },
      ])
      .onConflictDoNothing();
    await tx
      .insert(doctorProfileLinks)
      .values({
        hospitalId: ids.hospital,
        doctorId: ids.doctors.amir,
        profileId: ids.profiles.doctor,
        createdAt: seededAt,
      })
      .onConflictDoNothing();

    await tx
      .insert(schedules)
      .values([
        {
          id: ids.schedules.amir,
          hospitalId: ids.hospital,
          doctorId: ids.doctors.amir,
          departmentId: ids.departments.cardiology,
          weekday: 1,
          localStartTime: "09:00",
          localEndTime: "12:00",
          effectiveFrom: "2026-09-21",
          defaultCapacity: 2,
          createdAt: seededAt,
          updatedAt: seededAt,
        },
        {
          id: ids.schedules.li,
          hospitalId: ids.hospital,
          doctorId: ids.doctors.li,
          departmentId: ids.departments.dermatology,
          weekday: 1,
          localStartTime: "14:00",
          localEndTime: "16:00",
          effectiveFrom: "2026-09-21",
          defaultCapacity: 1,
          createdAt: seededAt,
          updatedAt: seededAt,
        },
        {
          id: ids.schedules.kavitha,
          hospitalId: ids.hospital,
          doctorId: ids.doctors.kavitha,
          departmentId: ids.departments.generalMedicine,
          weekday: 2,
          localStartTime: "10:00",
          localEndTime: "12:00",
          effectiveFrom: "2026-09-22",
          defaultCapacity: 3,
          createdAt: seededAt,
          updatedAt: seededAt,
        },
      ])
      .onConflictDoNothing();
    await tx
      .insert(sessions)
      .values([
        {
          id: ids.sessions.one,
          hospitalId: ids.hospital,
          scheduleId: ids.schedules.amir,
          doctorId: ids.doctors.amir,
          departmentId: ids.departments.cardiology,
          startsAt: new Date("2026-09-21T01:00:00Z"),
          endsAt: new Date("2026-09-21T04:00:00Z"),
          capacity: 2,
          bookedUnits: 1,
          createdAt: seededAt,
          updatedAt: seededAt,
        },
        {
          id: ids.sessions.two,
          hospitalId: ids.hospital,
          scheduleId: ids.schedules.li,
          doctorId: ids.doctors.li,
          departmentId: ids.departments.dermatology,
          startsAt: new Date("2026-09-21T06:00:00Z"),
          endsAt: new Date("2026-09-21T08:00:00Z"),
          capacity: 1,
          createdAt: seededAt,
          updatedAt: seededAt,
        },
        {
          id: ids.sessions.three,
          hospitalId: ids.hospital,
          scheduleId: ids.schedules.kavitha,
          doctorId: ids.doctors.kavitha,
          departmentId: ids.departments.generalMedicine,
          startsAt: new Date("2026-09-22T02:00:00Z"),
          endsAt: new Date("2026-09-22T04:00:00Z"),
          capacity: 3,
          bookedUnits: 2,
          createdAt: seededAt,
          updatedAt: seededAt,
        },
        {
          id: ids.sessions.four,
          hospitalId: ids.hospital,
          scheduleId: ids.schedules.kavitha,
          doctorId: ids.doctors.kavitha,
          departmentId: ids.departments.generalMedicine,
          startsAt: new Date("2026-09-23T02:00:00Z"),
          endsAt: new Date("2026-09-23T04:00:00Z"),
          capacity: 1,
          status: "closed",
          closureReason: "Synthetic closed-session scenario",
          createdAt: seededAt,
          updatedAt: seededAt,
        },
      ])
      .onConflictDoNothing();

    const callerRows = [
      ["adam", "Adam Test", "+12025550101"],
      ["farah", "Farah Test", "+12025550102"],
      ["grace", "Grace Test", "+12025550106"],
    ] as const;
    await tx
      .insert(callers)
      .values(
        callerRows.map(([key, displayName, phoneE164]) => ({
          id: ids.callers[key],
          hospitalId: ids.hospital,
          displayName,
          phoneE164,
          phoneHash: hashPhone(phoneE164),
          createdAt: seededAt,
          updatedAt: seededAt,
        })),
      )
      .onConflictDoNothing();
    await tx
      .insert(patients)
      .values([
        {
          id: ids.patients.adam,
          hospitalId: ids.hospital,
          stableKey: "patient-adam-test",
          displayName: "Adam Test",
          phoneE164: "+12025550101",
          phoneHash: hashPhone("+12025550101"),
          createdAt: seededAt,
          updatedAt: seededAt,
        },
        {
          id: ids.patients.hana,
          hospitalId: ids.hospital,
          stableKey: "patient-hana-test",
          displayName: "Hana Test",
          createdAt: seededAt,
          updatedAt: seededAt,
        },
        {
          id: ids.patients.haziq,
          hospitalId: ids.hospital,
          stableKey: "patient-haziq-test",
          displayName: "Haziq Test",
          createdAt: seededAt,
          updatedAt: seededAt,
        },
      ])
      .onConflictDoNothing();
    await tx
      .insert(callerPatientLinks)
      .values([
        {
          hospitalId: ids.hospital,
          callerId: ids.callers.adam,
          patientId: ids.patients.adam,
          relationship: "self",
          createdAt: seededAt,
        },
        {
          hospitalId: ids.hospital,
          callerId: ids.callers.farah,
          patientId: ids.patients.hana,
          relationship: "parent",
          createdAt: seededAt,
        },
        {
          hospitalId: ids.hospital,
          callerId: ids.callers.farah,
          patientId: ids.patients.haziq,
          relationship: "parent",
          createdAt: seededAt,
        },
      ])
      .onConflictDoNothing();

    await tx
      .insert(appointments)
      .values([
        {
          id: ids.appointments.adam,
          hospitalId: ids.hospital,
          reference: "APT-SYN-001",
          sessionId: ids.sessions.one,
          patientId: ids.patients.adam,
          bookedByCallerId: ids.callers.adam,
          status: "confirmed",
          source: "voice",
          confirmedAt: new Date("2026-09-17T04:05:00Z"),
          createdAt: seededAt,
          updatedAt: seededAt,
        },
        {
          id: ids.appointments.hana,
          hospitalId: ids.hospital,
          reference: "APT-SYN-002",
          sessionId: ids.sessions.three,
          patientId: ids.patients.hana,
          bookedByCallerId: ids.callers.farah,
          status: "confirmed",
          source: "voice",
          confirmedAt: new Date("2026-09-17T04:10:00Z"),
          createdAt: seededAt,
          updatedAt: seededAt,
        },
        {
          id: ids.appointments.haziq,
          hospitalId: ids.hospital,
          reference: "APT-SYN-003",
          sessionId: ids.sessions.three,
          patientId: ids.patients.haziq,
          bookedByCallerId: ids.callers.farah,
          status: "confirmed",
          source: "voice",
          confirmedAt: new Date("2026-09-17T04:11:00Z"),
          createdAt: seededAt,
          updatedAt: seededAt,
        },
      ])
      .onConflictDoNothing();
    await tx
      .insert(appointmentHistory)
      .values(
        Object.values(ids.appointments).map((appointmentId, index) => ({
          id: `00000000-0000-4014-8000-${String(index + 1).padStart(12, "0")}`,
          hospitalId: ids.hospital,
          appointmentId,
          toStatus: "confirmed" as const,
          evidence: { source: "deterministic-seed" },
          occurredAt: new Date(
            `2026-09-17T04:${String(index + 5).padStart(2, "0")}:00Z`,
          ),
        })),
      )
      .onConflictDoNothing();

    await tx
      .insert(calls)
      .values([
        {
          id: ids.calls.success,
          hospitalId: ids.hospital,
          providerCallId: "call_synthetic_success",
          direction: "inbound",
          status: "ended",
          startedAt: new Date("2026-09-17T04:00:00Z"),
          endedAt: new Date("2026-09-17T04:06:00Z"),
          lastProviderEventAt: new Date("2026-09-17T04:06:30Z"),
          createdAt: seededAt,
          updatedAt: seededAt,
        },
        {
          id: ids.calls.family,
          hospitalId: ids.hospital,
          providerCallId: "call_synthetic_family",
          direction: "inbound",
          status: "ended",
          startedAt: new Date("2026-09-17T04:07:00Z"),
          endedAt: new Date("2026-09-17T04:12:00Z"),
          lastProviderEventAt: new Date("2026-09-17T04:12:30Z"),
          createdAt: seededAt,
          updatedAt: seededAt,
        },
        {
          id: ids.calls.unresolved,
          hospitalId: ids.hospital,
          providerCallId: "call_synthetic_unresolved",
          direction: "inbound",
          status: "ended",
          startedAt: new Date("2026-09-17T04:20:00Z"),
          endedAt: new Date("2026-09-17T04:24:00Z"),
          lastProviderEventAt: new Date("2026-09-17T04:24:30Z"),
          createdAt: seededAt,
          updatedAt: seededAt,
        },
      ])
      .onConflictDoNothing();
    await tx
      .insert(callAppointments)
      .values([
        {
          hospitalId: ids.hospital,
          callId: ids.calls.success,
          appointmentId: ids.appointments.adam,
          linkReason: "created_during_call",
          createdAt: seededAt,
        },
        {
          hospitalId: ids.hospital,
          callId: ids.calls.family,
          appointmentId: ids.appointments.hana,
          linkReason: "created_during_call",
          createdAt: seededAt,
        },
        {
          hospitalId: ids.hospital,
          callId: ids.calls.family,
          appointmentId: ids.appointments.haziq,
          linkReason: "created_during_call",
          createdAt: seededAt,
        },
      ])
      .onConflictDoNothing();
    await tx
      .insert(callTranscripts)
      .values({
        id: "00000000-0000-4015-8000-000000000001",
        hospitalId: ids.hospital,
        callId: ids.calls.success,
        language: "en",
        content:
          "Synthetic transcript: caller explicitly confirmed the fictional appointment.",
        isFinal: true,
        capturedAt: new Date("2026-09-17T04:06:30Z"),
      })
      .onConflictDoNothing();
    await tx
      .insert(callAnalyses)
      .values({
        id: "00000000-0000-4016-8000-000000000001",
        hospitalId: ids.hospital,
        callId: ids.calls.success,
        status: "completed",
        summary: "Synthetic caller booked one cardiology appointment.",
        outcome: "success",
        bookingIntent: true,
        completedAt: new Date("2026-09-17T04:07:00Z"),
        createdAt: seededAt,
        updatedAt: seededAt,
      })
      .onConflictDoNothing();

    await tx
      .insert(followUps)
      .values({
        id: ids.followUp,
        hospitalId: ids.hospital,
        callId: ids.calls.unresolved,
        reasonCode: "non_bookable_service",
        priority: "p3",
        queue: "reception",
        resolutionCriterion:
          "Caller receives a confirmed human response about the requested service.",
        dueAt: new Date("2026-09-18T04:24:00Z"),
        createdAt: seededAt,
        updatedAt: seededAt,
      })
      .onConflictDoNothing();
    await tx
      .insert(followUpAssignments)
      .values({
        id: ids.followUpAssignment,
        hospitalId: ids.hospital,
        followUpId: ids.followUp,
        kind: "queue",
        queue: "reception",
        assignedAt: seededAt,
      })
      .onConflictDoNothing();

    await tx
      .insert(retellAgents)
      .values([
        {
          id: ids.retellAgents.handler,
          hospitalId: ids.hospital,
          providerAgentId: "agent_e609a7e1b851ec6d5c031da675",
          displayName: "HVA Prince Court Call Handler Agent",
          agentType: "single_prompt",
          voiceName: "Rita",
          status: "active",
          createdAt: seededAt,
          updatedAt: seededAt,
        },
        {
          id: ids.retellAgents.nadia,
          hospitalId: ids.hospital,
          providerAgentId: "agent_4c7d93c4c4f15b702efd8962f7",
          displayName: "HVA Nadia - English",
          agentType: "single_prompt",
          voiceName: "Cimo",
          status: "active",
          createdAt: seededAt,
          updatedAt: seededAt,
        },
      ])
      .onConflictDoNothing();
    await tx
      .insert(knowledgeSources)
      .values({
        id: ids.knowledgeSource,
        hospitalId: ids.hospital,
        providerKnowledgeBaseId: "knowledge_base_62e3190652bb8cce",
        providerSourceId: "kb_source_bdf687d1e9469b10",
        name: "kb.md",
        status: "active",
        processedAt: new Date("2026-09-17T03:05:00Z"),
        createdAt: seededAt,
        updatedAt: seededAt,
      })
      .onConflictDoNothing();

    const [hospital] = await tx
      .select({ displayName: hospitals.displayName })
      .from(hospitals)
      .where(eq(hospitals.id, ids.hospital));
    if (!hospital)
      throw new Error("Deterministic hospital seed was not created.");
  });
}

seed()
  .then(async () => {
    console.log("Seeded deterministic synthetic Module 2 data.");
    await databaseClient.end();
  })
  .catch(async (error: unknown) => {
    console.error("Database seed failed.", error);
    await databaseClient.end();
    process.exitCode = 1;
  });
