export function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ts">{label}</p>
      <div className="mt-2 text-3xl font-bold text-tp">{value}</div>
      {sub && <p className="mt-1 text-xs text-ts">{sub}</p>}
    </div>
  );
}
