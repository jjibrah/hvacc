"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function KnowledgeActions({ hospitalId }: { hospitalId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  async function create(form: HTMLFormElement) {
    const values = new FormData(form);
    const response = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hospitalId,
        name: values.get("name"),
        sourceType: values.get("sourceType"),
        content: values.get("content"),
      }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(body.error ?? "Source could not be created.");
      return;
    }
    setOpen(false);
    setMessage("Source created as draft.");
    form.reset();
    router.refresh();
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
      >
        Add knowledge source
      </button>
      {open ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void create(event.currentTarget);
          }}
          className="mt-4 grid gap-3 md:grid-cols-3"
        >
          <input
            required
            name="name"
            placeholder="Source name"
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <select
            name="sourceType"
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="text">Text / FAQ</option>
            <option value="url">URL</option>
            <option value="document">Document reference</option>
          </select>
          <textarea
            required
            name="content"
            placeholder="Approved hospital information"
            className="min-h-24 rounded-lg border px-3 py-2 text-sm md:col-span-3"
          />
          <button className="w-fit rounded-lg border px-4 py-2 text-sm font-semibold">
            Create draft
          </button>
        </form>
      ) : null}
      {message ? (
        <p className="mt-3 text-sm text-slate-600">{message}</p>
      ) : null}
    </div>
  );
}

export function ApproveKnowledgeButton({
  hospitalId,
  sourceId,
}: {
  hospitalId: string;
  sourceId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function approve() {
    setBusy(true);
    await fetch(`/api/knowledge/${sourceId}/approve?hospitalId=${hospitalId}`, {
      method: "POST",
    });
    setBusy(false);
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={() => void approve()}
      disabled={busy}
      className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
    >
      {busy ? "Approving…" : "Approve"}
    </button>
  );
}
