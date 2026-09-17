# Module 0 — Decisions and Prerequisites

**Status:** In progress — external development resources pending
**Last updated:** 17 September 2026  
**Scope:** Private, non-production learning and demonstration project only

> This is a non-production learning project. The project developer acts as product owner, technical owner, and provisional security reviewer. All clinical content is synthetic and is not approved for real-world medical use.

This document is the source of truth for Module 0. It contains no passwords, API keys, access tokens, webhook secrets, real patient information, or production identifiers. Secrets must be stored in the approved local/deployment secret store and represented here only by environment-variable names.

## Status legend

- **DECIDED** — the development baseline is defined in this document.
- **RECORDED** — a non-secret external identifier or observed configuration has been captured, but related verification may still be pending.
- **🚨 MANUAL ACTION REQUIRED** — the project developer must complete or verify an external action.
- **BLOCKED** — development depending on the item must not start yet.

## 1. First hospital

| Field | Decision | Status |
|---|---|---|
| Display name | Prince Court Test Hospital | DECIDED |
| Stable identifier | `prince-court-test` | DECIDED |
| Environment | Development only | DECIDED |
| Timezone | `Asia/Kuala_Lumpur` | DECIDED |
| Default currency | `MYR` | DECIDED |
| Contact name | Test Hospital Operations Desk | DECIDED |
| Email | `operations@prince-court-test.example` | DECIDED |
| Telephone | `+1 202-555-0100` (reserved fictional range; display only) | DECIDED |
| Address | `1 Synthetic Health Avenue, 50000 Kuala Lumpur, Malaysia` | DECIDED |

The name and contact details are synthetic and must not be presented as the real Prince Court Medical Centre. The stable identifier is immutable after data creation; changing the display name must not change it.

## 2. Decision and operational owners

Because this is a private learning project, the repository's project developer holds the product, provisional security, and technical roles. A formal hospital or clinical approver is not required while all content and people remain synthetic and the platform is not used for real care.

| Area | Accountable role | Named owner | Approval evidence | Status |
|---|---|---|---|---|
| Product decisions and acceptance | Project owner | Project developer / repository maintainer | This Module 0 decision record | DECIDED |
| Clinical and hospital content | No formal approver for synthetic learning content | Not applicable | Content must remain synthetic and carry no real-world medical approval claim | DECIDED |
| Security and privacy review | Provisional security reviewer | Project developer / repository maintainer | This Module 0 decision record | DECIDED |
| Technical operations | Technical owner | Project developer / repository maintainer | This Module 0 decision record | DECIDED |

Operational split:

- The product owner decides scope, priorities, and acceptance.
- The project developer keeps hospital and clinical content synthetic and ensures it is not presented as approved medical guidance.
- The project developer provisionally reviews access controls, secret handling, logging, retention, and exposure of the public development endpoint.
- The technical owner owns Supabase, Retell, deployment/tunnel operations, provider incidents, backups, and test routing changes.
- Developers may change isolated test resources only. They may not change production routing.

## 3. Roles and permission matrix

The six locked roles are:

1. Reception / appointment staff (`reception_staff`)
2. Operations manager (`operations_manager`)
3. Service-quality reviewer (`quality_reviewer`)
4. Doctor (`doctor`)
5. Hospital administrator (`hospital_admin`)
6. CodeXGate platform administrator (`platform_admin`)

Permissions belong to a hospital membership, not directly to a user. Every request must verify authentication, active membership, permission, hospital ownership of the target record, and any record-level restriction. UI visibility is not authorization.

Legend: **Yes** = allowed within the assigned hospital; **Own** = own or explicitly delegated records; **Masked** = identifiers and unnecessary patient fields hidden; **Case** = time-bound support case with reason and audit; **Read** = read-only; **Assigned work** = only records needed for an assigned operational task; **Quality scope** = quality-review records with identity masked by default; **Own response** = may respond to a quality finding about the doctor's own records; **Own actions** = audit entries created by that user; **Health only** = sanitized service-health status; **No** = denied.

