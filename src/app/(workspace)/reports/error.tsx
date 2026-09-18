"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
      <h1 className="text-lg font-semibold text-red-900">
        Reports couldn&apos;t be loaded
      </h1>
      <p className="mt-2 text-sm text-red-800">
        The reporting data could not be retrieved. Try again, or check the
        development server terminal for the database error.
      </p>
      <button
        onClick={reset}
        className="mt-5 rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white"
      >
        Retry
      </button>
    </div>
  );
}
