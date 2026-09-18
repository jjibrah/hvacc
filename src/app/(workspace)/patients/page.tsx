import Link from "next/link";

import { redirect } from "next/navigation";

import { isAuthError } from "@/modules/authentication/errors";
import { getDashboardContext } from "@/modules/hospital-administration/server/service";
import { listPatients } from "@/modules/patients/server/service";
import { CreatePatientForm } from "@/modules/patients/components/create-patient-form";

function date(value: Date | null) {
  return value
    ? value.toLocaleDateString("en-US", { dateStyle: "medium" })
    : "—";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let context;
  try {
    context = await getDashboardContext();
  } catch (error) {
    if (isAuthError(error) && error.status === 401) redirect("/login");
    throw error;
  }
  const membership = context.memberships.find(
    (item) =>
      item.permissionCodes.has("patients.read") ||
      item.permissionCodes.has("patients.contact.read"),
  );
  if (!membership) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h1 className="font-semibold">Patient access required</h1>
        <p className="mt-1 text-sm">
          Your account does not have permission to view patient records. Ask a
          hospital administrator to assign the patient records permission.
        </p>
      </div>
    );
  }
  const hospitalId = membership.hospitalId;
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : undefined;
  const page = Number(typeof params.page === "string" ? params.page : "1") || 1;
  const result = await listPatients({ hospitalId, search, page, pageSize: 25 });
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">Workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Patients
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Find patient context and connect appointments, calls, and
            follow-ups.
          </p>
        </div>
        <CreatePatientForm hospitalId={hospitalId} />
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <form className="flex flex-wrap gap-3" method="get">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search name, phone, email, or patient reference"
            className="min-w-72 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
          <button className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            Search
          </button>
        </form>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Patient records</h2>
            <p className="text-xs text-slate-500">
              {result.pagination.total} records
            </p>
          </div>
        </div>
        {result.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Date of birth</th>
                  <th className="px-5 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <Link
                        className="font-semibold text-teal-800 hover:underline"
                        href={`/patients/${item.id}`}
                      >
                        {item.displayName}
                      </Link>
                      <p className="text-xs text-slate-500">{item.stableKey}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {item.phoneE164 ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {item.dateOfBirth ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {date(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="font-semibold text-slate-900">
              {search ? "No patients match your search." : "No patients yet."}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Try another name, phone number, or patient reference."
                : "Patients will appear here when they are added to the hospital workflow."}
            </p>
          </div>
        )}
        {result.pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm">
            <span className="text-slate-500">
              Page {result.pagination.page} of {result.pagination.totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  className="rounded border px-3 py-1.5"
                  href={`/patients?${new URLSearchParams({ ...(search ? { search } : {}), page: String(page - 1) })}`}
                >
                  Previous
                </Link>
              )}
              {page < result.pagination.totalPages && (
                <Link
                  className="rounded border px-3 py-1.5"
                  href={`/patients?${new URLSearchParams({ ...(search ? { search } : {}), page: String(page + 1) })}`}
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
