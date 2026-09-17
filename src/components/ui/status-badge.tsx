type Status = "complete" | "active" | "pending";

const styles: Record<Status, string> = {
  complete: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  active: "bg-blue-50 text-blue-700 ring-blue-600/20",
  pending: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${styles[status]}`}
    >
      {status}
    </span>
  );
}
