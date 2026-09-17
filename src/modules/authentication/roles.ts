export const roles = [
  "reception_staff",
  "operations_manager",
  "quality_reviewer",
  "doctor",
  "hospital_admin",
  "platform_admin",
] as const;

export type Role = (typeof roles)[number];

export const roleLabels: Record<Role, string> = {
  reception_staff: "Reception staff",
  operations_manager: "Operations manager",
  quality_reviewer: "Quality reviewer",
  doctor: "Doctor",
  hospital_admin: "Hospital administrator",
  platform_admin: "Platform administrator",
};

export const assignableRoles = roles.filter(
  (role): role is Exclude<Role, "platform_admin"> => role !== "platform_admin",
);

export const permissions = [
  "calls.read",
  "transcripts.read",
  "recordings.play",
  "recordings.download",
  "patients.contact.read",
  "appointments.manage",
  "sessions.manage",
  "follow_ups.manage",
  "reports.read",
  "exports.create",
  "audits.read",
  "diagnostics.read",
  "hospital.manage",
  "memberships.manage",
] as const;

export type Permission = (typeof permissions)[number];

export const permissionLabels: Record<Permission, string> = {
  "calls.read": "View calls",
  "transcripts.read": "View transcripts",
  "recordings.play": "Play recordings",
  "recordings.download": "Download recordings",
  "patients.contact.read": "View patient contact details",
  "appointments.manage": "Manage appointments",
  "sessions.manage": "Manage sessions",
  "follow_ups.manage": "Manage follow-ups",
  "reports.read": "View reports",
  "exports.create": "Export operational data",
  "audits.read": "View audit history",
  "diagnostics.read": "View technical diagnostics",
  "hospital.manage": "Manage hospital configuration",
  "memberships.manage": "Manage hospital users and roles",
};

export const defaultRolePermissions: Record<Role, readonly Permission[]> = {
  reception_staff: [
    "calls.read",
    "transcripts.read",
    "recordings.play",
    "appointments.manage",
    "follow_ups.manage",
  ],
  operations_manager: [
    "calls.read",
    "transcripts.read",
    "recordings.play",
    "patients.contact.read",
    "appointments.manage",
    "sessions.manage",
    "follow_ups.manage",
    "reports.read",
    "exports.create",
    "audits.read",
  ],
  quality_reviewer: [
    "calls.read",
    "transcripts.read",
    "recordings.play",
    "reports.read",
  ],
  doctor: ["calls.read", "transcripts.read", "recordings.play"],
  hospital_admin: [
    "calls.read",
    "transcripts.read",
    "recordings.play",
    "recordings.download",
    "patients.contact.read",
    "appointments.manage",
    "sessions.manage",
    "follow_ups.manage",
    "reports.read",
    "exports.create",
    "audits.read",
    "hospital.manage",
    "memberships.manage",
  ],
  platform_admin: ["diagnostics.read", "audits.read"],
};

export function isRole(value: string): value is Role {
  return (roles as readonly string[]).includes(value);
}

export function isPermission(value: string): value is Permission {
  return (permissions as readonly string[]).includes(value);
}
