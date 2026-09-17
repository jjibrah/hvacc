# HVA Product Design Principles

> Product UX and interface design contract
> **Status:** Agreed direction for implementation
> **Product:** HVA — Hospital Voice Assistant
> **Primary users:** Receptionist and hospital operations staff

This document defines the interface model that future HVA features must follow. It is intentionally more durable than an individual screen specification. New modules should compose from these patterns rather than introduce new navigation, page anatomy, or interaction rules without a documented reason.

## 1. Product experience goal

HVA should help hospital staff move confidently through the complete operational lifecycle:

```text
Caller contacts hospital
        ↓
Call is received and processed
        ↓
Agent handles the enquiry
        ↓
Appointment is booked, enquiry is resolved, or an issue is identified
        ↓
Call and appointment are linked where applicable
        ↓
Follow-up is created when required
        ↓
Staff member owns and resolves the follow-up
        ↓
Outcome becomes visible in reporting
```

The interface should make the next useful action obvious without hiding the evidence behind it. HVA is operational software, not a collection of disconnected records or a statistics-only dashboard.

The experience should feel:

- Calm and clinical
- Trustworthy and precise
- Efficient for repeated daily use
- Dense enough for operations, but never visually chaotic
- Consistent across modules and user roles

## 2. Design principles

1. **Design around work, not database entities.** Staff need to know what requires attention, what is happening today, and what action comes next.
2. **Preserve context.** Users should not lose their place in a worklist merely because they inspected a record.
3. **Make evidence and interpretation distinct.** What the caller said, what the provider inferred, and what the system actually changed must remain visibly different.
4. **The same action behaves the same everywhere.** Search, filtering, status changes, confirmation, cancellation, and navigation should develop muscle memory.
5. **Important information is visible.** Do not hide operationally important state behind decorative cards, unnecessary tabs, or unexplained icons.
6. **Uncertainty is a valid state.** Unknown, pending, unavailable, and incomplete must not be represented as zero, empty, or successful.
7. **Dangerous actions are deliberate.** Destructive or irreversible actions require clear intent, useful confirmation, and an explanation of the consequence.
8. **Role-aware does not mean inconsistent.** Permissions may change what users see and do, but the underlying interaction patterns remain familiar.
9. **Every view handles reality.** Loading, empty, error, partial, stale, unavailable, and unauthorized states are designed states, not afterthoughts.
10. **Accessibility is operational efficiency.** Keyboard access, focus management, readable density, contrast, and non-color status indicators are required parts of the experience.

## 3. Users and role-aware experience

The primary design target is the shared receptionist/operations workflow. Other roles use the same system through narrower, permission-aware experiences.

| Role | Main experience emphasis |
| --- | --- |
| Reception staff | Calls, appointments, patients, and actionable follow-ups |
| Operations manager | Operational overview, capacity, schedules, unresolved work, and reporting |
| Quality reviewer | Calls, recordings, transcripts, provider evidence, and agent outcomes |
| Doctor | Own schedule, sessions, and relevant appointments |
| Hospital administrator | Users, permissions, hospital configuration, integrations, and connected agents |
| Platform administrator | Authorised cross-hospital diagnostics, integrations, and audit information |

Navigation and actions must reflect server-enforced permissions. Hiding a link is not authorization, and a restricted action must not be made available through a direct request or alternate UI path.

## 4. Application shell

The shell is a permanent mental map for the product. It should remain stable as new features are added.

```text
┌──────────────────────────────────────────────────────────────┐
│ HVA       Search patients, calls, appointments...   User     │
├──────────────────┬───────────────────────────────────────────┤
│                  │                                           │
│ WORKSPACE        │                                           │
│  Overview        │                                           │
│  Calls           │                 PAGE CONTENT               │
│  Appointments    │                                           │
│  Follow-ups      │                                           │
│  Patients        │                                           │
│                  │                                           │
│ CARE DELIVERY    │                                           │
│  Doctors         │                                           │
│  Departments     │                                           │
│  Schedules       │                                           │
│                  │                                           │
│ VOICE & AUTOMATION│                                          │
│  Voice agents    │                                           │
│  Knowledge       │                                           │
│  Call logs       │                                           │
│                  │                                           │
│ ADMINISTRATION   │                                           │
│  Users & roles   │                                           │
│  Hospital config │                                           │
│  Integrations    │                                           │
│  Audit log       │                                           │
└──────────────────┴───────────────────────────────────────────┘
```

### Shell rules

- The current hospital and user context must always be clear.
- Navigation groups use task language rather than database terminology where possible.
- Sections and items are role-aware.
- The active destination is visually and semantically identifiable.
- The top bar reserves space for global search, notifications or attention indicators, and the signed-in user menu.
- The shell works at desktop density and degrades gracefully to a compact navigation pattern on smaller screens.
- The product is branded as HVA, with the hospital identity visible in the workspace context.

## 5. Navigation and module boundaries

### Workspace

These modules represent daily operational work:

