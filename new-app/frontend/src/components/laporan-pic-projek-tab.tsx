"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { laporanPicApi } from "@/lib/api/laporanPic";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { User, Calendar, ImageOff, Check, X } from "lucide-react";
import { storageUrl } from "@/lib/storage-url";
import { useAuthStore } from "@/store/authStore";

function ReportText({ text }: { text: string }) {
  return (
    <div className="space-y-1 text-sm leading-relaxed text-foreground">
      {text.split("\n").map((line, index) => line.startsWith("- ") ? (
        <div key={index} className="flex gap-2">
          <span aria-hidden="true">•</span>
          <span>{line.slice(2)}</span>
        </div>
      ) : <div key={index}>{line || " "}</div>)}
    </div>
  );
}

// Muat gambar lewat /api/v1 (path yang sudah pasti diteruskan ke backend, sama seperti API call lain).
// Path DB "/storage/..." → "/api/v1/storage/...". Hindari URL absolut & rute /storage terpisah di production.
/**
 * Tab "Laporan PIC Project" pada detail Projek Sipil/Interior.
 * Menampilkan laporan yang diisi PIC (teks + banyak gambar), read-only,
 * terhubung otomatis berdasarkan (project_type, project_id).
 */
export function LaporanPicProjekTab({
  projectType,
  projectId,
}: {
  projectType: "sipil" | "interior";
  projectId: string | number;
}) {
  const qc = useQueryClient();
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const { data, isLoading } = useQuery({
    queryKey: ["laporan-pic", projectType, String(projectId)],
    queryFn: () => laporanPicApi.listByProject(projectType, projectId),
  });
  const approvalMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "reject" }) => laporanPicApi.approveStatus(id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["laporan-pic", projectType, String(projectId)] }),
  });

  const rows = data ?? [];
  const grouped = rows.reduce<Record<string, typeof rows>>((groups, row) => {
    const key = `${row.termin_id ?? "none"}:${row.task_id ?? "none"}`;
    (groups[key] ??= []).push(row);
    return groups;
  }, {});

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Memuat laporan…</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
        <ImageOff className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">Belum ada Laporan PIC Project</p>
        <p className="text-xs text-muted-foreground">
          Laporan akan muncul di sini setelah PIC mengisi Laporan Harian dan memilih projek ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([key, reports]) => {
        const first = reports[0];
        const reportTitle = `${first.termin_nama || "Tanpa termin"} - ${first.pekerjaan_nama || "Tanpa pekerjaan"}`;
        return <div key={key} className="space-y-2">
          <div className="border-l-4 border-orange-400 pl-3">
            <p className="text-sm font-semibold text-foreground">{reportTitle}</p>
          </div>
          {reports.map((r) => <div key={r.id} className="rounded-lg border bg-card p-4 shadow-sm ml-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <User className="h-3.5 w-3.5" />
              {r.user?.name ?? "PIC"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {r.tanggal ? format(new Date(r.tanggal), "d MMMM yyyy", { locale: idLocale }) : "-"}
            </span>
            <span className={`rounded-full px-2 py-0.5 font-medium ${r.status_pekerjaan === "Selesai" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
              {r.status_pekerjaan}
            </span>
            {r.status_approval === "Menunggu Approval" && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">Menunggu Approval</span>}
            {r.status_approval === "Disetujui" && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">Disetujui</span>}
            {r.status_approval === "Ditolak" && <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">Ditolak</span>}
            {isSuperAdmin && r.status_approval === "Menunggu Approval" && (
              <span className="ml-auto inline-flex gap-1">
                <button type="button" className="inline-flex min-h-9 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60" disabled={approvalMutation.isPending} onClick={() => approvalMutation.mutate({ id: r.id, action: "approve" })}>
                  <Check className="h-3.5 w-3.5" /> Setujui
                </button>
                <button type="button" className="inline-flex min-h-9 items-center gap-1 rounded-md border border-red-200 px-2.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60" disabled={approvalMutation.isPending} onClick={() => approvalMutation.mutate({ id: r.id, action: "reject" })}>
                  <X className="h-3.5 w-3.5" /> Tolak
                </button>
              </span>
            )}
          </div>

          <div className="mt-2">
            <p className="text-xs text-muted-foreground">{r.termin_nama || "Tanpa termin"} · {r.pekerjaan_nama || "Tanpa pekerjaan"}</p>
            <ReportText text={[r.kegiatan, r.kendala ? `- Kendala: ${r.kendala}` : ""].filter(Boolean).join("\n")} />
          </div>

          {Array.isArray(r.images) && r.images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {r.images.map((p, i) => (
                <a key={i} href={storageUrl(p)} target="_blank" rel="noreferrer" title="Buka gambar">
                  <img
                    src={storageUrl(p)}
                    alt={`Foto ${i + 1}`}
                    className="h-24 w-24 rounded border bg-slate-50 object-contain transition-opacity hover:opacity-90"
                    onLoad={() =>
                      console.log("[LaporanPIC] Gambar tampil di tab project", {
                        report_id: r.id,
                        project_type: projectType,
                        project_id: String(projectId),
                        image_index: i,
                        path: p,
                        url: storageUrl(p),
                      })
                    }
                    onError={(event) =>
                      console.error("[LaporanPIC] Gambar gagal tampil di tab project", {
                        report_id: r.id,
                        project_type: projectType,
                        project_id: String(projectId),
                        image_index: i,
                        path: p,
                        url: storageUrl(p),
                        currentSrc: event.currentTarget.currentSrc,
                      })
                    }
                  />
                </a>
              ))}
            </div>
          )}
          </div>)}
        </div>;
      })}
    </div>
  );
}
