# Hospital Voice Agent Control Center — Delivery Roadmap

This document is the implementation checklist from an empty repository to a complete, demonstrable platform. Check an item only when its code, tests, documentation, and relevant evidence are complete.

Project boundary: this is a private, non-production learning project. The project developer acts as product owner, technical owner, and provisional security reviewer; formal hospital and clinical approvals are not applicable while all content remains synthetic.

## Delivery principles

- Build one full-stack Next.js application using TypeScript and npm.
- Treat PostgreSQL as the operational source of truth and access it through Drizzle ORM.
- Keep Retell behind server-side provider interfaces; never expose provider or service-role secrets to the browser.
- Store `hospital_id` explicitly on every hospital-owned record.
- Keep call, AI outcome, appointment, follow-up, and handoff lifecycles independent.
- Treat appointment records as the authority for bookings and capacity.
- Enforce authorization on the server for pages, APIs, searches, exports, downloads, recordings, and real-time updates.
- Use only synthetic people and isolated development integrations until production use is separately approved.
- Build each module as a vertical slice: schema, service, authorization, API, UI, tests, audit, and documentation.

## Progress summary

| Module | Status | Completion gate |
| --- | --- | --- |
| 0. Decisions and prerequisites | In progress | Required decisions and development accounts are recorded |
| 1. Repository and application foundation | In progress | A new developer can run checks and start the app |
| 2. Database and domain model | Not started | Migrations and deterministic synthetic seeds work |
| 3. Authentication and authorization | Not started | All six roles pass server-side access tests |
| 4. Hospital and staff administration | Not started | Admin can safely manage hospital users and settings |
| 5. Scheduling and capacity | Not started | Concurrent booking cannot overbook a session |
| 6. Caller, patient, and appointment management | Not started | Booking, cancellation, and rescheduling are idempotent |
| 7. Retell configuration inventory | Not started | Exact development routing and versions are visible |
| 8. Retell tools and webhook ingestion | Not started | Signed, duplicate, late, and partial events are handled |
| 9. Calls and conversation review | Not started | Staff can explain a call using source evidence |
| 10. Follow-up and handoff | Not started | An unresolved journey creates owned, traceable work |
| 11. Dashboard and reporting | Not started | Every metric reconciles with its underlying records |
| 12. Knowledge visibility | Not started | Readiness reflects indexing and agent connection state |
| 13. Audit, diagnostics, and resilience | Not started | Failures are observable and important actions auditable |
| 14. Accessibility and user experience | Not started | Required accessibility and responsive checks pass |
| 15. Test automation and acceptance evidence | Not started | All PRD acceptance cases have recorded evidence |
| 16. Deployment and operational handover | Not started | Staging is reproducible and support ownership is clear |
| 17. Production-readiness review | Not started | Explicit approval is recorded for every production concern |

## Module 0 — Decisions and prerequisites

- [x] Confirm the first hospital name, stable identifier, timezone, default currency, and synthetic contact details.
- [x] Record the learning-project ownership model for product, synthetic content, provisional security review, and technical operations.
- [x] Convert the six locked roles into an agreed permission matrix covering resources and actions.
- [x] Decide which roles may view transcripts, play recordings, download recordings, view patient contact details, export data, view audits, and view technical diagnostics.
- [x] Define doctor ownership rules, including cover arrangements and delegated access.
- [x] Define follow-up assignment, due-time, escalation, and resolution policies.
- [x] Define appointment cancellation, rescheduling, capacity, and session-closing rules.
- [x] Write metric definitions before implementing reporting.
- [x] Provision a separate development Supabase project.
- [x] Provision isolated development Retell agents and a browser-call test facility.
- [ ] Record approved agent, version, number, routing, tool, webhook, and knowledge identifiers.
- [x] Agree on a public development endpoint or tunnel approach and assign test-call cost ownership to the project developer; paid calls require a separately recorded budget.
- [x] Approve a synthetic dataset containing hospital, staff, doctors, sessions, callers, patients, and expected outcomes for learning use only.

Exit gate: required decisions, owners, development resources, and synthetic data are documented without committing secrets.

## Module 1 — Repository and application foundation

