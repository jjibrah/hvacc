import { redirect } from "next/navigation";

import { isAuthError } from "@/modules/authentication/errors";
import {
  getHospitalAdministration,
  getUserManagementContext,
} from "@/modules/hospital-administration/server/service";
import { saveHospitalConfigurationAction } from "@/modules/hospital-administration/server/administration-actions";

const days = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
function field(value: unknown, fallback = "") {
  return value === null || value === undefined ? fallback : String(value);
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  let context;
  try {
    context = await getUserManagementContext();
  } catch (error) {
    if (isAuthError(error) && error.status === 401) redirect("/login");
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
        Access denied: hospital administrators only.
      </div>
    );
  }
  const data = await getHospitalAdministration(context.hospital.id);
  const config = data.configuration;
  const appointment = (config?.appointmentPolicy ?? {}) as Record<
    string,
    unknown
  >;
  const patient = (config?.patientPolicy ?? {}) as Record<string, unknown>;
  const followUp = (config?.followUpPolicy ?? {}) as Record<string, unknown>;
  const voice = (config?.voicePolicy ?? {}) as Record<string, unknown>;
  const notifications = (config?.notificationPolicy ?? {}) as Record<
    string,
    unknown
  >;
  const privacy = (config?.privacyPolicy ?? {}) as Record<string, unknown>;
  const access = (config?.accessPolicy ?? {}) as Record<string, unknown>;
  const hours = (config?.operatingHours ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  const params = await searchParams;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-teal-700">Administration</p>
        <h1 className="mt-1 text-3xl font-semibold">Hospital configuration</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Configure how this hospital operates. Integration connection health is
          managed separately.
        </p>
      </header>
      {params.success ? (
        <p
          role="status"
          className="rounded-lg bg-green-50 p-3 text-sm text-green-800"
        >
          Hospital configuration saved.
        </p>
      ) : null}
      {params.error ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          The configuration could not be saved. It may have changed; reload and
          try again.
        </p>
      ) : null}
      <form action={saveHospitalConfigurationAction} className="space-y-5">
        <input type="hidden" name="hospitalId" value={context.hospital.id} />
        <input
          type="hidden"
          name="expectedUpdatedAt"
          value={context.hospital.updatedAt.toISOString()}
        />
        <input
          type="hidden"
          name="expectedConfigurationUpdatedAt"
          value={config?.updatedAt.toISOString() ?? ""}
        />
        <Section
          title="Hospital identity"
          description="The public identity and contact details for this hospital."
        >
          <Field
            name="displayName"
            label="Hospital name"
            defaultValue={context.hospital.displayName}
          />
          <Field
            name="stableKey"
            label="Stable key"
            defaultValue={context.hospital.stableKey}
          />
          <Field
            name="syntheticContactEmail"
            label="Contact email"
            defaultValue={config?.syntheticContactEmail ?? ""}
            type="email"
          />
          <Field
            name="syntheticContactPhone"
            label="Contact phone"
            defaultValue={config?.syntheticContactPhone ?? ""}
          />
          <Field
            name="syntheticAddress"
            label="Address"
            defaultValue={config?.syntheticAddress ?? ""}
          />
        </Section>
        <Section
          title="Regional settings"
          description="Used by schedules, appointments, calls, and reports."
        >
          <Field
            name="timezone"
            label="Timezone"
            defaultValue={config?.timezone ?? "Asia/Kuala_Lumpur"}
          />
          <Field
            name="defaultLocale"
            label="Locale"
            defaultValue={config?.defaultLocale ?? "en-MY"}
          />
          <Field
            name="currencyCode"
            label="Currency code"
            defaultValue={config?.currencyCode ?? "MYR"}
          />
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 md:col-span-2">
            Changing timezone affects future display and scheduling
            calculations. Historical timestamps remain stored safely.
          </p>
        </Section>
        <Section
          title="Operating hours"
          description="These are hospital policy hours; doctor schedules remain managed in Schedules."
        >
          {days.map((day) => {
            const value = hours[day] ?? {};
            return (
              <div
                key={day}
                className="grid grid-cols-[100px_1fr_1fr_auto] items-end gap-2"
              >
                <span className="text-sm font-medium capitalize">{day}</span>
                <Field
                  name={`${day}Open`}
                  label="Opens"
                  defaultValue={field(value.open, "08:00")}
                  type="time"
                />
                <Field
                  name={`${day}Close`}
                  label="Closes"
                  defaultValue={field(value.close, "18:00")}
                  type="time"
                />
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    name={`${day}Closed`}
                    defaultChecked={Boolean(value.closed)}
                  />{" "}
                  Closed
                </label>
              </div>
            );
          })}
        </Section>
        <Section
          title="Appointment policy"
          description="Defaults for new scheduling workflows; existing appointments are not changed."
        >
          <NumberField
            name="defaultDurationMinutes"
            label="Default duration (minutes)"
            value={appointment.defaultDurationMinutes ?? 30}
          />
          <NumberField
            name="defaultCapacity"
            label="Default capacity"
            value={appointment.defaultCapacity ?? 1}
          />
          <NumberField
            name="minimumAdvanceMinutes"
            label="Minimum advance booking (minutes)"
            value={appointment.minimumAdvanceMinutes ?? 120}
          />
          <NumberField
            name="maximumAdvanceDays"
            label="Maximum advance booking (days)"
            value={appointment.maximumAdvanceDays ?? 60}
          />
          <NumberField
            name="cancellationNoticeHours"
            label="Cancellation notice (hours)"
            value={appointment.cancellationNoticeHours ?? 24}
          />
        </Section>
        <Section
          title="Patient operations"
          description="Controls how callers and patients are matched. Ambiguous matches require staff confirmation."
        >
          <SelectField
            name="patientMatchingMode"
            label="Matching mode"
            value={field(patient.matchingMode, "phone_or_name")}
            options={[
              ["phone_or_name", "Phone or name"],
              ["phone_only", "Phone only"],
              ["manual", "Manual confirmation"],
            ]}
          />
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              name="ambiguousRequiresConfirmation"
              defaultChecked={patient.ambiguousRequiresConfirmation !== false}
            />{" "}
            Require confirmation for ambiguous matches
          </label>
        </Section>
        <Section
          title="Follow-ups and voice"
          description="Operational defaults used when unresolved work or voice escalation is created."
        >
          <Field
            name="defaultFollowUpQueue"
            label="Default follow-up queue"
            defaultValue={field(followUp.defaultQueue, "reception")}
          />
          <SelectField
            name="defaultFollowUpPriority"
            label="Default follow-up priority"
            value={field(followUp.defaultPriority, "p3")}
            options={[
              ["p1", "P1 · Urgent"],
              ["p2", "P2 · High"],
              ["p3", "P3 · Normal"],
              ["p4", "P4 · Low"],
            ]}
          />
          <NumberField
            name="followUpEscalationHours"
            label="Escalate after (hours)"
            value={followUp.escalationHours ?? 24}
          />
          <SelectField
            name="defaultVoiceLanguage"
            label="Default voice language"
            value={field(voice.defaultLanguage, "en")}
            options={[
              ["en", "English"],
              ["ms", "Malay"],
            ]}
          />
          <SelectField
            name="voiceFallbackMode"
            label="Voice fallback"
            value={field(voice.fallbackMode, "human_follow_up")}
            options={[
              ["human_follow_up", "Create human follow-up"],
              ["end_call", "End call safely"],
            ]}
          />
        </Section>
        <Section
          title="Notifications, privacy, and access"
          description="Policy values are stored and audited; provider connection health is shown on Integrations."
        >
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="appointmentRemindersEnabled"
              defaultChecked={
                notifications.appointmentRemindersEnabled !== false
              }
            />{" "}
            Enable appointment reminders
          </label>
          <NumberField
            name="reminderHoursBefore"
            label="Reminder lead time (hours)"
            value={notifications.reminderHoursBefore ?? 24}
          />
          <NumberField
            name="recordingRetentionDays"
            label="Recording retention (days)"
            value={privacy.recordingRetentionDays ?? 90}
          />
          <NumberField
            name="transcriptRetentionDays"
            label="Transcript retention (days)"
            value={privacy.transcriptRetentionDays ?? 365}
          />
          <NumberField
            name="auditRetentionDays"
            label="Audit retention (days)"
            value={privacy.auditRetentionDays ?? 730}
          />
          <NumberField
            name="sessionTimeoutMinutes"
            label="Session timeout (minutes)"
            value={access.sessionTimeoutMinutes ?? 60}
          />
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 md:col-span-2">
            Retention values are policy records. Automatic deletion and
            session-timeout enforcement still require their respective
            workers/runtime support.
          </p>
        </Section>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Changes are hospital-scoped, concurrency-checked, and audited.
          </p>
          <button className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">
            Save configuration
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}
function Field({
  name,
  label,
  defaultValue,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input
        required={!name.includes("Contact") && !name.includes("Address")}
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
      />
    </label>
  );
}
function NumberField({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: unknown;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input
        required
        min="0"
        name={name}
        type="number"
        defaultValue={String(value)}
        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
      />
    </label>
  );
}
function SelectField({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: string[][];
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <select
        name={name}
        defaultValue={value}
        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
      >
        {options.map(([option, text]) => (
          <option key={option} value={option}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
