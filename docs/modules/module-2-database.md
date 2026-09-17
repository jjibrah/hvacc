# Database conventions

Module 2 uses PostgreSQL on the isolated development Supabase project and
Drizzle ORM. The application connects only from trusted server code. Browser
components must not import `src/modules/database`.

## Connections and commands

- `DATABASE_URL` is the runtime connection string. For a serverless deployment,
  use Supabase's transaction pooler; the client caps its pool at one connection,
  requires TLS outside localhost, and disables prepared statements.
- `DATABASE_MIGRATION_URL` is optional and should use Supabase's direct or
  session connection. Drizzle falls back to `DATABASE_URL` for local work.
- `npm run db:generate -- --name=<change>` creates a reviewed SQL migration.
- `npm run db:migrate` applies committed migrations.
- `npm run db:seed` inserts the approved synthetic dataset. Stable UUIDs,
  timestamps, provider references, and `ON CONFLICT DO NOTHING` make repeated
  runs deterministic and non-duplicating.

Never use `drizzle-kit push` against a shared environment. Schema changes must
be represented by committed migrations.

## Row-level security

Every application table in the Data API-exposed `public` schema has RLS
enabled. The current server-only architecture intentionally defines no `anon`
or `authenticated` policies and revokes their table grants, so browser and
publishable-key access is denied by default. The trusted PostgreSQL owner and
Supabase service role continue to bypass RLS; neither credential may reach the
browser.

Module 3 must add grants and policies together if it introduces user-scoped
Data API access. Those policies must combine authenticated profile identity,
active hospital membership, explicit permission, hospital ownership, and any
doctor record scope. Never add a broad `using (true)` policy to patient, caller,
call, transcript, recording, appointment, follow-up, provider-event, or audit
tables.

## Identity, ownership, and time

- Primary keys are PostgreSQL UUIDs. Runtime-created records use
  `gen_random_uuid()`; seed records use fixed UUIDs.
- Every hospital-owned table carries `hospital_id`. Cross-record ownership is
  enforced with composite foreign keys `(hospital_id, record_id)`, so records
  from different hospitals cannot be connected accidentally.
- Supabase Auth owns login identities. `profiles.auth_user_id` stores the Auth
  user UUID uniquely without attempting to manage the provider-owned
  `auth.users` table in Drizzle migrations.
- All instants use `timestamp with time zone` and are written/read as UTC.
  Hospital configuration stores an IANA timezone validated by PostgreSQL; it is
  used for display, scheduling input, and reporting boundaries.
- Weekly schedules store local wall-clock times plus effective dates. Generated
  sessions store resolved UTC instants, preserving what was actually bookable
  if timezone rules later change.

## Lifecycle and deletion

- Operational records with a `deleted_at` column use soft deletion. Business
  history, provider events, and audit events are never soft-deleted to hide an
  outcome.
- Appointment and follow-up transitions are restricted by database triggers.
  Cancellations and resolutions require their evidence fields.
- Provider event identity and payload are immutable after receipt; only
  processing status, processed time, and a safe error may change.
- Audit events are fully append-only.
- Session capacity is constrained to `0 <= booked_units <= capacity`. Booking
  services must lock the session row and change appointment plus capacity in a
  single transaction; that concurrency service belongs to Module 5.

## PII and evidence

This learning environment permits only the approved synthetic identities.
Names, phone numbers, dates of birth, transcript text, and recording references
are PII-classified even when synthetic:

- do not place them in application logs, provider-event error fields, audit
  before/after JSON, metrics, or idempotency responses;
- normalize phones to E.164 and use a SHA-256 lookup hash scoped by hospital;
- return PII only after explicit permission and record-scope checks;
- keep provider payloads server-only and redact them before diagnostics;
- store recording object references, never public URLs or credentials.

`safe_before`, `safe_after`, `safe_error`, and `safe_configuration` mean the
caller must supply an allow-listed, redacted object. The database cannot infer
whether arbitrary JSON contains PII, so service-layer serializers must enforce
that contract and tests must cover it when those services are introduced.

## Schema-test boundary

`schema.integration.test.ts` creates an in-memory PostgreSQL-compatible database
and applies every committed migration. It proves fresh migration, timezone
validation, hospital ownership, lifecycle transitions, provider-event
deduplication, and evidence immutability without touching Supabase.
