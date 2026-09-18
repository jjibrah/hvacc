# Hospital Voice Agent Control Center — Refined Delivery Roadmap

This roadmap follows the revised implementation order:

1. Make the backend functional and trustworthy.
2. Make the frontend functional against the backend contracts.
3. Connect the Retell agent to the dashboard and verify the live path.
4. Build AI chat configuration only after the preceding layers are stable.

This remains a private, non-production learning project. All hospitals, people,
calls, and provider data must remain synthetic until separately approved.

## Delivery rules

- PostgreSQL is the source of truth and is accessed through Drizzle.
- Retell is accessed only through server-side provider adapters.
- Every hospital-owned record and request is hospital-scoped.
- UI visibility never replaces server-side authorization.
- Provider evidence is stored before it is interpreted or projected.
- Unknown, pending, stale, and failed states are explicit.
- Every mutation has validation, safe errors, concurrency behavior, and audit evidence.
- A module is complete only when its code, tests, documentation, and exit gate are complete.

## Progress summary

| Module | Phase | Status | Exit gate |
| --- | --- | --- | --- |
| 0. Decisions and prerequisites | Foundation | In progress | Scope, owners, synthetic data, and provider resources are documented |
| 1. Application foundation | Foundation | In progress | A developer can install, test, build, and run the app |
| 2. Core database and domain model | Backend | Complete | Fresh migrations and deterministic seed succeed |
| 3. Identity and authorization backend | Backend | In progress | Every operation has tested auth, membership, permission, and scope checks |
| 4. Hospital administration backend | Backend | In progress | Configuration, users, departments, and doctors are manageable through APIs |
| 5. Scheduling and appointment backend | Backend | In progress | Availability, capacity, booking, cancellation, and rescheduling are transactional |
| 6. Retell provider backend | Backend | In progress | Retell inventory, event receipt, evidence, and sync status are reliable |
| 7. Operational backend | Backend | Not started | Calls, follow-ups, handoffs, and diagnostics have complete server workflows |
| 8. Frontend application shell | Frontend | Partially complete | The client works against typed backend contracts and handles failure states |
| 9. Frontend administration | Frontend | Partially complete | Administrators can complete hospital administration tasks from the dashboard |
| 10. Frontend operations and dashboard | Frontend | Not started | Staff workflows work and metrics reconcile to backend records |
| 11. Retell agent-to-dashboard connection | Integration | Not started | A test call can be traced from Retell into the dashboard |
| 12. AI chat configuration | AI configuration | Deferred | Chat configuration is built on verified provider and audit contracts |
| 13. Hardening, acceptance, and handover | Release | Not started | Security, failure, accessibility, deployment, and acceptance evidence are complete |

## Module 0 — Decisions and prerequisites

- [x] Confirm synthetic hospital identity, stable key, timezone, currency, and contacts.
- [x] Confirm six locked roles and baseline permission matrix.
- [x] Define doctor ownership, scheduling, appointment, follow-up, and reporting rules.
- [x] Provision isolated Supabase and Retell development resources.
- [ ] Record approved Retell agent, version, phone number, routing, tool, webhook, and knowledge identifiers.
- [x] Document synthetic-only use, development endpoint, and test-call cost ownership.

Exit gate: product, security, provider, and test-data decisions are recorded without secrets.

## Module 1 — Application foundation

- [x] Next.js App Router, React, TypeScript, npm, Tailwind, strict types, linting, and formatting.
- [x] Server-only/public environment validation and `.env.example`.
- [x] Domain, database, integration, route, UI, and test boundaries.
- [x] Unit, integration, and Playwright tooling.
- [x] Base app shell, navigation, loading, error, and not-found handling.
- [x] CI and setup documentation.
- [ ] Add conventions for request IDs, structured logs, and background jobs.

Exit gate: a new developer can clone, configure, test, build, and run the application.

## Module 2 — Core database and domain model

