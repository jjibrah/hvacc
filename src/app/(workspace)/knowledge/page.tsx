import { redirect } from "next/navigation";
import { isAuthError } from "@/modules/authentication/errors";
import { getUserManagementContext } from "@/modules/hospital-administration/server/service";
import { listKnowledge } from "@/modules/knowledge/server/service";
import {
  ApproveKnowledgeButton,
  KnowledgeActions,
} from "@/modules/knowledge/components/knowledge-actions";

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
  const data = await listKnowledge(context.hospital.id);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-teal-700">
          Voice & automation
        </p>
        <h1 className="mt-1 text-3xl font-semibold">
          Approved knowledge sources
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage approved hospital information used by voice agents.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Total", data.summary.total],
          ["Approved", data.summary.active],
          ["Processing", data.summary.processing],
          ["Failed", data.summary.failed],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border bg-white p-4">
            <p className="text-xs text-slate-500 uppercase">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <KnowledgeActions hospitalId={context.hospital.id} />
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="divide-y divide-slate-100">
          {data.sources.length ? (
            data.sources.map((source) => (
              <div
                key={source.id}
                className="flex flex-wrap justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-semibold">{source.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {source.sourceType} · {source.providerSourceId}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${source.status === "active" ? "bg-green-50 text-green-800" : source.status === "error" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}
                  >
                    {source.status}
                  </span>
                  {source.status === "draft" ? (
                    <ApproveKnowledgeButton
                      hospitalId={context.hospital.id}
                      sourceId={source.id}
                    />
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="py-6 text-sm text-slate-500">No approved sources.</p>
          )}
        </div>
      </section>
    </div>
  );
}
