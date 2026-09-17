# Hospital Voice Agent Control Center

> Product requirements and delivery specification  
> **Status:** Non-production learning-project definition
> **Primary audience:** Product, engineering, hospital operations, service quality, and platform support

## Contents

1. [Product overview](#1-product-overview)
2. [Workflow and system context](#2-workflow-and-system-context)
3. [Users and access model](#3-users-and-access-model)
4. [Functional requirements](#4-functional-requirements)
5. [Domain and state rules](#5-domain-and-state-rules)
6. [Architecture and technical direction](#6-architecture-and-technical-direction)
7. [Security and reliability](#7-security-and-reliability)
8. [First-release deliverables](#8-first-release-deliverables)
9. [Acceptance criteria](#9-acceptance-criteria)
10. [Out of scope](#10-out-of-scope)
11. [External prerequisites](#11-external-prerequisites)

## 1. Product overview

### 1.1 Product goal

Build a dependable hospital operations dashboard connected to a Retell voice agent. Staff must be able to follow a caller journey from the hospital phone number and handling agent through to the verified appointment or follow-up outcome.

### 1.2 First-release boundary

The first release serves **one hospital**. Hospital ownership must remain explicit throughout the architecture so the solution can later be repeated across hospitals without redesigning its core data and authorization model.

Multi-hospital onboarding, hospital switching, and general cross-hospital administration are not part of the first release.

This is a private, non-production learning project. The project developer acts as product owner, technical owner, and provisional security reviewer. All hospital, caller, patient, appointment, and clinical content is synthetic and is not approved for real-world medical use.

### 1.3 Reference-project boundary

MediHub is a reference project only. Its workflows and lessons may inform this product, but its code and behavior are not assumed to exist in this repository.

## 2. Workflow and system context

### 2.1 Primary successful journey

```text
Caller
  -> hospital test number
  -> Retell call handler asks for language
  -> caller selects a supported language
  -> call handler routes to the matching language agent
  -> specialist or department enquiry
  -> backend availability lookup
  -> caller confirms a session
  -> backend creates the appointment
  -> Retell events enrich the call record
  -> staff verify the call, appointment, and next action
```

The release must also demonstrate at least one failed or unresolved journey that creates clear, owned follow-up work.

### 2.2 System context

The product consists of four main parts:

| Part | Responsibilities |
| --- | --- |
| Retell agent system | Uses an initial call handler to collect language choice and route to a language-specific agent. The selected agent handles the conversation, uses approved hospital knowledge, calls backend tools for availability and booking, and sends call and analysis events through webhooks. |
| Backend | Uses Next.js server routes and services to expose Retell tools, validate requests and permissions, process webhooks, and enforce booking, capacity, follow-up, and audit rules. |
| Database | Uses PostgreSQL through Supabase to store hospital, staff, doctor, schedule, caller, patient, appointment, call, transcript, follow-up, integration, and audit records. It is the appointment authority for the first release. |
| Frontend | Uses Next.js and React to provide the staff dashboard for calls, appointments, schedules, service configuration, follow-ups, and reports, including authorized operational actions. |

```text
Caller -> Retell agent system -> Backend -> Database
                                  |
                                  v
                            Staff dashboard
```

Supabase Auth provides staff identity and session management as part of the backend and database infrastructure. It is not a separate product surface.

## 3. Users and access model

### 3.1 Authoritative roles

The application uses the following authoritative role identifiers and scopes:

| User / role | Role identifier | Scope | Main responsibilities |
| --- | --- | --- | --- |
| Reception and appointment staff | `reception_staff` | Assigned hospital | Find callers, review calls and transcripts, verify agreed outcomes, manage appointments, assign or complete follow-ups, and correct operational information. |
| Hospital operations manager | `operations_manager` | Assigned hospital | Monitor demand, schedules, capacity, unsuccessful caller journeys, unresolved work, booking outcomes, and operational performance. |
| Service-quality reviewer | `quality_reviewer` | Assigned hospital | Listen to recordings, review transcripts and summaries, compare conversations with actual outcomes, and identify agent or knowledge-base improvements. |
| Doctor | `doctor` | Own records within assigned hospital | View their own schedule, sessions, and relevant appointment information. Doctors do not have hospital-wide administration privileges. |
| Hospital administrator | `hospital_admin` | Assigned hospital | Manage hospital users and access, hospital configuration, connected agents and phone numbers, integrations, and approved knowledge sources. |
| CodeXGate platform administrator | `platform_admin` | All authorised hospitals | Manage and support the platform across hospitals, inspect agent, number, and integration connections, investigate service failures, and access technical diagnostics and audit information. |

Patients and callers interact with the voice service but are not Control Center accounts.

### 3.2 Access-control rules

- Every hospital-level role must be restricted to its assigned hospital.
- Doctors may access only their own schedule, sessions, and relevant appointment information within that hospital.
- Only hospital administrators may manage hospital user access and hospital configuration.
- Only platform administrators may have cross-hospital visibility, and that access must be limited to authorised hospitals and audited.
- Recordings, transcripts, reports, searches, downloads, exports, and real-time updates must enforce the same permissions as ordinary server reads.
- All permissions must be enforced by the backend. Hiding navigation, pages, fields, or buttons is not authorization.
- Access to transcripts, recording playback, recording download, patient contact details, exports, technical diagnostics, and audit data must be represented as explicit permissions rather than inferred solely from page access.
- Authentication establishes identity; hospital membership, role, ownership, and explicit permissions determine authorization.

The `platform_admin` role is defined now so the authorization model does not require redesign later. In the first release, only one hospital is present; general cross-hospital product administration remains out of scope.

## 4. Functional requirements

### 4.1 Hospital and Retell configuration

- Clearly identify the hospital, phone number, number purpose, handling agent, language, role, version, routing configuration, connected knowledge, connection status, and last check time.
- Distinguish an agent's published version from the version selected by a phone number.
- Preserve the handling agent, version, number, and routing snapshot on historical calls.
- Keep the first release read-only for production Retell routing. Any routing experiment must use isolated development resources and have a rollback path.

### 4.2 Calls and conversation review

- Ingest authenticated Retell events for call and analysis lifecycles.
- Search and filter calls by date, agent, number, language, purpose, outcome, and booking relationship where available.
- Show call timing, participants, provider identity, transcript, recording state, summary, analysis, linked appointments, and unresolved work.
- Keep source transcript/provider evidence separate from application or AI interpretation.
- Represent pending analysis, missing recordings, incomplete transcripts, delayed events, unknown costs, and provider outages honestly.

### 4.3 Scheduling and appointments

- Model departments, doctors, sessions, capacity, callers, patients, and appointments.
- Treat caller and patient as separate people; a caller may book for someone else.
- Allow one call to link to zero, one, or multiple appointments.
- Retrieve availability from the backend scheduling authority.
- Create an appointment only after explicit caller confirmation and a successful backend save.
- Support booking, cancellation, and rescheduling with atomic capacity updates.
- Prevent retry duplicates while allowing distinct family-member appointments.
- Treat the appointment record—not a transcript, sentiment, summary, or AI success tag—as the authority for appointment existence and state.

### 4.4 Follow-up and escalation

- Create follow-up for failed bookings, unresolved enquiries, unavailable services, requested human contact, or technical failure.
- Show the reason, owner, due time, status, activity history, and resolution condition.
- Support `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, and `CANCELLED` states; derive overdue status from the due time.
- Do not claim a live transfer or accepted handoff without corresponding evidence.

### 4.5 Dashboard and reporting

- Provide an operational overview, call activity, call detail, appointments, doctors, schedules, follow-up, service configuration, and basic reports.
- Define every metric's population, period, hospital timezone, currency, and meaning.
- Distinguish calls from bookings, bookings created during a period from appointments scheduled during it, and AI-assessed success from verified outcomes.
- Show analysis coverage and represent unknown values separately from zero.
- Let staff navigate from a metric to the underlying filtered records.

### 4.6 Knowledge visibility

- Show which approved knowledge sources are connected to the agent.
- Display processing, indexed, failed, obsolete, or unknown states.
- Do not present upload completion as successful agent readiness unless indexing and agent connection are verified.

## 5. Domain and state rules

### 5.1 Independent lifecycles

The following lifecycles must remain independent:

```text
Call:       RECEIVED -> IN_PROGRESS -> ENDED -> ANALYSIS_PENDING -> ANALYZED
AI outcome: SUCCESS | FAILED | PARTIAL | UNKNOWN | ESCALATED
Appointment: CONFIRMED -> COMPLETED | CANCELLED | NO_SHOW
Follow-up:  OPEN -> ASSIGNED -> IN_PROGRESS -> RESOLVED | CANCELLED
Handoff:    ESCALATION_REQUESTED -> HANDOFF_ATTEMPTED -> HANDOFF_ACCEPTED
```

A completed call does not prove successful analysis, an AI success label does not prove an appointment, and an escalation label does not prove human handoff.

### 5.2 Sources of truth

- The backend scheduling service and database are authoritative for availability and capacity.
- The appointment record is authoritative for whether a booking exists and for its current state.
- Retell webhook payloads, transcripts, recordings, and analysis remain provider evidence; they do not override appointment state.
- Source transcript and provider evidence must remain distinguishable from application-generated or AI-generated interpretation.
- A handoff is accepted only when evidence of acceptance exists; an escalation request alone is insufficient.

### 5.3 Core relationship rules

- A caller and a patient are separate people; a caller may book for themselves or someone else.
- One call may link to zero, one, or multiple appointments.
- Retry protection must prevent duplicate effects without preventing legitimate bookings for different patients.
- Historical calls retain the number, agent, version, and routing snapshot that applied at call time.
- Overdue follow-up is derived from its due time and unresolved state rather than stored as an independent lifecycle state.

## 6. Architecture and technical direction

### 6.1 Technology stack

- **Application:** Next.js, React, and TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL hosted through Supabase
- **Database access:** Drizzle ORM
- **Authentication:** Supabase Auth
- **Client data:** React Query; Zustand only for lightweight UI state
- **Reporting:** Recharts where useful
- **Voice provider:** Retell behind server-side integration boundaries
- **Package manager:** npm

### 6.2 Application boundary

The first release uses one full-stack Next.js application. Retell access, webhook processing, authorization, database access, booking logic, capacity control, and audit creation run through server-side boundaries.

Provider keys, webhook credentials, database credentials, and service-role keys must never reach browser code.

## 7. Security and reliability

### 7.1 Authorization and data protection

- Authenticate staff and enforce role permissions on every server-side read and mutation.
- Scope all records and operations to the configured hospital.
- Apply separate permissions to transcripts, recording playback, recording download, patient contact details, exports, and audit data.
- Ensure searches, reports, downloads, and real-time updates cannot reveal data that an equivalent direct read would deny.
- Keep secrets and privileged provider operations behind server-only boundaries.

### 7.2 Provider-event integrity

- Verify Retell signatures from the original raw request body using the current provider contract; fail closed when verification configuration is missing.
- Deduplicate provider events and tolerate duplicate, late, partial, and out-of-order delivery.
- Preserve the original provider identity and enough event metadata to investigate processing and replay safely.

### 7.3 Transactional integrity and recovery

- Use idempotency keys for booking, cancellation, and rescheduling operations.
- Protect capacity with database transactions or equivalent locking.
- Preserve stored history during provider outages and show data freshness.
- Audit important changes with actor, time, target, action, result, and appropriate before/after values.

### 7.4 Development and assurance boundaries

- Use only isolated development Retell resources and synthetic patients during development.
- Do not claim compliance, production security, backup, recovery, retention, or scale without verified evidence.

## 8. First-release deliverables

- Reproducible Next.js development environment and setup instructions.
- Database schema, migrations, and a small synthetic demonstration dataset.
- Authentication and server-enforced roles for the agreed hospital users.
- Hospital, doctor, department, session, caller, patient, appointment, and follow-up records.
- Retell configuration inventory for the development agent and number.
- Retell backend tools for availability and confirmed booking operations.
- Authenticated and idempotent Retell webhook ingestion.
- Operational dashboard with call search, call detail, appointment verification, schedules, follow-up, and defined overview metrics.
- Audit and visible failure/recovery information for important operations.
- Automated tests, end-to-end demonstration instructions, test results, and known limitations.

## 9. Acceptance criteria

### 9.1 Required evidence

The release is accepted only when the following are demonstrated with synthetic data and recorded evidence:

1. A reviewer can identify the hospital, number, routing, agent, language, and exact version used.
2. A specialist enquiry reaches availability lookup and creates an appointment only after explicit confirmation.
3. The resulting call can be found and its transcript, provider evidence, linked appointment, and actual outcome can be explained.
4. A returning caller and a caller booking for different family members produce correct, distinct patient and appointment records.
5. Replaying the same webhook does not duplicate calls, bookings, follow-ups, or audit effects.
6. Retrying the same intended booking does not create a duplicate appointment.
7. Two concurrent requests for the last available capacity do not overbook the session.
8. Cancellation releases capacity once; rescheduling safely reserves the replacement and preserves history.
9. A failed or unresolved journey creates an understandable follow-up with a reason, owner, due time, recovery action, and resolution.
10. Unauthorized UI and direct API requests are rejected according to role permissions.
11. Pending analysis, missing recording, incomplete transcript, unknown cost, delayed event, and provider outage states are displayed truthfully.
12. Dashboard lists, detail pages, schedules, capacity, and overview metrics agree after mutations and refresh.
13. Every reported count or rate reconciles with a written definition and the known test dataset.
14. Normal test events become visible within the agreed target of 30 seconds, with the observed timing recorded.
15. A new reviewer can find and explain a specified call and outcome within two minutes using the handover instructions.
16. Keyboard navigation, responsive layouts, reduced motion, long names, and multilingual transcript text receive practical verification.

### 9.2 Acceptance standard

Passing isolated unit tests is not sufficient. Acceptance requires the complete Retell-to-backend-to-dashboard workflow and recorded evidence for success, failure, retry, concurrency, and authorization cases.

## 10. Out of scope

- Multi-hospital onboarding, switching, and SaaS administration
- Production phone-number purchasing or routing changes
- Multiple voice providers
- A full WhatsApp reply console
- Production hospital information system or EMR integration
- Medical-record replacement or invented clinical advice
- Unsupported compliance, hosting, retention, backup, recovery, or performance guarantees

## 11. External prerequisites

### 11.1 Development prerequisites

- Separate development Supabase database and authentication project
- Dedicated development Retell agent and test number or approved browser-call facility
- Confirmed Retell agent, version, number, routing, tool, webhook, and knowledge identifiers
- Securely issued development credentials
- A public development endpoint or approved tunnel reachable by Retell
- Approved synthetic hospital, doctor, schedule, caller, and patient data
- Agreement on test-call costs and who may authorize later production trials

### 11.2 Production approval boundary

Production use requires separate approval of hosting, privacy, retention, recording access, support ownership, recovery procedures, hospital policy, and live routing changes.
