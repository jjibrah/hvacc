import Link from "next/link";

export function AppHeader({
  hospitalName,
  onMobileMenuOpen,
}: {
  hospitalName: string;
  onMobileMenuOpen: () => void;
}) {
  return (
    <header className="z-40 shrink-0 border-b border-slate-800 bg-slate-950 text-white shadow-sm">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={onMobileMenuOpen}
            className="grid size-9 place-items-center rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 lg:hidden"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ☰
            </span>
          </button>
          <Link href="/dashboard" className="min-w-0 shrink-0">
            <p className="text-sm font-bold tracking-[0.18em] text-teal-300 uppercase">
              HVA
            </p>
            <p className="max-w-52 truncate text-xs text-slate-300">
              {hospitalName}
            </p>
          </Link>
        </div>

        <div className="hidden max-w-xl flex-1 items-center sm:flex">
          <label className="relative block w-full">
            <span className="sr-only">Search HVA</span>
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              ⌕
            </span>
            <input
              disabled
              placeholder="Search patients, calls, appointments..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pr-3 pl-9 text-sm text-slate-200 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
            />
          </label>
        </div>

        <p className="hidden shrink-0 text-xs text-slate-300 sm:block">
          Hospital workspace
        </p>
      </div>
    </header>
  );
}