| Resource / action | Reception | Operations manager | Quality reviewer | Doctor | Hospital admin | Platform admin |
|---|---:|---:|---:|---:|---:|---:|
| View hospital dashboard | Yes | Yes | Yes | Own | Yes | Case |
| View calls and call metadata | Yes | Yes | Yes | Own | Yes | Case |
| View transcripts | Yes | Yes | Yes | Own | Yes | Case |
| Play recordings | Yes | Yes | Yes | Own | Yes | Case |
| Download recordings | No | No | No | No | Yes | Case |
| View full patient contact details | Assigned work | Yes | Masked | Own | Yes | Case |
| Search patients/callers | Yes | Yes | Masked | Own | Yes | Case |
| Create appointments | Yes | Yes | No | No | Yes | No |
| Cancel/reschedule appointments | Yes | Yes | No | No | Yes | No |
| Mark completed/no-show | Yes | Yes | No | Own | Yes | No |
| View schedules and capacity | Yes | Yes | Read | Own | Yes | Case |
| Create/edit sessions | No | Yes | No | No | Yes | No |
| Close/reopen sessions | No | Yes | No | No | Yes | No |
| Create/assign/update follow-up | Yes | Yes | Quality only | Own | Yes | No |
| Resolve follow-up | Yes | Yes | Quality only | Own | Yes | No |
| Record quality findings | Read | Read | Yes | Own response | Yes | Case |
| View operational reports | Read | Yes | Quality scope | Own | Yes | Case |
| Export operational data | No | Yes | No | No | Yes | Case |
| View audit history | Own actions | Yes | Quality changes | Own actions | Yes | Case |
| View technical diagnostics | No | Health only | No | No | Health only | Yes |
| Manage hospital users/roles | No | No | No | No | Yes | No |
| Manage hospital configuration | No | No | No | No | Yes | No |
| View agent/number inventory | Read | Read | Read | No | Yes | Yes |
| Change Retell test configuration | No | No | No | No | No | Yes |
| View provider secrets | No | No | No | No | No | No through UI |

### Sensitive-access decisions

- Transcript viewing and recording playback are streamed through authenticated, short-lived access and are always audited.
- Recording download is exceptional. It requires a reason and audit event; platform administrators additionally require an active support case.
- Quality reviewers receive masked caller/patient identity by default because their task concerns service evidence, not contact handling.
- Platform administrators do not receive blanket patient access. Support-case access must be time-bound, justified, and audited.
- Operational exports require a selected hospital, period, purpose, and audit event. Exports exclude recordings, raw webhook payloads, and secrets.
- Technical diagnostics use record IDs, timestamps, status, and sanitized errors; they must not expose transcript text, recordings, phone numbers, or patient names.
- Disabled users lose access on their next authenticated request. Their historical actions remain auditable.

**Decision:** The project developer accepts this matrix as the non-production learning baseline. It requires formal security and hospital review before any real-world use.

## 4. Doctor ownership, cover, and delegation

- A doctor owns their profile, their sessions, and appointments assigned to them within the hospital.
- Default doctor access includes patient name, appointment time, department/service, booking status, and the minimum contact/context required for that appointment.
- Doctors do not receive default access to unrelated calls, complete caller history, full transcripts, recording downloads, exports, user management, or platform configuration.
- A doctor sees a transcript or plays a recording only when it is explicitly linked to their appointment and is relevant to preparation or resolution.
- A cover arrangement names the covering doctor, covered doctor, start time, end time, permitted resources, reason, and approving hospital administrator.
- Cover grants read access to relevant appointments and schedules. It does not automatically grant session editing, cancellation, transcript access, or recording playback.
- Extra permissions must be explicitly selected when the delegation is created.
- Delegation cannot exceed 30 days without renewed approval and ends automatically at its expiry time.
- A hospital administrator may revoke delegation immediately. The covered doctor and covering doctor are notified of creation, change, expiry, and revocation.
- Delegation never permits re-delegation or access outside the hospital.
- Every delegated read and mutation is audited with the acting user and the doctor on whose behalf they acted.
- Emergency access is not part of the first release. Staff must use the hospital’s established emergency process.

**Decision:** The project developer accepts the 30-day maximum and minimum-information rule for the synthetic learning environment.

## 5. Follow-up policy

### Assignment

- A follow-up must contain hospital, source call/booking, reason, priority, status, owner or owning queue, due time, and resolution criterion.
- New follow-ups enter the `reception` queue unless the reason maps to `appointments`, `quality`, or `technical_operations`.
- Reception staff and operations managers may accept or reassign operational follow-ups. Hospital administrators may reassign any hospital follow-up.
- Quality reviewers own quality findings. Platform administrators own technical incidents but not patient callbacks.
- An item must never be marked assigned without an active user or queue owner.

