"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Availability = {
  id: string;
  startsAt: string;
  endsAt: string;
  localStartsAt: string;
  availableUnits: number;
  capacity: number;
};

type Appointment = {
  id: string;
  reference: string;
  sessionId: string;
  startsAt: string;
  endsAt: string;
  patientId: string;
  patientName: string;
  callerName: string | null;
  status: string;
  source: string;
};

type AppointmentPeople = {
  patients: Array<{
    id: string;
    displayName: string;
    phoneE164: string | null;
    stableKey: string;
  }>;
  callers: Array<{
    id: string;
    displayName: string | null;
    phoneE164: string;
  }>;
};

const hospitalTimeZone = "Asia/Kuala_Lumpur";
const hospitalLocale = "en-GB";

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(hospitalLocale, {
    timeZone: hospitalTimeZone,
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(hospitalLocale, {
    timeZone: hospitalTimeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AppointmentWorkspace({
  hospitalId,
  availability,
  appointments,
  people,
}: {
  hospitalId: string;
  availability: Availability[];
  appointments: Appointment[];
  people: AppointmentPeople;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<Record<string, string>>({});
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);

  const calendarDays = useMemo(() => {
    const dates = [
      ...appointments.map((item) => item.startsAt),
      ...availability.map((item) => item.startsAt),
    ].map((value) => new Date(value).toISOString().slice(0, 10));
    return [...new Set(dates)].sort().slice(0, 7);
  }, [appointments, availability]);

  const selectedAppointment = appointments.find(
    (item) => item.id === selectedAppointmentId,
  );

  async function mutate(url: string, body: Record<string, unknown>) {
    setError(null);
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      setError(result.error ?? "The operation could not be completed.");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutate("/api/appointments", {
      hospitalId,
      sessionId: form.get("sessionId"),
      patientId: form.get("patientId"),
      callerId: form.get("callerId") || undefined,
      idempotencyKey: `frontend-booking-${crypto.randomUUID()}`,
      confirmed: form.get("confirmed") === "on",
      source: "staff",
      capacityUnits: 1,
    });
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h2 className="font-semibold">Scheduling calendar</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select an appointment to review or act on it.
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Week view · hospital availability
          </span>
        </div>
        <div className="grid min-w-[900px] grid-cols-7 divide-x divide-slate-200 overflow-x-auto">
          {calendarDays.map((day) => {
            const dayAppointments = appointments.filter((item) =>
              item.startsAt.startsWith(day),
            );
            const dayAvailability = availability.filter((item) =>
              item.startsAt.startsWith(day),
            );
            return (
              <div key={day} className="min-h-48 bg-white">
                <div className="border-b border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    {new Date(`${day}T12:00:00Z`).toLocaleDateString(
                      hospitalLocale,
                      {
                        timeZone: hospitalTimeZone,
                        weekday: "short",
                      },
                    )}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {day.slice(8, 10)}
                  </p>
                </div>
                <div className="space-y-2 p-2">
                  {dayAppointments.map((appointment) => (
                    <button
                      key={appointment.id}
                      type="button"
                      onClick={() => setSelectedAppointmentId(appointment.id)}
                      className={`w-full border-l-2 p-2 text-left text-xs ${selectedAppointmentId === appointment.id ? "border-teal-600 bg-teal-50" : "border-slate-300 bg-slate-50 hover:border-teal-500"}`}
                    >
                      <p className="font-semibold text-slate-900">
                        {formatTime(appointment.startsAt)}
                      </p>
                      <p className="mt-1 truncate text-slate-700">
                        {appointment.patientName}
                      </p>
                      <p className="mt-1 text-slate-500 capitalize">
                        {appointment.status}
                      </p>
                    </button>
                  ))}
                  {dayAvailability.slice(0, 3).map((session) => (
                    <div
                      key={session.id}
                      className="border border-dashed border-teal-200 p-2 text-xs text-teal-700"
                    >
                      {formatTime(session.startsAt)} · {session.availableUnits}{" "}
                      open
                    </div>
                  ))}
                  {!dayAppointments.length && !dayAvailability.length ? (
                    <p className="p-2 text-xs text-slate-400">No activity</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {selectedAppointment ? (
        <section className="border border-teal-200 bg-teal-50/60 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-wide text-teal-700 uppercase">
                Appointment details
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {selectedAppointment.patientName}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {selectedAppointment.reference} ·{" "}
                {formatDateTime(selectedAppointment.startsAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAppointmentId(null)}
              className="text-sm font-semibold text-slate-600"
            >
              Close details
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">New appointment</h2>
            <p className="mt-1 text-sm text-slate-500">
              The server confirms capacity and patient ownership before saving.
            </p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
            Backend connected
          </span>
        </div>
        <form
          onSubmit={submitBooking}
          className="mt-5 grid gap-4 md:grid-cols-4"
        >
          <label className="text-sm font-medium">
            Available session
            <select
              name="sessionId"
              required
              className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Choose a session</option>
              {availability.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.localStartsAt} · {session.availableUnits} remaining
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Patient
            <select
              name="patientId"
              required
              className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Search/select patient</option>
              {people.patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.displayName} ·{" "}
                  {patient.phoneE164 ?? patient.stableKey}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Caller{" "}
            <span className="font-normal text-slate-500">(optional)</span>
            <select
              name="callerId"
              className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Use patient contact</option>
              {people.callers.map((caller) => (
                <option key={caller.id} value={caller.id}>
                  {caller.displayName ?? "Unknown caller"} · {caller.phoneE164}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 pb-3 text-sm">
              <input name="confirmed" type="checkbox" required /> Confirmed
            </label>
            <button
              disabled={isPending}
              className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Book"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="font-semibold">Appointments</h2>
          <p className="mt-1 text-sm text-slate-500">
            Confirmed records returned by the scheduling backend.
          </p>
        </div>
        {appointments.length ? (
          <div className="divide-y divide-slate-200">
            {appointments.map((appointment) => (
              <article
                key={appointment.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div>
                  <p className="font-medium">{appointment.patientName}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {appointment.reference} ·{" "}
                    {formatDateTime(appointment.startsAt)} ·{" "}
                    {appointment.callerName ?? "No caller linked"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Source:{" "}
                    {appointment.source === "voice"
                      ? "Voice call"
                      : appointment.source}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 capitalize">
                    {appointment.status}
                  </span>
                  {appointment.status === "confirmed" ||
                  appointment.status === "pending" ? (
                    <>
                      {appointment.status === "confirmed" ? (
                        <>
                          <select
                            aria-label={`Destination for ${appointment.reference}`}
                            value={destinations[appointment.id] ?? ""}
                            onChange={(event) =>
                              setDestinations((current) => ({
                                ...current,
                                [appointment.id]: event.target.value,
                              }))
                            }
                            className="rounded-lg border border-slate-300 px-2 py-2 text-xs"
                          >
                            <option value="">Reschedule to…</option>
                            {availability
                              .filter(
                                (session) =>
                                  session.id !== appointment.sessionId,
                              )
                              .map((session) => (
                                <option key={session.id} value={session.id}>
                                  {session.localStartsAt} (
                                  {session.availableUnits})
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            disabled={
                              isPending || !destinations[appointment.id]
                            }
                            onClick={() =>
                              mutate(
                                `/api/appointments/${appointment.id}/reschedule`,
                                {
                                  hospitalId,
                                  destinationSessionId:
                                    destinations[appointment.id],
                                  reason:
                                    "Rescheduled from appointments workspace",
                                  idempotencyKey: `frontend-reschedule-${appointment.id}-${destinations[appointment.id]}`,
                                  confirmed: true,
                                },
                              )
                            }
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                          >
                            Move
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          mutate(`/api/appointments/${appointment.id}/cancel`, {
                            hospitalId,
                            reason: "Cancelled from appointments workspace",
                            idempotencyKey: `frontend-cancel-${appointment.id}-${Date.now()}`,
                            confirmed: true,
                          })
                        }
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="p-5 text-sm text-slate-500">
            No appointments in the selected window.
          </p>
        )}
      </section>
    </div>
  );
}
