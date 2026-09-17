CREATE TYPE "public"."actor_kind" AS ENUM('profile', 'provider', 'system');--> statement-breakpoint
CREATE TYPE "public"."analysis_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."appointment_source" AS ENUM('voice', 'staff', 'import');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."assignment_kind" AS ENUM('queue', 'membership');--> statement-breakpoint
CREATE TYPE "public"."audit_result" AS ENUM('succeeded', 'denied', 'failed');--> statement-breakpoint
CREATE TYPE "public"."call_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."call_status" AS ENUM('received', 'in_progress', 'ended', 'failed');--> statement-breakpoint
CREATE TYPE "public"."event_processing_status" AS ENUM('received', 'processed', 'ignored', 'failed');--> statement-breakpoint
CREATE TYPE "public"."follow_up_priority" AS ENUM('p1', 'p2', 'p3', 'p4');--> statement-breakpoint
CREATE TYPE "public"."follow_up_status" AS ENUM('open', 'assigned', 'in_progress', 'resolved', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."idempotency_operation" AS ENUM('book', 'cancel', 'reschedule');--> statement-breakpoint
CREATE TYPE "public"."idempotency_status" AS ENUM('processing', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('draft', 'active', 'disabled', 'error');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('reception_staff', 'operations_manager', 'quality_reviewer', 'doctor', 'hospital_admin', 'platform_admin');--> statement-breakpoint
CREATE TYPE "public"."provider_kind" AS ENUM('retell');--> statement-breakpoint
CREATE TYPE "public"."record_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."recording_status" AS ENUM('pending', 'available', 'expired', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('open', 'closing', 'closed', 'cancelled', 'completed');--> statement-breakpoint
CREATE TABLE "appointment_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"from_status" "appointment_status",
	"to_status" "appointment_status" NOT NULL,
	"actor_profile_id" uuid,
	"reason" text,
	"evidence" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_history_status_changes" CHECK ("appointment_history"."from_status" is null or "appointment_history"."from_status" <> "appointment_history"."to_status")
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"session_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"booked_by_caller_id" uuid,
	"status" "appointment_status" DEFAULT 'pending' NOT NULL,
	"source" "appointment_source" NOT NULL,
	"capacity_units" integer DEFAULT 1 NOT NULL,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"replaced_appointment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "appointments_scope_unique" UNIQUE("hospital_id","id"),
	CONSTRAINT "appointments_capacity_units_positive" CHECK ("appointments"."capacity_units" > 0),
	CONSTRAINT "appointments_confirmed_at_required" CHECK ("appointments"."status" <> 'confirmed' or "appointments"."confirmed_at" is not null),
	CONSTRAINT "appointments_cancellation_fields" CHECK ("appointments"."status" <> 'cancelled' or ("appointments"."cancelled_at" is not null and "appointments"."cancellation_reason" is not null))
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid,
	"actor_kind" "actor_kind" NOT NULL,
	"actor_profile_id" uuid,
	"actor_provider_id" text,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"result" "audit_result" NOT NULL,
	"reason" text,
	"request_id" text,
	"safe_before" jsonb,
	"safe_after" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_actor_identity" CHECK (("audit_events"."actor_kind" = 'profile' and "audit_events"."actor_profile_id" is not null and "audit_events"."actor_provider_id" is null) or ("audit_events"."actor_kind" = 'provider' and "audit_events"."actor_profile_id" is null and "audit_events"."actor_provider_id" is not null) or ("audit_events"."actor_kind" = 'system' and "audit_events"."actor_profile_id" is null))
);
--> statement-breakpoint
CREATE TABLE "call_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"call_id" uuid NOT NULL,
	"status" "analysis_status" DEFAULT 'pending' NOT NULL,
	"provider_analysis_id" text,
	"summary" text,
	"sentiment" text,
	"outcome" text,
	"booking_intent" boolean,
	"raw_snapshot" jsonb,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "call_analyses_completed_at_required" CHECK ("call_analyses"."status" <> 'completed' or "call_analyses"."completed_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "call_appointments" (
	"hospital_id" uuid NOT NULL,
	"call_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"link_reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "call_appointments_hospital_id_call_id_appointment_id_pk" PRIMARY KEY("hospital_id","call_id","appointment_id")
);
--> statement-breakpoint
CREATE TABLE "call_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"call_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"caller_id" uuid,
	"profile_id" uuid,
	"provider_participant_id" text,
	"joined_at" timestamp with time zone,
	"left_at" timestamp with time zone,
	CONSTRAINT "call_participants_time_order" CHECK ("call_participants"."left_at" is null or "call_participants"."joined_at" is null or "call_participants"."left_at" >= "call_participants"."joined_at")
);
--> statement-breakpoint
CREATE TABLE "call_provider_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"call_id" uuid NOT NULL,
	"snapshot_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_recordings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"call_id" uuid NOT NULL,
	"status" "recording_status" DEFAULT 'pending' NOT NULL,
	"provider_recording_id" text,
	"storage_reference" text,
	"duration_seconds" integer,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "call_recordings_duration_nonnegative" CHECK ("call_recordings"."duration_seconds" is null or "call_recordings"."duration_seconds" >= 0)
);
--> statement-breakpoint
CREATE TABLE "call_transcripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"call_id" uuid NOT NULL,
	"provider_transcript_id" text,
	"language" text,
	"content" text NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "caller_patient_links" (
	"hospital_id" uuid NOT NULL,
	"caller_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"relationship" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "caller_patient_links_hospital_id_caller_id_patient_id_pk" PRIMARY KEY("hospital_id","caller_id","patient_id")
);
--> statement-breakpoint
CREATE TABLE "callers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"display_name" text,
	"phone_e164" text NOT NULL,
	"phone_hash" text NOT NULL,
	"preferred_locale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "callers_scope_unique" UNIQUE("hospital_id","id"),
	CONSTRAINT "callers_phone_e164_format" CHECK ("callers"."phone_e164" ~ '^\+[1-9][0-9]{7,14}$')
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"provider" "provider_kind" DEFAULT 'retell' NOT NULL,
	"provider_call_id" text NOT NULL,
	"direction" "call_direction" NOT NULL,
	"status" "call_status" DEFAULT 'received' NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"last_provider_event_at" timestamp with time zone,
	"cost_amount" numeric(12, 4),
	"cost_currency" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calls_scope_unique" UNIQUE("hospital_id","id"),
	CONSTRAINT "calls_time_order" CHECK ("calls"."ended_at" is null or "calls"."started_at" is null or "calls"."ended_at" >= "calls"."started_at"),
	CONSTRAINT "calls_cost_pair" CHECK (("calls"."cost_amount" is null) = ("calls"."cost_currency" is null))
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "departments_scope_unique" UNIQUE("hospital_id","id")
);
--> statement-breakpoint
CREATE TABLE "doctor_profile_links" (
	"hospital_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "doctor_profile_links_hospital_id_doctor_id_profile_id_pk" PRIMARY KEY("hospital_id","doctor_id","profile_id"),
	CONSTRAINT "doctor_profile_links_one_profile_per_doctor" UNIQUE("hospital_id","doctor_id")
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"stable_key" text NOT NULL,
	"display_name" text NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "doctors_scope_unique" UNIQUE("hospital_id","id")
);
--> statement-breakpoint
CREATE TABLE "follow_up_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"follow_up_id" uuid NOT NULL,
	"actor_profile_id" uuid,
	"activity_type" text NOT NULL,
	"note" text,
	"evidence" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow_up_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"follow_up_id" uuid NOT NULL,
	"kind" "assignment_kind" NOT NULL,
	"membership_id" uuid,
	"queue" text,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "follow_up_assignments_target" CHECK (("follow_up_assignments"."kind" = 'membership' and "follow_up_assignments"."membership_id" is not null and "follow_up_assignments"."queue" is null) or ("follow_up_assignments"."kind" = 'queue' and "follow_up_assignments"."queue" is not null and "follow_up_assignments"."membership_id" is null))
);
--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"call_id" uuid,
	"appointment_id" uuid,
	"reason_code" text NOT NULL,
	"priority" "follow_up_priority" NOT NULL,
	"status" "follow_up_status" DEFAULT 'open' NOT NULL,
	"queue" text NOT NULL,
	"resolution_criterion" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"resolution_code" text,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "follow_ups_scope_unique" UNIQUE("hospital_id","id"),
	CONSTRAINT "follow_ups_source_required" CHECK ("follow_ups"."call_id" is not null or "follow_ups"."appointment_id" is not null),
	CONSTRAINT "follow_ups_resolution_fields" CHECK ("follow_ups"."status" <> 'resolved' or ("follow_ups"."resolved_at" is not null and "follow_ups"."resolution_code" is not null and "follow_ups"."resolution_note" is not null))
);
--> statement-breakpoint
CREATE TABLE "handoff_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"call_id" uuid NOT NULL,
	"follow_up_id" uuid,
	"requested_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by_membership_id" uuid,
	"provider_reference" text,
	"evidence" jsonb NOT NULL,
	CONSTRAINT "handoff_evidence_acceptance_pair" CHECK (("handoff_evidence"."accepted_at" is null) = ("handoff_evidence"."accepted_by_membership_id" is null)),
	CONSTRAINT "handoff_evidence_time_order" CHECK ("handoff_evidence"."accepted_at" is null or "handoff_evidence"."accepted_at" >= "handoff_evidence"."requested_at")
);
--> statement-breakpoint
CREATE TABLE "hospital_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"timezone" text NOT NULL,
	"currency_code" text NOT NULL,
	"synthetic_contact_email" text,
	"synthetic_contact_phone" text,
	"synthetic_address" text,
	"default_locale" text DEFAULT 'en-MY' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hospital_configurations_currency_code" CHECK ("hospital_configurations"."currency_code" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "hospital_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"role" "membership_role" NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "hospital_memberships_profile_role_unique" UNIQUE("hospital_id","profile_id","role"),
	CONSTRAINT "hospital_memberships_scope_unique" UNIQUE("hospital_id","id")
);
--> statement-breakpoint
CREATE TABLE "hospitals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stable_key" text NOT NULL,
	"display_name" text NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "hospitals_scope_unique" UNIQUE("id","stable_key"),
	CONSTRAINT "hospitals_stable_key_format" CHECK ("hospitals"."stable_key" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "idempotency_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"operation" "idempotency_operation" NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"patient_id" uuid,
	"session_id" uuid,
	"status" "idempotency_status" DEFAULT 'processing' NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"resource_type" text,
	"resource_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_records_response_pair" CHECK (("idempotency_records"."response_status" is null) = ("idempotency_records"."response_body" is null))
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"provider" "provider_kind" NOT NULL,
	"kind" text NOT NULL,
	"external_id" text,
	"status" "integration_status" DEFAULT 'draft' NOT NULL,
	"safe_configuration" jsonb NOT NULL,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"provider_knowledge_base_id" text NOT NULL,
	"provider_source_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "integration_status" DEFAULT 'draft' NOT NULL,
	"checksum" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_permissions" (
	"hospital_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"permission_code" text NOT NULL,
	"granted" boolean NOT NULL,
	"reason" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_permissions_membership_id_permission_code_pk" PRIMARY KEY("membership_id","permission_code")
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"stable_key" text NOT NULL,
	"display_name" text NOT NULL,
	"date_of_birth" date,
	"phone_e164" text,
	"phone_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "patients_scope_unique" UNIQUE("hospital_id","id"),
	CONSTRAINT "patients_phone_e164_format" CHECK ("patients"."phone_e164" is null or "patients"."phone_e164" ~ '^\+[1-9][0-9]{7,14}$')
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"code" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"sensitive" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "provider_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"provider" "provider_kind" NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"call_id" uuid,
	"payload" jsonb NOT NULL,
	"payload_hash" text NOT NULL,
	"occurred_at" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processing_status" "event_processing_status" DEFAULT 'received' NOT NULL,
	"processed_at" timestamp with time zone,
	"safe_error" text
);
--> statement-breakpoint
CREATE TABLE "retell_agent_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"provider_version" text NOT NULL,
	"response_engine_id" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"configuration_snapshot" jsonb NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retell_agent_versions_scope_unique" UNIQUE("hospital_id","id")
);
--> statement-breakpoint
CREATE TABLE "retell_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"provider_agent_id" text NOT NULL,
	"display_name" text NOT NULL,
	"agent_type" text NOT NULL,
	"voice_name" text,
	"status" "integration_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retell_agents_scope_unique" UNIQUE("hospital_id","id")
);
--> statement-breakpoint
CREATE TABLE "retell_phone_numbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"provider_phone_number_id" text NOT NULL,
	"phone_e164" text,
	"nickname" text NOT NULL,
	"agent_version_id" uuid,
	"status" "integration_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retell_routing_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"source_agent_version_id" uuid NOT NULL,
	"destination_agent_version_id" uuid,
	"routing_rule" jsonb NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role" "membership_role" NOT NULL,
	"permission_code" text NOT NULL,
	CONSTRAINT "role_permissions_role_permission_code_pk" PRIMARY KEY("role","permission_code")
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"local_start_time" time NOT NULL,
	"local_end_time" time NOT NULL,
	"effective_from" date NOT NULL,
	"effective_until" date,
	"default_capacity" integer NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "schedules_scope_unique" UNIQUE("hospital_id","id"),
	CONSTRAINT "schedules_weekday_range" CHECK ("schedules"."weekday" between 0 and 6),
	CONSTRAINT "schedules_time_order" CHECK ("schedules"."local_end_time" > "schedules"."local_start_time"),
	CONSTRAINT "schedules_capacity_positive" CHECK ("schedules"."default_capacity" > 0),
	CONSTRAINT "schedules_effective_date_order" CHECK ("schedules"."effective_until" is null or "schedules"."effective_until" >= "schedules"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "session_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"schedule_id" uuid NOT NULL,
	"exception_date" date NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"replacement_starts_at" timestamp with time zone,
	"replacement_ends_at" timestamp with time zone,
	"capacity_override" integer,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_exceptions_capacity_positive" CHECK ("session_exceptions"."capacity_override" is null or "session_exceptions"."capacity_override" > 0),
	CONSTRAINT "session_exceptions_replacement_pair" CHECK (("session_exceptions"."replacement_starts_at" is null) = ("session_exceptions"."replacement_ends_at" is null)),
	CONSTRAINT "session_exceptions_replacement_order" CHECK ("session_exceptions"."replacement_starts_at" is null or "session_exceptions"."replacement_ends_at" > "session_exceptions"."replacement_starts_at")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"schedule_id" uuid,
	"doctor_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"capacity" integer NOT NULL,
	"booked_units" integer DEFAULT 0 NOT NULL,
	"status" "session_status" DEFAULT 'open' NOT NULL,
	"closure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "sessions_scope_unique" UNIQUE("hospital_id","id"),
	CONSTRAINT "sessions_time_order" CHECK ("sessions"."ends_at" > "sessions"."starts_at"),
	CONSTRAINT "sessions_capacity_positive" CHECK ("sessions"."capacity" > 0),
	CONSTRAINT "sessions_booked_units_range" CHECK ("sessions"."booked_units" >= 0 and "sessions"."booked_units" <= "sessions"."capacity"),
	CONSTRAINT "sessions_closure_reason_required" CHECK ("sessions"."status" not in ('closing', 'closed', 'cancelled') or "sessions"."closure_reason" is not null)
);
--> statement-breakpoint
ALTER TABLE "appointment_history" ADD CONSTRAINT "appointment_history_actor_profile_id_profiles_id_fk" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_history" ADD CONSTRAINT "appointment_history_appointment_scope_fk" FOREIGN KEY ("hospital_id","appointment_id") REFERENCES "public"."appointments"("hospital_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_session_scope_fk" FOREIGN KEY ("hospital_id","session_id") REFERENCES "public"."sessions"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_scope_fk" FOREIGN KEY ("hospital_id","patient_id") REFERENCES "public"."patients"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_caller_scope_fk" FOREIGN KEY ("hospital_id","booked_by_caller_id") REFERENCES "public"."callers"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_replacement_scope_fk" FOREIGN KEY ("hospital_id","replaced_appointment_id") REFERENCES "public"."appointments"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_profile_id_profiles_id_fk" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_analyses" ADD CONSTRAINT "call_analyses_call_scope_fk" FOREIGN KEY ("hospital_id","call_id") REFERENCES "public"."calls"("hospital_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_appointments" ADD CONSTRAINT "call_appointments_call_scope_fk" FOREIGN KEY ("hospital_id","call_id") REFERENCES "public"."calls"("hospital_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_appointments" ADD CONSTRAINT "call_appointments_appointment_scope_fk" FOREIGN KEY ("hospital_id","appointment_id") REFERENCES "public"."appointments"("hospital_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_call_scope_fk" FOREIGN KEY ("hospital_id","call_id") REFERENCES "public"."calls"("hospital_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_caller_scope_fk" FOREIGN KEY ("hospital_id","caller_id") REFERENCES "public"."callers"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_provider_snapshots" ADD CONSTRAINT "call_provider_snapshots_call_scope_fk" FOREIGN KEY ("hospital_id","call_id") REFERENCES "public"."calls"("hospital_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_recordings" ADD CONSTRAINT "call_recordings_call_scope_fk" FOREIGN KEY ("hospital_id","call_id") REFERENCES "public"."calls"("hospital_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_transcripts" ADD CONSTRAINT "call_transcripts_call_scope_fk" FOREIGN KEY ("hospital_id","call_id") REFERENCES "public"."calls"("hospital_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caller_patient_links" ADD CONSTRAINT "caller_patient_links_caller_scope_fk" FOREIGN KEY ("hospital_id","caller_id") REFERENCES "public"."callers"("hospital_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caller_patient_links" ADD CONSTRAINT "caller_patient_links_patient_scope_fk" FOREIGN KEY ("hospital_id","patient_id") REFERENCES "public"."patients"("hospital_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "callers" ADD CONSTRAINT "callers_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_profile_links" ADD CONSTRAINT "doctor_profile_links_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_profile_links" ADD CONSTRAINT "doctor_profile_links_doctor_scope_fk" FOREIGN KEY ("hospital_id","doctor_id") REFERENCES "public"."doctors"("hospital_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_department_scope_fk" FOREIGN KEY ("hospital_id","department_id") REFERENCES "public"."departments"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_activities" ADD CONSTRAINT "follow_up_activities_actor_profile_id_profiles_id_fk" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_activities" ADD CONSTRAINT "follow_up_activities_follow_up_scope_fk" FOREIGN KEY ("hospital_id","follow_up_id") REFERENCES "public"."follow_ups"("hospital_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_assignments" ADD CONSTRAINT "follow_up_assignments_follow_up_scope_fk" FOREIGN KEY ("hospital_id","follow_up_id") REFERENCES "public"."follow_ups"("hospital_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_assignments" ADD CONSTRAINT "follow_up_assignments_membership_scope_fk" FOREIGN KEY ("hospital_id","membership_id") REFERENCES "public"."hospital_memberships"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_call_scope_fk" FOREIGN KEY ("hospital_id","call_id") REFERENCES "public"."calls"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_appointment_scope_fk" FOREIGN KEY ("hospital_id","appointment_id") REFERENCES "public"."appointments"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handoff_evidence" ADD CONSTRAINT "handoff_evidence_call_scope_fk" FOREIGN KEY ("hospital_id","call_id") REFERENCES "public"."calls"("hospital_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handoff_evidence" ADD CONSTRAINT "handoff_evidence_follow_up_scope_fk" FOREIGN KEY ("hospital_id","follow_up_id") REFERENCES "public"."follow_ups"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handoff_evidence" ADD CONSTRAINT "handoff_evidence_membership_scope_fk" FOREIGN KEY ("hospital_id","accepted_by_membership_id") REFERENCES "public"."hospital_memberships"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_configurations" ADD CONSTRAINT "hospital_configurations_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_memberships" ADD CONSTRAINT "hospital_memberships_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_memberships" ADD CONSTRAINT "hospital_memberships_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_patient_scope_fk" FOREIGN KEY ("hospital_id","patient_id") REFERENCES "public"."patients"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_session_scope_fk" FOREIGN KEY ("hospital_id","session_id") REFERENCES "public"."sessions"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_permissions" ADD CONSTRAINT "membership_permissions_permission_code_permissions_code_fk" FOREIGN KEY ("permission_code") REFERENCES "public"."permissions"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_permissions" ADD CONSTRAINT "membership_permissions_membership_scope_fk" FOREIGN KEY ("hospital_id","membership_id") REFERENCES "public"."hospital_memberships"("hospital_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_events" ADD CONSTRAINT "provider_events_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_events" ADD CONSTRAINT "provider_events_call_scope_fk" FOREIGN KEY ("hospital_id","call_id") REFERENCES "public"."calls"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retell_agent_versions" ADD CONSTRAINT "retell_agent_versions_agent_scope_fk" FOREIGN KEY ("hospital_id","agent_id") REFERENCES "public"."retell_agents"("hospital_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retell_agents" ADD CONSTRAINT "retell_agents_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retell_phone_numbers" ADD CONSTRAINT "retell_phone_numbers_agent_version_scope_fk" FOREIGN KEY ("hospital_id","agent_version_id") REFERENCES "public"."retell_agent_versions"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retell_routing_snapshots" ADD CONSTRAINT "retell_routing_snapshots_source_scope_fk" FOREIGN KEY ("hospital_id","source_agent_version_id") REFERENCES "public"."retell_agent_versions"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retell_routing_snapshots" ADD CONSTRAINT "retell_routing_snapshots_destination_scope_fk" FOREIGN KEY ("hospital_id","destination_agent_version_id") REFERENCES "public"."retell_agent_versions"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_code_permissions_code_fk" FOREIGN KEY ("permission_code") REFERENCES "public"."permissions"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_doctor_scope_fk" FOREIGN KEY ("hospital_id","doctor_id") REFERENCES "public"."doctors"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_department_scope_fk" FOREIGN KEY ("hospital_id","department_id") REFERENCES "public"."departments"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_exceptions" ADD CONSTRAINT "session_exceptions_schedule_scope_fk" FOREIGN KEY ("hospital_id","schedule_id") REFERENCES "public"."schedules"("hospital_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_schedule_scope_fk" FOREIGN KEY ("hospital_id","schedule_id") REFERENCES "public"."schedules"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_doctor_scope_fk" FOREIGN KEY ("hospital_id","doctor_id") REFERENCES "public"."doctors"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_department_scope_fk" FOREIGN KEY ("hospital_id","department_id") REFERENCES "public"."departments"("hospital_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_history_timeline_idx" ON "appointment_history" USING btree ("appointment_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_reference_unique" ON "appointments" USING btree ("hospital_id","reference");--> statement-breakpoint
CREATE INDEX "appointments_session_status_idx" ON "appointments" USING btree ("hospital_id","session_id","status");--> statement-breakpoint
CREATE INDEX "audit_events_target_idx" ON "audit_events" USING btree ("hospital_id","target_type","target_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_profile_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "call_analyses_call_unique" ON "call_analyses" USING btree ("call_id");--> statement-breakpoint
CREATE INDEX "call_provider_snapshots_timeline_idx" ON "call_provider_snapshots" USING btree ("call_id","captured_at");--> statement-breakpoint
CREATE UNIQUE INDEX "call_recordings_provider_id_unique" ON "call_recordings" USING btree ("hospital_id","provider_recording_id") WHERE "call_recordings"."provider_recording_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "call_transcripts_provider_id_unique" ON "call_transcripts" USING btree ("hospital_id","provider_transcript_id") WHERE "call_transcripts"."provider_transcript_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "callers_phone_hash_unique" ON "callers" USING btree ("hospital_id","phone_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "calls_provider_id_unique" ON "calls" USING btree ("hospital_id","provider","provider_call_id");--> statement-breakpoint
CREATE INDEX "calls_started_at_idx" ON "calls" USING btree ("hospital_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_code_unique" ON "departments" USING btree ("hospital_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "doctors_stable_key_unique" ON "doctors" USING btree ("hospital_id","stable_key");--> statement-breakpoint
CREATE INDEX "follow_up_activities_timeline_idx" ON "follow_up_activities" USING btree ("follow_up_id","occurred_at");--> statement-breakpoint
CREATE INDEX "follow_ups_work_queue_idx" ON "follow_ups" USING btree ("hospital_id","status","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "hospital_configurations_hospital_unique" ON "hospital_configurations" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "hospital_memberships_profile_idx" ON "hospital_memberships" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hospitals_stable_key_unique" ON "hospitals" USING btree ("stable_key");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_records_key_unique" ON "idempotency_records" USING btree ("hospital_id","operation","idempotency_key");--> statement-breakpoint
CREATE INDEX "idempotency_records_expiry_idx" ON "idempotency_records" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_external_id_unique" ON "integrations" USING btree ("hospital_id","provider","kind","external_id") WHERE "integrations"."external_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_sources_provider_unique" ON "knowledge_sources" USING btree ("hospital_id","provider_source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "patients_stable_key_unique" ON "patients" USING btree ("hospital_id","stable_key");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_auth_user_unique" ON "profiles" USING btree ("auth_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_email_unique" ON "profiles" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "provider_events_dedup_unique" ON "provider_events" USING btree ("hospital_id","provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "provider_events_replay_idx" ON "provider_events" USING btree ("hospital_id","processing_status","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "retell_agent_versions_provider_unique" ON "retell_agent_versions" USING btree ("agent_id","provider_version");--> statement-breakpoint
CREATE UNIQUE INDEX "retell_agents_provider_id_unique" ON "retell_agents" USING btree ("hospital_id","provider_agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "retell_phone_numbers_provider_unique" ON "retell_phone_numbers" USING btree ("hospital_id","provider_phone_number_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_exceptions_schedule_date_unique" ON "session_exceptions" USING btree ("schedule_id","exception_date");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_doctor_start_unique" ON "sessions" USING btree ("hospital_id","doctor_id","starts_at");--> statement-breakpoint
CREATE INDEX "sessions_availability_idx" ON "sessions" USING btree ("hospital_id","status","starts_at");