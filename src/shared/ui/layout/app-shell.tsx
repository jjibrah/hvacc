import type { ReactNode } from "react";

const navigation = [
  { label: "Overview", href: "#overview", current: true },
  { label: "Calls", href: "#calls", current: false },
  { label: "Appointments", href: "#appointments", current: false },
  { label: "Follow-ups", href: "#follow-ups", current: false },
  { label: "Configuration", href: "#configuration", current: false },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold">CodeXGate</p>
            <p className="text-xs text-slate-300">Prince Court Test Hospital</p>
          </div>
          <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-200">
            Demonstration only
          </span>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl lg:grid-cols-[15rem_1fr]">
        <nav
          aria-label="Primary navigation"
          className="border-b border-slate-200 bg-white p-4 lg:min-h-[calc(100vh-73px)] lg:border-r lg:border-b-0 lg:p-6"
        >
          <ul className="flex gap-2 overflow-x-auto lg:flex-col">
            {navigation.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  aria-current={item.current ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                    item.current
                      ? "bg-teal-50 text-teal-800"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main id="overview" className="min-w-0 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
