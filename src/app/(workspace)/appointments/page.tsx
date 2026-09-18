import { redirect } from "next/navigation";

import { isAuthError } from "@/modules/authentication/errors";
import { getDashboardContext } from "@/modules/hospital-administration/server/service";
import { AppointmentWorkspace } from "@/modules/scheduling/components/appointment-workspace";
import { getSchedulingDateRange } from "@/modules/scheduling/server/date-range";
import {
  listAppointments,
  listAvailability,
  listAppointmentPeople,
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

  const { now, from, to } = getSchedulingDateRange();
  const [appointments, availability, people] = await Promise.all([
    listAppointments({ hospitalId, from, to }),
    listAvailability({
      hospitalId,
      from: now,
      to,
      timeZone: "Asia/Kuala_Lumpur",
    }),
    listAppointmentPeople({ hospitalId }),
  ]);

  return (
    <div className="space-y-6">
      <AppointmentWorkspace
        hospitalId={hospitalId}
        appointments={appointments.map((item) => ({
          ...item,
          startsAt: item.startsAt.toISOString(),
          endsAt: item.endsAt.toISOString(),
        }))}
        availability={availability.map((item) => ({
          ...item,
          startsAt: item.startsAt.toISOString(),
          endsAt: item.endsAt.toISOString(),
        }))}
        people={people}
      />
    </div>
  );
}
