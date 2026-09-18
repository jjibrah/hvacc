"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type FollowUp = {
  id: string;
  reasonCode: string;
  reasonLabel: string;
  priority: "p1" | "p2" | "p3" | "p4";
  priorityLabel: string;
  status: "open" | "assigned" | "in_progress" | "resolved" | "cancelled";
  queue: string;
  resolutionCriterion: string;
  dueAt: string;
  createdAt: string;
  updatedAt: string;
  ownerName: string | null;
  ownerMembershipId: string | null;
  patientName: string | null;
  callerName: string | null;
  callerPhone: string | null;
  relatedAppointment: {
    id: string;
    reference: string;
    startsAt: string;
  } | null;
  relatedCall: { id: string } | null;
  overdue: boolean;
};

type Detail = FollowUp & {
  resolutionCode: string | null;
  resolutionNote: string | null;
  owner: { ownerName: string | null; queue: string | null } | null;
  activities: Array<{
    id: string;
    activityType: string;
    note: string | null;
    occurredAt: string;
    actorName: string | null;
  }>;
  appointment: {
    id: string;
    reference: string;
    patientName: string;
    startsAt: string;
  } | null;
  call: {
    id: string;
    providerCallId: string;
    callerName: string | null;
    callerPhone: string | null;
  } | null;
};

type Assignee = { membershipId: string; displayName: string; role: string };

const statusLabels: Record<FollowUp["status"], string> = {
  open: "Open",
  assigned: "Assigned",
  in_progress: "In progress",
  resolved: "Resolved",
  cancelled: "Cancelled",
};

const hospitalTimeZone = "Asia/Kuala_Lumpur";
const hospitalLocale = "en-GB";

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: hospitalTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDue(value: string, overdue: boolean) {
  const date = new Date(value);
  const formatted = date.toLocaleString(hospitalLocale, {
    timeZone: hospitalTimeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });
  if (overdue) return `Overdue · ${formatted}`;
  return formatted;
}

