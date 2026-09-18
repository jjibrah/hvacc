"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const timeZone = "Asia/Kuala_Lumpur";
const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const hours = Array.from({ length: 13 }, (_, index) => index + 7);

type Session = {
  id: string;
  scheduleId: string | null;
  doctorId: string;
  doctorName: string;
  departmentId: string;
  departmentName: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedUnits: number;
  availableUnits: number;
  status: string;
  effectiveStatus: string;
  closureReason: string | null;
};

type Configuration = {
  doctors: { id: string; displayName: string; departmentId: string }[];
  departments: { id: string; name: string }[];
  schedules: {
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
  }[];
};

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dateFromKey(key: string) {
  return new Date(`${key}T12:00:00Z`);
}

function addDays(key: string, amount: number) {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function startOfWeek(key: string) {
  const date = dateFromKey(key);
  const day = date.getUTCDay();
  return addDays(key, day === 0 ? -6 : 1 - day);
}

function localParts(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return { hour: Number(values.hour), minute: Number(values.minute) };
}

function formatDate(key: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, ...options }).format(
    dateFromKey(key),
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function sessionDay(session: Session) {
  return dateKey(new Date(session.startsAt));
}

function statusLabel(session: Session) {
  if (session.effectiveStatus === "full") return "Full";
  if (session.effectiveStatus === "cancelled") return "Cancelled";
  if (session.effectiveStatus === "closed") return "Closed";
  if (session.effectiveStatus === "completed") return "Completed";
  return "Open";
}

function statusClass(session: Session) {
  if (session.effectiveStatus === "full")
    return "border-amber-200 bg-amber-50 text-amber-900";
  if (["closed", "cancelled"].includes(session.effectiveStatus))
    return "border-slate-300 bg-slate-100 text-slate-600";
  if (session.effectiveStatus === "completed")
    return "border-blue-200 bg-blue-50 text-blue-900";
  return "border-teal-200 bg-teal-50 text-teal-900";
}

function rangeFor(view: string, anchor: string) {
  if (view === "day")
    return { from: anchor, to: addDays(anchor, 1), days: [anchor] };
  if (view === "month") {
    const date = dateFromKey(anchor);
    const first = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const last = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
    )
      .toISOString()
      .slice(0, 10);
    return { from: first, to: addDays(last, 1), days: [] };
  }
  const from = startOfWeek(anchor);
  return {
    from,
    to: addDays(from, 7),
    days: Array.from({ length: 7 }, (_, index) => addDays(from, index)),
  };
}

