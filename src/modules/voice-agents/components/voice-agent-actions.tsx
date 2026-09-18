"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function VoiceAgentActions({
  hospitalId,
  agentId,
}: {
  hospitalId: string;
  agentId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function sync() {
    setBusy(true);
    setMessage("");
    const response = await fetch(
      `/api/voice-agents/${agentId}?hospitalId=${hospitalId}`,
      { method: "POST" },
    );
    const body = (await response.json()) as { error?: string };
    setMessage(response.ok ? "Synced" : (body.error ?? "Sync failed"));
    setBusy(false);
    if (response.ok) router.refresh();
  }
  return (
    <div className="mt-4 flex items-center gap-2">
      <button
        type="button"
        onClick={() => void sync()}
        disabled={busy}
        className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
      >
        {busy ? "Syncing…" : "Sync with Retell"}
      </button>
      {message ? (
        <span className="text-xs text-slate-500">{message}</span>
      ) : null}
    </div>
  );
}
