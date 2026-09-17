import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/modules/database/client";
import {
  doctorProfileLinks,
  hospitalMemberships,
  membershipPermissions,
  profiles,
  rolePermissions,
} from "@/modules/database/schema";

import type {
  AuthorizationActor,
  AuthorizationMembership,
} from "./authorization";
import { AuthenticationRequiredError } from "./errors";
import { isPermission, type Permission } from "./roles";
import { createSupabaseServerClient } from "./supabase/server";

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;

  if (error || !subject) throw new AuthenticationRequiredError();
  return { supabase, authUserId: subject };
}

export async function loadAuthorizationActor(
  authUserId: string,
): Promise<AuthorizationActor | null> {
  const profile = await db.query.profiles.findFirst({
    where: and(
      eq(profiles.authUserId, authUserId),
      eq(profiles.status, "active"),
    ),
  });
  if (!profile) return null;

  const memberships = await db
    .select()
    .from(hospitalMemberships)
    .where(
      and(
        eq(hospitalMemberships.profileId, profile.id),
        eq(hospitalMemberships.status, "active"),
      ),
    );
  if (memberships.length === 0) {
    return { authUserId, profileId: profile.id, memberships: [] };
  }

  const permissionRows = await db
    .select({
      role: rolePermissions.role,
      code: rolePermissions.permissionCode,
    })
    .from(rolePermissions)
    .where(
      inArray(
        rolePermissions.role,
        memberships.map(({ role }) => role),
      ),
    );
  const overrideRows = await db
    .select({
      membershipId: membershipPermissions.membershipId,
      code: membershipPermissions.permissionCode,
      granted: membershipPermissions.granted,
      expiresAt: membershipPermissions.expiresAt,
    })
    .from(membershipPermissions)
    .where(
      inArray(
        membershipPermissions.membershipId,
        memberships.map(({ id }) => id),
      ),
    );
  const doctorRows = await db
    .select({
      doctorId: doctorProfileLinks.doctorId,
      hospitalId: doctorProfileLinks.hospitalId,
    })
    .from(doctorProfileLinks)
    .where(eq(doctorProfileLinks.profileId, profile.id));

  const result: AuthorizationMembership[] = memberships.map((membership) => {
    const codes = new Set<Permission>();
    for (const row of permissionRows) {
      if (row.role === membership.role && isPermission(row.code))
        codes.add(row.code);
    }
    for (const row of overrideRows) {
      if (row.membershipId !== membership.id) continue;
      if (row.expiresAt && row.expiresAt <= new Date()) continue;
      if (!isPermission(row.code)) continue;
      if (row.granted) codes.add(row.code);
      else codes.delete(row.code);
    }

    return {
      id: membership.id,
      hospitalId: membership.hospitalId,
      role: membership.role,
      permissionCodes: codes,
      doctorIds: new Set(
        doctorRows
          .filter((row) => row.hospitalId === membership.hospitalId)
          .map((row) => row.doctorId),
      ),
    };
  });

  return { authUserId, profileId: profile.id, memberships: result };
}

export async function requireAuthorizationActor() {
  const { authUserId } = await getAuthenticatedUser();
  const actor = await loadAuthorizationActor(authUserId);
  if (!actor || actor.memberships.length === 0) {
    throw new AuthenticationRequiredError();
  }
  return actor;
}