export function ScheduleWorkspace({
  hospitalId,
  initialSessions,
  configuration,
}: {
  hospitalId: string;
  initialSessions: Session[];
  configuration: Configuration;
}) {
  const router = useRouter();
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [anchor, setAnchor] = useState(dateKey(new Date()));
  const [departmentId, setDepartmentId] = useState("all");
  const [doctorId, setDoctorId] = useState("all");
  const [status, setStatus] = useState("all");
  const [sessions, setSessions] = useState(initialSessions);
  const [selected, setSelected] = useState<Session | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();
  const range = useMemo(() => rangeFor(view, anchor), [view, anchor]);
  const filteredDoctors = configuration.doctors.filter(
    (doctor) => departmentId === "all" || doctor.departmentId === departmentId,
  );
  const visibleSessions = sessions.filter(
    (session) =>
      (departmentId === "all" || session.departmentId === departmentId) &&
      (doctorId === "all" || session.doctorId === doctorId) &&
      (status === "all" || session.effectiveStatus === status),
  );
  const summary = {
    total: visibleSessions.length,
    open: visibleSessions.filter(
      (session) => session.effectiveStatus === "open",
    ).length,
    full: visibleSessions.filter(
      (session) => session.effectiveStatus === "full",
    ).length,
    closed: visibleSessions.filter((session) =>
      ["closed", "cancelled"].includes(session.effectiveStatus),
    ).length,
  };

  function loadRange(nextAnchor = anchor, nextView = view) {
    const nextRange = rangeFor(nextView, nextAnchor);
    const params = new URLSearchParams({
      hospitalId,
      from: `${nextRange.from}T00:00:00.000Z`,
      to: `${nextRange.to}T00:00:00.000Z`,
      timeZone,
      status: "all",
    });
    startLoading(async () => {
      setError(null);
      try {
        const response = await fetch(`/api/scheduling/calendar?${params}`);
        const body = (await response.json()) as {
          data?: Session[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(body.error ?? "The schedule could not be loaded.");
        setSessions(body.data ?? []);
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "The schedule could not be loaded.",
        );
      }
    });
  }

  function move(amount: number) {
    const days = view === "day" ? 1 : view === "month" ? 28 : 7;
    const nextAnchor = addDays(anchor, amount * days);
    setAnchor(nextAnchor);
    loadRange(nextAnchor, view);
  }

  async function closeSession(session: Session) {
    const reason = window.prompt(
      "Why is this session being closed?",
      "Doctor unavailable",
    );
    if (!reason) return;
    startSaving(async () => {
      setError(null);
      const response = await fetch(
        `/api/scheduling/sessions/${session.id}/close`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ hospitalId, reason, confirmed: true }),
        },
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "The session could not be closed.");
        return;
      }
      setMessage("Session closed.");
      setSelected(null);
      loadRange();
      router.refresh();
    });
  }

  function createRecurring(form: HTMLFormElement) {
    const values = new FormData(form);
    const selectedDays = values.getAll("weekdays").map(Number);
    if (!selectedDays.length) {
      setError("Select at least one day.");
      return;
    }
    startSaving(async () => {
      setError(null);
      const response = await fetch("/api/scheduling/schedules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          hospitalId,
          doctorId: values.get("doctorId"),
          departmentId: values.get("departmentId"),
          weekdays: selectedDays,
          localStartTime: values.get("localStartTime"),
          localEndTime: values.get("localEndTime"),
          effectiveFrom: values.get("effectiveFrom"),
          effectiveUntil: values.get("effectiveUntil") || undefined,
          defaultCapacity: Number(values.get("defaultCapacity")),
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "The recurring schedule could not be created.");
        return;
      }
      setShowCreate(false);
      setMessage("Recurring availability created.");
      form.reset();
      loadRange();
      router.refresh();
    });
  }

  const sessionsForDay = (day: string) =>
    visibleSessions.filter((session) => sessionDay(session) === day);
  const monthDays = (() => {
    const date = dateFromKey(anchor);
    const first = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const offset = (dateFromKey(first).getUTCDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, index) =>
      addDays(first, index - offset),
    );
  })();

  return (
    <div className="space-y-5">
      {message ? (
        <div
          role="status"
          className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900"
        >
          {message}
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-semibold">Availability calendar</h2>
            <p className="mt-1 text-sm text-slate-500">
              Doctor availability and appointment capacity · {timeZone}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
          >
            + Add schedule
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-4">
          <button
            type="button"
            onClick={() => {
              const today = dateKey(new Date());
              setAnchor(today);
              loadRange(today);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Previous period"
            onClick={() => move(-1)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-lg leading-none"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next period"
            onClick={() => move(1)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-lg leading-none"
          >
            ›
          </button>
          <p className="min-w-[220px] text-sm font-semibold text-slate-800">
            {view === "month"
              ? formatDate(anchor, { month: "long", year: "numeric" })
              : `${formatDate(range.from, { day: "numeric", month: "short" })} – ${formatDate(addDays(range.to, -1), { day: "numeric", month: "short", year: "numeric" })}`}
          </p>
          <div className="ml-auto flex rounded-lg border border-slate-300 p-1">
            {(["day", "week", "month"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setView(item);
                  loadRange(anchor, item);
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${view === item ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-3">
          <label className="text-xs font-semibold text-slate-500">
            Department
            <select
              value={departmentId}
              onChange={(event) => {
                setDepartmentId(event.target.value);
                setDoctorId("all");
              }}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
            >
              <option value="all">All departments</option>
              {configuration.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Doctor
            <select
              value={doctorId}
              onChange={(event) => setDoctorId(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
            >
              <option value="all">All doctors</option>
              {filteredDoctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="full">Full</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-4 gap-2 border-b border-slate-200 p-4">
          {[
            { label: "Sessions", value: summary.total },
            { label: "Open", value: summary.open },
            { label: "Full", value: summary.full },
            { label: "Closed", value: summary.closed },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-1 text-lg font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading calendar…
          </div>
        ) : view === "month" ? (
          <MonthView
            days={monthDays}
            sessions={sessionsForDay}
            onSelect={setSelected}
          />
        ) : (
          <TimeGrid
            days={view === "day" ? [anchor] : range.days}
            sessions={sessionsForDay}
            onSelect={setSelected}
          />
        )}
      </section>
      <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer list-none p-5 text-sm font-semibold">
          Recurring rules
          <span className="ml-2 font-normal text-slate-500">
            {configuration.schedules.length} configured
          </span>
        </summary>
        <div className="overflow-x-auto border-t border-slate-200">
          {configuration.schedules.length ? (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Doctor</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Repeats</th>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Effective</th>
                  <th className="px-5 py-3">Capacity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {configuration.schedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td className="px-5 py-3 font-medium">
                      {configuration.doctors.find(
                        (doctor) => doctor.id === schedule.doctorId,
                      )?.displayName ?? "Unknown doctor"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {configuration.departments.find(
                        (department) => department.id === schedule.departmentId,
                      )?.name ?? "Unknown department"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      Every {weekdays[schedule.weekday]}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {schedule.localStartTime.slice(0, 5)} –{" "}
                      {schedule.localEndTime.slice(0, 5)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {schedule.effectiveFrom} →{" "}
                      {schedule.effectiveUntil ?? "No end date"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {schedule.defaultCapacity} per session
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-5 text-sm text-slate-500">
              No recurring rules configured.
            </p>
          )}
        </div>
      </details>
      {selected ? (
        <SessionDrawer
          session={selected}
          saving={saving}
          onClose={() => setSelected(null)}
          onCloseSession={() => closeSession(selected)}
        />
      ) : null}
      {showCreate ? (
        <CreateScheduleDialog
          configuration={configuration}
          saving={saving}
          onCancel={() => setShowCreate(false)}
          onSubmit={createRecurring}
        />
      ) : null}
    </div>
  );
}

function TimeGrid({
  days,
  sessions,
  onSelect,
}: {
  days: string[];
  sessions: (day: string) => Session[];
  onSelect: (session: Session) => void;
}) {
  const columns =
    days.length === 1
      ? "grid-cols-[56px_minmax(260px,1fr)]"
      : "grid-cols-[56px_repeat(7,minmax(120px,1fr))]";
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className={`grid ${columns} border-b border-slate-200`}>
          <div />
          {days.map((day) => (
            <div
              key={day}
              className="border-l border-slate-200 p-3 text-center"
            >
              <p className="text-xs font-semibold text-slate-500 uppercase">
                {formatDate(day, { weekday: "short" })}
              </p>
              <p className="mt-1 text-lg font-semibold">
                {formatDate(day, { day: "numeric" })}
              </p>
            </div>
          ))}
        </div>
        <div className={`grid ${columns}`}>
          <div className="text-xs text-slate-400">
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-16 border-b border-slate-100 pt-1 pr-2 text-right"
              >
                {hour}:00
              </div>
            ))}
          </div>
          {days.map((day) => (
            <div key={day} className="relative border-l border-slate-200">
              {hours.map((hour) => (
                <div key={hour} className="h-16 border-b border-slate-100" />
              ))}
              {sessions(day).map((session) => (
                <CalendarEvent
                  key={session.id}
                  session={session}
                  onClick={() => onSelect(session)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarEvent({
  session,
  onClick,
}: {
  session: Session;
  onClick: () => void;
}) {
  const start = localParts(session.startsAt);
  const end = localParts(session.endsAt);
  const top = Math.max(0, ((start.hour - 7) * 60 + start.minute) / 60) * 64;
  const height = Math.max(
    42,
    (((end.hour - start.hour) * 60 + end.minute - start.minute) / 60) * 64,
  );
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ top, height }}
      className={`absolute right-1 left-1 overflow-hidden rounded-lg border p-2 text-left text-xs shadow-sm ${statusClass(session)}`}
    >
      <p className="truncate font-semibold">{session.doctorName}</p>
      <p className="truncate">{session.departmentName}</p>
      <p className="mt-1 truncate font-medium">
        {formatTime(session.startsAt)} – {formatTime(session.endsAt)}
      </p>
      <p className="mt-1 truncate">
        {session.effectiveStatus === "full"
          ? "Full"
          : `${session.availableUnits} of ${session.capacity} available`}
      </p>
    </button>
  );
}

function MonthView({
  days,
  sessions,
  onSelect,
}: {
  days: string[];
  sessions: (day: string) => Session[];
  onSelect: (session: Session) => void;
}) {
  return (
    <div className="grid grid-cols-7 border-t border-l border-slate-200">
      {days.map((day) => (
        <div
          key={day}
          className="min-h-32 border-r border-b border-slate-200 p-2"
        >
          <p className="text-xs font-semibold text-slate-500">
            {formatDate(day, { day: "numeric" })}
          </p>
          <div className="mt-2 space-y-1">
            {sessions(day)
              .slice(0, 3)
              .map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => onSelect(session)}
                  className={`block w-full truncate rounded border px-1.5 py-1 text-left text-xs ${statusClass(session)}`}
                >
                  {formatTime(session.startsAt)} · {session.doctorName}
                </button>
              ))}
            {sessions(day).length > 3 ? (
              <p className="text-xs text-slate-500">
                +{sessions(day).length - 3} more
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionDrawer({
  session,
  saving,
  onClose,
  onCloseSession,
}: {
  session: Session;
  saving: boolean;
  onClose: () => void;
  onCloseSession: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={onClose}>
      <aside
        className="absolute top-0 right-0 h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-700">
              Session details
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              {session.doctorName}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {session.departmentName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-slate-400"
            aria-label="Close details"
          >
            ×
          </button>
        </div>
        <div className={`mt-6 rounded-xl border p-4 ${statusClass(session)}`}>
          <p className="font-semibold">{statusLabel(session)}</p>
          <p className="mt-1 text-sm">
            {formatDate(sessionDay(session), {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="text-sm">
            {formatTime(session.startsAt)} – {formatTime(session.endsAt)}
          </p>
        </div>
        <div className="mt-6 space-y-5">
          <section>
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Capacity
            </h3>
            <div className="mt-2 flex justify-between text-sm">
              <span>{session.bookedUnits} booked</span>
              <span>{session.availableUnits} available</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-teal-600"
                style={{
                  width: `${Math.min(100, (session.bookedUnits / session.capacity) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {session.capacity} total appointment places
            </p>
          </section>
          <section>
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Source
            </h3>
            <p className="mt-2 text-sm text-slate-700">
              {session.scheduleId ? "Recurring schedule" : "One-off session"}
            </p>
            {session.closureReason ? (
              <p className="mt-1 text-sm text-slate-500">
                Reason: {session.closureReason}
              </p>
            ) : null}
          </section>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          {session.status === "open" && session.bookedUnits === 0 ? (
            <button
              type="button"
              disabled={saving}
              onClick={onCloseSession}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
            >
              Close session
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
          >
            Done
          </button>
        </div>
      </aside>
    </div>
  );
}

function CreateScheduleDialog({
  configuration,
  saving,
  onCancel,
  onSubmit,
}: {
  configuration: Configuration;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (form: HTMLFormElement) => void;
}) {
  const today = dateKey(new Date());
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/30 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-700">Add schedule</p>
            <h2 className="mt-1 text-2xl font-semibold">
              Create recurring availability
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              The rule will generate real appointment sessions on the calendar.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-2xl text-slate-400"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <form
          className="mt-6 grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(event.currentTarget);
          }}
        >
          <label className="text-sm font-medium">
            Doctor
            <select
              required
              name="doctorId"
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              {configuration.doctors.map((doctor) => (
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
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              {configuration.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="md:col-span-2">
            <legend className="text-sm font-medium">Repeat on</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {weekdays.map((day, index) => (
                <label
                  key={day}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="weekdays"
                    value={index}
                    defaultChecked={index === 1}
                  />
                  {day.slice(0, 3)}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="text-sm font-medium">
            Start time
            <input
              required
              type="time"
              name="localStartTime"
              defaultValue="09:00"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium">
            End time
            <input
              required
              type="time"
              name="localEndTime"
              defaultValue="17:00"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium">
            Capacity per session
            <input
              required
              min="1"
              type="number"
              name="defaultCapacity"
              defaultValue="1"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium">
            Effective from
            <input
              required
              type="date"
              name="effectiveFrom"
              defaultValue={today}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium">
            Effective until{" "}
            <span className="font-normal text-slate-500">(optional)</span>
            <input
              type="date"
              name="effectiveUntil"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 md:col-span-2">
            This availability repeats in the hospital timezone: {timeZone}.
          </div>
          <div className="flex justify-end gap-3 md:col-span-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
