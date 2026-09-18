"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetellCheckButton({ hospitalId }: { hospitalId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function check() {
    setBusy(true);
    setMessage(null);
    const response = await fetch(
      `/api/admin/integrations?hospitalId=${hospitalId}`,
      { method: "POST" },
    );
    const body = (await response.json()) as { error?: string };
    setMessage(
      response.ok
        ? "Retell connection verified."
        : (body.error ?? "Retell connection failed."),
    );
    setBusy(false);
    if (response.ok) router.refresh();
  }
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => void check()}
        disabled={busy}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {busy ? "Checking…" : "Check connection"}
      </button>
      {message ? (
        <span role="status" className="text-sm text-slate-600">
          {message}
        </span>
      ) : null}
    </div>
  );
}
