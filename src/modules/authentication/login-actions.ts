"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "./supabase/server";
import { getAuthenticatedUser } from "./actor";
import { recordAuthenticationAudit } from "./audit";

const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function signInAction(formData: FormData) {
  const parsed = loginInput.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/login?error=invalid_credentials");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/login?error=invalid_credentials");

  if (data.user?.id) {
    await recordAuthenticationAudit({
      authUserId: data.user.id,
      action: "auth.login",
    });
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  try {
    const { authUserId } = await getAuthenticatedUser();
    await recordAuthenticationAudit({ authUserId, action: "auth.logout" });
  } catch {
    // Sign-out must still complete if the audit write cannot be completed.
  }
  await supabase.auth.signOut();
  redirect("/login");
}
