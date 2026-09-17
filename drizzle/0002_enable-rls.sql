-- The application currently accesses PostgreSQL only through trusted server
-- code. Enable RLS on every Data API-exposed table and define no client policy:
-- this intentionally creates a deny-by-default boundary for anon/authenticated.
ALTER TABLE public.appointment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_provider_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caller_patient_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.callers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_profile_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handoff_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retell_agent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retell_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retell_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retell_routing_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Older Supabase projects may automatically grant public-schema tables to the
-- Data API roles. No browser access is required before Module 3, so remove both
-- existing and future table grants. This is deliberately conditional so the
-- same migration remains testable on plain PostgreSQL without Supabase roles.
DO $$
DECLARE
  client_role text;
BEGIN
  FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I',
        client_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM %I',
        client_role
      );
    END IF;
  END LOOP;
END;
$$;
