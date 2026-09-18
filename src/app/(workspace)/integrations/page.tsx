import { redirect } from "next/navigation";
import { isAuthError } from "@/modules/authentication/errors";
import {
  getHospitalAdministration,
  getUserManagementContext,
} from "@/modules/hospital-administration/server/service";

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
  const data = await getHospitalAdministration(context.hospital.id);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-teal-700">Administration</p>
        <h1 className="mt-1 text-3xl font-semibold">Integrations</h1>
        <p className="mt-2 text-sm text-slate-600">
          Connected services and their safe, non-secret health state.
        </p>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="divide-y divide-slate-100">
          {data.integrations.length ? (
            data.integrations.map((integration) => (
              <div
                key={integration.id}
                className="flex flex-wrap justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-semibold">
                    {integration.provider} · {integration.kind}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {integration.externalId ?? "No external identifier"}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                  {integration.status}
                </span>
              </div>
            ))
          ) : (
            <p className="py-6 text-sm text-slate-500">
              No integrations connected.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