- **Overview:** What is happening today and what requires attention.
- **Calls:** Operational review of calls, transcripts, recordings, outcomes, and linked work.
- **Appointments:** Appointment list, detail, creation, cancellation, and rescheduling.
- **Follow-ups:** Owned unresolved work with due times, statuses, and activity history.
- **Patients:** Patient search, profile, appointments, calls, notes, and activity.

### Care delivery

These modules represent the hospital’s scheduling and service structure:

- Doctors
- Departments
- Schedules

### Voice & automation

These modules represent the voice system and its supporting information:

- **Voice agents:** Agent identity, version, configuration, status, and testing.
- **Knowledge:** Approved knowledge sources and readiness state.
- **Call logs:** Technical/provider event history, ingestion state, and diagnostics.

Calls are operational records. Call logs are technical/provider records. The UI must keep that distinction clear.

### Administration

These modules represent controlled configuration and oversight:

- Users and roles
- Hospital configuration
- Integrations
- Audit log

## 6. Operational dashboard

The default landing page is the operational dashboard. It should answer four questions quickly:

1. What is happening today?
2. What requires attention?
3. What is happening soon?
4. How is the operation performing?

Recommended structure:

### Today

A compact summary row, for example:

```text
Calls received       Appointments created       Follow-ups due       Booking failures
42                    18                         4                    2
```

Each metric must have a defined population, period, timezone, and meaning. Metrics link to the underlying filtered records.

### Requires attention

This is the most important dashboard section. Examples include:

- Caller requested human assistance
- Appointment booking failed
- Appointment requires confirmation
- Doctor schedule changed after bookings existed
- Call analysis is incomplete
- Recording or transcript is unavailable
- Voice integration or agent issue detected

Every item should expose enough context to decide whether to open, assign, resolve, or investigate it.

### Upcoming operations

Show the next relevant appointments, schedule changes, capacity concerns, and exceptions. The default window should prioritize the next few hours rather than distant activity.

### Reporting and trends

Reporting appears below immediate operational work. It may include call volume, booking outcomes, follow-up resolution, appointment outcomes, and agent performance. Reports must distinguish verified operational outcomes from AI-assessed outcomes.

## 7. Standard page anatomy

All major worklist modules should use the same structure:

```text
Page title                                      Primary action
Short description or scope context

Search        Filters        Date        More actions

──────────────────────────────────────────────────────────────
Main table, queue, or calendar
──────────────────────────────────────────────────────────────

Result count        Pagination        Loading/empty/error state
```

Page headers must communicate:

- Where the user is
- What the module contains
- What the primary action is
- What scope or date range is active

Primary creation actions belong at the top-right on wide screens and remain easily reachable on smaller screens. Filters belong above the main content. Row actions belong at the right side of the row or in a consistent overflow menu.

## 8. Worklists and the reusable DataTable

Tables are a first-class HVA component because staff will work with records repeatedly and at scale.

The initial reusable DataTable should support:

- Search
- Sorting
- Status filters
- Date filters
- Additional filters appropriate to the module
- Pagination
- Result totals
- Row selection
- Bulk actions where safe and useful
- Row actions
- Expandable rows where a short preview improves scanning
- Loading, empty, error, partial, and unauthorized states
- Sticky headers when useful
- Responsive horizontal scrolling or a deliberate compact mobile representation

Column customization and saved views are planned extensions, not prerequisites for the first worklists.

The first table patterns should be validated with Calls, Appointments, and Follow-ups before being generalized to Patients, Doctors, Users, and other modules.

## 9. Side panels and full-page detail

### Side panels

Use a side panel for quick inspection and lightweight action:

- Inspecting a call from a list
- Previewing an appointment
- Viewing a patient summary
- Reviewing a follow-up
- Checking a doctor’s availability
- Viewing recent activity
- Confirming a simple status change

Closing a side panel must return the user to the same table position, filters, and scroll context.

### Full pages

Use a full page for sustained or complex work:

- Long transcript and recording review
- Appointment editing, cancellation, or rescheduling
- Full patient profile management
- Doctor schedule management
- Voice agent configuration
- User and permission administration
- Audit investigation
- Complex follow-up resolution

Rule of thumb:

> Side panels are for inspection and lightweight action. Full pages are for sustained work, editing, and complexity.

## 10. Entity profiles

Entities should share a recognizable profile structure rather than inventing a new layout per module.

```text
Entity name                                      Status
Primary contact or identifying information

Overview   Appointments   Calls   Notes   Activity

──────────────────────────────────────────────────────────────
Relevant summary and current operational state
──────────────────────────────────────────────────────────────
Related records and chronological activity
```

Profiles should prioritize current operational context, then history. They must distinguish source evidence, staff-entered information, and AI-generated interpretation.

Expected profile variants include:

- Patient
- Doctor
- Appointment
- Call
- Follow-up
- Voice agent

## 11. Follow-ups as first-class work

Follow-ups are a top-level Workspace module because they represent owned work, not merely metadata attached to a call.

