export default function AdminLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page content">
      <div className="h-9 w-64 animate-pulse rounded bg-slate-200" />
      <div className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </div>
  );
}
