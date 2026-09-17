import type {
  AppShellNavigationIcon,
  AppShellNavigationItem,
} from "@/shared/ui/layout/app-shell";

import type { AuthorizationActor } from "../authentication/authorization";
import type { Permission, Role } from "../authentication/roles";

type NavigationDefinition = AppShellNavigationItem & {
  icon: AppShellNavigationIcon;
  permission?: Permission;
  roles?: readonly Role[];
};

const navigationDefinitions: NavigationDefinition[] = [
  {
    icon: "dashboard",
    label: "Overview",
    href: "/dashboard",
    key: "overview",
    group: "Workspace",
  },
  {
    icon: "phone",
    label: "Calls",
    href: "/calls",
    key: "calls",
    group: "Workspace",
    permission: "calls.read",
  },
  {
    icon: "calendar",
    label: "Appointments",
    href: "/appointments",
    key: "appointments",
    group: "Workspace",
    permission: "appointments.manage",
  },
  {
    icon: "follow-up",
    label: "Follow-ups",
    href: "/follow-ups",
    key: "follow-ups",
    group: "Workspace",
    permission: "follow_ups.manage",
  },
  {
    icon: "patient",
    label: "Patients",
    href: "/patients",
    key: "patients",
    group: "Workspace",
    permission: "patients.contact.read",
  },
  {
    icon: "report",
    label: "Reports",
    href: "/reports",
    key: "reports",
    group: "Workspace",
    permission: "reports.read",
  },
  {
    icon: "doctor",
    label: "Doctors",
    href: "/doctors",
    key: "doctors",
    group: "Care delivery",
    permission: "sessions.manage",
  },
  {
    icon: "department",
    label: "Departments",
    href: "/departments",
    key: "departments",
    group: "Care delivery",
    permission: "hospital.manage",
  },
  {
    icon: "schedule",
    label: "Schedules",
    href: "/schedules",
    key: "schedules",
    group: "Care delivery",
    permission: "sessions.manage",
    roles: ["doctor"],
  },
  {
    icon: "bot",
    label: "Voice agents",
    href: "/voice-agents",
    key: "voice-agents",
    group: "Voice & automation",
    permission: "hospital.manage",
  },
  {
    icon: "knowledge",
    label: "Knowledge",
    href: "/knowledge",
    key: "knowledge",
    group: "Voice & automation",
    permission: "hospital.manage",
  },
  {
    icon: "logs",
    label: "Call logs",
    href: "/call-logs",
    key: "call-logs",
    group: "Voice & automation",
    permission: "diagnostics.read",
  },
  {
    icon: "users",
    label: "Users & roles",
    href: "/admin/users",
    key: "users",
    group: "Administration",
    permission: "memberships.manage",
  },
  {
    icon: "hospital",
    label: "Hospital configuration",
    href: "/hospital-settings",
    key: "hospital-settings",
    group: "Administration",
    permission: "hospital.manage",
  },
  {
    icon: "integration",
    label: "Integrations",
    href: "/integrations",
    key: "integrations",
    group: "Administration",
    permission: "hospital.manage",
  },
  {
    icon: "audit",
    label: "Audit log",
    href: "/audit",
    key: "audit",
    group: "Administration",
    permission: "audits.read",
  },
];

function membershipCanSee(
  membership: AuthorizationActor["memberships"][number],
  item: NavigationDefinition,
) {
  if (item.roles?.includes(membership.role)) return true;
  if (!item.permission) return true;
  return membership.permissionCodes.has(item.permission);
}

export function getNavigationForActor(
  actor: AuthorizationActor,
): AppShellNavigationItem[] {
  return navigationDefinitions.filter((item) =>
    actor.memberships.some((membership) => membershipCanSee(membership, item)),
  );
}
