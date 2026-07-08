"use client";

import { useQuery } from "@tanstack/react-query";
import { laporanPicApi } from "@/lib/api/laporanPic";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { User, Calendar, ImageOff } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
  const { data, isLoading } = useQuery({
    queryKey: ["laporan-pic", projectType, String(projectId)],
    queryFn: () => laporanPicApi.listByProject(projectType, projectId),
  });

  const rows = data ?? [];

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
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.id} className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <User className="h-3.5 w-3.5" />
              {r.user?.name ?? "PIC"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {r.tanggal ? format(new Date(r.tanggal), "d MMMM yyyy", { locale: idLocale }) : "-"}
            </span>
          </div>

          <div className="mt-2">
            <p className="whitespace-pre-wrap text-sm text-foreground">{r.kegiatan}</p>
            {r.kendala && (
              <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                <span className="font-semibold">Kendala:</span> {r.kendala}
              </p>
            )}
          </div>

          {Array.isArray(r.images) && r.images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {r.images.map((p, i) => (
                <a key={i} href={`${API_BASE}${p}`} target="_blank" rel="noreferrer" title="Buka gambar">
                  <img
                    src={`${API_BASE}${p}`}
                    alt={`Foto ${i + 1}`}
                    className="h-24 w-24 rounded border object-cover transition-opacity hover:opacity-90"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
