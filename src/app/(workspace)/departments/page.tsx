import { redirect } from "next/navigation";
import { isAuthError } from "@/modules/authentication/errors";
import {
  getUserManagementContext,
  getHospitalAdministration,
} from "@/modules/hospital-administration/server/service";
import { saveDepartmentAction } from "@/modules/hospital-administration/server/administration-actions";

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
        <h1 className="mt-1 text-3xl font-semibold">Departments</h1>
        <p className="mt-2 text-sm text-slate-600">
          Maintain the hospital service structure used by appointments and
          doctors.
        </p>
      </header>
      <form
        action={saveDepartmentAction}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <input type="hidden" name="hospitalId" value={context.hospital.id} />
        <label className="text-sm font-medium">
          Code
          <input
            required
            name="code"
            placeholder="CARDIOLOGY"
            className="mt-2 block rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          Department name
          <input
            required
            name="name"
            placeholder="Cardiology"
            className="mt-2 block rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <button className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white">
          Add department
        </button>
      </form>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="p-4">Code</th>
              <th className="p-4">Name</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.departments.map((department) => (
              <tr key={department.id}>
                <td className="p-4 font-mono text-xs">{department.code}</td>
                <td className="p-4 font-medium">{department.name}</td>
                <td className="p-4 text-slate-600">{department.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
