import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthError } from "@/modules/authentication/errors";
import {
  getUserManagementContext,
  listHospitalAuditEvents,
} from "@/modules/hospital-administration/server/service";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  let context;
  try {
    context = await getUserManagementContext();
  } catch (error) {
    if (isAuthError(error) && error.status === 401) redirect("/login");
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
        Access denied.
      </div>
    );
  }
  const params = await searchParams;
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const result = await listHospitalAuditEvents(context.hospital.id, {
    page,
    pageSize: 10,
  });
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-teal-700">Administration</p>
        <h1 className="mt-1 text-3xl font-semibold">Audit log</h1>
        <p className="mt-2 text-sm text-slate-600">
          Access, role, configuration, department, doctor, and integration
          changes.
        </p>
      </header>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="p-4">Time</th>
              <th className="p-4">Who</th>
              <th className="p-4">Action</th>
              <th className="p-4">Target</th>
              <th className="p-4">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {result.events.map((event) => (
              <tr key={event.id}>
                <td className="p-4 text-slate-500">
                  {event.occurredAt.toISOString()}
                </td>
                <td className="p-4">
                  <p className="font-medium text-slate-900">
                    {event.who.displayName}
                  </p>
                  {event.who.email ? (
                    <p className="text-xs text-slate-500">{event.who.email}</p>
                  ) : null}
                </td>
                <td className="p-4 font-medium">{event.action}</td>
                <td className="p-4">{event.targetType}</td>
                <td className="p-4">{event.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!result.events.length ? (
          <p className="p-6 text-sm text-slate-500">No audited events yet.</p>
        ) : null}
      </section>
      {result.total > 0 ? (
        <nav
          aria-label="Audit log pagination"
          className="flex items-center justify-between"
        >
          <p className="text-sm text-slate-500">
            Page {result.page} of {result.totalPages} · {result.total} events
          </p>
          <div className="flex gap-2">
            <Link
              aria-disabled={result.page <= 1}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${result.page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`}
              href={`/audit?page=${Math.max(result.page - 1, 1)}`}
            >
              Previous
            </Link>
            <Link
              aria-disabled={result.page >= result.totalPages}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${result.page >= result.totalPages ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`}
              href={`/audit?page=${Math.min(result.page + 1, result.totalPages)}`}
            >
              Next
            </Link>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
