"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreatePatientForm({ hospitalId }: { hospitalId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(form: HTMLFormElement) {
    setSaving(true);
    setError("");
    const values = new FormData(form);
    const response = await fetch("/api/patients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hospitalId,
        displayName: values.get("displayName"),
        dateOfBirth: values.get("dateOfBirth") || null,
        phoneE164: values.get("phoneE164") || null,
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Patient could not be created.");
      setSaving(false);
      return;
    }
    setOpen(false);
    setSaving(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
      >
        Add patient
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">Add patient</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create a hospital patient record.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xl text-slate-400"
              >
                ×
              </button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submit(event.currentTarget);
              }}
              className="mt-6 space-y-4"
            >
              <label className="block text-sm font-medium">
                Full name
                <input
                  required
                  name="displayName"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
              <label className="block text-sm font-medium">
                Phone number{" "}
                <span className="font-normal text-slate-400">
                  (optional, E.164)
                </span>
                <input
                  name="phoneE164"
                  placeholder="+60123456789"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
              <label className="block text-sm font-medium">
                Date of birth{" "}
                <span className="font-normal text-slate-400">(optional)</span>
                <input
                  type="date"
                  name="dateOfBirth"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Create patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
