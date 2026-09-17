import { redirect } from "next/navigation";

import { getDashboardContext } from "@/modules/authentication/service";
import { roleLabels } from "@/modules/authentication";
import { isAuthError } from "@/modules/authentication/errors";
import { signOutAction } from "@/modules/authentication/login-actions";
import { AppShell } from "@/shared/ui/layout/app-shell";

export default async function DashboardPage() {
  let context;
  try {
    context = await getDashboardContext();
  } catch (error) {
    if (isAuthError(error) && error.status === 401) redirect("/login");
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
          <h1 className="text-xl font-semibold">Access unavailable</h1>
          <p className="mt-2 text-sm">
            Your account is not provisioned for this application.
          </p>
        </section>
      </main>
    );
  }

  const canManageUsers = context.actor.memberships.some((membership) =>
    membership.permissionCodes.has("memberships.manage"),
  );

  return (
    <AppShell current="dashboard" showUserManagement={canManageUsers}>
      <div className="space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-teal-700">Dashboard</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Welcome, {context.profile.displayName}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Your workspace is scoped to the hospitals and permissions shown
              below.
            </p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </form>
        </header>

        <section className="grid gap-5 md:grid-cols-2">
          {context.memberships.map((membership) => (
            <article
              key={membership.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm text-slate-500">Hospital access</p>
              <h2 className="mt-2 text-xl font-semibold">
                {membership.hospitalName}
              </h2>
              <p className="mt-3 inline-flex rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800">
                {roleLabels[membership.role]}
              </p>
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Permissions
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {membership.permissionCodes.size} active permissions
                </p>
              </div>
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
