import { describe, expect, it } from "vitest";

import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  ResourceNotFoundError,
} from "./errors";
import { authErrorResponse } from "./http";

import {
  evaluateAuthorization,
  type AuthorizationActor,
} from "./authorization";
import {
  defaultRolePermissions,
  assignableRoles,
  roles,
  type Permission,
  type Role,
} from "./roles";

const hospitalId = "00000000-0000-4000-8000-000000000001";
const otherHospitalId = "00000000-0000-4000-8000-000000000002";
const doctorId = "00000000-0000-4000-8000-000000000003";

function actor(
  role: Role,
  options?: { hospital?: string; permissions?: Permission[] },
): AuthorizationActor {
  const scopedHospital = options?.hospital ?? hospitalId;
  const permissionCodes = new Set(
    options?.permissions ?? defaultRolePermissions[role],
  );
  return {
    authUserId: "auth-user",
    profileId: "profile",
    memberships: [
      {
        id: "membership",
        hospitalId: scopedHospital,
        role,
        permissionCodes,
        doctorIds: new Set(role === "doctor" ? [doctorId] : []),
      },
    ],
  };
}

describe("centralized authorization", () => {
  it("keeps the six role identifiers locked", () => {
    expect(roles).toEqual([
      "reception_staff",
      "operations_manager",
      "quality_reviewer",
      "doctor",
      "hospital_admin",
      "platform_admin",
    ]);
  });

  it("keeps platform administration out of hospital role assignment", () => {
    expect(assignableRoles).not.toContain("platform_admin");
    expect(assignableRoles).toHaveLength(5);
  });

  it("allows hospital administration only with the explicit permission", () => {
    const decision = evaluateAuthorization(actor("hospital_admin"), {
      hospitalId,
      permission: "memberships.manage",
      scope: { kind: "hospital" },
    });
    expect(decision.allowed).toBe(true);
  });

  it("matches every role's permission matrix", () => {
    for (const role of roles) {
      for (const permission of [
        "calls.read",
        "transcripts.read",
        "recordings.play",
        "recordings.download",
        "patients.contact.read",
        "appointments.manage",
        "sessions.manage",
        "follow_ups.manage",
        "reports.read",
        "exports.create",
        "audits.read",
        "diagnostics.read",
        "hospital.manage",
        "memberships.manage",
      ] as Permission[]) {
        const decision = evaluateAuthorization(actor(role), {
          hospitalId,
          permission,
          scope:
            role === "doctor"
              ? { kind: "doctor", doctorId }
              : { kind: "hospital" },
        });
        expect(decision.allowed).toBe(
          defaultRolePermissions[role].includes(permission),
        );
      }
    }
  });

  it("rejects reception staff from managing users", () => {
    const decision = evaluateAuthorization(actor("reception_staff"), {
      hospitalId,
      permission: "memberships.manage",
      scope: { kind: "hospital" },
    });
    expect(decision).toEqual({ allowed: false, reason: "missing_permission" });
  });

  it("rejects quality reviewers from full patient contact data", () => {
    const decision = evaluateAuthorization(actor("quality_reviewer"), {
      hospitalId,
      permission: "patients.contact.read",
      scope: { kind: "hospital" },
    });
    expect(decision).toEqual({ allowed: false, reason: "missing_permission" });
  });

  it("limits doctors to linked doctor records", () => {
    const allowed = evaluateAuthorization(actor("doctor"), {
      hospitalId,
      permission: "calls.read",
      scope: { kind: "doctor", doctorId },
    });
    const wrongDoctor = evaluateAuthorization(actor("doctor"), {
      hospitalId,
      permission: "calls.read",
      scope: { kind: "doctor", doctorId: "other-doctor" },
    });
    const wholeHospital = evaluateAuthorization(actor("doctor"), {
      hospitalId,
      permission: "calls.read",
      scope: { kind: "hospital" },
    });
    expect(allowed.allowed).toBe(true);
    expect(wrongDoctor).toEqual({
      allowed: false,
      reason: "doctor_scope_mismatch",
    });
    expect(wholeHospital).toEqual({
      allowed: false,
      reason: "doctor_scope_required",
    });
  });

  it("requires an explicit platform membership for elevated access", () => {
    const allowed = evaluateAuthorization(
      actor("platform_admin", { permissions: ["diagnostics.read"] }),
      {
        hospitalId,
        permission: "diagnostics.read",
        scope: { kind: "hospital" },
      },
    );
    const otherHospital = evaluateAuthorization(
      actor("platform_admin", { permissions: ["diagnostics.read"] }),
      {
        hospitalId: otherHospitalId,
        permission: "diagnostics.read",
        scope: { kind: "hospital" },
      },
    );
    expect(allowed).toMatchObject({ allowed: true, elevated: true });
    expect(otherHospital).toEqual({ allowed: false, reason: "no_membership" });
  });

  it.each([
    [new AuthenticationRequiredError(), 401, "Authentication required."],
    [new AuthorizationDeniedError(), 403, "Not authorized."],
    [new ResourceNotFoundError(), 404, "Not found."],
  ] as const)("returns safe HTTP status %s", async (error, status, message) => {
    const response = authErrorResponse(error);
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ error: message });
  });
});
