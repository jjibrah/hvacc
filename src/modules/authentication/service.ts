import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/modules/database/client";
import {
  auditEvents,
  hospitalMemberships,
  hospitals,
  profiles,
} from "@/modules/database/schema";

import { evaluateAuthorization } from "./authorization";
import { requireAuthorizationActor } from "./actor";
import { AuthorizationDeniedError, ResourceNotFoundError } from "./errors";
import { assignableRoles, type Permission, type Role } from "./roles";
import { createSupabaseAdminClient } from "./supabase/admin";

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
  hospitalId: string;
  hospitalName: string;
};

export async function listHospitalUsers(
  hospitalId: string,
): Promise<UserMembershipRow[]> {
  await requireMembershipPermission(hospitalId, "memberships.manage");
  return db
    .select({
      membershipId: hospitalMemberships.id,
      profileId: profiles.id,
      displayName: profiles.displayName,
      email: profiles.email,
      profileStatus: profiles.status,
      role: hospitalMemberships.role,
      membershipStatus: hospitalMemberships.status,
      hospitalId: hospitals.id,
      hospitalName: hospitals.displayName,
    })
    .from(hospitalMemberships)
    .innerJoin(profiles, eq(profiles.id, hospitalMemberships.profileId))
    .innerJoin(hospitals, eq(hospitals.id, hospitalMemberships.hospitalId))
    .where(eq(hospitalMemberships.hospitalId, hospitalId));
}

export async function updateHospitalUserRole(input: {
  hospitalId: string;
  membershipId: string;
  role: string;
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

    await tx
      .update(hospitalMemberships)
      .set({ role: parsedRole, updatedAt: new Date() })
      .where(
        and(
          eq(hospitalMemberships.id, parsedInput.membershipId),
          eq(hospitalMemberships.hospitalId, parsedInput.hospitalId),
        ),
      );
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
  } catch {
    await admin.auth.admin.deleteUser(data.user.id);
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