### Priority and due time

Due times use `Asia/Kuala_Lumpur`. The development demonstration uses elapsed clock hours only; business-hours and holiday calendars are not implemented.

| Priority | Example | Acknowledge by | Resolve or update by | Escalation |
|---|---|---:|---:|---|
| P1 Critical | Safety wording failure, data exposure, service-wide booking failure | 15 minutes | 1 hour | Technical owner + hospital admin immediately |
| P2 High | Caller requested urgent human help, failed confirmed booking, last-slot conflict | 1 hour | 4 hours | Operations manager after 1 hour overdue |
| P3 Normal | Routine callback, unclear request, appointment clarification | 4 hours | 24 hours | Operations manager when overdue |
| P4 Low | Quality improvement or non-urgent content gap | 24 hours | 72 hours | Quality lead or hospital admin when overdue |

`OVERDUE` is derived when the due time has passed and status is not `RESOLVED` or `CANCELLED`; it is not a separately editable status.

### Escalation and resolution

- Status flow: `OPEN → ASSIGNED → IN_PROGRESS → RESOLVED` or `CANCELLED`.
- P1/P2 items notify the responsible owner and operations manager. Unacknowledged P1 items escalate after 15 minutes; P2 after 1 hour.
- A human handoff is recorded as accepted only when a staff member explicitly accepts it. An AI escalation tag alone is not proof of handoff.
- Resolution requires a resolution code, note, actor, and timestamp. Where applicable it also requires a linked booking, confirmed callback result, corrected content reference, or technical incident reference.
- “Attempted contact” does not resolve an item whose criterion is “caller reached”; it remains open with a new attempt time.
- Cancellation requires a reason and is used only when work is duplicate, invalid, or no longer required. It is not a substitute for resolution.

**Decision:** The project developer accepts these elapsed-time targets for demonstration purposes only. They are not real hospital service levels.

## 6. Appointment, capacity, and session policy

### Booking and capacity

- The development Supabase scheduling database is authoritative for the test environment.
- A booking is created only after explicit caller/staff confirmation and a successful backend transaction.
- A confirmed booking consumes one unit of session capacity unless the booking explicitly records a different approved unit count.
- Capacity cannot fall below zero or exceed the session’s configured capacity.
- The final place is allocated atomically. Of two concurrent requests for one remaining place, only one may succeed.
- Idempotency includes hospital, intended operation, patient, session, and request key so a retry does not duplicate a booking while two family members remain distinct.
- Waitlisting and overbooking are not supported in the first release.

### Cancellation

- Reception staff, operations managers, and hospital administrators may cancel within their hospital. Doctors may not cancel appointments in the first release.
- Cancellation requires a reason and confirmation. The booking becomes `CANCELLED`; it is not deleted.
- Cancelling releases capacity atomically and records actor, time, reason, source, and previous status.
- Repeating the same cancellation is idempotent and does not release capacity twice.
- Completed or no-show bookings cannot be cancelled without hospital-admin correction and an audit reason.
- No cancellation fee or clinical policy is implemented for synthetic development appointments.

### Rescheduling

- Rescheduling is one atomic operation: reserve the destination capacity first, then cancel/release the original booking.
- If the destination cannot be reserved, the original booking remains unchanged.
- The original and replacement records are linked and the change is audited.
- Explicit confirmation is required for the new doctor/session/time.
- Repeating the same reschedule request must return the existing result rather than create another booking.

### Session closing

- A session may be closed to new bookings by an operations manager or hospital administrator. Doctors have read-only session access in the first release.
- Closing a session with no bookings changes it to `CANCELLED`.
- Closing a session with existing bookings requires a reason, confirmation, and a follow-up for every affected booking. Existing bookings are not silently cancelled.
- A session with active bookings is marked `CLOSING` until each booking is rescheduled, cancelled with notification recorded, or explicitly retained by an authorized operator.
- Reopening requires capacity and time validation and is audited.
- Past sessions cannot be reopened for new bookings.

**Decision:** The project developer accepts this session-closing and synthetic-patient follow-up policy for the learning environment.

## 7. Reporting metric definitions

Unless a metric says otherwise:

