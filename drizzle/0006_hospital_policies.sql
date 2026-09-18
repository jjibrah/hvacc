ALTER TABLE "hospital_configurations" ADD COLUMN "operating_hours" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "hospital_configurations" ADD COLUMN "appointment_policy" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "hospital_configurations" ADD COLUMN "patient_policy" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "hospital_configurations" ADD COLUMN "follow_up_policy" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "hospital_configurations" ADD COLUMN "voice_policy" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "hospital_configurations" ADD COLUMN "notification_policy" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "hospital_configurations" ADD COLUMN "privacy_policy" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "hospital_configurations" ADD COLUMN "access_policy" jsonb DEFAULT '{}'::jsonb NOT NULL;
