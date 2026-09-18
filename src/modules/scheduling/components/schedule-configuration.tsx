"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Option = {
  id: string;
  name?: string;
  displayName?: string;
  departmentId?: string;
};
type Schedule = {
  id: string;
  doctorId: string;
  departmentId: string;
  weekday: number;
  localStartTime: string;
  localEndTime: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  defaultCapacity: number;
  status: string;
};

const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function ScheduleConfiguration({
  hospitalId,
  doctors,
  departments,
  schedules,
}: {
  hospitalId: string;
  doctors: Option[];
  departments: Option[];
  schedules: Schedule[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function create(form: HTMLFormElement) {
    setSaving(true);
    setMessage(null);
    const values = new FormData(form);
    const response = await fetch("/api/scheduling/schedules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hospitalId,
        doctorId: values.get("doctorId"),
        departmentId: values.get("departmentId"),
        weekday: Number(values.get("weekday")),
        localStartTime: values.get("localStartTime"),
        localEndTime: values.get("localEndTime"),
        effectiveFrom: values.get("effectiveFrom"),
        effectiveUntil: values.get("effectiveUntil") || undefined,
        defaultCapacity: Number(values.get("defaultCapacity")),
      }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(result.error ?? "Schedule could not be created.");
      setSaving(false);
      return;
    }
    setMessage("Recurring schedule created.");
    setSaving(false);
    form.reset();
    router.refresh();
  }
  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="font-semibold">Recurring schedules</h2>
        <p className="mt-1 text-sm text-slate-500">
          Create weekly rules used to materialize appointment sessions.
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void create(event.currentTarget);
        }}
        className="grid gap-3 md:grid-cols-4"
      >
        <label className="text-sm font-medium">
          Doctor
          <select
            required
            name="doctorId"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          >
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Department
          <select
            required
            name="departmentId"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          >
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Day
          <select
            name="weekday"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          >
            {weekdays.map((day, index) => (
              <option key={day} value={index}>
                {day}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Capacity
          <input
            required
            min="1"
            type="number"
            name="defaultCapacity"
            defaultValue="1"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          Start
          <input
            required
            type="time"
            name="localStartTime"
            defaultValue="09:00"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          End
          <input
            required
            type="time"
            name="localEndTime"
            defaultValue="17:00"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          Effective from
          <input
            required
            type="date"
            name="effectiveFrom"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          Effective until
          <input
            type="date"
            name="effectiveUntil"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <div className="flex items-center gap-3 md:col-span-4">
          <button
            disabled={saving}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create recurring schedule"}
          </button>
          {message ? (
            <span className="text-sm text-slate-600">{message}</span>
          ) : null}
        </div>
      </form>
      {schedules.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-3 py-2">Doctor</th>
                <th className="px-3 py-2">Day</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Effective</th>
                <th className="px-3 py-2">Capacity</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {schedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td className="px-3 py-3">
                    {doctors.find((doctor) => doctor.id === schedule.doctorId)
                      ?.displayName ?? "Unknown doctor"}
                  </td>
                  <td className="px-3 py-3">{weekdays[schedule.weekday]}</td>
                  <td className="px-3 py-3">
                    {schedule.localStartTime}–{schedule.localEndTime}
                  </td>
                  <td className="px-3 py-3">
                    {schedule.effectiveFrom}–
                    {schedule.effectiveUntil ?? "Open ended"}
                  </td>
                  <td className="px-3 py-3">{schedule.defaultCapacity}</td>
                  <td className="px-3 py-3 capitalize">{schedule.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          No recurring schedules configured.
        </p>
      )}
    </section>
  );
}
