import type { ReactNode } from "react";
import Link from "next/link";
import { useRef, useState } from "react";

import type {
  AppShellNavigationIcon,
  AppShellNavigationItem,
} from "./app-shell";
import { SidebarAccount } from "./sidebar-account";

function SidebarIcon({ name }: { name: AppShellNavigationIcon }) {
  const paths: Record<AppShellNavigationIcon, string> = {
    dashboard: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    phone:
      "M5 4h3l2 5-2 1.5a14 14 0 0 0 5.5 5.5L15 14l5 2v3a2 2 0 0 1-2 2C10.3 20.5 3.5 13.7 3 5a2 2 0 0 1 2-1Z",
    calendar: "M6 3v3M18 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Z",
    "follow-up": "M5 5h14v14H5zM8 9h8M8 13h5",
    patient: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
    report: "M5 20V10M12 20V4M19 20v-7",
    doctor:
      "M12 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM5 20a7 7 0 0 1 14 0M12 13v4M10 15h4",
    department: "M4 20V8l8-4 8 4v12M8 20v-5h8v5M8 10h.01M12 10h.01M16 10h.01",
    schedule: "M4 19h16M6 17V7l6-4 6 4v10M9 17v-4h6v4",
    bot: "M12 3v3M8 10h.01M16 10h.01M8 15h8M5 7h14v12H5z",
    knowledge: "M5 5h14v14H5zM8 9h8M8 13h6",
    logs: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
    users:
      "M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM16 3a4 4 0 0 1 0 7",
    hospital: "M4 21V5h16v16M9 9h6M12 6v6M8 21v-4h8v4",
    integration: "M8 12h8M12 8v8M5 5h4v4H5zM15 15h4v4h-4z",
    audit: "M12 3 19 6v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3ZM9 12l2 2 4-4",
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[18px] shrink-0"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function Sidebar({
  navigation,
  pathname,
  userName,
  roleLabel,
  signOut,
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  navigation: AppShellNavigationItem[];
  pathname: string;
  userName: string;
  roleLabel: string;
  signOut?: ReactNode;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate: () => void;
}) {
  const [tooltip, setTooltip] = useState<{
    label: string;
    top: number;
    left: number;
  } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTooltip = () => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = null;
    setTooltip(null);
  };
  const showTooltip = (label: string, bounds: DOMRect) => {
    if (!collapsed) return;
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => {
      setTooltip({
        label,
        top: bounds.top - 64 + bounds.height / 2,
        left: bounds.right + 8,
      });
    }, 80);
  };
  const groups = navigation.reduce<Map<string, AppShellNavigationItem[]>>(
    (result, item) => {
      const items = result.get(item.group) ?? [];
      items.push(item);
      result.set(item.group, items);
      return result;
    },
    new Map(),
  );

  return (
    <aside
      className={`flex h-full min-h-0 flex-col bg-white ${collapsed ? "p-2" : "p-3 lg:p-5"}`}
    >
      <div
        className={`mb-4 flex shrink-0 ${collapsed ? "justify-center" : "justify-start"}`}
      >
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleCollapse}
          className="grid size-9 place-items-center rounded-lg bg-slate-900 text-slate-300 transition-colors duration-150 hover:bg-teal-900 hover:text-teal-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-[17px]"
          >
            <path d="M4 5h16v14H4zM9 5v14" />
            {collapsed ? (
              <path d="m13 9 3 3-3 3M16 12H11" />
            ) : (
              <path d="m11 9-3 3 3 3M8 12h5" />
            )}
          </svg>
        </button>
      </div>
      <nav
        aria-label="Primary navigation"
        className="sidebar-nav min-h-0 flex-1 overflow-y-auto"
      >
        <div className="space-y-4">
          {[...groups.entries()].map(([group, items], groupIndex) => (
            <section key={group} aria-labelledby={`nav-${group}`}>
              {collapsed && groupIndex > 0 ? (
                <div
                  aria-hidden="true"
                  className="mx-auto mb-3 h-px w-6 bg-slate-200"
                />
              ) : null}
              <h2
                id={`nav-${group}`}
                className={`mb-1 max-h-5 overflow-hidden px-3 text-[0.68rem] font-bold tracking-[0.16em] text-slate-400 uppercase transition-opacity duration-150 ease-out ${collapsed ? "opacity-0" : "opacity-100"}`}
              >
                {group}
              </h2>
              <ul
                className={`space-y-0.5 ${collapsed ? "flex flex-col items-center" : ""}`}
              >
                {items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href));
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={onNavigate}
                        onMouseEnter={(event) =>
                          showTooltip(
                            item.label,
                            event.currentTarget.getBoundingClientRect(),
                          )
                        }
                        onMouseLeave={clearTooltip}
                        onFocus={(event) => {
                          showTooltip(
                            item.label,
                            event.currentTarget.getBoundingClientRect(),
                          );
                        }}
                        onBlur={clearTooltip}
                        className={`group relative flex min-h-9 items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${collapsed ? "size-10 shrink-0 justify-center px-0" : "px-3"} ${active ? "bg-teal-50 font-semibold text-teal-800 before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-teal-600" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
                      >
                        <SidebarIcon name={item.icon} />
                        <span
                          className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-150 ease-out ${collapsed ? "pointer-events-none max-w-0 opacity-0" : "max-w-40 opacity-100"}`}
                        >
                          {item.label}
                        </span>
                        {item.badge && !collapsed ? (
                          <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.65rem] font-bold text-amber-800">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </nav>
      <SidebarAccount
        userName={userName}
        roleLabel={roleLabel}
        signOut={signOut}
        collapsed={collapsed}
      />
      {tooltip ? (
        <span
          role="tooltip"
          className="pointer-events-none fixed z-[100] -translate-y-1/2 rounded-md bg-slate-950 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-100 shadow-lg transition-opacity duration-150"
          style={{ top: tooltip.top, left: tooltip.left }}
        >
          {tooltip.label}
        </span>
      ) : null}
    </aside>
  );
}
