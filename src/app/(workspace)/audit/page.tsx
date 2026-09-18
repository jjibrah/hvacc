import { redirect } from "next/navigation";
import { isAuthError } from "@/modules/authentication/errors";
import {
  getUserManagementContext,
  listHospitalAuditEvents,
} from "@/modules/hospital-administration/server/service";

export default async function Page() {
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
  const events = await listHospitalAuditEvents(context.hospital.id);
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
              <th className="p-4">Action</th>
              <th className="p-4">Target</th>
              <th className="p-4">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {events.map((event) => (
              <tr key={event.id}>
                <td className="p-4 text-slate-500">
                  {event.occurredAt.toISOString()}
                </td>
                <td className="p-4 font-medium">{event.action}</td>
                <td className="p-4">{event.targetType}</td>
                <td className="p-4">{event.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!events.length ? (
          <p className="p-6 text-sm text-slate-500">No audited events yet.</p>
        ) : null}
      </section>
    </div>
  );
}