- [x] Initialize a valid Git repository and define the branching and review workflow.
- [x] Scaffold Next.js with the App Router, React, TypeScript, npm, and Tailwind CSS.
- [x] Add strict TypeScript, ESLint, formatting, import boundaries, and scripts for all checks.
- [x] Define a maintainable structure for routes, UI components, domain services, database code, integrations, authorization, and tests.
- [x] Add environment-variable validation with separate server-only and public schemas.
- [x] Add `.env.example` containing names and explanations but no credentials.
- [x] Add unit/integration test tooling and browser end-to-end testing.
- [x] Add React Query at the application boundary; add Zustand only if a concrete UI-state need appears.
- [x] Create a base application shell with accessible navigation, loading states, error boundaries, and not-found handling.
- [x] Add CI checks for install, type-check, lint, tests, and build.
- [x] Write setup, local-development, test, and troubleshooting instructions.

Verification: formatting, ESLint/import boundaries, strict TypeScript, three unit tests, and the production build pass locally. The Playwright test is configured, Chromium is downloaded, and CI installs its operating-system dependencies automatically. Local execution remains pending because this machine requires an interactive administrator password to install `libnspr4.so` and related browser libraries.

Exit gate: a new developer can clone, configure, test, build, and run the application from the documentation. Database migration and seed commands are introduced and verified in Module 2.

## Module 2 — Database and domain model

- [ ] Configure PostgreSQL/Supabase and Drizzle ORM.
- [ ] Establish conventions for UUIDs, timestamps, hospital timezones, soft deletion, enums, and personally identifiable information.
- [ ] Model hospitals and hospital configuration.
- [ ] Model authenticated profiles, hospital memberships, roles, explicit permissions, and doctor-profile links.
- [ ] Model departments, doctors, schedules, sessions, capacity, and session exceptions.
- [ ] Model callers and patients as separate entities with appropriate links.
- [ ] Model appointments and appointment history.
- [ ] Model calls, call participants, transcripts, recordings, analysis, and provider snapshots.
- [ ] Model the many-to-many relationship between calls and appointments.
- [ ] Model follow-ups, assignments, activity history, and handoff evidence.
- [ ] Model Retell agents, versions, phone numbers, routing snapshots, integrations, and knowledge sources.
- [ ] Model immutable provider events for deduplication and replay investigation.
- [ ] Model idempotency records for booking, cancellation, and rescheduling.
- [ ] Model audit events with actor, action, target, result, and safe before/after data.
- [ ] Add foreign keys, uniqueness constraints, indexes, check constraints, and hospital-scoping safeguards.
- [ ] Add migrations and deterministic synthetic seed data.
- [ ] Add schema tests for ownership, lifecycle constraints, uniqueness, and referential integrity.

Exit gate: a fresh database can be migrated and seeded deterministically, and invalid cross-hospital or invalid-state relationships are rejected.

## Module 3 — Authentication and authorization

- [ ] Integrate Supabase Auth using secure server-side sessions.
- [ ] Implement the locked role identifiers: `reception_staff`, `operations_manager`, `quality_reviewer`, `doctor`, `hospital_admin`, and `platform_admin`.
- [ ] Implement centralized authorization using identity, hospital membership, role, record ownership, and explicit permissions.
- [ ] Restrict hospital roles to their assigned hospital.
- [ ] Restrict doctors to their own schedules, sessions, and relevant appointment records.
- [ ] Restrict hospital user/access and configuration management to `hospital_admin`.
- [ ] Limit `platform_admin` to explicitly authorised hospitals and audit every elevated action.
- [ ] Protect server components, route handlers, mutations, background handlers, search, export, download, and real-time subscriptions.
- [ ] Decide and implement defense-in-depth database policies where appropriate.
- [ ] Return safe `401`, `403`, and `404` responses without leaking record existence.
- [ ] Add positive and negative authorization tests for every role and sensitive data class.

Exit gate: direct API requests cannot bypass the same permissions applied by the UI.

## Module 4 — Hospital and staff administration

- [ ] Build hospital identity and configuration pages.
- [ ] Build hospital user and membership management for administrators.
- [ ] Support role assignment only from the locked role set.
- [ ] Prevent removal or demotion that would leave the hospital without an administrator.
- [ ] Build department and doctor administration.
- [ ] Display connected agents, versions, phone numbers, integrations, and approved knowledge sources.
- [ ] Audit access, role, configuration, and integration changes.
- [ ] Add validation, optimistic-concurrency handling, and meaningful failure states.

