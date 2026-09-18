import "server-only";

import { randomUUID } from "node:crypto";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/modules/database/client";
import {
  auditEvents,
  departments,
  doctors,
  hospitalConfigurations,
  hospitalMemberships,
  membershipPermissions,
  hospitals,
  profiles,
  rolePermissions,
  doctorProfileLinks,
  retellAgents,
  retellAgentVersions,
  retellPhoneNumbers,
  integrations,
  knowledgeSources,
} from "@/modules/database/schema";

import { evaluateAuthorization } from "@/modules/authentication/authorization";
import { requireAuthorizationActor } from "@/modules/authentication/actor";
import {
  AuthorizationDeniedError,
  ConcurrentModificationError,
  DuplicateResourceError,
  ResourceNotFoundError,
} from "@/modules/authentication/errors";
import {
  assignableRoles,
  type Permission,
  type Role,
} from "@/modules/authentication/roles";
import { createSupabaseAdminClient } from "@/modules/authentication/supabase/admin";

export const membershipRoleInput = z.enum(assignableRoles);
export const inviteUserInput = z.object({
  hospitalId: z.string().uuid(),
  email: z.string().email().max(320),
  displayName: z.string().trim().min(1).max(120),
  role: membershipRoleInput,
});
export const updateRoleInput = z.object({
  hospitalId: z.string().uuid(),
  membershipId: z.string().uuid(),
  role: z.string(),
  expectedUpdatedAt: z.coerce.date().optional(),
});

const hospitalConfigInput = z.object({
  hospitalId: z.string().uuid(),
  displayName: z.string().trim().min(2).max(160),
  stableKey: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  timezone: z.string().min(1).max(80),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  defaultLocale: z.string().trim().min(2).max(20),
  syntheticContactEmail: z.string().email().max(320).nullable(),
  syntheticContactPhone: z
    .string()
    .regex(/^\+[1-9][0-9]{7,14}$/)
    .nullable(),
  syntheticAddress: z.string().trim().max(500).nullable(),
  expectedUpdatedAt: z.coerce.date().optional(),
  expectedConfigurationUpdatedAt: z.coerce.date().optional(),
  operatingHours: z.record(z.string(), z.unknown()).optional(),
  appointmentPolicy: z.record(z.string(), z.unknown()).optional(),
  patientPolicy: z.record(z.string(), z.unknown()).optional(),
  followUpPolicy: z.record(z.string(), z.unknown()).optional(),
  voicePolicy: z.record(z.string(), z.unknown()).optional(),
  notificationPolicy: z.record(z.string(), z.unknown()).optional(),
  privacyPolicy: z.record(z.string(), z.unknown()).optional(),
  accessPolicy: z.record(z.string(), z.unknown()).optional(),
});
const departmentInput = z.object({
  hospitalId: z.string().uuid(),
  id: z.string().uuid().optional(),
  code: z
    .string()
    .trim()
    .regex(/^[A-Z0-9-]{2,24}$/),
  name: z.string().trim().min(2).max(120),
  expectedUpdatedAt: z.coerce.date().optional(),
});
const doctorInput = z.object({
  hospitalId: z.string().uuid(),
  id: z.string().uuid().optional(),
  departmentId: z.string().uuid(),
  stableKey: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  displayName: z.string().trim().min(2).max(120),
  expectedUpdatedAt: z.coerce.date().optional(),
});

async function writeAudit(input: {
  hospitalId: string;
  actorProfileId: string;
  action: string;
  targetType: string;
  targetId?: string;
  result: "succeeded" | "denied" | "failed";
  reason?: string;
  safeBefore?: Record<string, unknown>;
  safeAfter?: Record<string, unknown>;
}) {
  await db.insert(auditEvents).values({
    hospitalId: input.hospitalId,
    actorKind: "profile",
    actorProfileId: input.actorProfileId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    result: input.result,
    reason: input.reason,
    safeBefore: input.safeBefore,
    safeAfter: input.safeAfter,
  });
}

