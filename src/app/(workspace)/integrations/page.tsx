import { redirect } from "next/navigation";

import { isAuthError } from "@/modules/authentication/errors";
import { getUserManagementContext } from "@/modules/hospital-administration/server/service";
import { getIntegrationHealth } from "@/modules/voice-agents/server/service";
import { RetellCheckButton } from "@/modules/voice-agents/components/integration-actions";

export default async function Page() {
  let context;
  try {
    context = await getUserManagementContext();
  } catch (error) {
    if (isAuthError(error) && error.status === 401) redirect("/login");
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
        Access denied: hospital administrators only.
      </div>
    );
  }
  const data = await getIntegrationHealth(context.hospital.id);
  const retell = data.retell;
  const statusClass =
    retell.status === "active"
      ? "bg-green-50 text-green-800"
      : retell.status === "disabled"
        ? "bg-slate-100 text-slate-700"
        : "bg-amber-50 text-amber-800";
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-teal-700">Administration</p>
        <h1 className="mt-1 text-3xl font-semibold">Integrations</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Monitor the systems supporting hospital operations. Operational rules
          remain in Hospital configuration.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-4">
        <Summary
          label="Connected"
          value={
            data.integrations.filter((item) => item.status === "active").length
          }
        />
        <Summary
          label="Healthy"
          value={
            data.integrations.filter(
              (item) => item.status === "active" && item.lastVerifiedAt,
            ).length
          }
        />
        <Summary
          label="Warnings"
          value={
            data.integrations.filter((item) => item.status === "error").length
          }
        />
        <Summary
          label="Not configured"
          value={
            data.integrations.filter(
              (item) => item.status === "draft" || item.status === "disabled",
            ).length
          }
        />
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Voice and calls
            </p>
            <h2 className="mt-1 text-xl font-semibold">Retell AI</h2>
            <p className="mt-1 text-sm text-slate-600">
              Voice agents, phone numbers, webhooks, appointment tools, and
              provider events.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass}`}
          >
            {retell.status}
          </span>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Health
            label="Credentials"
            value={String(retell.safeConfiguration.credentials ?? "missing")}
          />
          <Health label="Webhook" value={retell.webhook} />
          <Health label="Availability tool" value={retell.availabilityTool} />
          <Health label="Booking tool" value={retell.bookingTool} />
          <Health label="Agents" value={String(retell.agents)} />
          <Health
            label="Published versions"
            value={String(retell.publishedVersions)}
          />
          <Health label="Phone numbers" value={String(retell.phoneNumbers)} />
          <Health
            label="Approved knowledge"
            value={String(retell.approvedKnowledge)}
          />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-500">
            Last checked:{" "}
            {retell.lastVerifiedAt
              ? new Date(retell.lastVerifiedAt).toLocaleString("en-GB", {
                  timeZone: "Asia/Kuala_Lumpur",
                })
              : "Not checked yet"}
          </p>
          <RetellCheckButton hospitalId={context.hospital.id} />
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Connection safety</h2>
        <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3">
            Secrets are server-only and never displayed.
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            Production webhook requests require signature verification.
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            Connection checks and sync actions are audited.
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Other connected services</h2>
        {data.integrations.filter(
          (item) => !(item.provider === "retell" && item.kind === "retell"),
        ).length ? (
          <div className="mt-3 divide-y divide-slate-100">
            {data.integrations
              .filter(
                (item) =>
                  !(item.provider === "retell" && item.kind === "retell"),
              )
              .map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between py-3 text-sm"
                >
                  <span>
                    {item.provider} · {item.kind}
                  </span>
                  <span className="text-slate-500 capitalize">
                    {item.status}
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            No other integrations are configured.
          </p>
        )}
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500 uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
function Health({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}
