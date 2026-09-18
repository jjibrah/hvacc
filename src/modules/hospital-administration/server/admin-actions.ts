"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { inviteHospitalUser, updateHospitalUserRole } from "./service";

function redirectWithError(message: string): never {
  redirect(`/admin/users?error=${encodeURIComponent(message)}`);
}

export async function updateRoleAction(formData: FormData) {
  try {
    await updateHospitalUserRole({
      hospitalId: String(formData.get("hospitalId") ?? ""),
      membershipId: String(formData.get("membershipId") ?? ""),
      role: String(formData.get("role") ?? ""),
      expectedUpdatedAt: String(formData.get("expectedUpdatedAt") ?? "") || undefined,
    });
  } catch (error) {
    if (error instanceof Error && "status" in error && error.status === 401) {
      redirect("/login");
    }
    if (error instanceof Error && "status" in error && error.status === 404) {
      redirectWithError("not_found");
    }
    redirectWithError("role_update_failed");
  }
  revalidatePath("/admin/users");
  redirect("/admin/users?success=role_updated");
}

export async function inviteUserAction(formData: FormData) {
  try {
    await inviteHospitalUser({
      hospitalId: String(formData.get("hospitalId") ?? ""),
      email: String(formData.get("email") ?? ""),
      displayName: String(formData.get("displayName") ?? ""),
      role: String(formData.get("role") ?? ""),
    });
  } catch (error) {
    if (error instanceof Error && "status" in error && error.status === 401) {
      redirect("/login");
    }
    redirectWithError("invitation_failed");
  }
  revalidatePath("/admin/users");
  redirect("/admin/users?success=invited");
}
