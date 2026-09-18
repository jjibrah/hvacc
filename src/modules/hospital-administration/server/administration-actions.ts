"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  saveDepartment,
  saveDoctor,
  updateHospitalConfiguration,
  updateHospitalMembershipStatus,
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
