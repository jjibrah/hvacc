import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { isAuthError } from "@/modules/authentication/errors";
import { getDashboardContext } from "@/modules/hospital-administration/server/service";
import { getPatient } from "@/modules/patients/server/service";

function format(value: Date | null) {
  return value
    ? value.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : "—";
}

export default async function Page({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  let context;
  try {
    context = await getDashboardContext();
  } catch (error) {
    if (isAuthError(error) && error.status === 401) redirect("/login");
    throw error;
  }
  const hospitalId = context.memberships[0]?.hospitalId;
  if (!hospitalId) redirect("/login");
  const { patientId } = await params;
  let data;
  try {
    data = await getPatient(hospitalId, patientId);
  } catch (error) {
    if (isAuthError(error) && error.status === 404) notFound();
    throw error;
  }
  const activity = [
    ...data.calls.map((item) => ({
      at: item.startedAt,
      label: "Call received",
      detail: item.summary ?? item.outcome ?? item.status,
    })),
    ...data.appointments.map((item) => ({
      at: item.createdAt,
      label: "Appointment recorded",
      detail: `${item.departmentName} · ${item.status}`,
    })),
    ...data.followUps.map((item) => ({
      at: item.createdAt,
      label: "Follow-up created",
      detail: item.reasonCode.replaceAll("_", " "),
    })),
  ].sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0));
  return (
    <div className="space-y-6">
      <Link
        href="/patients"
        className="text-sm font-semibold text-teal-700 hover:underline"
      >
        ← Patients
      </Link>
      <header className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Patient record</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {data.patient.displayName}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {data.patient.stableKey} · Created{" "}
              {format(data.patient.createdAt)}
            </p>
          </div>
          <div className="text-sm text-slate-600">
            <p>{data.patient.phoneE164 ?? "Contact restricted"}</p>
            <p>
              {data.patient.dateOfBirth
                ? `DOB ${data.patient.dateOfBirth}`
                : "DOB not recorded"}
            </p>
          </div>
        </div>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Appointments", data.summary.totalAppointments],
          ["Upcoming", data.summary.upcomingAppointments],
          ["Completed", data.summary.completedAppointments],
          ["Calls", data.summary.totalCalls],
          ["Open follow-ups", data.summary.pendingFollowUps],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <p className="text-xs tracking-wide text-slate-500 uppercase">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {value}
            </p>
          </div>
        ))}
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold">Appointments</h2>
          </div>
          {data.appointments.length ? (
            <div className="divide-y divide-slate-100">
              {data.appointments.map((item) => (
                <div key={item.id} className="px-5 py-4">
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold">
                      {item.departmentName} · {item.doctorName}
                    </p>
                    <span className="text-xs text-slate-500 capitalize">
                      {item.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {format(item.startsAt)} · {item.reference} · {item.source}{" "}
                    booking
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-5 text-sm text-slate-500">
              No appointments recorded for this patient.
            </p>
          )}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold">Calls</h2>
          </div>
          {data.calls.length ? (
            <div className="divide-y divide-slate-100">
              {data.calls.map((item) => (
                <div key={item.id} className="px-5 py-4">
                  <div className="flex justify-between">
                    <Link
                      href={`/calls?callId=${item.id}`}
                      className="font-semibold text-teal-800 hover:underline"
                    >
                      {item.direction} call
                    </Link>
                    <span className="text-xs text-slate-500 capitalize">
                      {item.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {format(item.startedAt)}
                    {item.summary ? ` · ${item.summary}` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-5 text-sm text-slate-500">
              No calls recorded for this patient.
            </p>
          )}
        </section>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold">Follow-ups</h2>
          </div>
          {data.followUps.length ? (
            <div className="divide-y divide-slate-100">
              {data.followUps.map((item) => (
                <div key={item.id} className="px-5 py-4">
                  <div className="flex justify-between">
                    <p className="font-semibold capitalize">
                      {item.reasonCode.replaceAll("_", " ")}
                    </p>
                    <span className="text-xs text-slate-500 capitalize">
                      {item.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Due {format(item.dueAt)} · {item.priority.toUpperCase()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-5 text-sm text-slate-500">
              No follow-ups recorded for this patient.
            </p>
          )}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold">Recent activity</h2>
          </div>
          {activity.length ? (
            <div className="divide-y divide-slate-100">
              {activity.slice(0, 12).map((item, index) => (
                <div key={`${item.label}-${index}`} className="px-5 py-4">
                  <p className="font-semibold text-slate-800">{item.label}</p>
                  <p className="text-sm text-slate-600 capitalize">
                    {item.detail}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {format(item.at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-5 text-sm text-slate-500">
              No activity recorded for this patient.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
