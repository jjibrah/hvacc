import { redirect } from "next/navigation";

import { isAuthError } from "@/modules/authentication/errors";
import { getDashboardContext } from "@/modules/hospital-administration/server/service";
import { CallsWorkspace } from "@/modules/calls/components/calls-workspace";
import { listCalls } from "@/modules/calls/server/service";

export default async function Page() {
  let context;
  try {
    context = await getDashboardContext();
  } catch (error) {
    if (isAuthError(error) && error.status === 401) redirect("/login");
    throw error;
  }
  const hospitalId = context.memberships[0]?.hospitalId;
  if (!hospitalId) redirect("/login");
  const calls = await listCalls({ hospitalId });

  return (
    <div className="space-y-5">
      <CallsWorkspace
        hospitalId={hospitalId}
        initialCalls={calls.map((call) => ({
          ...call,
          startedAt: call.startedAt?.toISOString() ?? null,
          endedAt: call.endedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