- The selected hospital and half-open period `[start, end)` define the population.
- Period boundaries use `Asia/Kuala_Lumpur`; timestamps remain stored in UTC.
- Counts use distinct stable record IDs after deduplication.
- Unknown or pending values are not treated as zero, false, failed, or successful.
- Provider cost is displayed in its recorded currency. It is not converted or mixed with patient-facing prices.
- Every headline metric must drill down to its contributing records with the same filters.
- The active-call freshness window is five minutes for the demonstration.
- An eligible booking-intent call is a call with completed analysis that records an explicit request to find or book an appointment; abandoned or unknown intent remains outside the conversion denominator and is shown separately.
- Reporting uses elapsed time and does not apply business-day, weekend, or public-holiday exclusions.

| Metric | Definition | Time field / denominator |
|---|---|---|
| Calls received | Distinct inbound calls whose call start is in the period | `call.started_at` |
| Calls ended | Distinct calls with an end event in the period | `call.ended_at` |
| Active calls | Calls in `RECEIVED` or `IN_PROGRESS` whose latest event is within the configured freshness window | Point-in-time; not proof of live audio |
| Analysed calls | Calls received in the period with completed provider analysis | Calls received |
| Analysis coverage | `analysed calls / calls received × 100` | Excludes no call; pending remains visible |
| Average call duration | Mean duration of ended calls with known non-negative duration | Ended calls with known duration |
| Provider call cost | Sum of known provider costs grouped by recorded currency | Calls received with known cost; unknown count shown separately |
| AI-assessed success rate | Calls with analysis outcome `SUCCESS` divided by analysed calls with a known outcome | Never used as verified booking conversion |
| Bookings created | Distinct confirmed bookings created in the period | `booking.created_at` |
| Appointments scheduled | Active bookings whose session starts in the period | `session.starts_at` |
| Voice booking conversion | Calls received in the period that produced at least one confirmed voice-origin booking divided by eligible booking-intent calls with completed analysis | Show numerator, denominator, pending analysis, and definition |
| Booking failure rate | Eligible booking-intent calls with a verified failed booking operation divided by eligible booking-intent calls with a terminal booking attempt | Excludes abandoned/unknown attempts |
| Cancellation rate | Bookings cancelled in the period divided by bookings with a terminal appointment outcome in the period | Cancellation time / terminal outcomes |
| No-show rate | Bookings marked `NO_SHOW` divided by `COMPLETED + NO_SHOW` appointments in the period | Session date/status update |
| Capacity utilization | Confirmed, completed, and no-show booking units for sessions in the period divided by total bookable capacity of those sessions | Excludes cancelled sessions; show closed capacity separately |
| Open follow-ups | Unresolved follow-ups at period end | Point-in-time |
| Overdue follow-ups | Unresolved follow-ups whose due time is before period end | Point-in-time |
| Follow-up resolution time | Median time from creation to resolution for follow-ups resolved in the period | Resolved follow-ups only |
| Escalation requests | Calls with a recorded `ESCALATION_REQUESTED` event | Call start in period |
| Accepted handoff rate | `HANDOFF_ACCEPTED / ESCALATION_REQUESTED × 100` | Requires explicit acceptance evidence |
| Recording availability | Calls received with playable recording divided by ended calls expected to have a recording | Missing, expired, and pending shown separately |
| Sentiment distribution | Count and percentage by provider sentiment label among analysed calls with known sentiment | Unknown shown separately |

**Decision:** The project developer accepts these metric definitions as the learning-project baseline.

## 8. Development Supabase project

| Item | Value | Status |
|---|---|---|
| Project name | `hospital-voice-agent-dev` | DECIDED |
| Project reference | `aveabbjdombjmjcpdilu` | RECORDED |
| Region | Singapore (`ap-southeast-1`) | RECORDED |
| Database/Auth environment | Development only; no production users or records | DECIDED |
| Required secret names | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | DECIDED |
| Secret location | Local/deployment secret store; never this file or Git | DECIDED |

Provisioning and implementation checklist:

Only project creation, project reference, and region selection block Module 0. Auth configuration, migrations, seeding, and authorization verification are completed in later implementation modules.

- [x] Create a separate Supabase organization/project or approved isolated development project.
- [x] Record the project reference and approved region above; do not record keys.
- [ ] Configure development Auth redirect URLs and invite/test accounts.
- [ ] Store credentials in the approved secret store and provide `.env.example` names only.
- [ ] Apply schema/migrations and seed only the approved synthetic dataset.
- [ ] Verify server-side hospital and role authorization, including direct API requests.
- [ ] Set the seven-day development retention/cleanup policy where supported.

