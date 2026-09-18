import { redirect } from "next/navigation";
import { isAuthError } from "@/modules/authentication/errors";
import { getUserManagementContext } from "@/modules/hospital-administration/server/service";
import { listVoiceAgents } from "@/modules/voice-agents/server/service";
import Link from "next/link";
import { VoiceAgentActions } from "@/modules/voice-agents/components/voice-agent-actions";

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
  const data = await listVoiceAgents(context.hospital.id);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-teal-700">
          Voice & automation
        </p>
        <h1 className="mt-1 text-3xl font-semibold">Connected voice agents</h1>
        <p className="mt-2 text-sm text-slate-600">
          Govern connected agents, versions, phone numbers, tools, and
          readiness.
        </p>
      </header>
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-slate-500 uppercase">Active agents</p>
          <p className="mt-2 text-2xl font-semibold">
            {data.agents.filter((agent) => agent.status === "active").length}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-slate-500 uppercase">Published versions</p>
          <p className="mt-2 text-2xl font-semibold">
            {data.versions.filter((version) => version.isPublished).length}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-slate-500 uppercase">Phone numbers</p>
          <p className="mt-2 text-2xl font-semibold">{data.phones.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-slate-500 uppercase">Approved knowledge</p>
          <p className="mt-2 text-2xl font-semibold">
            {data.approvedKnowledgeCount}
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {data.agents.map((agent) => (
          <article
            key={agent.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/voice-agents/${agent.id}`}
                className="font-semibold text-teal-800 hover:underline"
              >
                {agent.displayName}
              </Link>
              <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-800">
                {agent.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {agent.agentType} · {agent.voiceName ?? "Provider default voice"}
            </p>
            <p className="mt-3 font-mono text-xs text-slate-400">
              {agent.providerAgentId}
            </p>
            <VoiceAgentActions
              hospitalId={context.hospital.id}
              agentId={agent.id}
            />
          </article>
        ))}
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Versions & phone numbers</h2>
        <div className="mt-3 grid gap-2 text-sm">
          {data.versions.map((version) => (
            <div
              key={version.id}
              className="flex justify-between border-b border-slate-100 py-2"
            >
              <span>{version.providerVersion}</span>
              <span className="text-slate-500">
                {version.isPublished ? "Published" : "Captured"}
              </span>
            </div>
          ))}
          {data.phones.map((phone) => (
            <div
              key={phone.id}
              className="flex justify-between border-b border-slate-100 py-2"
            >
              <span>{phone.nickname}</span>
              <span className="text-slate-500">
                {phone.phoneE164 ?? "No number"} · {phone.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