Exit gate: a hospital administrator can manage permitted hospital configuration while every other hospital role is rejected server-side.

## Module 5 — Scheduling and capacity

- [ ] Implement recurring schedules, dated sessions, capacity, closures, and exceptions.
- [ ] Make the backend the sole authority for availability.
- [ ] Implement availability queries by hospital, department, doctor, date, and eligibility rules.
- [ ] Implement transactional capacity reservation and release.
- [ ] Lock or otherwise serialize competing requests for the final slot.
- [ ] Make session changes preserve appointment and audit history.
- [ ] Build schedule views for permitted staff.
- [ ] Build the doctor view restricted to the signed-in doctor's records.
- [ ] Test timezone boundaries, daylight-saving behavior where relevant, and concurrent last-slot requests.

Exit gate: two concurrent requests for one remaining place result in one confirmed appointment and one clear failure.

## Module 6 — Caller, patient, and appointment management

- [ ] Implement caller search and safe caller matching.
- [ ] Support a caller booking for themselves or a distinct patient.
- [ ] Avoid unsafe automatic merging of people who share names or phone numbers.
- [ ] Implement appointment creation only after explicit confirmation.
- [ ] Require and enforce idempotency keys for booking operations.
- [ ] Implement cancellation with exactly-once capacity release.
- [ ] Implement atomic rescheduling that reserves the replacement safely and preserves history.
- [ ] Implement `CONFIRMED`, `COMPLETED`, `CANCELLED`, and `NO_SHOW` transitions.
- [ ] Build appointment list, detail, creation, cancellation, and rescheduling interfaces.
- [ ] Record actor, source, call link, timestamps, reason, and audit evidence for mutations.
- [ ] Test retry behavior, returning callers, family-member bookings, and conflicting mutations.

Exit gate: appointment state and capacity remain correct through retries, cancellation, rescheduling, and family-member scenarios.

## Module 7 — Retell configuration inventory

- [ ] Define a provider-neutral voice integration interface and a Retell implementation.
- [ ] Store the development phone number purpose, agent identity, language, role, published version, selected version, routing, and connected knowledge.
- [ ] Distinguish the agent's published version from the version selected by the number.
- [ ] Record connection status, last successful check, last attempted check, and safe error detail.
- [ ] Preserve agent, version, number, and routing snapshots on historical calls.
- [ ] Keep production routing read-only in the first release.
- [ ] Document isolated development changes and a rollback path.
- [ ] Build an administrator inventory page with honest unknown and stale states.

Exit gate: a reviewer can identify the exact number, route, agent, language, and version used by a historical call.

## Module 8 — Retell tools and webhook ingestion

- [ ] Implement server-side tools for availability lookup and confirmed booking.
- [ ] Validate all provider tool inputs and return structured, safe errors.
- [ ] Ensure booking cannot occur without explicit confirmation data and a successful database commit.
- [ ] Capture the original raw webhook body.
- [ ] Verify Retell signatures using the current provider contract and fail closed if verification is unconfigured.
- [ ] Store provider event identifiers and payload metadata before processing.
- [ ] Deduplicate repeated events without repeating calls, appointments, follow-ups, or audit effects.
- [ ] Handle late, partial, unknown, and out-of-order events.
- [ ] Separate receipt from processing when retries or background work are required.
- [ ] Add replay-safe fixtures for every supported event type.
- [ ] Measure event receipt-to-visibility latency.

Exit gate: valid events update the platform; invalid signatures are rejected; repeated or reordered events cannot corrupt state.

## Module 9 — Calls and conversation review

- [ ] Implement independent call lifecycle and AI-outcome fields.
- [ ] Build call search/filtering by date, agent, number, language, purpose, outcome, and booking relationship.
- [ ] Build call detail showing timing, participants, provider identity, routing snapshot, transcript, recording state, summary, and analysis.
- [ ] Display provider/source evidence separately from application or AI interpretation.
- [ ] Link each call to zero, one, or multiple appointments.
- [ ] Link unresolved work and follow-up activity.
- [ ] Represent pending analysis, incomplete transcripts, missing recordings, unknown costs, delayed events, and provider outages honestly.
- [ ] Gate transcript viewing, recording playback, recording download, and patient details independently.
- [ ] Audit sensitive playback, download, and export actions as agreed.
- [ ] Verify multilingual text, long speaker turns, and missing data states.

