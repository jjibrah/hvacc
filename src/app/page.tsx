import { AppShell } from "@/components/layout/app-shell";
import { ModuleProgress } from "@/features/dashboard/components/module-progress";

export default function Home() {
  return (
    <AppShell>
      <section aria-labelledby="page-title" className="space-y-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold tracking-[0.18em] text-teal-700 uppercase">
            Fictional learning environment
          </p>
          <h1
            id="page-title"
            className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
          >
            Hospital Voice Agent Control Center
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Build and verify the operational workflow one module at a time. No
            real patient or clinical data belongs in this environment.
          </p>
        </div>

        <ModuleProgress />
      </section>
    </AppShell>
  );
}
