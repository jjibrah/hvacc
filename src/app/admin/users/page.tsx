import { redirect } from "next/navigation";

import {
  assignableRoles,
  defaultRolePermissions,
  permissionLabels,
  roleLabels,
} from "@/modules/authentication";
import { isAuthError } from "@/modules/authentication/errors";
import {
  getUserManagementContext,
  listHospitalUsers,
} from "@/modules/authentication/service";
import {
  inviteUserAction,
  updateRoleAction,
} from "@/modules/authentication/admin-actions";
import { signOutAction } from "@/modules/authentication/login-actions";
import { AppShell } from "@/shared/ui/layout/app-shell";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  let context;
  try {
    context = await getUserManagementContext();
  } catch (error) {
    if (isAuthError(error) && error.status === 401) redirect("/login");
    return (
      <AppShell current="users" showUserManagement>
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
          <h1 className="text-2xl font-semibold">Access denied</h1>
          <p className="mt-2 text-sm">
            You do not have permission to manage hospital users.
          </p>
        </section>
      </AppShell>
    );
  }

  const users = await listHospitalUsers(context.hospital.id);
  const statusMessage =
    params.success === "invited"
      ? "Invitation sent."
      : params.success === "role_updated"
        ? "Role updated."
        : null;
  const errorMessage =
    params.error === "role_update_failed"
      ? "The role could not be updated."
      : params.error === "invitation_failed"
        ? "The invitation could not be created."
        : params.error === "not_found"
          ? "The requested membership was not found."
          : null;

  return (
    <AppShell current="users" showUserManagement>
      <div className="space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-teal-700">Administration</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Users & permissions
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Manage active membership roles for {context.hospital.displayName}.
              Every change is checked again by the server and recorded in the
              audit log.
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

        {statusMessage ? (
          <p
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            {statusMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {errorMessage}
          </p>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Invite a hospital user</h2>
          <p className="mt-1 text-sm text-slate-600">
            The invitation is sent through Supabase Auth. The role is stored
            only after the Auth user is created successfully.
          </p>
          <form
            action={inviteUserAction}
            className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_12rem_auto] md:items-end"
          >
            <input
              type="hidden"
              name="hospitalId"
              value={context.hospital.id}
            />
            <label className="text-sm font-medium">
              Name
              <input
                required
                name="displayName"
                className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Email
              <input
                required
                name="email"
                type="email"
                className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Role
              <select
                name="role"
                defaultValue="reception_staff"
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              >
                {assignableRoles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Send invite
            </button>
          </form>
          <p className="mt-4 text-xs text-slate-500">
            Platform administrator membership is intentionally not assignable
            from a hospital UI.
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-semibold">Hospital memberships</h2>
            <p className="mt-1 text-sm text-slate-600">
              {users.length} membership{users.length === 1 ? "" : "s"} in this
              hospital.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Current role</th>
                  <th className="px-6 py-3">Membership</th>
                  <th className="px-6 py-3">Change role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.membershipId}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {user.displayName}
                      </div>
                      <div className="text-slate-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
                        {roleLabels[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {user.membershipStatus}
                    </td>
                    <td className="px-6 py-4">
                      <form
                        action={updateRoleAction}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="hidden"
                          name="hospitalId"
                          value={user.hospitalId}
                        />
                        <input
                          type="hidden"
                          name="membershipId"
                          value={user.membershipId}
                        />
                        <select
                          name="role"
                          defaultValue={user.role}
                          disabled={user.role === "platform_admin"}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                        >
                          {assignableRoles.map((role) => (
                            <option key={role} value={role}>
                              {roleLabels[role]}
                            </option>
                          ))}
                          {user.role === "platform_admin" ? (
                            <option value="platform_admin">
                              {roleLabels.platform_admin}
                            </option>
                          ) : null}
                        </select>
                        <button
                          disabled={user.role === "platform_admin"}
                          type="submit"
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Role permission matrix</h2>
          <p className="mt-1 text-sm text-slate-600">
            Default permissions are enforced server-side. Membership overrides
            are intentionally audited and will be exposed in the next
            administration slice.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(defaultRolePermissions).map(
              ([role, rolePermissionList]) => (
                <article
                  key={role}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <h3 className="font-semibold">
                    {roleLabels[role as keyof typeof roleLabels]}
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {rolePermissionList.map((permission) => (
                      <li key={permission} className="flex gap-2">
                        <span className="text-teal-700">✓</span>
                        {permissionLabels[permission]}
                      </li>
                    ))}
                  </ul>
                </article>
              ),
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
