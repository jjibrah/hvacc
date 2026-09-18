INSERT INTO permissions (code, description, sensitive)
VALUES ('patients.read', 'View patient records', false)
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role, permission_code)
VALUES
  ('reception_staff', 'patients.read'),
  ('operations_manager', 'patients.read'),
  ('hospital_admin', 'patients.read')
ON CONFLICT (role, permission_code) DO NOTHING;