async function requireMembershipPermission(
  hospitalId: string,
  permission: Permission,
  scope: "hospital" | "membership" = "hospital",
) {
  const actor = await requireAuthorizationActor();
  const decision = evaluateAuthorization(actor, {
    hospitalId,
    permission,
    scope:
      scope === "hospital"
        ? { kind: "hospital" }
        : { kind: "membership", membershipId: "target" },
  });

  if (!decision.allowed) {
    const actorMembership = actor.memberships.find(
      ({ hospitalId: id }) => id === hospitalId,
    );
    if (actorMembership) {
      await writeAudit({
        hospitalId,
        actorProfileId: actor.profileId,
        action: `authorization.${permission}`,
        targetType: "authorization",
        result: "denied",
        reason: decision.reason,
      });
    }
    throw new AuthorizationDeniedError();
  }

  if (decision.elevated) {
    await writeAudit({
      hospitalId,
      actorProfileId: actor.profileId,
      action: `authorization.${permission}`,
      targetType: "authorization",
      result: "succeeded",
      reason: "platform_admin_elevated_access",
    });
  }

  return { actor, membership: decision.membership };
}

export type UserMembershipRow = {
  membershipId: string;
  profileId: string;
  displayName: string;
  email: string;
  profileStatus: "active" | "disabled";
  role: Role;
  membershipStatus: "active" | "disabled";
  updatedAt: Date;
  hospitalId: string;
  hospitalName: string;
  hasCustomPermissions: boolean;
};

export async function listHospitalUsers(
  hospitalId: string,
  options: { search?: string; role?: string; status?: string } = {},
): Promise<UserMembershipRow[]> {
  await requireMembershipPermission(hospitalId, "memberships.manage");
  const rows = await db
    .select({
      membershipId: hospitalMemberships.id,
      profileId: profiles.id,
      displayName: profiles.displayName,
      email: profiles.email,
      profileStatus: profiles.status,
      role: hospitalMemberships.role,
      membershipStatus: hospitalMemberships.status,
      updatedAt: hospitalMemberships.updatedAt,
      hospitalId: hospitals.id,
      hospitalName: hospitals.displayName,
    })
    .from(hospitalMemberships)
    .innerJoin(profiles, eq(profiles.id, hospitalMemberships.profileId))
    .innerJoin(hospitals, eq(hospitals.id, hospitalMemberships.hospitalId))
    .where(
      and(
        eq(hospitalMemberships.hospitalId, hospitalId),
        options.role
          ? eq(hospitalMemberships.role, options.role as Role)
          : undefined,
        options.status
          ? eq(
              hospitalMemberships.status,
              options.status as "active" | "disabled",
            )
          : undefined,
        options.search
          ? sql`(${profiles.displayName} ilike ${`%${options.search}%`} or ${profiles.email} ilike ${`%${options.search}%`})`
          : undefined,
      ),
    )
    .orderBy(profiles.displayName);
  const overrides = rows.length
    ? await db
        .select({ membershipId: membershipPermissions.membershipId })
        .from(membershipPermissions)
        .where(
          inArray(
            membershipPermissions.membershipId,
            rows.map((row) => row.membershipId),
          ),
        )
    : [];
  const custom = new Set(overrides.map((row) => row.membershipId));
  return rows.map((row) => ({
    ...row,
    hasCustomPermissions: custom.has(row.membershipId),
  }));
}

