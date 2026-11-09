"use client";

import { useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { laporanPicApi } from "@/lib/api/laporanPic";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { User, Calendar, ImageOff, Images, Check, X, FileDown, Loader2 } from "lucide-react";
import { storageUrl } from "@/lib/storage-url";
import { useAuthStore } from "@/store/authStore";
import { getLogoBase64 } from "@/lib/get-logo";
import { LaporanPicPdf, type PdfReport } from "@/components/laporan-pic-pdf";

const PDF_IMAGE_MAX_EDGE = 1100;
const PDF_IMAGE_QUALITY = 0.68;

async function imageBlobToCompressedDataUrl(blob: Blob) {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Format gambar tidak dapat dibaca"));
      element.src = objectUrl;
    });
    const scale = Math.min(1, PDF_IMAGE_MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas tidak tersedia");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", PDF_IMAGE_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function preparePdfImage(path: string) {
  const url = storageUrl(path);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await imageBlobToCompressedDataUrl(await response.blob());
  } catch {
    // URL asli menjadi fallback agar satu foto yang gagal dikompresi tidak
    // menggagalkan seluruh laporan dan tetap dapat dicoba oleh renderer PDF.
    return url;
  }
}

// Gambar disembunyikan di balik dropdown → <img> baru dirender (dan baru dimuat browser)
// saat dibuka. Ini mencegah puluhan/ratusan gambar dimuat serentak saat tab dibuka.
function ReportImages({ images }: { images: string[] }) {
  const [open, setOpen] = useState(false);
  if (!Array.isArray(images) || images.length === 0) return null;
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-slate-50"
      >
        <Images className="h-3.5 w-3.5" />
        {open ? "Sembunyikan gambar" : `Lihat ${images.length} gambar`}
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((p, i) => (
            <a key={i} href={storageUrl(p)} target="_blank" rel="noreferrer" title="Buka gambar">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={storageUrl(p)}
                alt={`Foto ${i + 1}`}
                loading="lazy"
                decoding="async"
                className="h-24 w-24 rounded border bg-slate-50 object-contain transition-opacity hover:opacity-90"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ done: 0, total: 0 });
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["laporan-pic", projectType, String(projectId)],
    queryFn: ({ pageParam }) => laporanPicApi.listByProjectPaged(projectType, projectId, pageParam, 15),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.items.length, 0);
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
  });
  const approvalMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "reject" }) => laporanPicApi.approveStatus(id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["laporan-pic", projectType, String(projectId)] }),
  });

  const rows = data?.pages.flatMap((p) => p.items) ?? [];
  const grouped = rows.reduce<Record<string, typeof rows>>((groups, row) => {
    const key = `${row.termin_id ?? "none"}`;
    (groups[key] ??= []).push(row);
    return groups;
  }, {});

  const downloadPdf = async () => {
    setIsDownloadingPdf(true);
    setPdfProgress({ done: 0, total: 0 });
    try {
      const allReports = await laporanPicApi.listByProject(projectType, projectId);
      const totalImages = allReports.reduce((count, report) => count + (report.images?.length ?? 0), 0);
      setPdfProgress({ done: 0, total: totalImages });

      let completedImages = 0;
      const preparedReports: PdfReport[] = [];
      for (const report of allReports) {
        const images: string[] = [];
        // Diproses berurutan supaya banyak foto resolusi tinggi tidak memenuhi
        // memori browser secara bersamaan sebelum PDF dirender.
        for (const imagePath of report.images ?? []) {
          images.push(await preparePdfImage(imagePath));
          completedImages += 1;
          setPdfProgress({ done: completedImages, total: totalImages });
        }
        const taskNames = (report.tasks?.length
          ? report.tasks.map((task) => task.nama).filter(Boolean)
          : [report.pekerjaan_nama].filter(Boolean)) as string[];
        preparedReports.push({
          tanggal: report.tanggal ? format(new Date(report.tanggal), "d MMMM yyyy", { locale: idLocale }) : "-",
          project_type: report.project_type,
          project_nama: report.project_nama || `Projek ${projectType}`,
          termin_nama: report.termin_nama,
          pekerjaan_nama: taskNames.join(", ") || "Tanpa pekerjaan",
          pic_name: report.user?.name || "PIC",
          kegiatan: report.kegiatan,
          kendala: report.kendala,
          images,
        });
      }

      const reportDates = allReports
        .map((report) => report.tanggal && new Date(report.tanggal))
        .filter((date): date is Date => date instanceof Date && !Number.isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
      const periode = reportDates.length === 0
        ? "-"
        : reportDates.length === 1
          ? format(reportDates[0], "d MMMM yyyy", { locale: idLocale })
          : `${format(reportDates[0], "d MMM yyyy", { locale: idLocale })} - ${format(reportDates[reportDates.length - 1], "d MMM yyyy", { locale: idLocale })}`;
      const projectName = allReports[0]?.project_nama || `Projek ${projectType}`;
      const logo = await getLogoBase64();
      const blob = await pdf(
        <LaporanPicPdf
          reports={preparedReports}
          logo={logo}
          meta={{
            periode,
            projek: projectName,
            total: preparedReports.length,
            dicetak: new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date()),
          }}
        />,
      ).toBlob();
      const safeName = projectName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || String(projectId);
      saveAs(blob, `laporan-pic-${safeName}.pdf`);
      toast.success(`PDF berhasil dibuat dengan ${totalImages} foto`);
    } catch (error: any) {
      toast.error(error?.message || "PDF Laporan PIC gagal dibuat");
    } finally {
      setIsDownloadingPdf(false);
      setPdfProgress({ done: 0, total: 0 });
    }
  };

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Laporan PIC Project</p>
          <p className="text-xs text-muted-foreground">PDF memuat seluruh laporan dan semua foto dengan resolusi yang diperkecil.</p>
        </div>
        <button
          type="button"
          onClick={downloadPdf}
          disabled={isDownloadingPdf}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium text-foreground hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDownloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          {isDownloadingPdf && pdfProgress.total > 0
            ? `Menyiapkan foto ${pdfProgress.done}/${pdfProgress.total}`
            : isDownloadingPdf ? "Membuat PDF…" : "Download PDF"}
        </button>
      </div>
      {Object.entries(grouped).map(([key, reports]) => {
        const first = reports[0];
        const reportTitle = first.termin_nama || "Tanpa termin";
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
            <div className="mb-2 flex flex-wrap gap-1.5">
              {(r.tasks?.length ? r.tasks : [{ id: r.task_id ?? "legacy", nama: r.pekerjaan_nama }]).map((task) => (
                <span key={task.id} className="rounded-md bg-muted px-2 py-1 text-xs text-foreground">{task.nama || "Tanpa pekerjaan"}</span>
              ))}
            </div>
            <ReportText text={[r.kegiatan, r.kendala ? `- Kendala: ${r.kendala}` : ""].filter(Boolean).join("\n")} />
          </div>

          <ReportImages images={r.images} />
          </div>)}
        </div>;
      })}

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-md border px-4 py-2 text-sm font-medium text-foreground hover:bg-slate-50 disabled:opacity-60"
          >
            {isFetchingNextPage ? "Memuat…" : "Muat lebih banyak"}
          </button>
        </div>
      )}
    </div>
  );
}
