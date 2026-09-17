# Module 3 — Authentication and authorization

The first RBAC slice uses Supabase Auth for identity and the application tables
for hospital membership and authorization. Server components, server actions,
and route handlers all call the same authorization service; hiding a button is
never the security boundary.

## Authentication flow

1. `src/modules/authentication/supabase/server.ts` creates a cookie-backed SSR
   client for Server Components, Server Actions, and Route Handlers.
2. `src/proxy.ts` refreshes Auth cookies with `getClaims()` on requests.
3. `getAuthenticatedUser()` verifies the Auth claim and returns the Auth user
   subject. It does not trust an unverified client-provided profile ID.
4. `loadAuthorizationActor()` maps the subject to an active profile, active
   hospital memberships, role permissions, explicit membership overrides, and
   doctor-profile links.

Supabase Auth users are intentionally not created by the database seed. Create
an Auth user in the isolated development project first, then link it to any
active seeded profile for role testing:

```bash
npm run auth:link-profile -- siti.admin@example.test your-auth-email@example.test
npm run auth:link-profile -- amir.rahman@example.test doctor-test@example.test
npm run auth:link-profile -- alex.platform@example.test platform-test@example.test
```

The command uses the service key only from the trusted server environment. It
does not print or store the key, refuses to run in production, rejects inactive
profiles, and prevents one Auth user from being linked to multiple profiles.
The profile's seeded role and hospital membership are preserved; the command
does not assign roles.

## RBAC rules

The role enum is locked to:

`reception_staff`, `operations_manager`, `quality_reviewer`, `doctor`,
`hospital_admin`, and `platform_admin`.

Every authorization decision requires:

- a verified Auth subject;
- an active application profile;
- an active membership in the requested hospital;
- the requested explicit permission; and
- the correct record scope.

Doctors must supply a linked doctor scope for doctor-owned records. Platform
administrators need an explicit membership for each hospital they access, and
successful elevated authorization checks create audit events. Hospital
administrators manage users only in their own hospital. The UI cannot assign
`platform_admin`; that role requires controlled platform provisioning.

## Users and permissions UI

`/admin/users` provides:

- server-rendered hospital membership listing;
- invite-user form backed by Supabase Auth Admin API and a transactionally
  created profile/membership;
- role changes using the same authorization service exposed by the API;
- a default role permission matrix; and
- safe sign-out and error states.

The matching direct API endpoints are:

- `GET /api/admin/users?hospitalId=<id>`
- `POST /api/admin/users`
- `PATCH /api/admin/users/<membershipId>`

They return generic `401`, `403`, and `404` responses and never trust UI state.

RLS remains deny-by-default for browser roles. This is deliberate defense in
depth: browser/client roles receive no table policies, while the trusted
server authorization layer uses a controlled database connection and is the
active policy boundary. When Data API or realtime access is introduced, add
policies that mirror the same membership, role, permission, and ownership
checks before exposing those surfaces.