export async function getHospitalUserDetail(
  hospitalId: string,
  membershipId: string,
) {
  await requireMembershipPermission(hospitalId, "memberships.manage");
  const user = await db
    .select({
      membershipId: hospitalMemberships.id,
      profileId: profiles.id,
      displayName: profiles.displayName,
      email: profiles.email,
      profileStatus: profiles.status,
      role: hospitalMemberships.role,
      membershipStatus: hospitalMemberships.status,
      createdAt: hospitalMemberships.createdAt,
      updatedAt: hospitalMemberships.updatedAt,
      hospitalId: hospitals.id,
      hospitalName: hospitals.displayName,
    })
    .from(hospitalMemberships)
    .innerJoin(profiles, eq(profiles.id, hospitalMemberships.profileId))
    .innerJoin(hospitals, eq(hospitals.id, hospitalMemberships.hospitalId))
    .where(
      and(
        eq(hospitalMemberships.id, membershipId),
        eq(hospitalMemberships.hospitalId, hospitalId),
      ),
    )
    .then((rows) => rows[0]);
  if (!user) throw new ResourceNotFoundError();
  const [overrides, doctorLink] = await Promise.all([
    db
      .select()
      .from(membershipPermissions)
      .where(
        and(
          eq(membershipPermissions.hospitalId, hospitalId),
          eq(membershipPermissions.membershipId, membershipId),
        ),
      ),
    db
      .select({
        doctorId: doctorProfileLinks.doctorId,
        displayName: doctors.displayName,
        departmentId: doctors.departmentId,
      })
      .from(doctorProfileLinks)
      .innerJoin(
        doctors,
        and(
          eq(doctors.id, doctorProfileLinks.doctorId),
          eq(doctors.hospitalId, doctorProfileLinks.hospitalId),
        ),
      )
      .where(
        and(
          eq(doctorProfileLinks.hospitalId, hospitalId),
          eq(doctorProfileLinks.profileId, user.profileId),
        ),
      )
      .then((rows) => rows[0] ?? null),
  ]);
  return { ...user, overrides, doctorLink };
}

export async function listRolePermissions(hospitalId: string) {
  await requireMembershipPermission(hospitalId, "memberships.manage");
  return db.select().from(rolePermissions);
}

export async function setMembershipPermissionOverride(input: unknown) {
  const parsed = z
    .object({
      hospitalId: z.string().uuid(),
      membershipId: z.string().uuid(),
      permissionCode: z.string().min(1),
      granted: z.boolean(),
      reason: z.string().trim().min(1).max(300),
    })
    .parse(input);
  const { actor } = await requireMembershipPermission(
    parsed.hospitalId,
    "memberships.manage",
  );
  const target = await db.query.hospitalMemberships.findFirst({
    where: and(
      eq(hospitalMemberships.id, parsed.membershipId),
      eq(hospitalMemberships.hospitalId, parsed.hospitalId),
    ),
  });
  if (!target) throw new ResourceNotFoundError();
  if (target.role === "platform_admin") throw new AuthorizationDeniedError();
  await db
    .insert(membershipPermissions)
    .values(parsed)
    .onConflictDoUpdate({
      target: [
        membershipPermissions.membershipId,
        membershipPermissions.permissionCode,
      ],
      set: {
        granted: parsed.granted,
        reason: parsed.reason,
        createdAt: new Date(),
      },
    });
  await writeAudit({
    hospitalId: parsed.hospitalId,
    actorProfileId: actor.profileId,
    action: parsed.granted
      ? "membership.permission_granted"
      : "membership.permission_denied",
    targetType: "hospital_membership",
    targetId: target.id,
    result: "succeeded",
    safeAfter: { permission: parsed.permissionCode, granted: parsed.granted },
  });
}

export async function removeMembershipPermissionOverride(input: unknown) {
  const parsed = z
    .object({
      hospitalId: z.string().uuid(),
      membershipId: z.string().uuid(),
      permissionCode: z.string().min(1),
    })
    .parse(input);
  const { actor } = await requireMembershipPermission(
    parsed.hospitalId,
    "memberships.manage",
  );
  await db
    .delete(membershipPermissions)
    .where(
      and(
        eq(membershipPermissions.hospitalId, parsed.hospitalId),
        eq(membershipPermissions.membershipId, parsed.membershipId),
        eq(membershipPermissions.permissionCode, parsed.permissionCode),
      ),
    );
  await writeAudit({
    hospitalId: parsed.hospitalId,
    actorProfileId: actor.profileId,
    action: "membership.permission_override_removed",
    targetType: "hospital_membership",
    targetId: parsed.membershipId,
    result: "succeeded",
    safeAfter: { permission: parsed.permissionCode },
  });
}

