"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  saveDepartment,
  saveDoctor,
  updateHospitalConfiguration,
  updateHospitalMembershipStatus,
  linkDoctorProfile,
  setMembershipPermissionOverride,
  removeMembershipPermissionOverride,
} from "./service";

function done(path: string, message: string) {
  revalidatePath(path);
  redirect(`${path}?success=${message}`);
}
function fail(path: string, message: string): never {
  redirect(`${path}?error=${message}`);
}
function value(data: FormData, key: string) {
  const result = data.get(key);
  return result ? String(result) : "";
}
function dateValue(data: FormData, key: string) {
  const result = value(data, key);
  return result || undefined;
}
function bool(data: FormData, key: string) {
  return data.get(key) === "on";
}
function numberValue(data: FormData, key: string, fallback: number) {
  const parsed = Number(value(data, key));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function saveHospitalConfigurationAction(data: FormData) {
  try {
    await updateHospitalConfiguration({
      hospitalId: value(data, "hospitalId"),
      displayName: value(data, "displayName"),
      stableKey: value(data, "stableKey"),
      timezone: value(data, "timezone"),
      currencyCode: value(data, "currencyCode"),
      defaultLocale: value(data, "defaultLocale"),
      syntheticContactEmail: value(data, "syntheticContactEmail") || null,
      syntheticContactPhone: value(data, "syntheticContactPhone") || null,
      syntheticAddress: value(data, "syntheticAddress") || null,
      operatingHours: Object.fromEntries(
        [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ].map((day) => [
          day,
          {
            closed: bool(data, `${day}Closed`),
            open: value(data, `${day}Open`),
            close: value(data, `${day}Close`),
          },
        ]),
      ),
      appointmentPolicy: {
        defaultDurationMinutes: numberValue(data, "defaultDurationMinutes", 30),
        defaultCapacity: numberValue(data, "defaultCapacity", 1),
        minimumAdvanceMinutes: numberValue(data, "minimumAdvanceMinutes", 120),
        maximumAdvanceDays: numberValue(data, "maximumAdvanceDays", 60),
        cancellationNoticeHours: numberValue(
          data,
          "cancellationNoticeHours",
          24,
        ),
      },
      patientPolicy: {
        matchingMode: value(data, "patientMatchingMode") || "phone_or_name",
        ambiguousRequiresConfirmation: bool(
          data,
          "ambiguousRequiresConfirmation",
        ),
      },
      followUpPolicy: {
        defaultQueue: value(data, "defaultFollowUpQueue") || "reception",
        defaultPriority: value(data, "defaultFollowUpPriority") || "p3",
        escalationHours: numberValue(data, "followUpEscalationHours", 24),
      },
      voicePolicy: {
        defaultLanguage: value(data, "defaultVoiceLanguage") || "en",
        fallbackMode: value(data, "voiceFallbackMode") || "human_follow_up",
      },
      notificationPolicy: {
        appointmentRemindersEnabled: bool(data, "appointmentRemindersEnabled"),
        reminderHoursBefore: numberValue(data, "reminderHoursBefore", 24),
      },
      privacyPolicy: {
        recordingRetentionDays: numberValue(data, "recordingRetentionDays", 90),
        transcriptRetentionDays: numberValue(
          data,
          "transcriptRetentionDays",
          365,
        ),
        auditRetentionDays: numberValue(data, "auditRetentionDays", 730),
      },
      accessPolicy: {
        sessionTimeoutMinutes: numberValue(data, "sessionTimeoutMinutes", 60),
      },
      expectedUpdatedAt: dateValue(data, "expectedUpdatedAt"),
      expectedConfigurationUpdatedAt: dateValue(
        data,
        "expectedConfigurationUpdatedAt",
      ),
    });
  } catch {
    fail("/hospital-settings", "save_failed");
  }
  done("/hospital-settings", "saved");
}

export async function saveDepartmentAction(data: FormData) {
  try {
    await saveDepartment({
      hospitalId: value(data, "hospitalId"),
      id: dateValue(data, "id"),
      code: value(data, "code"),
      name: value(data, "name"),
      expectedUpdatedAt: dateValue(data, "expectedUpdatedAt"),
    });
  } catch {
    fail("/departments", "save_failed");
  }
  done("/departments", "saved");
}

export async function saveDoctorAction(data: FormData) {
  try {
    await saveDoctor({
      hospitalId: value(data, "hospitalId"),
      id: dateValue(data, "id"),
      departmentId: value(data, "departmentId"),
      stableKey: value(data, "stableKey"),
      displayName: value(data, "displayName"),
      expectedUpdatedAt: dateValue(data, "expectedUpdatedAt"),
    });
  } catch {
    fail("/doctors", "save_failed");
  }
  done("/doctors", "saved");
}

export async function updateMembershipStatusAction(data: FormData) {
  try {
    await updateHospitalMembershipStatus({
      hospitalId: value(data, "hospitalId"),
      membershipId: value(data, "membershipId"),
      status: value(data, "status") as "active" | "disabled",
      expectedUpdatedAt: dateValue(data, "expectedUpdatedAt"),
    });
  } catch {
    fail("/admin/users", "membership_update_failed");
  }
  done("/admin/users", "membership_updated");
}

export async function linkDoctorProfileAction(data: FormData) {
  try {
    await linkDoctorProfile({
      hospitalId: value(data, "hospitalId"),
      membershipId: value(data, "membershipId"),
      doctorId: value(data, "doctorId"),
    });
  } catch {
    fail(`/admin/users/${value(data, "membershipId")}`, "doctor_link_failed");
  }
  done(`/admin/users/${value(data, "membershipId")}`, "doctor_linked");
}

export async function setPermissionOverrideAction(data: FormData) {
  const membershipId = value(data, "membershipId");
  try {
    await setMembershipPermissionOverride({
      hospitalId: value(data, "hospitalId"),
      membershipId,
      permissionCode: value(data, "permissionCode"),
      granted: value(data, "granted") === "true",
      reason: value(data, "reason") || "Administrative access review",
    });
  } catch {
    fail(`/admin/users/${membershipId}`, "permission_update_failed");
  }
  done(`/admin/users/${membershipId}`, "permission_updated");
}

export async function removePermissionOverrideAction(data: FormData) {
  const membershipId = value(data, "membershipId");
  try {
    await removeMembershipPermissionOverride({
      hospitalId: value(data, "hospitalId"),
      membershipId,
      permissionCode: value(data, "permissionCode"),
    });
  } catch {
    fail(`/admin/users/${membershipId}`, "permission_update_failed");
  }
  done(`/admin/users/${membershipId}`, "permission_updated");
}
