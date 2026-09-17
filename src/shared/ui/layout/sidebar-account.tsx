"use client";

import type { ReactNode } from "react";
import { useState } from "react";

export function SidebarAccount({
  userName,
  roleLabel,
  signOut,
  collapsed,
}: {
  userName: string;
  roleLabel: string;
  signOut?: ReactNode;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative border-t border-slate-200 px-1 pt-3 pb-1">
      <div
        className={`group flex items-center gap-3 rounded-lg ${collapsed ? "justify-center" : "px-1"}`}
      >
        <button
          type="button"
          aria-label={`Open account menu for ${userName}`}
          aria-expanded={open}
          onClick={() => setOpen((isOpen) => !isOpen)}
          className="relative grid size-9 shrink-0 place-items-center rounded-full bg-teal-400 text-sm font-bold text-slate-950 transition-colors hover:bg-teal-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          {userName.slice(0, 1).toUpperCase()}
        </button>
        <div
          className={`min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-150 ease-out ${collapsed ? "pointer-events-none max-w-0 opacity-0" : "max-w-40 opacity-100"}`}
        >
          <p
            className="truncate text-sm font-semibold text-slate-800"
            title={userName}
          >
            {userName}
          </p>
          <p className="truncate text-xs text-slate-500" title={roleLabel}>
            {roleLabel}
          </p>
        </div>
        {open ? (
          <div className="absolute bottom-2 left-[calc(100%+8px)] z-50 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
            <div className="border-b border-slate-100 px-3 py-2">
              <p className="truncate text-sm font-semibold text-slate-800">
                {userName}
              </p>
              <p className="truncate text-xs text-slate-500">{roleLabel}</p>
            </div>
            <button
              type="button"
              disabled
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400"
            >
              Profile
            </button>
            <button
              type="button"
              disabled
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400"
            >
              Settings
            </button>
            {signOut ? (
              <div className="mt-1 border-t border-slate-100 pt-1">
                {signOut}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