export async function linkDoctorProfile(input: unknown) {
  const parsed = z
    .object({
      hospitalId: z.string().uuid(),
      membershipId: z.string().uuid(),
      doctorId: z.string().uuid(),
    })
    .parse(input);
  const { actor } = await requireMembershipPermission(
    parsed.hospitalId,
    "memberships.manage",
  );
  const membership = await db.query.hospitalMemberships.findFirst({
    where: and(
      eq(hospitalMemberships.id, parsed.membershipId),
      eq(hospitalMemberships.hospitalId, parsed.hospitalId),
    ),
  });
  const doctor = await db.query.doctors.findFirst({
    where: and(
      eq(doctors.id, parsed.doctorId),
      eq(doctors.hospitalId, parsed.hospitalId),
    ),
  });
  if (!membership || !doctor) throw new ResourceNotFoundError();
  await db.insert(doctorProfileLinks).values({
    hospitalId: parsed.hospitalId,
    doctorId: parsed.doctorId,
    profileId: membership.profileId,
  });
  await writeAudit({
    hospitalId: parsed.hospitalId,
    actorProfileId: actor.profileId,
    action: "membership.doctor_profile_linked",
    targetType: "hospital_membership",
    targetId: membership.id,
    result: "succeeded",
    safeAfter: { doctorId: doctor.id },
  });
}

export async function listLinkableDoctors(hospitalId: string) {
  await requireMembershipPermission(hospitalId, "memberships.manage");
  return db
    .select({
      id: doctors.id,
      displayName: doctors.displayName,
      stableKey: doctors.stableKey,
    })
    .from(doctors)
    .where(eq(doctors.hospitalId, hospitalId))
    .orderBy(doctors.displayName);
}

export async function listPendingHospitalInvitations(hospitalId: string) {
  await requireMembershipPermission(hospitalId, "memberships.manage");
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw new Error("Pending invitations could not be loaded.");
  const authUsers = data.users.filter(
    (user) => user.invited_at && !user.last_sign_in_at,
  );
  if (!authUsers.length) return [];
  const rows = await db
    .select({
      email: profiles.email,
      displayName: profiles.displayName,
      role: hospitalMemberships.role,
      membershipStatus: hospitalMemberships.status,
    })
    .from(hospitalMemberships)
    .innerJoin(profiles, eq(profiles.id, hospitalMemberships.profileId))
    .where(eq(hospitalMemberships.hospitalId, hospitalId));
  const byEmail = new Map(rows.map((row) => [row.email.toLowerCase(), row]));
  return authUsers.flatMap((user) => {
    const row = byEmail.get((user.email ?? "").toLowerCase());
    return row
      ? [
          {
            email: row.email,
            displayName: row.displayName,
            role: row.role,
            invitedAt: user.invited_at,
            status: row.membershipStatus,
          },
        ]
      : [];
  });
}

export async function updateHospitalUserRole(input: {
  hospitalId: string;
  membershipId: string;
  role: string;
  expectedUpdatedAt?: Date | string;
}) {
  const parsedInput = updateRoleInput.parse(input);
  const parsedRole = membershipRoleInput.parse(parsedInput.role);
  const { actor } = await requireMembershipPermission(
    parsedInput.hospitalId,
    "memberships.manage",
    "membership",
  );
  const target = await db.query.hospitalMemberships.findFirst({
    where: and(
      eq(hospitalMemberships.id, parsedInput.membershipId),
      eq(hospitalMemberships.hospitalId, parsedInput.hospitalId),
    ),
  });
  if (!target) throw new ResourceNotFoundError();
  if (target.role === "platform_admin") throw new AuthorizationDeniedError();

  await db.transaction(async (tx) => {
    if (target.role === "hospital_admin" && parsedRole !== "hospital_admin") {
      const lockedAdmins = await tx.execute<{ id: string }>(sql`
        select id
        from hospital_memberships
        where hospital_id = ${parsedInput.hospitalId}
          and role = 'hospital_admin'
          and status = 'active'
        for update
      `);
      if (lockedAdmins.length <= 1) throw new AuthorizationDeniedError();
    }

    const updated = await tx
      .update(hospitalMemberships)
      .set({ role: parsedRole, updatedAt: new Date() })
      .where(
        and(
          eq(hospitalMemberships.id, parsedInput.membershipId),
          eq(hospitalMemberships.hospitalId, parsedInput.hospitalId),
          ...(parsedInput.expectedUpdatedAt
            ? [eq(hospitalMemberships.updatedAt, parsedInput.expectedUpdatedAt)]
            : []),
        ),
      )
      .returning({ id: hospitalMemberships.id });
    if (updated.length === 0) throw new ConcurrentModificationError();
  });
  await writeAudit({
    hospitalId: parsedInput.hospitalId,
    actorProfileId: actor.profileId,
    action: "membership.role_updated",
    targetType: "hospital_membership",
    targetId: target.id,
    result: "succeeded",
    safeBefore: { role: target.role },
    safeAfter: { role: parsedRole },
  });
}

