import { redirect } from "next/navigation";

import { isAuthError } from "@/modules/authentication/errors";
import { getDashboardContext } from "@/modules/hospital-administration/server/service";
import { FollowUpsWorkspace } from "@/modules/follow-ups/components/follow-ups-workspace";
import {
  listFollowUpAssignees,
  listFollowUps,
} from "@/modules/follow-ups/server/service";

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
  const [followUps, assignees] = await Promise.all([
    listFollowUps({ hospitalId }),
    listFollowUpAssignees(hospitalId),
  ]);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-teal-700">Workspace</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Follow-ups
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Manage unresolved patient and operational work requiring human
          attention.
        </p>
      </header>
      <FollowUpsWorkspace
        hospitalId={hospitalId}
        initialFollowUps={followUps.map((item) => ({
          ...item,
          dueAt: item.dueAt.toISOString(),
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          relatedAppointment: item.relatedAppointment
            ? {
                ...item.relatedAppointment,
                startsAt: item.relatedAppointment.startsAt.toISOString(),
              }
            : null,
        }))}
        assignees={assignees}
      />
    </div>
  );
}
