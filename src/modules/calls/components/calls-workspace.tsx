"use client";

import { useEffect, useMemo, useState } from "react";

type CallItem = {
  id: string;
  providerCallId: string;
  direction: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  summary: string | null;
  outcome: string | null;
  sentiment: string | null;
  bookingIntent: boolean | null;
  callerName: string | null;
  callerPhone: string | null;
};

type CallDetail = {
  call: CallItem & { providerCallId: string };
  analysis: {
    summary: string | null;
    outcome: string | null;
    sentiment: string | null;
    bookingIntent: boolean | null;
  } | null;
  recording: {
    status: string;
    storageReference: string | null;
    durationSeconds: number | null;
  } | null;
  transcripts: { content: string; capturedAt: string | Date }[];
  participant: { name: string | null; phone: string | null } | null;
  activity: { eventType: string; capturedAt: string | Date }[];
  appointments: {
    id: string;
    reference: string;
    status: string;
    startsAt: string | Date;
    patientName: string;
    doctorName: string;
    departmentName: string;
  }[];
};

const hospitalTimeZone = "Asia/Kuala_Lumpur";
const hospitalLocale = "en-GB";

function formatTime(value: string | Date | null) {
  return value
    ? new Date(value).toLocaleString(hospitalLocale, {
        timeZone: hospitalTimeZone,
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
}

function statusTone(status: string) {
  if (status === "ended") return "bg-teal-500";
  if (status === "failed") return "bg-red-500";
  if (status === "in_progress") return "bg-amber-500";
  return "bg-slate-400";
}

function CallEvidenceSkeleton() {
  return (
    <div className="min-h-[520px] animate-pulse">
      <div className="border-b border-slate-200 p-5">
        <div className="h-6 w-48 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-72 rounded bg-slate-100" />
        <div className="mt-3 h-3 w-56 rounded bg-slate-100" />
      </div>
      <div className="space-y-6 p-5">
        <div>
          <div className="h-3 w-28 rounded bg-slate-200" />
          <div className="mt-3 h-16 w-full rounded bg-slate-100" />
        </div>
        <div className="border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-200" />
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="h-3 flex-1 rounded bg-slate-100" />
          </div>
          <div className="mt-4 h-3 w-full rounded bg-slate-100" />
          <div className="mt-2 h-3 w-5/6 rounded bg-slate-100" />
          <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
        </div>
        <div>
          <div className="h-3 w-24 rounded bg-slate-200" />
          <div className="mt-3 space-y-2">
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-10 rounded bg-slate-100" />
          </div>
        </div>
        <p className="text-center text-sm font-medium text-slate-500">
          Loading call evidence…
        </p>
      </div>
    </div>
  );
}

export function CallsWorkspace({
  hospitalId,
  initialCalls,
}: {
  hospitalId: string;
  initialCalls: CallItem[];
}) {
  const [selectedId, setSelectedId] = useState(initialCalls[0]?.id ?? null);
  const [detail, setDetail] = useState<CallDetail | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(Boolean(initialCalls[0]?.id));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    fetch(`/api/calls/${selectedId}?hospitalId=${hospitalId}`)
      .then(async (response) => {
        const body = (await response.json()) as {
          data?: CallDetail;
          error?: string;
        };
        if (!response.ok)
          throw new Error(body.error ?? "Call details could not be loaded.");
        if (!cancelled) setDetail(body.data ?? null);
      })
      .catch((reason: unknown) => {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "Call details could not be loaded.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hospitalId, selectedId]);

  const visibleCalls = useMemo(
    () =>
      initialCalls.filter((call) => {
        const matchesSearch =
          !search ||
          `${call.providerCallId} ${call.summary ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase());
        const matchesFilter =
          filter === "all" ||
          call.status === filter ||
          (filter === "appointment" && call.bookingIntent);
        return matchesSearch && matchesFilter;
      }),
    [filter, initialCalls, search],
  );

  return (
    <div className="grid min-h-[calc(100vh-12rem)] grid-cols-1 overflow-hidden border border-slate-200 bg-white shadow-sm xl:grid-cols-[300px_minmax(0,1fr)_320px]">
      <aside className="border-b border-slate-200 xl:border-r xl:border-b-0">
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Call history</h2>
            <span className="text-xs text-slate-500">
              {initialCalls.length}
            </span>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search calls…"
            className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All calls</option>
            <option value="ended">Completed</option>
            <option value="in_progress">In progress</option>
            <option value="failed">Failed</option>
            <option value="appointment">Appointment activity</option>
          </select>
        </div>
        <div className="max-h-[calc(100vh-18rem)] overflow-y-auto">
          {visibleCalls.map((call) => (
            <button
              key={call.id}
              type="button"
              onClick={() => {
                setSelectedId(call.id);
                setError(null);
                setLoading(true);
              }}
              className={`block w-full border-b border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50 ${selectedId === call.id ? "border-l-2 border-l-teal-600 bg-teal-50/60" : "border-l-2 border-l-transparent"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${statusTone(call.status)}`}
                  />
                  {call.callerName ?? "Unknown caller"}
                </span>
                <span className="shrink-0 text-xs text-slate-500">
                  {call.startedAt
                    ? new Date(call.startedAt).toLocaleTimeString(
                        hospitalLocale,
                        {
                          timeZone: hospitalTimeZone,
                          hour: "numeric",
                          minute: "2-digit",
                        },
                      )
                    : "—"}
                </span>
              </div>
              <p className="mt-2 truncate text-xs text-slate-500">
                {call.callerPhone ?? "Phone unavailable"} ·{" "}
                {call.summary ?? "Call in progress"} ·{" "}
                {call.durationSeconds
                  ? `${Math.floor(call.durationSeconds / 60)}m ${call.durationSeconds % 60}s`
                  : "Duration pending"}
              </p>
              <p className="mt-1 text-xs text-slate-500 capitalize">
                {call.status.replace("_", " ")}
              </p>
            </button>
          ))}
          {!visibleCalls.length ? (
            <p className="p-5 text-sm text-slate-500">
              No calls match these filters.
            </p>
          ) : null}
        </div>
      </aside>

      <main className="min-w-0 border-b border-slate-200 xl:border-r xl:border-b-0">
        {loading ? <CallEvidenceSkeleton /> : null}
        {error ? (
          <div
            role="alert"
            className="m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        ) : null}
        {!detail && !loading ? (
          <div className="grid min-h-[520px] place-items-center p-8 text-center text-sm text-slate-500">
            Select a call to review the conversation, recording, summary, and
            activity.
          </div>
        ) : null}
        {detail && !loading ? (
          <div className="min-h-full overflow-y-auto">
            <header className="border-b border-slate-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-semibold">
                    {detail.participant?.name ?? "Unknown caller"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {detail.call.direction === "inbound"
                      ? "Incoming"
                      : "Outgoing"}{" "}
                    call · {formatTime(detail.call.startedAt)} ·{" "}
                    {detail.call.durationSeconds
                      ? `${Math.floor(detail.call.durationSeconds / 60)}m ${detail.call.durationSeconds % 60}s`
                      : "Duration pending"}
                  </p>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 capitalize">
                  {detail.call.status.replace("_", " ")}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Provider: Retell AI · Call reference:{" "}
                {detail.call.providerCallId}
              </p>
            </header>
            <div className="space-y-5 p-5">
              <section aria-labelledby="summary-heading">
                <h2
                  id="summary-heading"
                  className="text-sm font-semibold tracking-wide text-slate-500 uppercase"
                >
                  Call overview
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-800">
                  {detail.analysis?.summary ?? "Summary processing…"}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">Outcome</p>
                    <p className="mt-1 text-sm font-medium capitalize">
                      {detail.analysis?.outcome ?? "Pending"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Intent</p>
                    <p className="mt-1 text-sm font-medium">
                      {detail.analysis?.bookingIntent
                        ? "Appointment activity"
                        : "Not classified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Sentiment</p>
                    <p className="mt-1 text-sm font-medium capitalize">
                      {detail.analysis?.sentiment ?? "Pending"}
                    </p>
                  </div>
                </div>
              </section>
              <section aria-labelledby="recording-heading">
                <h2
                  id="recording-heading"
                  className="text-sm font-semibold tracking-wide text-slate-500 uppercase"
                >
                  Recording
                </h2>
                {detail.recording?.storageReference ? (
                  <audio
                    controls
                    preload="metadata"
                    className="mt-3 w-full"
                    src={detail.recording.storageReference}
                  >
                    Your browser does not support audio playback.
                  </audio>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Recording {detail.recording?.status ?? "pending"}.
                  </p>
                )}
              </section>
              <section aria-labelledby="transcript-heading">
                <div className="flex items-center justify-between">
                  <h2
                    id="transcript-heading"
                    className="text-sm font-semibold tracking-wide text-slate-500 uppercase"
                  >
                    Transcript
                  </h2>
                  <span className="text-xs text-slate-500">
                    {detail.transcripts.length
                      ? "Source transcript"
                      : "Processing"}
                  </span>
                </div>
                {detail.transcripts.length ? (
                  <div className="mt-3 space-y-4">
                    {detail.transcripts.map((transcript) => (
                      <div
                        key={`${transcript.capturedAt}-${transcript.content}`}
                        className="border-l-2 border-slate-200 pl-4"
                      >
                        <p className="text-xs text-slate-500">
                          {formatTime(transcript.capturedAt)}
                        </p>
                        <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-slate-800">
                          {transcript.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Transcript processing…
                  </p>
                )}
              </section>
              <section aria-labelledby="activity-heading">
                <h2
                  id="activity-heading"
                  className="text-sm font-semibold tracking-wide text-slate-500 uppercase"
                >
                  Activity
                </h2>
                <div className="mt-3 divide-y divide-slate-100">
                  {detail.activity.map((event) => (
                    <div
                      key={`${event.eventType}-${event.capturedAt}`}
                      className="flex justify-between gap-3 py-2 text-sm"
                    >
                      <span className="text-slate-700 capitalize">
                        {event.eventType.replaceAll("_", " ")}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatTime(event.capturedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </main>

      <aside className="min-w-0 bg-slate-50/70 p-5">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Caller intelligence
        </h2>
        {detail && !loading ? (
          <div className="mt-5 space-y-6">
            <section>
              <p className="text-lg font-semibold">
                {detail.participant?.name ?? "Unknown caller"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {detail.participant?.phone ?? "Phone number unavailable"}
              </p>
            </section>
            <section>
              <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Operational outcome
              </h3>
              <p className="mt-2 text-sm font-medium capitalize">
                {detail.analysis?.outcome ?? "Processing"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {detail.analysis?.bookingIntent
                  ? "Appointment activity detected"
                  : "No appointment activity detected"}
              </p>
            </section>
            <section>
              <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Appointments from this call
              </h3>
              {detail.appointments.length ? (
                <div className="mt-2 space-y-2">
                  {detail.appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="border-l-2 border-teal-500 pl-3"
                    >
                      <p className="text-sm font-medium">
                        {appointment.patientName}
                      </p>
                      <p className="text-xs text-slate-600">
                        {appointment.reference} ·{" "}
                        {formatTime(appointment.startsAt)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {appointment.departmentName} · {appointment.doctorName}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-600">
                  No linked appointment.
                </p>
              )}
            </section>
            <section>
              <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Follow-up
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Follow-up status will appear here when created by the
                operational workflow.
              </p>
            </section>
          </div>
        ) : (
          <p className="mt-5 text-sm text-slate-500">
            Select a call to view caller and patient context.
          </p>
        )}
      </aside>
    </div>
  );
}