export async function updateHospitalMembershipStatus(input: {
  hospitalId: string;
  membershipId: string;
  status: "active" | "disabled";
  expectedUpdatedAt?: Date | string;
}) {
  const parsed = z
    .object({
      hospitalId: z.string().uuid(),
      membershipId: z.string().uuid(),
      status: z.enum(["active", "disabled"]),
      expectedUpdatedAt: z.coerce.date().optional(),
    })
    .parse(input);
  const { actor } = await requireMembershipPermission(
    parsed.hospitalId,
    "memberships.manage",
  );
  const target = await db.query.hospitalMemberships.findFirst({
    where: and(
      eq(hospitalMemberships.id, parsed.membershipId),
      eq(hospitalMemberships.hospitalId, parsed.hospitalId),
    ),
  });
  if (!target) throw new ResourceNotFoundError();
  await db.transaction(async (tx) => {
    if (
      target.role === "hospital_admin" &&
      target.status === "active" &&
      parsed.status === "disabled"
    ) {
      const admins = await tx.execute<{ id: string }>(
        sql`select id from hospital_memberships where hospital_id = ${parsed.hospitalId} and role = 'hospital_admin' and status = 'active' for update`,
      );
      if (admins.length <= 1) throw new AuthorizationDeniedError();
    }
    const updated = await tx
      .update(hospitalMemberships)
      .set({ status: parsed.status, updatedAt: new Date() })
      .where(
        and(
          eq(hospitalMemberships.id, parsed.membershipId),
          eq(hospitalMemberships.hospitalId, parsed.hospitalId),
          ...(parsed.expectedUpdatedAt
            ? [eq(hospitalMemberships.updatedAt, parsed.expectedUpdatedAt)]
            : []),
        ),
      )
      .returning({ id: hospitalMemberships.id });
    if (!updated.length) throw new ConcurrentModificationError();
  });
  await writeAudit({
    hospitalId: parsed.hospitalId,
    actorProfileId: actor.profileId,
    action: "membership.status_updated",
    targetType: "hospital_membership",
    targetId: target.id,
    result: "succeeded",
    safeBefore: { status: target.status },
    safeAfter: { status: parsed.status },
  });
}

export async function getHospitalAdministration(hospitalId: string) {
  await requireMembershipPermission(hospitalId, "hospital.manage");
  const [
    hospital,
    configuration,
    departmentRows,
    doctorRows,
    agentRows,
    versionRows,
    phoneRows,
    integrationRows,
    sourceRows,
  ] = await Promise.all([
    db.query.hospitals.findFirst({ where: eq(hospitals.id, hospitalId) }),
    db.query.hospitalConfigurations.findFirst({
      where: eq(hospitalConfigurations.hospitalId, hospitalId),
    }),
    db.select().from(departments).where(eq(departments.hospitalId, hospitalId)),
    db.select().from(doctors).where(eq(doctors.hospitalId, hospitalId)),
    db
      .select()
      .from(retellAgents)
      .where(eq(retellAgents.hospitalId, hospitalId)),
    db
      .select()
      .from(retellAgentVersions)
      .where(eq(retellAgentVersions.hospitalId, hospitalId)),
    db
      .select()
      .from(retellPhoneNumbers)
      .where(eq(retellPhoneNumbers.hospitalId, hospitalId)),
    db
      .select()
      .from(integrations)
      .where(eq(integrations.hospitalId, hospitalId)),
    db
      .select()
      .from(knowledgeSources)
      .where(eq(knowledgeSources.hospitalId, hospitalId)),
  ]);
  if (!hospital) throw new ResourceNotFoundError();
  return {
    hospital,
    configuration,
    departments: departmentRows,
    doctors: doctorRows,
    agents: agentRows,
    versions: versionRows,
    phoneNumbers: phoneRows,
    integrations: integrationRows,
    knowledgeSources: sourceRows,
  };
}

