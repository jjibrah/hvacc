# Module 5 — Scheduling and appointment backend

Scheduling is server-authoritative. Availability is read from materialized
session rows; recurring schedules and date exceptions are materialized into
those rows using the hospital timezone before availability is returned.

The scheduling service lives in
`src/modules/scheduling/server/service.ts` and exposes:

- `GET /api/appointments/availability`
- `POST /api/appointments`
- `POST /api/appointments/:appointmentId/cancel`
- `POST /api/appointments/:appointmentId/reschedule`
- `POST /api/scheduling/schedules`
- `PUT /api/scheduling/schedules` for date exceptions
- `POST /api/scheduling/sessions/:sessionId/close`
- `POST /api/scheduling/caller-patient`

Booking requires `confirmed: true` and an idempotency key. The transaction
creates or replays the idempotency record, locks the session with
`SELECT ... FOR UPDATE`, verifies remaining capacity, creates the confirmed
appointment, increments `booked_units`, writes appointment history, and audits
the mutation. Cancellation and rescheduling use the same pattern. Rescheduling
locks source and destination sessions in deterministic order, reserves the
destination first, then releases the source.

Callers and patients are separate records. A caller may book for a linked
patient, including multiple family members, but an unlinked caller/patient
pair is rejected without revealing cross-hospital records.

The remaining exit-gate work is database-level concurrency evidence covering
two simultaneous final-slot requests, retries after committed responses,
timezone/DST boundaries, closed sessions, and atomic rescheduling.
