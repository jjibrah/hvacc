import { redirect } from "next/navigation";
import { isAuthError } from "@/modules/authentication/errors";
import {
  getUserManagementContext,
  getHospitalAdministration,
} from "@/modules/hospital-administration/server/service";
import { saveDoctorAction } from "@/modules/hospital-administration/server/administration-actions";

export default async function Page() {
  let context;
  try {
    context = await getUserManagementContext();
  } catch (error) {
    if (isAuthError(error) && error.status === 401) redirect("/login");
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
        Access denied.
      </div>
    );
  }
  const data = await getHospitalAdministration(context.hospital.id);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-teal-700">Care delivery</p>
        <h1 className="mt-1 text-3xl font-semibold">Doctors</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage doctors and their department assignments.
        </p>
      </header>
      <form
        action={saveDoctorAction}
        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-4 md:items-end"
      >
        <input type="hidden" name="hospitalId" value={context.hospital.id} />
        <label className="text-sm font-medium">
          Name
          <input
            required
            name="displayName"
            className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          Stable key
          <input
            required
            name="stableKey"
            placeholder="dr-lee"
            className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          Department
          <select
            required
            name="departmentId"
            className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            {data.departments
              .filter((d) => d.status === "active")
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        </label>
        <button className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white">
          Add doctor
        </button>
      </form>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="p-4">Doctor</th>
              <th className="p-4">Department</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.doctors.map((doctor) => (
              <tr key={doctor.id}>
                <td className="p-4 font-medium">
                  {doctor.displayName}
                  <div className="font-mono text-xs text-slate-500">
                    {doctor.stableKey}
                  </div>
                </td>
                <td className="p-4">
                  {data.departments.find((d) => d.id === doctor.departmentId)
                    ?.name ?? "Unknown"}
                </td>
                <td className="p-4 text-slate-600">{doctor.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
