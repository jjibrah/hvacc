import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthError } from "@/modules/authentication/errors";
import { getUserManagementContext } from "@/modules/hospital-administration/server/service";
import { getVoiceAgent } from "@/modules/voice-agents/server/service";

export default async function Page({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  let context;
  try {
    context = await getUserManagementContext();
  } catch (error) {
    if (isAuthError(error) && error.status === 401) redirect("/login");
    throw error;
  }
  const { agentId } = await params;
  const data = await getVoiceAgent(context.hospital.id, agentId);
  return (
    <div className="space-y-6">
      <Link
        href="/voice-agents"
        className="text-sm font-semibold text-teal-700"
      >
        ← Voice agents
      </Link>
      <header className="rounded-2xl border bg-white p-6">
        <p className="text-sm text-slate-500">Provider agent</p>
        <h1 className="mt-1 text-3xl font-semibold">
          {data.agent.displayName}
        </h1>
        <p className="mt-2 font-mono text-xs text-slate-500">
          {data.agent.providerAgentId}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
            {data.agent.status}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${data.readiness.ready ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}
          >
            {data.readiness.ready ? "Ready" : "Not ready"}
          </span>
        </div>
      </header>
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="font-semibold">Readiness</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(data.readiness.checks).map(([key, passed]) => (
            <div
              key={key}
              className="flex justify-between rounded-lg border p-3 text-sm"
            >
              <span className="capitalize">
                {key.replaceAll(/([A-Z])/g, " $1")}
              </span>
              <span className={passed ? "text-green-700" : "text-red-700"}>
                {passed ? "Pass" : "Missing"}
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="font-semibold">Version history</h2>
        <div className="mt-3 divide-y">
          {data.versions.map((version) => (
            <div
              key={version.id}
              className="flex flex-wrap justify-between gap-3 py-3 text-sm"
            >
              <span>{version.providerVersion}</span>
              <span className="text-slate-500">
                {version.isPublished ? "Published" : "Draft"} ·{" "}
                {version.capturedAt.toLocaleString("en-US")}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
