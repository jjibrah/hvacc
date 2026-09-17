import { redirect } from "next/navigation";

import { isAuthError } from "@/modules/authentication/errors";
import { getDashboardContext } from "@/modules/authentication/service";
import { getNavigationForActor } from "@/modules/dashboard/navigation";

const sectionDetails = {
  calls: {
    eyebrow: "Workspace",
    title: "Calls",
    description:
      "Review calls, transcripts, recordings, outcomes, and linked appointments.",
    next: "The call worklist and conversation review experience will be built here.",
  },
  appointments: {
    eyebrow: "Workspace",
    title: "Appointments",
    description:
      "Manage the hospital appointment lifecycle from booking through outcome.",
    next: "The appointment worklist, detail view, and scheduling actions will be built here.",
  },
  "follow-ups": {
    eyebrow: "Workspace",
    title: "Follow-ups",
    description:
      "Own unresolved work with clear reasons, due times, statuses, and activity history.",
    next: "The actionable follow-up queue and resolution flow will be built here.",
  },
  patients: {
    eyebrow: "Workspace",
    title: "Patients",
    description:
      "Find patient context and connect appointments, calls, notes, and activity.",
    next: "The patient search and profile experience will be built here.",
  },
  doctors: {
    eyebrow: "Care delivery",
    title: "Doctors",
    description:
      "Understand doctors, departments, availability, and related appointments.",
    next: "The doctor directory and profile experience will be built here.",
  },
  departments: {
    eyebrow: "Care delivery",
    title: "Departments",
    description:
      "Manage the hospital service structure used by calls and appointments.",
    next: "Department administration will be built here.",
  },
  schedules: {
    eyebrow: "Care delivery",
    title: "Schedules",
    description:
      "Plan doctor availability, sessions, capacity, and exceptions.",
    next: "The schedule and calendar views will be built here.",
  },
  "voice-agents": {
    eyebrow: "Voice & automation",
    title: "Voice agents",
    description:
      "Review connected agents, versions, phone numbers, routing, and readiness.",
    next: "The voice agent inventory will be built here.",
  },
  knowledge: {
    eyebrow: "Voice & automation",
    title: "Knowledge",
    description:
      "See approved knowledge sources, indexing state, and agent connections.",
    next: "Knowledge visibility and readiness will be built here.",
  },
  "call-logs": {
    eyebrow: "Voice & automation",
    title: "Call logs",
    description:
      "Investigate provider events, ingestion state, and technical diagnostics.",
    next: "Technical call event history will be built here.",
  },
  reports: {
    eyebrow: "Workspace",
    title: "Reports",
    description:
      "Trace operational metrics back to the calls, appointments, and follow-ups behind them.",
    next: "Reporting and drill-down views will be built here.",
  },
  "hospital-settings": {
    eyebrow: "Administration",
    title: "Hospital configuration",
    description:
      "Maintain the hospital identity, timezone, defaults, and operational settings.",
    next: "Hospital configuration will be built here.",
  },
  integrations: {
    eyebrow: "Administration",
    title: "Integrations",
    description:
      "Monitor connected services and the health of their server-side boundaries.",
    next: "Integration inventory and health states will be built here.",
  },
  audit: {
    eyebrow: "Administration",
    title: "Audit log",
    description:
      "Review important changes and sensitive actions with safe before-and-after context.",
    next: "Audit history and investigation tools will be built here.",
  },
} as const;

export type WorkspaceSection = keyof typeof sectionDetails;

export async function WorkspacePlaceholderPage({
  section,
}: {
  section: WorkspaceSection;
}) {
  const details = sectionDetails[section];
  let context;
  try {
    context = await getDashboardContext();
  } catch (error) {
    if (isAuthError(error) && error.status === 401) redirect("/login");
    throw error;
  }

  const navigation = getNavigationForActor(context.actor);
  const allowed = navigation.some((item) => item.key === section);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">
            {details.eyebrow}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {details.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            {details.description}
          </p>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
          Module planned
        </span>
      </header>

      <section
        className={`rounded-2xl border p-6 ${allowed ? "border-slate-200 bg-white" : "border-red-200 bg-red-50 text-red-900"}`}
      >
        <p className="text-sm font-semibold">
          {allowed
            ? "This workspace is ready for the next vertical slice."
            : "Access restricted"}
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {allowed
            ? details.next
            : "Your current role does not have permission to access this workspace. If this seems incorrect, contact a hospital administrator."}
        </p>
        {allowed ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              "Search and filters",
              "Operational worklist",
              "Detail and activity views",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"
              >
                <p className="text-sm font-medium text-slate-700">{item}</p>
                <p className="mt-1 text-xs text-slate-500">Placeholder</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
