-- Hospital administration is a safety invariant, not only an application rule.
-- This protects the hospital if a future job, script, or API path updates
-- memberships without going through the administration service.
CREATE FUNCTION protect_last_hospital_admin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  active_admin_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'hospital_admin' AND OLD.status = 'active' THEN
      SELECT count(*) INTO active_admin_count
      FROM hospital_memberships
      WHERE hospital_id = OLD.hospital_id
        AND role = 'hospital_admin'
        AND status = 'active';
      IF active_admin_count <= 1 THEN
        RAISE EXCEPTION 'hospital must retain an active administrator'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.role = 'hospital_admin'
    AND OLD.status = 'active'
    AND (NEW.role <> 'hospital_admin' OR NEW.status <> 'active')
  THEN
    SELECT count(*) INTO active_admin_count
    FROM hospital_memberships
    WHERE hospital_id = OLD.hospital_id
      AND role = 'hospital_admin'
      AND status = 'active';
    IF active_admin_count <= 1 THEN
      RAISE EXCEPTION 'hospital must retain an active administrator'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER hospital_memberships_retain_admin
BEFORE UPDATE OF role, status OR DELETE ON hospital_memberships
FOR EACH ROW EXECUTE FUNCTION protect_last_hospital_admin();
--> statement-breakpoint

ALTER TABLE retell_phone_numbers
  ADD CONSTRAINT retell_phone_numbers_e164_format
  CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{7,14}$');