Exit gate: an authorised reviewer can find a call and explain what was said, what the provider inferred, and what actually happened.

## Module 10 — Follow-up and handoff

- [ ] Create follow-ups for failed bookings, unresolved enquiries, unavailable services, requested human contact, and technical failures.
- [ ] Implement `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, and `CANCELLED` transitions.
- [ ] Derive overdue state from the due time rather than storing an independent flag.
- [ ] Store reason, owner, due time, source, resolution condition, and activity history.
- [ ] Build queue, filters, detail, assignment, progress, and resolution workflows.
- [ ] Keep escalation request, handoff attempt, and handoff acceptance as separate evidence-backed states.
- [ ] Prevent the UI and reports from claiming a live transfer without evidence.
- [ ] Notify or surface overdue and unassigned work according to the agreed policy.

Exit gate: a failed journey generates understandable work with an owner, due time, recovery action, history, and explicit resolution.

## Module 11 — Dashboard and reporting

- [ ] Write a metric catalogue defining population, period, timezone, currency, numerator, denominator, exclusions, unknowns, and drill-down target.
- [ ] Implement operational overview metrics from server-side queries.
- [ ] Separate calls from bookings and AI-assessed success from verified outcomes.
- [ ] Separate bookings created during a period from appointments scheduled during that period.
- [ ] Show analysis coverage and unknown values separately from zero.
- [ ] Build demand, schedule, capacity, unsuccessful journey, unresolved work, and booking-outcome views.
- [ ] Make every metric navigate to its underlying filtered records.
- [ ] Apply role, hospital, patient-data, transcript, and export permissions to reports.
- [ ] Add safe CSV/export functionality only for authorised roles if approved.
- [ ] Reconcile every metric against deterministic seed data and mutation tests.

Exit gate: every displayed number has a written definition and exactly matches the underlying authorised records.

## Module 12 — Knowledge visibility

- [ ] Model approved knowledge sources and their provider identifiers.
- [ ] Display processing, indexed, failed, obsolete, and unknown states.
- [ ] Verify both indexing readiness and agent connection before showing ready status.
- [ ] Record last check time, data freshness, and safe failure details.
- [ ] Allow quality reviewers to record improvement observations without directly changing approved content.
- [ ] Restrict knowledge-source management to hospital administrators.
- [ ] Audit source and connection changes.

Exit gate: the platform never equates upload completion with an indexed source connected to the active agent version.

## Module 13 — Audit, diagnostics, and resilience

- [ ] Implement structured application logs with correlation, call, event, and request identifiers.
- [ ] Ensure logs and errors do not expose secrets, complete recordings, or unnecessary patient data.
- [ ] Implement immutable audit records for access changes, configuration changes, appointment mutations, exports, and elevated actions.
- [ ] Display service health, last successful sync, data freshness, and provider degradation.
- [ ] Preserve stored history when Retell or another dependency is unavailable.
- [ ] Define retry, backoff, timeout, and dead-letter/recovery behavior.
- [ ] Add health and readiness endpoints suitable for deployment.
- [ ] Add error monitoring and alert ownership for staging.
- [ ] Document webhook replay and failed-event recovery procedures.
- [ ] Test dependency outages and recovery without inventing successful outcomes.

Exit gate: operators can identify a failure, its affected records, the safe recovery action, and the audit trail.

## Module 14 — Accessibility and user experience

- [ ] Ensure full keyboard navigation and visible focus.
- [ ] Use semantic landmarks, headings, labels, tables, and accessible dialogs.
- [ ] Verify meaningful color contrast and non-color status indicators.
- [ ] Respect reduced-motion preferences.
- [ ] Test desktop, tablet, and narrow mobile layouts.
- [ ] Test long hospital, doctor, patient, department, and agent names.
- [ ] Test multilingual transcripts, right-to-left text where relevant, and mixed-language content.
- [ ] Provide clear loading, empty, partial, stale, error, and permission-denied states.
- [ ] Keep destructive actions explicit and confirmable.
- [ ] Run automated accessibility checks and practical keyboard/screen-reader review.

Exit gate: the core demonstration workflow is usable by keyboard, responsive, and honest in every incomplete or failure state.

## Module 15 — Test automation and acceptance evidence

- [ ] Unit-test state transitions, metric definitions, permission decisions, validation, and provider mapping.
- [ ] Integration-test database constraints, transactions, idempotency, webhook processing, and audit behavior.
- [ ] End-to-end test each role's permitted and forbidden workflows.
- [ ] Prove a specialist enquiry can retrieve availability and create an appointment only after explicit confirmation.
- [ ] Prove a call links to its transcript/provider evidence and actual appointment outcome.
- [ ] Prove returning-caller and family-member bookings remain distinct.
- [ ] Prove replayed webhooks cause no duplicate effect.
- [ ] Prove repeated booking requests cause no duplicate appointment.
- [ ] Prove concurrent last-slot requests do not overbook.
- [ ] Prove cancellation releases capacity once and rescheduling is atomic.
- [ ] Prove a failed journey creates and resolves owned follow-up work.
- [ ] Prove unauthorized UI and direct API access are rejected.
- [ ] Prove pending, missing, incomplete, unknown, delayed, and outage states render truthfully.
- [ ] Prove dashboard, details, schedules, capacity, and metrics remain consistent after mutations and refresh.
- [ ] Record normal event visibility latency and verify the agreed 30-second target.
- [ ] Run a timed handover test in which a new reviewer explains a specified call within two minutes.
- [ ] Record accessibility, responsive, reduced-motion, long-name, and multilingual verification.
- [ ] Document test results, known limitations, and retained evidence.

Exit gate: every acceptance criterion in the PRD is linked to a repeatable test and recorded evidence, not only a statement that it passed.

## Module 16 — Deployment and operational handover

- [ ] Choose and document the approved staging hosting architecture.
- [ ] Configure staging secrets outside source control with least privilege and rotation ownership.
- [ ] Automate migration and deployment with safe failure behavior.
- [ ] Configure the public webhook endpoint, TLS, signature verification, and development Retell resources.
- [ ] Add deployment smoke tests and rollback instructions.
- [ ] Document user provisioning and deprovisioning.
- [ ] Document event investigation, webhook replay, provider outage, booking failure, and access incident procedures.
- [ ] Document monitoring, alert routing, service ownership, and escalation contacts.
- [ ] Write an end-to-end demonstration and reviewer handover guide.
- [ ] Verify a clean environment can be deployed from the documented process.

Exit gate: staging can be reproduced, demonstrated, supported, and rolled back by someone other than the original developer.

## Module 17 — Production-readiness review

This module does not imply production approval. Each item requires evidence and an accountable approver.

- [ ] Complete threat modeling and independent security review.
- [ ] Approve privacy, consent, recording, transcript, and patient-contact handling policies.
- [ ] Approve retention and deletion schedules for each data class.
- [ ] Approve backup, restoration, recovery-time, and recovery-point procedures based on tested evidence.
- [ ] Approve production hosting, regions, data processors, and contractual responsibilities.
- [ ] Approve production Retell resources, routing changes, rollback, cost controls, and change ownership.
- [ ] Approve hospital support, incident response, escalation, and business-continuity procedures.
- [ ] Run load, reliability, and recovery tests against agreed targets.
- [ ] Remediate all release-blocking accessibility, security, privacy, and data-integrity findings.
- [ ] Record go/no-go decisions and residual risks explicitly.

Exit gate: production use begins only after the relevant hospital and platform owners explicitly approve the evidence. The application must not claim compliance, security, retention, recovery, or scale beyond what has been verified.

## Recommended first implementation slice

Complete these items before investing in the full dashboard:

1. Finish Modules 0–3 sufficiently to establish the schema, synthetic identities, and authorization boundary.
2. Create one department, doctor, dated session, caller, and patient.
3. Implement availability lookup and an idempotent, transactional confirmed booking.
4. Ingest a signed synthetic Retell event and link the resulting call to the appointment.
5. Display the call, source transcript evidence, appointment, actual outcome, and audit history.
6. Repeat the webhook and booking requests to prove there are no duplicate effects.
7. Run two simultaneous requests against the final slot to prove capacity cannot be exceeded.
8. Exercise a failed booking that creates an assigned follow-up.

This slice tests the platform's riskiest boundaries early: identity, hospital scope, provider trust, event ordering, appointment authority, idempotency, concurrency, and truthful operational reporting.