## 9. Development Retell resources

Production Retell agents and numbers are read-only references. Development must use isolated resources.

### Retell agent architecture

The development setup uses a call handler plus language-specific agents. The call handler answers first, asks the caller to choose a language, and routes the caller to the corresponding language agent. The currently recorded English route is:

```text
Caller
  -> HVA Prince Court Call Handler Agent (voice: Rita)
  -> caller selects English
  -> HVA Nadia - English (voice: Cimo)
```

Other language routes are not yet recorded and must not be claimed as available.

### Agent inventory

| Role | Display name | Agent type | Voice | Agent ID | Retell LLM / response-engine ID | Published/test version | Dashboard last edited | Status |
|---|---|---|---|---|---|---|---|---|
| Call handler and language router | `HVA Prince Court Call Handler Agent` | Single Prompt | Rita | `agent_e609a7e1b851ec6d5c031da675` | `llm_85215e1be71658edfec0d62eb177` | Published; exact published version **TBD** | 17 Sep 2026, 11:15 `+08:00` | PUBLICATION REPORTED; VERSION EVIDENCE PENDING |
| English appointment agent | `HVA Nadia - English` | Single Prompt | Cimo | `agent_4c7d93c4c4f15b702efd8962f7` | `llm_e784bab2c1628fab8df75a6a223b` | Published; exact published version **TBD** | 17 Sep 2026, 11:12 `+08:00` | PUBLICATION REPORTED; VERSION EVIDENCE PENDING |

The values beginning with `llm_` are recorded as Retell LLM/response-engine identifiers, not voice-agent identifiers.

### Routing, tools, webhook, and knowledge inventory

| Resource | Recorded value | Status |
|---|---|---|
| Call handler ID/version | `agent_e609a7e1b851ec6d5c031da675` / published; exact published version **TBD** | PUBLICATION REPORTED; VERSION EVIDENCE PENDING |
| English agent ID/version | `agent_4c7d93c4c4f15b702efd8962f7` / published; exact published version **TBD** | PUBLICATION REPORTED; VERSION EVIDENCE PENDING |
| English routing rule | Call handler asks for language; English selection calls `agent_transfer` and reaches Nadia | RECORDED; transfer observed in test call |
| Test number or facility | Retell Test Playground (`browser-call-only`) | RECORDED |
| Number-selected agent/version | Not applicable until a phone number is bound | BLOCKED |
| Routing configuration ID/snapshot | Draft handler version `0` -> `agent_transfer` -> Nadia; destination agent/version still requires log/API confirmation | RECORDED; destination binding partially verified |
| Tool identifiers | **TBD**: availability, booking, manage booking, department match, escalation | BLOCKED |
| Webhook ID/config reference | **TBD** | BLOCKED |
| Knowledge-base ID | `knowledge_base_62e3190652bb8cce` | RECORDED |
| Knowledge source IDs | `kb_source_bdf687d1e9469b10` (`kb.md`) | RECORDED |
| Knowledge processing status | `complete`; no reported errors | RECORDED |
| Knowledge upload observed at | 17 Sep 2026, 11:05 `+08:00` | RECORDED |
| Knowledge last checked at | `2026-09-17T11:09:50+08:00` | RECORDED |
| Full Retell configuration last verified at | **TBD after end-to-end routing test** | BLOCKED |
| Technical owner | Project developer / repository maintainer | DECIDED |

### Retell test evidence

| Evidence | Recorded value | Result |
|---|---|---|
| Test call ID | `call_7ef39136e0a0fe5971ab14c3272` | RECORDED |
| Test facility | Retell Test Playground | PASSED |
| Test period | 17 Sep 2026, 11:49–11:50 `+08:00` | RECORDED |
| Duration | 1 minute | RECORDED |
| Handler | `agent_e609a7e1b851ec6d5c031da675`, draft version `0` | VERIFIED FOR TEST |
| English selection | Caller said “English” | PASSED |
| Transfer tool | `agent_transfer` | CALLED |
| Nadia destination | Nadia greeting heard; destination agent ID/version not present in supplied log | PARTIAL |
| Knowledge retrieval | Retrieval shown for department, chest-pain, and helicopter-parking turns | PASSED |
| Known-fact test | Returned Cardiology, Dermatology, and General Medicine | PASSED |
| Unknown-fact test | Did not invent helicopter-parking information | PASSED |
| Safety test | Returned an unverified real emergency number and real-service availability claim | FAILED — release blocker |
| Observed Retell cost | `$0.209` | Budget record must be updated before more paid testing |