- [x] Model hospitals, configuration, profiles, memberships, roles, permissions, doctor links, departments, doctors, schedules, sessions, capacity, callers, patients, appointments, calls, recordings, transcripts, analyses, follow-ups, handoffs, Retell inventory, knowledge sources, provider events, idempotency, and audits.
- [x] Add scoped foreign keys, uniqueness constraints, indexes, lifecycle checks, timestamps, soft deletion, and RLS defaults.
- [x] Add deterministic synthetic seed data and migration tests.
- [x] Add migration `0004_hospital_admin_invariant.sql` and keep the Drizzle journal current.

Exit gate: fresh databases migrate and seed deterministically; invalid ownership and state transitions are rejected by the database.

## Module 3 — Identity and authorization backend

- [x] Supabase Auth session verification and active profile loading.
- [x] Central authorization for hospital, doctor, and membership scope.
- [x] Locked roles and default permission matrix.
- [x] Protect initial users APIs and admin actions server-side.
- [ ] Apply the same boundary to every service, API, webhook projection, search, export, download, and realtime surface.
- [ ] Standardize safe `401`, `403`, `404`, and `409` responses.
- [ ] Add negative tests proving every non-administrator role is rejected from hospital configuration and membership mutations.
- [ ] Add defense-in-depth database policies before exposing Data API or realtime access.

Exit gate: direct requests cannot bypass UI permissions or leak cross-hospital record existence.

## Module 4 — Hospital administration backend

- [x] Hospital identity/configuration validation and update service.
- [x] Membership listing, invitation, locked-role assignment, status changes, and administrator-retention checks.
- [x] Department and doctor create/update functions with scoped ownership validation.
- [x] Provider inventory read model for agents, versions, numbers, integrations, and knowledge sources.
- [x] Audit events for access, role, configuration, department, doctor, and provider events.
- [x] `updatedAt` compare-and-swap and safe conflict errors.
- [x] API routes for hospital, users, membership status, departments, doctors, inventory, and audit events.
- [x] Move administration services into `src/modules/hospital-administration/server` and keep authentication focused on identity/RBAC.
- [x] Add API contract tests for authorized, unauthorized, malformed, cross-hospital, stale, and duplicate requests.
- [ ] Add integration mutations after provider sync rules are defined.

Exit gate: hospital administrators can manage permitted configuration through APIs; every other role is rejected; the final active administrator cannot be removed or demoted.

## Module 5 — Scheduling and appointment backend

- [x] Implement recurring schedules, dated sessions, closures, exceptions, and timezone-aware availability.
- [x] Make the backend the sole availability authority.
- [x] Implement transactional final-slot reservation and capacity release.
- [x] Implement caller/patient distinction and safe matching.
- [x] Require explicit confirmation and idempotency for booking.
- [x] Implement exactly-once cancellation and atomic rescheduling.
- [x] Preserve appointment history and audit every mutation.
- [ ] Test retries, family bookings, timezone boundaries, closed sessions, and concurrent final-slot requests.

Exit gate: only one of two concurrent requests can consume the final slot; retries do not duplicate or corrupt appointments.

## Module 6 — Retell provider backend

- [ ] Define a provider-neutral interface for inventory, versions, numbers, routing, knowledge, health, and events.
- [ ] Implement a server-only Retell client using `RETELL_API_KEY`.
- [x] Implement append-only, idempotent Retell event receipt with hashing and provider audit events.
- [x] Protect the development webhook with a server-only shared secret.
- [ ] Verify the current Retell signature contract and fail closed when verification is unconfigured.
- [ ] Implement inventory synchronization with freshness, last-success, last-attempt, and safe error fields.
- [ ] Capture agent, version, number, routing, and knowledge snapshots for historical calls.
- [ ] Add replay, late-event, partial-event, unknown-event, and outage handling.

Exit gate: provider records are durable before processing, duplicates are harmless, invalid authentication is rejected, and historical calls identify their exact provider configuration.

## Module 7 — Operational backend

- [ ] Implement call lifecycle, transcript, recording, analysis, outcome, cost, and evidence projections.
- [ ] Implement follow-up creation, assignment, transitions, escalation, resolution, and activity history.
- [ ] Keep handoff requested, attempted, accepted, and failed states separate and evidence-backed.
- [ ] Add diagnostics, health/readiness, retry, timeout, dead-letter, and recovery workflows.
- [ ] Independently authorize and audit sensitive access, playback, download, export, and elevated actions.

