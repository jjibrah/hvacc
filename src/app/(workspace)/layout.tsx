import { redirect } from "next/navigation";

import { isAuthError } from "@/modules/authentication/errors";
import { signOutAction } from "@/modules/authentication/login-actions";
import { getDashboardContext } from "@/modules/authentication/service";
import { getNavigationForActor } from "@/modules/dashboard/navigation";
import { AppShell } from "@/shared/ui/layout/app-shell";

export default async function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let context;
  try {
    context = await getDashboardContext();
  } catch (error) {
    if (isAuthError(error) && error.status === 401) redirect("/login");
    throw error;
  }

  const membership = context.memberships[0];

  return (
    <AppShell
      navigation={getNavigationForActor(context.actor)}
      hospitalName={membership?.hospitalName}
      userName={context.profile.displayName}
      roleLabel={membership?.role.replaceAll("_", " ")}
      signOut={
        <form action={signOutAction}>
          <button
            type="submit"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Sign out
          </button>
        </form>
      }
    >
      {children}
    </AppShell>
  );
}
