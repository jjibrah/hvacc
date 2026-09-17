import type { Permission, Role } from "./roles";

export type AuthorizationScope =
  | { kind: "hospital" }
  | { kind: "doctor"; doctorId: string }
  | { kind: "membership"; membershipId: string };

export type AuthorizationMembership = {
  id: string;
  hospitalId: string;
  role: Role;
  permissionCodes: ReadonlySet<Permission>;
  doctorIds: ReadonlySet<string>;
};

export type AuthorizationActor = {
  authUserId: string;
  profileId: string;
  memberships: readonly AuthorizationMembership[];
};

export type AuthorizationRequest = {
  hospitalId: string;
  permission: Permission;
  scope: AuthorizationScope;
};

export type AuthorizationDecision =
  | {
      allowed: true;
      membership: AuthorizationMembership;
      elevated: boolean;
    }
  | {
      allowed: false;
      reason:
        | "no_membership"
        | "inactive_membership"
        | "missing_permission"
        | "doctor_scope_required"
        | "doctor_scope_mismatch";
    };

export function evaluateAuthorization(
  actor: AuthorizationActor,
  request: AuthorizationRequest,
): AuthorizationDecision {
  const memberships = actor.memberships.filter(
    (membership) => membership.hospitalId === request.hospitalId,
  );

  if (memberships.length === 0) {
    return { allowed: false, reason: "no_membership" };
  }

  for (const membership of memberships) {
    if (!membership.permissionCodes.has(request.permission)) continue;

    if (membership.role === "doctor") {
      if (request.scope.kind !== "doctor") {
        return { allowed: false, reason: "doctor_scope_required" };
      }
      if (!membership.doctorIds.has(request.scope.doctorId)) {
        continue;
      }
    }

    return {
      allowed: true,
      membership,
      elevated: membership.role === "platform_admin",
    };
  }

  if (memberships.some((membership) => membership.role === "doctor")) {
    return { allowed: false, reason: "doctor_scope_mismatch" };
  }
  return { allowed: false, reason: "missing_permission" };
}
