"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-red-700">Application error</p>
        <h1 className="mt-2 text-3xl font-semibold">Something went wrong</h1>
        <p className="mt-3 text-slate-600">
          The control center could not display this page. No operation was
          confirmed.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
