import Link from "next/link";
import { redirect } from "next/navigation";

import { isAuthError } from "@/modules/authentication/errors";
import { getDashboardContext } from "@/modules/hospital-administration/server/service";
import { getOverviewMetrics } from "@/modules/reports/server/service";

function metric(label: string, value: string | number, detail?: string) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
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
    console.error("[reports] context failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    if (isAuthError(error) && error.status === 401) redirect("/login");
    throw error;
  }
  const hospitalId = context.memberships[0]?.hospitalId;
  if (!hospitalId) redirect("/login");
  const params = await searchParams;
  const from =
    typeof params.from === "string"
      ? new Date(`${params.from}T00:00:00.000Z`)
      : undefined;
  const to =
    typeof params.to === "string"
      ? new Date(`${params.to}T23:59:59.999Z`)
      : undefined;
  let report;
  try {
    report = await getOverviewMetrics({ hospitalId, from, to });
  } catch (error) {
    console.error("[reports] failed to load overview", {
      hospitalId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
  const maxCalls = Math.max(1, ...report.daily.calls.map((item) => item.count));
  const maxAppointments = Math.max(
    1,
    ...report.daily.appointments.map((item) => item.count),
  );
  const query = (days: number) => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days + 1);
    return `/reports?from=${start.toISOString().slice(0, 10)}&to=${end.toISOString().slice(0, 10)}`;
  };
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-teal-700">Workspace</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-2 text-sm text-slate-600">
          Operational activity traced to real calls, appointments, and
          follow-ups.
        </p>
      </header>
      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        <span className="mr-2 text-sm font-semibold text-slate-700">
          Period
        </span>
        <Link
          href={query(1)}
          className="rounded-lg border px-3 py-2 text-sm hover:border-teal-500"
        >
          Today
        </Link>
        <Link
          href={query(7)}
          className="rounded-lg border px-3 py-2 text-sm hover:border-teal-500"
        >
          Last 7 days
        </Link>
        <Link
          href={query(30)}
          className="rounded-lg border px-3 py-2 text-sm hover:border-teal-500"
        >
          Last 30 days
        </Link>
        <form className="ml-auto flex flex-wrap gap-2" method="get">
          <input
            type="date"
            name="from"
            defaultValue={typeof params.from === "string" ? params.from : ""}
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <input
            type="date"
            name="to"
            defaultValue={typeof params.to === "string" ? params.to : ""}
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white">
            Apply
          </button>
        </form>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metric(
          "Total calls",
          report.calls.total,
          `${report.calls.completed} completed · ${report.calls.failed} failed`,
        )}
        {metric(
          "Appointments booked",
          report.appointments.booked,
          `${report.appointments.upcoming} upcoming`,
        )}
        {metric(
          "Booking conversion",
          `${report.bookings.conversionRate}%`,
          `${report.bookings.callsWithAppointment} calls produced appointments`,
        )}
        {metric(
          "Pending follow-ups",
          report.followUps.pending,
          `${report.followUps.overdue} overdue`,
        )}
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold">Call activity</h2>
              <p className="mt-1 text-xs text-slate-500">
                System-recorded calls · {report.range.timezone}
              </p>
            </div>
            <Link
              href={`/calls?status=ended`}
              className="text-sm font-semibold text-teal-700"
            >
              View calls →
            </Link>
          </div>
          <div className="mt-6 space-y-3">
            {report.daily.calls.length ? (
              report.daily.calls.map((item) => (
                <div key={item.day} className="flex items-center gap-3 text-sm">
                  <span className="w-24 text-slate-500">{item.day}</span>
                  <div className="h-6 flex-1 rounded bg-slate-100">
                    <div
                      className="h-6 rounded bg-teal-600"
                      style={{
                        width: `${Math.max(4, (item.count / maxCalls) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right font-semibold">
                    {item.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                No activity for this period.
              </p>
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold">Appointments created</h2>
              <p className="mt-1 text-xs text-slate-500">
                Operational records, not AI estimates
              </p>
            </div>
            <Link
              href="/appointments"
              className="text-sm font-semibold text-teal-700"
            >
              View appointments →
            </Link>
          </div>
          <div className="mt-6 space-y-3">
            {report.daily.appointments.length ? (
              report.daily.appointments.map((item) => (
                <div key={item.day} className="flex items-center gap-3 text-sm">
                  <span className="w-24 text-slate-500">{item.day}</span>
                  <div className="h-6 flex-1 rounded bg-slate-100">
                    <div
                      className="h-6 rounded bg-indigo-500"
                      style={{
                        width: `${Math.max(4, (item.count / maxAppointments) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right font-semibold">
                    {item.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                No activity for this period.
              </p>
            )}
          </div>
        </section>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Appointment outcomes</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {metric("Completed", report.appointments.completed)}
            {metric("Cancelled", report.appointments.cancelled)}
            {metric("No-show", report.appointments.noShow)}
            {metric(
              "Average call",
              `${Math.round(report.calls.averageDurationSeconds / 60)}m`,
              "duration",
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">AI-assessed call outcomes</h2>
              <p className="mt-1 text-xs text-slate-500">
                These are analysis labels, not verified hospital outcomes.
              </p>
            </div>
            <Link
              href="/follow-ups"
              className="text-sm font-semibold text-teal-700"
            >
              View follow-ups →
            </Link>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {report.outcomes.length ? (
              report.outcomes.map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between py-3 text-sm"
                >
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                No analyzed outcomes for this period.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
