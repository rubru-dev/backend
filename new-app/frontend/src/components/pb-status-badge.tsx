const STATUS_CLASS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Diajukan: "bg-amber-50 text-amber-700",
  "Disetujui Finance": "bg-indigo-50 text-indigo-700",
  Disetujui: "bg-blue-50 text-blue-700",
  Ditolak: "bg-red-50 text-red-700",
  "Diproses PR": "bg-teal-50 text-teal-700",
  "Sebagian Diterima": "bg-cyan-50 text-cyan-800",
  Selesai: "bg-emerald-50 text-emerald-700",
};

const STATUS_LABEL: Record<string, string> = {
  Disetujui: "Disetujui Super Admin",
};

export function PBStatusBadge({ status, revisi }: { status: string; revisi?: boolean }) {
  if (status === "Draft" && revisi) return <span className="inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">Perlu Revisi</span>;
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status] ?? "bg-muted text-muted-foreground"}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export const PB_STATUS_OPTIONS = ["Draft", "Diajukan", "Disetujui Finance", "Disetujui", "Ditolak", "Diproses PR", "Sebagian Diterima", "Selesai"];
