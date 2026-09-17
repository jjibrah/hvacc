"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";

import { AppHeader } from "./app-header";
import { Sidebar } from "./sidebar";

export type AppShellNavigationItem = {
  label: string;
  href: string;
  key: string;
  group: string;
  badge?: string;
  icon: AppShellNavigationIcon;
};

export type AppShellNavigationIcon =
  | "dashboard"
  | "phone"
  | "calendar"
  | "follow-up"
  | "patient"
  | "report"
  | "doctor"
  | "department"
  | "schedule"
  | "bot"
  | "knowledge"
  | "logs"
  | "users"
  | "hospital"
  | "integration"
  | "audit";

export function AppShell({
  children,
  navigation,
  hospitalName = "Hospital workspace",
  userName = "Signed-in user",
  roleLabel = "Staff member",
  signOut,
}: {
  children: ReactNode;
  navigation: AppShellNavigationItem[];
  hospitalName?: string;
  userName?: string;
  roleLabel?: string;
  signOut?: ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-950">
      <AppHeader
        hospitalName={hospitalName}
        onMobileMenuOpen={() => setSidebarOpen(true)}
      />

      <div className="relative flex min-h-0 w-full flex-1">
        {sidebarOpen ? (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 top-16 z-20 bg-slate-950/35 lg:hidden"
          />
        ) : null}

        <div
          className={`fixed inset-y-0 top-16 left-0 z-30 h-[calc(100vh-4rem)] w-72 border-r border-slate-300 shadow-xl transition-[width,transform] duration-200 lg:static lg:z-auto lg:block lg:h-full lg:shrink-0 lg:translate-x-0 lg:shadow-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} ${sidebarCollapsed ? "lg:w-[76px]" : "lg:w-64"}`}
        >
          <Sidebar
            navigation={navigation}
            pathname={pathname}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() =>
              setSidebarCollapsed((collapsed) => !collapsed)
            }
            userName={userName}
            roleLabel={roleLabel}
            signOut={signOut}
            onNavigate={() => setSidebarOpen(false)}
          />
        </div>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