function relative(value: string) {
  return new Date(value).toLocaleString(hospitalLocale, {
    timeZone: hospitalTimeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function FollowUpsWorkspace({
  hospitalId,
  initialFollowUps,
  assignees,
}: {
  hospitalId: string;
  initialFollowUps: FollowUp[];
  assignees: Assignee[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const items = initialFollowUps;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [due, setDue] = useState("all");
  const [owner, setOwner] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [assignMembershipId, setAssignMembershipId] = useState("");

  const visible = useMemo(() => {
    const needle = search.toLowerCase();
    return items.filter((item) => {
      const haystack = [
        item.reasonLabel,
        item.patientName,
        item.callerName,
        item.callerPhone,
        item.queue,
        item.relatedAppointment?.reference,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        (!needle || haystack.includes(needle)) &&
        (status === "all" || item.status === status) &&
        (priority === "all" || item.priority === priority) &&
        (owner === "all" ||
          (owner === "unassigned"
            ? !item.ownerMembershipId
            : owner === "me"
              ? Boolean(item.ownerMembershipId)
              : item.ownerMembershipId === owner)) &&
        (due === "all" ||
          (due === "overdue"
            ? item.overdue
            : due === "today"
              ? dateKey(new Date(item.dueAt)) === dateKey(new Date())
              : due === "upcoming"
                ? !item.overdue
                : !item.dueAt))
      );
    });
  }, [items, search, status, priority, due, owner]);

  const metrics = {
    overdue: items.filter((item) => item.overdue).length,
    today: items.filter(
      (item) =>
        !item.overdue && dateKey(new Date(item.dueAt)) === dateKey(new Date()),
    ).length,
    unassigned: items.filter(
      (item) =>
        !item.ownerMembershipId &&
        !["resolved", "cancelled"].includes(item.status),
    ).length,
    progress: items.filter((item) => item.status === "in_progress").length,
  };

  async function openDetail(id: string) {
    setSelectedId(id);
    const response = await fetch(
      `/api/follow-ups/${id}?hospitalId=${hospitalId}`,
    );
    if (!response.ok) return setError("Follow-up details could not be loaded.");
    const result = (await response.json()) as { data: Detail };
    setDetail(result.data);
  }

  async function mutate(operation: string, body: Record<string, unknown> = {}) {
    setError(null);
    const response = await fetch(`/api/follow-ups/${selectedId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation, hospitalId, ...body }),
    });
    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      setError(result.error ?? "The follow-up could not be updated.");
      return;
    }
    const result = (await response.json()) as { data: Detail };
    setDetail(result.data);
    startTransition(() => router.refresh());
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const related = visible[0];
    if (!related) return setError("A related call or appointment is required.");
    const response = await fetch("/api/follow-ups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hospitalId,
        appointmentId: related.relatedAppointment?.id,
        callId: related.relatedCall?.id,
        reasonCode: form.get("reasonCode"),
        priority: form.get("priority"),
        queue: "reception",
        resolutionCriterion: form.get("resolutionCriterion"),
        dueAt: form.get("dueAt"),
      }),
    });
    if (!response.ok) return setError("The follow-up could not be created.");
    setShowCreate(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div
          role="alert"
          className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(
          [
            ["Overdue", metrics.overdue, "overdue"],
            ["Due today", metrics.today, "today"],
            ["Unassigned", metrics.unassigned, "unassigned"],
            ["In progress", metrics.progress, "in_progress"],
          ] as Array<[string, number, string]>
        ).map(([label, value, filter]) => (
          <button
            key={label}
            type="button"
            onClick={() =>
              filter === "unassigned"
                ? setOwner("unassigned")
                : filter === "in_progress"
                  ? setStatus("in_progress")
                  : setDue(filter)
            }
            className="border border-slate-200 bg-white px-4 py-3 text-left shadow-sm hover:border-teal-300"
          >
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {value}
            </p>
          </button>
        ))}
      </div>
      <section className="border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search patient, caller, appointment, call..."
            className="min-w-64 flex-1 border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className="border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All priorities</option>
            <option value="p1">Urgent</option>
            <option value="p2">High</option>
            <option value="p3">Normal</option>
            <option value="p4">Low</option>
          </select>
          <select
            value={due}
            onChange={(event) => setDue(event.target.value)}
            className="border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All due dates</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="upcoming">Upcoming</option>
          </select>
          <select
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            className="border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">Anyone</option>
            <option value="me">Me</option>
            <option value="unassigned">Unassigned</option>
            {assignees.map((person) => (
              <option key={person.membershipId} value={person.membershipId}>
                {person.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Patient / caller</th>
                <th className="px-4 py-3">Related to</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visible.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => void openDetail(item.id)}
                  className={`cursor-pointer hover:bg-slate-50 ${selectedId === item.id ? "bg-teal-50" : ""}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">
                      {item.reasonLabel}
                    </p>
                    <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                      {item.resolutionCriterion}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>
                      {item.patientName ?? item.callerName ?? "Unknown caller"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.callerPhone ?? ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.relatedAppointment
                      ? `Appointment · ${item.relatedAppointment.reference}`
                      : item.relatedCall
                        ? "Incoming call"
                        : "Operational work"}
                  </td>
                  <td className="px-4 py-3">
                    {item.ownerName ?? (
                      <span className="text-amber-700">Unassigned</span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-3 ${item.overdue ? "font-semibold text-red-700" : "text-slate-600"}`}
                  >
                    {formatDue(item.dueAt, item.overdue)}
                  </td>
                  <td className="px-4 py-3">{item.priorityLabel}</td>
                  <td className="px-4 py-3">
                    <span className="border border-slate-200 px-2 py-1 text-xs">
                      {statusLabels[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {relative(item.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No follow-ups match these filters.
            </div>
          ) : null}
        </div>
      </section>

      {selectedId && detail ? (
        <aside className="fixed inset-y-0 right-0 z-20 w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-teal-700 uppercase">
                Follow-up
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                {detail.reasonLabel}
              </h2>
              <p className="mt-1 text-xs text-slate-500">{detail.id}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedId(null);
                setDetail(null);
              }}
              className="text-sm text-slate-500"
            >
              Close
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="border border-slate-200 px-2 py-1 text-xs">
              {detail.priorityLabel}
            </span>
            <span className="border border-slate-200 px-2 py-1 text-xs">
              {statusLabels[detail.status]}
            </span>
            {detail.overdue ? (
              <span className="border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                Overdue
              </span>
            ) : null}
          </div>
          <div className="mt-6 space-y-5">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Resolution condition
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {detail.resolutionCriterion}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Related records
              </p>
              <div className="mt-2 space-y-2 text-sm">
                {detail.call ? (
                  <p>
                    Call ·{" "}
                    {detail.call.callerName ??
                      detail.call.callerPhone ??
                      detail.call.providerCallId}
                  </p>
                ) : null}
                {detail.appointment ? (
                  <p>
                    Appointment · {detail.appointment.reference} ·{" "}
                    {detail.appointment.patientName}
                  </p>
                ) : null}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Owner and due time
              </p>
              <p className="mt-2 text-sm">
                {detail.owner?.ownerName ?? detail.owner?.queue ?? "Unassigned"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {formatDue(detail.dueAt, detail.overdue)}
              </p>
            </div>
            <div className="border-t border-slate-200 pt-5">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Activity
              </p>
              <div className="mt-3 space-y-4">
                {detail.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="border-l-2 border-slate-200 pl-3"
                  >
                    <p className="text-sm font-medium">
                      {activity.activityType.replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {activity.actorName ?? "System"} ·{" "}
                      {new Date(activity.occurredAt).toLocaleString(
                        hospitalLocale,
                        {
                          timeZone: hospitalTimeZone,
                          dateStyle: "medium",
                          timeStyle: "short",
                        },
                      )}
                    </p>
                    {activity.note ? (
                      <p className="mt-1 text-sm text-slate-700">
                        {activity.note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-7 border-t border-slate-200 pt-5">
            <div className="flex flex-wrap gap-2">
              {detail.status === "open" ? (
                <>
                  <select
                    aria-label="Assign follow-up to"
                    value={assignMembershipId}
                    onChange={(event) =>
                      setAssignMembershipId(event.target.value)
                    }
                    className="border border-slate-300 px-2 py-2 text-sm"
                  >
                    <option value="">Assign to…</option>
                    {assignees.map((person) => (
                      <option
                        key={person.membershipId}
                        value={person.membershipId}
                      >
                        {person.displayName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      void mutate("assign", {
                        membershipId: assignMembershipId,
                      })
                    }
                    disabled={isPending || !assignMembershipId}
                    className="bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Assign
                  </button>
                </>
              ) : null}
              {detail.status === "assigned" ? (
                <button
                  type="button"
                  onClick={() => void mutate("start")}
                  disabled={isPending}
                  className="bg-teal-700 px-3 py-2 text-sm font-semibold text-white"
                >
                  Start work
                </button>
              ) : null}
              {detail.status === "in_progress" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const note = window.prompt("Add internal note");
                      if (note) void mutate("note", { note });
                    }}
                    className="border border-slate-300 px-3 py-2 text-sm font-semibold"
                  >
                    Add note
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const note = window.prompt("Resolution note");
                      if (note)
                        void mutate("resolve", {
                          resolutionCode: "completed",
                          resolutionNote: note,
                        });
                    }}
                    className="bg-teal-700 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Resolve
                  </button>
                </>
              ) : null}
              {["open", "assigned", "in_progress"].includes(detail.status) ? (
                <button
                  type="button"
                  onClick={() => {
                    const note = window.prompt("Why is this being cancelled?");
                    if (note) void mutate("cancel", { reason: note });
                  }}
                  className="border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </aside>
      ) : null}
      {showCreate ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-slate-950/30 p-4">
          <form
            onSubmit={create}
            className="w-full max-w-lg space-y-4 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">New follow-up</h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-sm text-slate-500"
              >
                Close
              </button>
            </div>
            <label className="block text-sm font-medium">
              Reason
              <select
                name="reasonCode"
                className="mt-1 block w-full border border-slate-300 px-3 py-2"
              >
                <option value="human_contact_request">
                  Human callback requested
                </option>
                <option value="unresolved_enquiry">Unresolved enquiry</option>
                <option value="failed_booking">
                  Appointment booking failed
                </option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Priority
              <select
                name="priority"
                className="mt-1 block w-full border border-slate-300 px-3 py-2"
              >
                <option value="p2">High</option>
                <option value="p3">Normal</option>
                <option value="p1">Urgent</option>
                <option value="p4">Low</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Due time
              <input
                name="dueAt"
                type="datetime-local"
                required
                className="mt-1 block w-full border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium">
              Resolution condition
              <textarea
                name="resolutionCriterion"
                required
                className="mt-1 block w-full border border-slate-300 px-3 py-2"
                rows={3}
              />
            </label>
            <p className="text-xs text-slate-500">
              The new item will link to the first visible call or appointment so
              its operational context is preserved.
            </p>
            <button
              disabled={isPending}
              className="bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Create follow-up
            </button>
          </form>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="fixed right-6 bottom-6 bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-lg"
      >
        + New follow-up
      </button>
    </div>
  );
}
