import { redirect } from "next/navigation";

import { isAuthError } from "@/modules/authentication/errors";
import { getDashboardContext } from "@/modules/hospital-administration/server/service";
import { ScheduleWorkspace } from "@/modules/scheduling/components/schedule-workspace";
import { getSchedulingDateRange } from "@/modules/scheduling/server/date-range";
import {
  listScheduleCalendar,
  listScheduleConfiguration,
} from "@/modules/scheduling/server/service";

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
  const { from, to } = getSchedulingDateRange();
  const [sessions, configuration] = await Promise.all([
    listScheduleCalendar({
      hospitalId,
      from,
      to,
      timeZone: "Asia/Kuala_Lumpur",
      status: "all",
    }),
    listScheduleConfiguration(hospitalId),
  ]);

  return (
    <div className="space-y-6">
      <ScheduleWorkspace
        hospitalId={hospitalId}
        initialSessions={sessions.map((item) => ({
          ...item,
          startsAt: item.startsAt.toISOString(),
          endsAt: item.endsAt.toISOString(),
        }))}
        configuration={configuration}
      />
    </div>
  );
}