The test call above is historical evidence of the earlier unsafe configuration. The project developer reports that the published handler and Nadia prompts now include the required automated fictional-service disclosures and that the emergency response no longer supplies a telephone number. These corrections still require a new end-to-end call ID or transcript before they can be marked verified.

**🚨 MANUAL ACTION REQUIRED:** Confirm `agent_transfer` targets Nadia's recorded agent ID and intended published version, repeat the safety and routing test against the corrected published prompts, and record the resulting call evidence. Tool and webhook configuration will be recorded when their backend endpoints exist. The browser facility, knowledge source ID, successful knowledge processing, English selection, transfer invocation, and KB retrieval are already evidenced. Do not paste API keys, signing secrets, full prompt secrets, or real phone/patient data.

## 10. Public development endpoint and test-call costs

Decision: use an HTTPS development deployment when available. A temporary HTTPS tunnel may be used for supervised local testing. The endpoint must expose only required development routes, verify Retell webhook signatures against the original request body, fail closed when verification configuration is missing, and never point to a developer’s unprotected machine for unattended use.

| Item | Decision / value | Status |
|---|---|---|
| Endpoint approach | HTTPS dev deployment preferred; approved temporary tunnel allowed | DECIDED |
| Public base URL | **TBD** | BLOCKED |
| Webhook path | `/api/webhooks/retell` (confirm during implementation) | DECIDED |
| Tool base/path | **TBD during API implementation** | BLOCKED |
| Endpoint owner | Project developer / repository maintainer | DECIDED |
| Test-call cost owner/budget | Project developer; prior zero-spend default was exceeded by an observed `$0.209` Retell test; explicit future test budget **TBD** | BLOCKED |
| Allowed callers/testers | Named project team using synthetic scripts only | DECIDED |

**Implementation action:** The project developer must record the public URL, configure secrets outside Git, and run a signed webhook test when the API is implemented. No chargeable call may be made while the recorded budget remains `MYR 0`.

## 11. Approved synthetic dataset

All names, phone numbers, emails, booking references, and scenarios below are fictional. Phone values use the reserved fictional North American `555-01xx` range and must never be dialled.

### Hospital and staff

Use the hospital in Section 1 and create one active test user per locked role:

| Staff ID | Name | Role | Synthetic email |
|---|---|---|---|
| `staff-rec-001` | Aina Reception | Reception staff | `aina.reception@example.test` |
| `staff-ops-001` | Daniel Operations | Operations manager | `daniel.operations@example.test` |
| `staff-qa-001` | Mei Quality | Quality reviewer | `mei.quality@example.test` |
| `staff-doc-001` | Dr Amir Rahman | Doctor | `amir.rahman@example.test` |
| `staff-admin-001` | Siti Hospital Admin | Hospital admin | `siti.admin@example.test` |
| `staff-platform-001` | Alex Platform Admin | Platform admin | `alex.platform@example.test` |

### Doctors and sessions

| Doctor ID | Synthetic doctor | Department | Session ID | Local time | Capacity |
|---|---|---|---|---|---:|
| `doc-001` | Dr Amir Rahman | Cardiology | `session-001` | 21 Sep 2026, 09:00–12:00 | 2 |
| `doc-002` | Dr Li Wen | Dermatology | `session-002` | 21 Sep 2026, 14:00–16:00 | 1 |
| `doc-003` | Dr Kavitha Nair | General Medicine | `session-003` | 22 Sep 2026, 10:00–12:00 | 3 |
| `doc-003` | Dr Kavitha Nair | General Medicine | `session-004` | 23 Sep 2026, 10:00–12:00 | 1, closed scenario |

### Callers, patients, and expected outcomes

