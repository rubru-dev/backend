const STATUS_CLASS: Record<string, string> = {
  Diajukan: "bg-amber-50 text-amber-700",
  Disetujui: "bg-blue-50 text-blue-700",
  Ditolak: "bg-red-50 text-red-700",
  "Diproses PR": "bg-teal-50 text-teal-700",
  Selesai: "bg-emerald-50 text-emerald-700",
};

export function PBStatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status] ?? "bg-muted text-muted-foreground"}`}>{status}</span>;
}
