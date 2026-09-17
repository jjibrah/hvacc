import { redirect } from "next/navigation";
import { isAuthError } from "@/modules/authentication/errors";
import {
  getHospitalAdministration,
  getUserManagementContext,
} from "@/modules/authentication/service";
import { saveHospitalConfigurationAction } from "@/modules/authentication/administration-actions";

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
  const value = (await getHospitalAdministration(context.hospital.id))
    .configuration;
  const params = await searchParams;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-teal-700">Administration</p>
        <h1 className="mt-1 text-3xl font-semibold">
          Hospital identity & configuration
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          These settings apply to this hospital and are audited on every change.
        </p>
      </header>
      {params.success ? (
        <p
          role="status"
          className="rounded-lg bg-green-50 p-3 text-sm text-green-800"
        >
          Configuration saved.
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
      <form
        action={saveHospitalConfigurationAction}
        className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2"
      >
        <input type="hidden" name="hospitalId" value={context.hospital.id} />
        <input
          type="hidden"
          name="expectedUpdatedAt"
          value={context.hospital.updatedAt.toISOString()}
        />
        <input
          type="hidden"
          name="expectedConfigurationUpdatedAt"
          value={value?.updatedAt.toISOString() ?? ""}
        />
        {(
          [
            ["displayName", "Hospital name", context.hospital.displayName],
            ["stableKey", "Stable key", context.hospital.stableKey],
            ["timezone", "Timezone", value?.timezone ?? "Asia/Kuala_Lumpur"],
            ["currencyCode", "Currency code", value?.currencyCode ?? "MYR"],
            [
              "defaultLocale",
              "Default locale",
              value?.defaultLocale ?? "en-MY",
            ],
            [
              "syntheticContactEmail",
              "Contact email",
              value?.syntheticContactEmail ?? "",
            ],
            [
              "syntheticContactPhone",
              "Contact phone",
              value?.syntheticContactPhone ?? "",
            ],
            ["syntheticAddress", "Address", value?.syntheticAddress ?? ""],
          ] as const
        ).map(([name, label, defaultValue]) => (
          <label key={name} className="text-sm font-medium text-slate-700">
            {label}
            <input
              name={name}
              defaultValue={defaultValue}
              required={!name.startsWith("synthetic")}
              className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        ))}
        <button className="w-fit rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white">
          Save configuration
        </button>
      </form>
    </div>
  );
}
