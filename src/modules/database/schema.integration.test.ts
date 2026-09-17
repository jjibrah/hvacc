// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const migrationFiles = [
  "drizzle/0000_module-2-initial.sql",
  "drizzle/0001_module-2-invariants.sql",
  "drizzle/0002_enable-rls.sql",
  "drizzle/0003_one-role-per-hospital.sql",
  "drizzle/0004_hospital_admin_invariant.sql",
];

let postgres: PGlite;

async function applyMigrations(database: PGlite) {
  for (const filename of migrationFiles) {
    const migration = await readFile(resolve(process.cwd(), filename), "utf8");
    for (const statement of migration.split("--> statement-breakpoint")) {
      if (statement.trim()) await database.exec(statement);
    }
  }
}

async function expectDatabaseRejection(
  operation: Promise<unknown>,
  pattern: RegExp,
) {
  await expect(operation).rejects.toThrow(pattern);
}

describe("Module 2 PostgreSQL schema", () => {
  beforeAll(async () => {
    postgres = new PGlite();
    await applyMigrations(postgres);
  }, 30_000);

  afterAll(async () => {
    await postgres.close();
  });

  it("applies every migration to a fresh database", async () => {
    const result = await postgres.query<{ count: number }>(
      "select count(*)::int as count from information_schema.tables where table_schema = 'public'",
    );

    expect(result.rows[0]?.count).toBe(38);
  });

  it("enables deny-by-default RLS on every public table", async () => {
    const unprotected = await postgres.query<{ table_name: string }>(`
      select c.relname as table_name
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and not c.relrowsecurity
    `);
    const policies = await postgres.query<{ count: number }>(
      "select count(*)::int as count from pg_policies where schemaname = 'public'",
    );

    expect(unprotected.rows).toEqual([]);
    expect(policies.rows[0]?.count).toBe(0);

    await postgres.exec(`
      create role rls_test_client;
      grant usage on schema public to rls_test_client;
      grant select on public.hospitals to rls_test_client;
      set role rls_test_client;
    `);
    const hiddenRows = await postgres.query<{ count: number }>(
      "select count(*)::int as count from public.hospitals",
    );
    await postgres.exec("reset role;");

    expect(hiddenRows.rows[0]?.count).toBe(0);
  });

  it("rejects an invalid hospital timezone", async () => {
    await postgres.exec(`
      insert into hospitals (id, stable_key, display_name)
      values ('10000000-0000-4000-8000-000000000001', 'scope-a', 'Scope A');
    `);

    await expectDatabaseRejection(
      postgres.exec(`
        insert into hospital_configurations
          (hospital_id, timezone, currency_code)
        values
          ('10000000-0000-4000-8000-000000000001', 'Mars/Olympus', 'MYR');
      `),
      /invalid hospital timezone/i,
    );
  });

  it("rejects cross-hospital ownership links", async () => {
    await postgres.exec(`
      insert into hospitals (id, stable_key, display_name) values
        ('20000000-0000-4000-8000-000000000001', 'scope-b', 'Scope B'),
        ('30000000-0000-4000-8000-000000000001', 'scope-c', 'Scope C');
      insert into departments (id, hospital_id, code, name)
      values (
        '20000000-0000-4001-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        'CARD',
        'Cardiology'
      );
    `);

    await expectDatabaseRejection(
      postgres.exec(`
        insert into doctors
          (hospital_id, department_id, stable_key, display_name)
        values (
          '30000000-0000-4000-8000-000000000001',
          '20000000-0000-4001-8000-000000000001',
          'cross-hospital-doctor',
          'Invalid Doctor'
        );
      `),
      /doctors_department_scope_fk/i,
    );
  });

  it("rejects invalid lifecycle transitions", async () => {
    await postgres.exec(`
      insert into departments (id, hospital_id, code, name)
      values (
        '10000000-0000-4001-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        'GEN',
        'General Medicine'
      );
      insert into doctors (id, hospital_id, department_id, stable_key, display_name)
      values (
        '10000000-0000-4002-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        '10000000-0000-4001-8000-000000000001',
        'doctor-a',
        'Doctor A'
      );
      insert into sessions
        (id, hospital_id, doctor_id, department_id, starts_at, ends_at, capacity)
      values (
        '10000000-0000-4003-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        '10000000-0000-4002-8000-000000000001',
        '10000000-0000-4001-8000-000000000001',
        '2026-10-01T01:00:00Z',
        '2026-10-01T02:00:00Z',
        1
      );
      insert into patients (id, hospital_id, stable_key, display_name)
      values (
        '10000000-0000-4004-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        'patient-a',
        'Patient A'
      );
      insert into appointments
        (id, hospital_id, reference, session_id, patient_id, status, source)
      values (
        '10000000-0000-4005-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        'APT-TEST-A',
        '10000000-0000-4003-8000-000000000001',
        '10000000-0000-4004-8000-000000000001',
        'pending',
        'staff'
      );
    `);

    await expectDatabaseRejection(
      postgres.exec(`
        update appointments set status = 'completed'
        where id = '10000000-0000-4005-8000-000000000001';
      `),
      /invalid appointment transition/i,
    );
  });

  it("deduplicates and preserves immutable provider evidence", async () => {
    await postgres.exec(`
      insert into provider_events
        (id, hospital_id, provider, provider_event_id, event_type, payload, payload_hash)
      values (
        '10000000-0000-4006-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        'retell',
        'event-test-1',
        'call_started',
        '{"synthetic":true}',
        'hash-1'
      );
    `);

    await expectDatabaseRejection(
      postgres.exec(`
        insert into provider_events
          (hospital_id, provider, provider_event_id, event_type, payload, payload_hash)
        values (
          '10000000-0000-4000-8000-000000000001',
          'retell',
          'event-test-1',
          'call_started',
          '{"synthetic":true}',
          'hash-1'
        );
      `),
      /provider_events_dedup_unique/i,
    );

    await expectDatabaseRejection(
      postgres.exec(`
        update provider_events set payload = '{"synthetic":false}'
        where id = '10000000-0000-4006-8000-000000000001';
      `),
      /provider event evidence is immutable/i,
    );

    await postgres.exec(`
      update provider_events
      set processing_status = 'processed', processed_at = now()
      where id = '10000000-0000-4006-8000-000000000001';
    `);
  });

  it("retains at least one active hospital administrator", async () => {
    await postgres.exec(`
      insert into profiles (id, auth_user_id, display_name, email) values
        ('40000000-0000-4000-8000-000000000001', '40000000-0000-4001-8000-000000000001', 'Admin One', 'admin-one@example.test'),
        ('40000000-0000-4000-8000-000000000002', '40000000-0000-4001-8000-000000000002', 'Admin Two', 'admin-two@example.test');
      insert into hospital_memberships (id, hospital_id, profile_id, role) values
        ('40000000-0000-4002-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'hospital_admin'),
        ('40000000-0000-4002-8000-000000000002', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'reception_staff');
    `);

    await expectDatabaseRejection(
      postgres.exec(`
        update hospital_memberships
        set status = 'disabled'
        where id = '40000000-0000-4002-8000-000000000001';
      `),
      /retain an active administrator/i,
    );

    await postgres.exec(`
      update hospital_memberships
      set role = 'hospital_admin'
      where id = '40000000-0000-4002-8000-000000000002';
      update hospital_memberships
      set status = 'disabled'
      where id = '40000000-0000-4002-8000-000000000001';
    `);
  });
});