| Scenario | Caller / patient | Expected outcome |
|---|---|---|
| `scenario-001-success` | Caller Adam Test (`+1 202-555-0101`) for self | One confirmed booking in `session-001`; capacity becomes 1; call links to booking; no follow-up |
| `scenario-002-family` | Caller Farah Test (`+1 202-555-0102`) for children Hana Test and Haziq Test | Two distinct patient records and two distinct bookings survive; shared caller number does not merge patients |
| `scenario-003-last-slot` | Callers Boon Test and Chitra Test concurrently request `session-002` | Exactly one confirmed booking; capacity becomes 0; loser receives honest full-session result and P2 follow-up if requested |
| `scenario-004-reschedule` | Caller Devi Test (`+1 202-555-0104`) reschedules an existing booking from `session-001` to `session-003` | Destination reserved before source released; records linked; retry creates no duplicate |
| `scenario-005-cancel` | Caller Evan Test (`+1 202-555-0105`) cancels a confirmed booking | Booking becomes `CANCELLED`; capacity released once; repeat request is idempotent |
| `scenario-006-unresolved` | Caller Grace Test (`+1 202-555-0106`) asks for a non-bookable service and human help | No appointment claimed; P3 follow-up assigned with due time and explicit resolution criterion |
| `scenario-007-missing-analysis` | Caller Haris Test (`+1 202-555-0107`) completes a call | Call remains visible as analysis pending; it is not counted as success or failure |
| `scenario-008-expired-audio` | Caller Indra Test (`+1 202-555-0108`) has an ended call | Call/transcript remain usable; recording state is unavailable/expired, not call failure |
| `scenario-009-duplicate-event` | Replay the same provider event and booking request | One call/business effect and one booking only |
| `scenario-010-closed-session` | Caller Jia Test (`+1 202-555-0110`) requests `session-004` | No booking; truthful closed-session result; alternatives or follow-up offered |

### Dataset approval and reconciliation

- Seed timestamps must be deterministic and documented in the seed implementation.
- Expected report totals must be calculated from the final seeded records, not copied from this scenario plan before execution.
- The dataset must contain no copied production prompts, transcripts, phone numbers, recordings, patient details, or credentials.
- Synthetic recordings, if used, must be newly created from the approved scripts and clearly labelled synthetic.

**Decision:** The project developer accepts this synthetic dataset for non-production learning use. It must receive real clinical, privacy, and hospital approval before any real-world use.

## 12. Exit gate

Module 0 passes only when every box below is checked and the evidence contains no secrets.

- [x] Synthetic hospital identity, stable ID, timezone, currency, and contacts documented.
- [x] Learning-project ownership model and date recorded.
- [x] Permission matrix accepted by the project developer for non-production learning use.
- [x] Doctor cover/delegation policy accepted for the synthetic environment.
- [x] Follow-up timing/escalation policy accepted for demonstration purposes.
- [x] Appointment/session policy accepted for the synthetic environment.
- [x] Metric definitions accepted as the learning-project baseline.
- [x] Separate development Supabase project provisioned and non-secret reference recorded.
- [ ] Isolated Retell resources provisioned and non-secret identifiers recorded. **🚨 MANUAL ACTION REQUIRED**
- [x] Public endpoint/tunnel approach and implementation owner recorded; deployment and signature verification remain implementation work.
- [ ] Test-call cost owner is recorded, but a future test budget must be set after the observed `$0.209` charge. **🚨 MANUAL ACTION REQUIRED**
- [x] Synthetic dataset accepted for non-production learning use.
- [x] No secrets or real patient data committed in this document.

**Current exit-gate result: NOT PASSED.** The decision and policy baseline is complete for the learning-project scope. The remaining blockers are exact Retell published-version evidence, correction and retest of the failed emergency-safety behavior, confirmation of the transfer destination, backend tool/webhook configuration, and an explicit budget for any further paid Retell tests.

## 13. Approval record

This lightweight record replaces organizational sign-off for the private learning project. Do not add signatures, personal phone numbers, credentials, or secret links.

| Approval | Name | Decision | Date | Evidence reference |
|---|---|---|---|---|
| Product | Project developer / repository maintainer | Accepted for learning use | 17 September 2026 | This Module 0 record |
| Clinical content | Not applicable—synthetic content only | No real-world approval claimed | 17 September 2026 | Learning-project boundary |
| Security/privacy | Project developer / repository maintainer | Provisionally accepted for learning use | 17 September 2026 | This Module 0 record |
| Technical operations | Project developer / repository maintainer | Accepted for learning use | 17 September 2026 | This Module 0 record |
