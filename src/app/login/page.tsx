import Link from "next/link";

import { signInAction } from "@/modules/authentication/login-actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const hasError = params.error === "invalid_credentials";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold tracking-[0.18em] text-teal-700 uppercase">
          CodeXGate
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Sign in
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Use an invited hospital staff account. Access is checked again on the
          server for every protected operation.
        </p>
        {hasError ? (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            The email or password was not accepted.
          </p>
        ) : null}
        <form action={signInAction} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-800">
            Email
            <input
              required
              name="email"
              type="email"
              autoComplete="email"
              className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Password
            <input
              required
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Sign in securely
          </button>
        </form>
        <Link
          href="/"
          className="mt-5 inline-block text-sm text-slate-500 hover:text-slate-900"
        >
          Back to overview
        </Link>
      </section>
    </main>
  );
}