export async function updateHospitalConfiguration(input: unknown) {
  const parsed = hospitalConfigInput.parse(input);
  const { actor } = await requireMembershipPermission(
    parsed.hospitalId,
    "hospital.manage",
  );
  const before = await db.query.hospitals.findFirst({
    where: eq(hospitals.id, parsed.hospitalId),
  });
  const config = await db.query.hospitalConfigurations.findFirst({
    where: eq(hospitalConfigurations.hospitalId, parsed.hospitalId),
  });
  if (!before || !config) throw new ResourceNotFoundError();
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(hospitals)
      .set({
        displayName: parsed.displayName,
        stableKey: parsed.stableKey,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(hospitals.id, parsed.hospitalId),
          ...(parsed.expectedUpdatedAt
            ? [eq(hospitals.updatedAt, parsed.expectedUpdatedAt)]
            : []),
        ),
      )
      .returning({ id: hospitals.id });
    if (!updated.length) throw new ConcurrentModificationError();
    const updatedConfiguration = await tx
      .update(hospitalConfigurations)
      .set({
        timezone: parsed.timezone,
        currencyCode: parsed.currencyCode,
        defaultLocale: parsed.defaultLocale,
        syntheticContactEmail: parsed.syntheticContactEmail,
        syntheticContactPhone: parsed.syntheticContactPhone,
        syntheticAddress: parsed.syntheticAddress,
        updatedAt: new Date(),
        ...(parsed.operatingHours
          ? { operatingHours: parsed.operatingHours }
          : {}),
        ...(parsed.appointmentPolicy
          ? { appointmentPolicy: parsed.appointmentPolicy }
          : {}),
        ...(parsed.patientPolicy
          ? { patientPolicy: parsed.patientPolicy }
          : {}),
        ...(parsed.followUpPolicy
          ? { followUpPolicy: parsed.followUpPolicy }
          : {}),
        ...(parsed.voicePolicy ? { voicePolicy: parsed.voicePolicy } : {}),
        ...(parsed.notificationPolicy
          ? { notificationPolicy: parsed.notificationPolicy }
          : {}),
        ...(parsed.privacyPolicy
          ? { privacyPolicy: parsed.privacyPolicy }
          : {}),
        ...(parsed.accessPolicy ? { accessPolicy: parsed.accessPolicy } : {}),
      })
      .where(
        and(
          eq(hospitalConfigurations.id, config.id),
          ...(parsed.expectedConfigurationUpdatedAt
            ? [
                eq(
                  hospitalConfigurations.updatedAt,
                  parsed.expectedConfigurationUpdatedAt,
                ),
              ]
            : []),
        ),
      )
      .returning({ id: hospitalConfigurations.id });
    if (!updatedConfiguration.length) throw new ConcurrentModificationError();
  });
  await writeAudit({
    hospitalId: parsed.hospitalId,
    actorProfileId: actor.profileId,
    action: "hospital.configuration_updated",
    targetType: "hospital",
    targetId: parsed.hospitalId,
    result: "succeeded",
    safeBefore: {
      displayName: before.displayName,
      stableKey: before.stableKey,
      timezone: config.timezone,
      currencyCode: config.currencyCode,
      operatingHours: config.operatingHours,
      appointmentPolicy: config.appointmentPolicy,
      patientPolicy: config.patientPolicy,
      followUpPolicy: config.followUpPolicy,
      voicePolicy: config.voicePolicy,
      notificationPolicy: config.notificationPolicy,
      privacyPolicy: config.privacyPolicy,
      accessPolicy: config.accessPolicy,
    },
    safeAfter: {
      displayName: parsed.displayName,
      stableKey: parsed.stableKey,
      timezone: parsed.timezone,
      currencyCode: parsed.currencyCode,
      operatingHours: parsed.operatingHours,
      appointmentPolicy: parsed.appointmentPolicy,
      patientPolicy: parsed.patientPolicy,
      followUpPolicy: parsed.followUpPolicy,
      voicePolicy: parsed.voicePolicy,
      notificationPolicy: parsed.notificationPolicy,
      privacyPolicy: parsed.privacyPolicy,
      accessPolicy: parsed.accessPolicy,
    },
  });
}

