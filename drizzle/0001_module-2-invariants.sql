-- Validate IANA timezone names without relying on a session-specific timezone.
CREATE FUNCTION validate_hospital_timezone()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_timezone_names() WHERE name = NEW.timezone
  ) THEN
    RAISE EXCEPTION 'invalid hospital timezone: %', NEW.timezone
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER hospital_configurations_timezone_valid
BEFORE INSERT OR UPDATE OF timezone ON hospital_configurations
FOR EACH ROW EXECUTE FUNCTION validate_hospital_timezone();
--> statement-breakpoint

-- Provider evidence is append-only. Processing metadata may advance, but the
-- received provider identity, timestamps, payload, and hash cannot be changed.
CREATE FUNCTION protect_provider_event_evidence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'provider events are immutable'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.hospital_id IS DISTINCT FROM OLD.hospital_id
    OR NEW.provider IS DISTINCT FROM OLD.provider
    OR NEW.provider_event_id IS DISTINCT FROM OLD.provider_event_id
    OR NEW.event_type IS DISTINCT FROM OLD.event_type
    OR NEW.call_id IS DISTINCT FROM OLD.call_id
    OR NEW.payload IS DISTINCT FROM OLD.payload
    OR NEW.payload_hash IS DISTINCT FROM OLD.payload_hash
    OR NEW.occurred_at IS DISTINCT FROM OLD.occurred_at
    OR NEW.received_at IS DISTINCT FROM OLD.received_at
  THEN
    RAISE EXCEPTION 'provider event evidence is immutable'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER provider_events_evidence_immutable
BEFORE UPDATE OR DELETE ON provider_events
FOR EACH ROW EXECUTE FUNCTION protect_provider_event_evidence();
--> statement-breakpoint

-- Audit events are a journal, not mutable application state.
CREATE FUNCTION protect_audit_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit events are immutable'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_events_immutable
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION protect_audit_event();
--> statement-breakpoint

CREATE FUNCTION enforce_appointment_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF (OLD.status = 'pending' AND NEW.status IN ('confirmed', 'cancelled'))
    OR (OLD.status = 'confirmed' AND NEW.status IN ('cancelled', 'completed', 'no_show'))
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'invalid appointment transition: % -> %', OLD.status, NEW.status
    USING ERRCODE = 'check_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER appointments_valid_transition
BEFORE UPDATE OF status ON appointments
FOR EACH ROW EXECUTE FUNCTION enforce_appointment_transition();
--> statement-breakpoint

CREATE FUNCTION enforce_follow_up_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF (OLD.status = 'open' AND NEW.status IN ('assigned', 'cancelled'))
    OR (OLD.status = 'assigned' AND NEW.status IN ('in_progress', 'cancelled'))
    OR (OLD.status = 'in_progress' AND NEW.status IN ('assigned', 'resolved', 'cancelled'))
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'invalid follow-up transition: % -> %', OLD.status, NEW.status
    USING ERRCODE = 'check_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER follow_ups_valid_transition
BEFORE UPDATE OF status ON follow_ups
FOR EACH ROW EXECUTE FUNCTION enforce_follow_up_transition();