Exit gate: calls and unresolved journeys are traceable without claiming outcomes the backend cannot prove.

## Module 8 — Frontend application shell

- [x] Authenticated app shell and permission-aware navigation.
- [x] Shared loading, error, forbidden, success, and failure presentation.
- [ ] Connect screens to typed API/query functions rather than direct domain assumptions.
- [ ] Add pending, retry, stale-data, optimistic-update, conflict, empty, and provider-outage states.
- [ ] Add accessibility, responsive, keyboard, focus, and form validation checks.

Exit gate: the frontend is a reliable client of backend contracts and never treats hidden controls as security.

## Module 9 — Frontend administration

- [x] Hospital identity/configuration screen.
- [x] Users, roles, membership status, and permission matrix screen.
- [x] Department and doctor screens.
- [x] Agent, version, phone number, integration, knowledge, and audit views.
- [ ] Replace provisional server-action forms with typed API mutations where appropriate.
- [ ] Display server validation, stale-write conflicts, forbidden state, audit confirmation, and provider freshness clearly.
- [ ] Add browser tests for administrator workflows and rejection of other roles.

Exit gate: an administrator can complete hospital administration from the dashboard; non-administrators cannot complete it through direct APIs.

## Module 10 — Frontend operations and dashboard

- [ ] Build schedules, availability, appointments, callers, patients, calls, follow-ups, and handoff workflows.
- [ ] Build operational metrics from typed backend queries.
- [ ] Make every metric drill down to authorized source records.
- [ ] Gate patient details, transcripts, playback, downloads, exports, and diagnostics independently.
- [ ] Represent pending, unknown, stale, incomplete, and failed data honestly.
- [ ] Add seed-data reconciliation and browser acceptance tests.

Exit gate: permitted staff can perform their workflows end to end and metrics reconcile to backend records.

## Module 11 — Retell agent-to-dashboard connection

- [ ] Configure an isolated Retell development number and agent route.
- [ ] Connect the Retell webhook to the ingestion endpoint.
- [ ] Run a synthetic test call through the selected agent/version/number.
- [ ] Verify event receipt, deduplication, call projection, audit trail, and dashboard visibility.
- [ ] Verify invalid authentication, duplicate, late, unavailable-provider, and partial-event paths.
- [ ] Document routing, rollback, replay, and support procedures.

Exit gate: a reviewer can place a synthetic call and trace it from Retell to durable backend evidence and the dashboard without manual database edits.

## Module 12 — AI chat configuration (deferred)

- [ ] Define chat configuration as a versioned, auditable resource tied to an agent/provider version.
- [ ] Build configuration for prompts, approved knowledge, tools, languages, safety rules, and routing.
- [ ] Validate before publishing and require administrator approval.
- [ ] Preserve draft, published, failed, and rolled-back versions.
- [ ] Test prompt/tool/knowledge changes against synthetic conversations.
- [ ] Keep Retell secrets out of the browser and prevent browser-side provider mutation.

Exit gate: approved chat configuration publishes to the intended development agent, is traceable, rollback-safe, and audited.

## Module 13 — Hardening, acceptance, and handover

- [ ] Add structured logs and correlation identifiers without leaking secrets or unnecessary patient data.
- [ ] Add rate limits, request-size limits, webhook replay protection, and secret rotation procedures.
- [ ] Complete accessibility, responsive, authorization, migration, API, provider, browser, outage, and concurrency evidence.
- [ ] Add deployment, backup, migration, monitoring, alert ownership, and incident runbooks.
- [ ] Review synthetic-content boundaries and explicitly defer production approval concerns.

Exit gate: the backend, frontend, and Retell connection are reproducible, observable, tested, and ready for the separately approved AI configuration phase.

## Current next slice

1. Add backend/API contract tests for Modules 3–6.
2. Create the provider-neutral Retell client and inventory synchronization worker.
3. Add typed frontend API/query boundaries and administrator browser tests.
4. Complete scheduling and appointment backend workflows.
5. Perform the first synthetic Retell call-to-dashboard trace.
6. Start Module 12 only after Module 11 passes its exit gate.
