export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-teal-700">
          Workspace overview
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Today at a glance
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Follow the operational lifecycle from incoming calls to bookings,
          follow-ups, and verified outcomes.
        </p>
      </header>

      <section aria-labelledby="today-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="today-heading" className="text-lg font-semibold">
            Today
          </h2>
          <span className="text-sm text-slate-500">Operational summary</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Calls received", "—", "Awaiting call module"],
            ["Appointments", "—", "Awaiting scheduling module"],
            ["Follow-ups due", "—", "Awaiting follow-up module"],
            ["Booking failures", "—", "Awaiting verified outcomes"],
          ].map(([label, value, note]) => (
            <article
              key={label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                {value}
              </p>
              <p className="mt-2 text-xs text-slate-500">{note}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section
          aria-labelledby="attention-heading"
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-200 p-5">
            <h2 id="attention-heading" className="font-semibold">
              Requires attention
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Actionable issues will appear here as operational modules are
              enabled.
            </p>
          </div>
          <div className="p-5">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="text-sm font-medium text-slate-700">
                No attention items yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Call, booking, and follow-up signals will be connected here.
              </p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="upcoming-heading"
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-200 p-5">
            <h2 id="upcoming-heading" className="font-semibold">
              Upcoming operations
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              The next appointments and schedule exceptions will appear here.
            </p>
          </div>
          <div className="p-5">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="text-sm font-medium text-slate-700">
                Upcoming schedule placeholder
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Scheduling data will be shown once the module is implemented.
              </p>
            </div>
          </div>
        </section>
      </div>

      <section
        aria-labelledby="reporting-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 id="reporting-heading" className="font-semibold">
          Reporting and trends
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Metrics will remain linked to their underlying calls, appointments,
          and follow-ups.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {["Call outcomes", "Booking outcomes", "Follow-up resolution"].map(
            (item) => (
              <div
                key={item}
                className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"
              >
                <p className="text-sm font-medium text-slate-700">{item}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Report placeholder
                </p>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