The Follow-ups queue should show:

- Reason
- Related call, patient, or appointment
- Owner
- Due time
- Derived overdue state
- Status
- Priority or attention level
- Last activity

Follow-up statuses are:

```text
OPEN → ASSIGNED → IN_PROGRESS → RESOLVED
                         └──────→ CANCELLED
```

Overdue is derived from due time and unresolved state. It is not a separate lifecycle state.

The dashboard should surface actionable follow-ups, while the Follow-ups module provides the complete queue and history.

## 12. Status and semantic color system

Status must communicate through text and, where useful, an icon. Color alone is never sufficient.

| Meaning | Visual direction | Examples |
| --- | --- | --- |
| Successful / active / completed | Green | Confirmed, active, completed, resolved |
| Informational / normal | Blue | In progress, scheduled, informational |
| Attention required | Amber | Pending, due soon, needs review |
| Failure / destructive | Red | Failed, rejected, unavailable, delete |
| Inactive / cancelled / archived | Gray | Cancelled, archived, disabled |
| AI or automated action | Purple accent | AI-generated summary, automated action |
| Unknown / not available | Neutral gray with explicit label | Unknown, not received, not assessed |

The semantic meaning must remain consistent across Calls, Appointments, Follow-ups, Agents, Integrations, and administrative screens.

## 13. Evidence, trust, and data states

HVA must clearly separate:

- Caller statements and source transcript
- Provider recordings and webhook evidence
- AI-generated summaries or classifications
- Application state and database records
- Staff-entered notes and decisions

The following rules are mandatory UX behavior:

- An AI success label must not be presented as proof that an appointment exists.
- An escalation request must not be presented as a completed human handoff without evidence.
- Missing analysis must not be shown as no analysis.
- Unknown cost or provider state must not be shown as zero.
- A missing recording must be explicit and explain whether it is pending, unavailable, or failed.
- Historical calls must display the agent, version, phone number, and routing snapshot that applied at call time.

## 14. Responsive and accessibility rules

- Desktop is the primary working environment, but core tasks must remain usable on smaller screens.
- Tables may scroll horizontally when necessary; critical fields should remain visible or be summarized deliberately.
- Side panels become full-screen or bottom-sheet detail views on narrow screens.
- Focus must move predictably when panels, dialogs, and menus open or close.
- Every interactive control must be keyboard reachable and visibly focused.
- Statuses, errors, and required fields must not rely only on color.
- Text and controls must maintain readable contrast.
- Destructive confirmation dialogs must explain the action and its consequence.
- Loading states should preserve layout where possible to reduce disorientation.
- Empty states should explain what the user can do next.
- Error states should explain whether retrying, waiting, or contacting an administrator is appropriate.

## 15. Component foundation

The design system should be built in layers.

### Foundations

- Typography
- Spacing
- Colors and semantic tokens
- Borders and radii
- Shadows
- Icons
- Layout grid
- Focus and interaction states

### Core components

- Button
- Input
- Search field
- Select and combobox
- Date and date-range picker
- Checkbox and radio controls
- Status badge
- Avatar
- Tabs
- Dropdown and overflow menu
- Tooltip
- Toast or inline notification

### Operational components

- App shell
- Page header
- Filter bar
- DataTable
- Side panel
- Modal and confirmation dialog
- Activity timeline
- Attention queue
- Stat summary
- Calendar and schedule views
- Empty state
- Error state
- Skeleton/loading state
- Command search

Components should be created when a real workflow needs them and then generalized. Avoid creating large collections of unused abstractions.

## 16. Rules for adding future features

Before adding a new feature, answer:

1. Which user task does this support?
2. Which navigation group owns it?
3. Is it a worklist, detail workspace, profile, planning view, or configuration view?
4. Which existing component patterns does it reuse?
5. What are its loading, empty, error, unknown, stale, and unauthorized states?
6. What evidence is authoritative, and what is interpretation?
7. Which roles can view and act on it?
8. Does it introduce a new status or can it use the existing semantic system?
9. Should it open in a side panel or a full page, and why?
10. What record or metric should users be able to navigate to from it?

If a feature cannot answer these questions, its UX is not ready for implementation.

## 17. First design and implementation sequence

The initial design sequence is:

1. Application shell and role-aware navigation
2. Clinical/calm visual foundations
3. Operational dashboard
4. Calls worklist and call detail side panel
5. Appointments worklist and appointment detail
6. Follow-ups queue and resolution flow
7. Patient and doctor profiles
8. Scheduling and calendar views
9. Voice, knowledge, and integration administration
10. Reporting and drill-down behavior
11. Global search and saved views
12. Accessibility, responsive behavior, and full state coverage

The first vertical slice should follow the complete lifecycle rather than build isolated pages:

```text
Call review → appointment outcome → follow-up → verified reporting
```

This sequence will validate whether the shell, tables, side panels, entity profiles, status system, and evidence model work together before the product expands.