export async function listHospitalAuditEvents(
  hospitalId: string,
  options: { page?: number; pageSize?: number } = {},
) {
  await requireMembershipPermission(hospitalId, "audits.read");
  const pageSize = Math.min(Math.max(options.pageSize ?? 10, 1), 10);
  const page = Math.max(Math.floor(options.page ?? 1), 1);
  const where = eq(auditEvents.hospitalId, hospitalId);
  const [events, countRows] = await Promise.all([
    db
      .select({
        event: auditEvents,
        actorDisplayName: profiles.displayName,
        actorEmail: profiles.email,
      })
      .from(auditEvents)
      .leftJoin(profiles, eq(profiles.id, auditEvents.actorProfileId))
      .where(where)
      .orderBy(desc(auditEvents.occurredAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(auditEvents)
      .where(where),
  ]);
  const total = Number(countRows[0]?.total ?? 0);
  return {
    events: events.map(({ event, actorDisplayName, actorEmail }) => ({
      ...event,
      who:
        actorDisplayName || actorEmail
          ? { displayName: actorDisplayName, email: actorEmail }
          : event.actorKind === "provider"
            ? { displayName: event.actorProviderId ?? "Provider", email: null }
            : { displayName: "System", email: null },
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  };
}

export async function saveDepartment(input: unknown) {
  const parsed = departmentInput.parse(input);
  const { actor } = await requireMembershipPermission(
    parsed.hospitalId,
    "hospital.manage",
  );
  const now = new Date();
  if (parsed.id) {
    const current = await db.query.departments.findFirst({
      where: and(
        eq(departments.id, parsed.id),
        eq(departments.hospitalId, parsed.hospitalId),
      ),
    });
    if (!current) throw new ResourceNotFoundError();
    const updated = await db
      .update(departments)
      .set({ code: parsed.code, name: parsed.name, updatedAt: now })
      .where(
        and(
          eq(departments.id, parsed.id),
          eq(departments.hospitalId, parsed.hospitalId),
          ...(parsed.expectedUpdatedAt
            ? [eq(departments.updatedAt, parsed.expectedUpdatedAt)]
            : []),
        ),
      )
      .returning({ id: departments.id });
    if (!updated.length) throw new ConcurrentModificationError();
    await writeAudit({
      hospitalId: parsed.hospitalId,
      actorProfileId: actor.profileId,
      action: "department.updated",
      targetType: "department",
      targetId: parsed.id,
      result: "succeeded",
      safeBefore: { code: current.code, name: current.name },
      safeAfter: { code: parsed.code, name: parsed.name },
    });
    return parsed.id;
  }
  const [created] = await db
    .insert(departments)
    .values({
      hospitalId: parsed.hospitalId,
      code: parsed.code,
      name: parsed.name,
    })
    .returning({ id: departments.id });
  if (!created) throw new Error("Department could not be created.");
  await writeAudit({
    hospitalId: parsed.hospitalId,
    actorProfileId: actor.profileId,
    action: "department.created",
    targetType: "department",
    targetId: created.id,
    result: "succeeded",
    safeAfter: { code: parsed.code, name: parsed.name },
  });
  return created.id;
}

export async function saveDoctor(input: unknown) {
  const parsed = doctorInput.parse(input);
  const { actor } = await requireMembershipPermission(
    parsed.hospitalId,
    "hospital.manage",
  );
  const dept = await db.query.departments.findFirst({
    where: and(
      eq(departments.id, parsed.departmentId),
      eq(departments.hospitalId, parsed.hospitalId),
      eq(departments.status, "active"),
    ),
  });
  if (!dept) throw new ResourceNotFoundError();
  if (parsed.id) {
    const current = await db.query.doctors.findFirst({
      where: and(
        eq(doctors.id, parsed.id),
        eq(doctors.hospitalId, parsed.hospitalId),
      ),
    });
    if (!current) throw new ResourceNotFoundError();
    const updated = await db
      .update(doctors)
      .set({
        departmentId: parsed.departmentId,
        stableKey: parsed.stableKey,
        displayName: parsed.displayName,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(doctors.id, parsed.id),
          eq(doctors.hospitalId, parsed.hospitalId),
          ...(parsed.expectedUpdatedAt
            ? [eq(doctors.updatedAt, parsed.expectedUpdatedAt)]
            : []),
        ),
      )
      .returning({ id: doctors.id });
    if (!updated.length) throw new ConcurrentModificationError();
    await writeAudit({
      hospitalId: parsed.hospitalId,
      actorProfileId: actor.profileId,
      action: "doctor.updated",
      targetType: "doctor",
      targetId: parsed.id,
      result: "succeeded",
      safeBefore: {
        departmentId: current.departmentId,
        displayName: current.displayName,
      },
      safeAfter: {
        departmentId: parsed.departmentId,
        displayName: parsed.displayName,
      },
    });
    return parsed.id;
  }
  const [created] = await db
    .insert(doctors)
    .values({
      hospitalId: parsed.hospitalId,
      departmentId: parsed.departmentId,
      stableKey: parsed.stableKey,
      displayName: parsed.displayName,
    })
    .returning({ id: doctors.id });
  if (!created) throw new Error("Doctor could not be created.");
  await writeAudit({
    hospitalId: parsed.hospitalId,
    actorProfileId: actor.profileId,
    action: "doctor.created",
    targetType: "doctor",
    targetId: created.id,
    result: "succeeded",
    safeAfter: {
      departmentId: parsed.departmentId,
      displayName: parsed.displayName,
    },
  });
  return created.id;
}

export async function inviteHospitalUser(input: unknown) {
  const parsed = inviteUserInput.parse(input);
  const { actor } = await requireMembershipPermission(
    parsed.hospitalId,
    "memberships.manage",
  );
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(
    parsed.email,
    {
      data: { display_name: parsed.displayName },
    },
  );
  if (error || !data.user)
    throw new Error("The user invitation could not be created.");

  try {
    await db.transaction(async (tx) => {
      const profileId = randomUUID();
      await tx.insert(profiles).values({
        id: profileId,
        authUserId: data.user.id,
        displayName: parsed.displayName,
        email: parsed.email,
      });
      await tx.insert(hospitalMemberships).values({
        hospitalId: parsed.hospitalId,
        profileId,
        role: parsed.role,
      });
    });
  } catch (error) {
    await admin.auth.admin.deleteUser(data.user.id);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new DuplicateResourceError();
    }
    throw new Error("The user invitation could not be saved.");
  }

  await writeAudit({
    hospitalId: parsed.hospitalId,
    actorProfileId: actor.profileId,
    action: "membership.user_invited",
    targetType: "profile",
    targetId: data.user.id,
    result: "succeeded",
    safeAfter: { email_domain: parsed.email.split("@")[1], role: parsed.role },
  });
}

export async function getUserManagementContext() {
  const actor = await requireAuthorizationActor();
  const accessibleHospital = actor.memberships.find(({ permissionCodes }) =>
    permissionCodes.has("memberships.manage"),
  );
  if (!accessibleHospital) throw new AuthorizationDeniedError();
  const hospital = await db.query.hospitals.findFirst({
    where: eq(hospitals.id, accessibleHospital.hospitalId),
  });
  if (!hospital) throw new ResourceNotFoundError();
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, actor.profileId),
  });
  if (!profile) throw new ResourceNotFoundError();
  return { actor, hospital, profile };
}

export async function getDashboardContext() {
  const actor = await requireAuthorizationActor();
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, actor.profileId),
  });
  if (!profile) throw new ResourceNotFoundError();

  const hospitalIds = actor.memberships.map(({ hospitalId }) => hospitalId);
  const hospitalRows = hospitalIds.length
    ? await db
        .select({ id: hospitals.id, displayName: hospitals.displayName })
        .from(hospitals)
        .where(inArray(hospitals.id, hospitalIds))
    : [];

  return {
    actor,
    profile,
    memberships: actor.memberships.map((membership) => ({
      ...membership,
      hospitalName:
        hospitalRows.find(({ id }) => id === membership.hospitalId)
          ?.displayName ?? "Hospital",
    })),
  };
}
