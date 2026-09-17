import { StatusBadge } from "@/components/ui/status-badge";

const modules = [
  {
    number: 0,
    name: "Decisions and prerequisites",
    status: "active" as const,
    detail:
      "Policies, synthetic data, and resources are recorded; final Retell evidence remains.",
  },
  {
    number: 1,
    name: "Application foundation",
    status: "active" as const,
    detail: "Next.js, TypeScript, validation, tests, and application shell.",
  },
  {
    number: 2,
    name: "Database and domain model",
    status: "pending" as const,
    detail: "Supabase, Drizzle schema, migrations, and synthetic seed data.",
  },
];

export function ModuleProgress() {
  return (
    <section aria-labelledby="module-progress-heading">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Build roadmap</p>
          <h2
            id="module-progress-heading"
            className="mt-1 text-2xl font-semibold tracking-tight"
          >
            Current progress
          </h2>
        </div>
        <p className="text-sm text-slate-500">Module 1 in progress</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <ul className="divide-y divide-slate-200">
          {modules.map((module) => (
            <li
              key={module.number}
              className="grid gap-3 p-5 sm:grid-cols-[4rem_1fr_auto] sm:items-center"
            >
              <span className="text-sm font-semibold text-slate-500">
                M{module.number}
              </span>
              <div>
                <h3 className="font-semibold text-slate-900">{module.name}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {module.detail}
                </p>
              </div>
              <div className="sm:justify-self-end">
                <StatusBadge status={module.status} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
