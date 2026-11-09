"use client";
import { useState, useEffect, useCallback } from "react";
import { portalApi, STORAGE_BASE } from "@/lib/apiClient";

interface DokumenItem {
  id: number | string;
  source?: "manual" | "laporan_pic";
  report_id?: string;
  nama_file: string;
  folder_name: string | null;
  deskripsi: string | null;
  kategori: string | null;
  file_type: string | null;
  tanggal_upload: string | null;
  file_url: string | null;
  image_count?: number;
  pic_nama?: string;
  status?: string;
}

interface LaporanDetail {
  id: string;
  proyek_nama: string | null;
  termin_nama: string | null;
  pekerjaan: { id: string; nama: string | null }[];
  tanggal: string;
  kegiatan: string;
  kendala: string | null;
  status: string;
  pic_nama: string;
  images: string[];
  thumbnails: string[];
}

interface Folder {
  name: string;
  items: DokumenItem[];
}

function fmtDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function timeAgo(d?: string | null) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Baru saja";
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return fmtDate(d);
}

function getFileIcon(fileType: string | null) {
  const t = (fileType ?? "").toLowerCase();
  if (t.includes("pdf")) return "#ef4444";
  if (t.includes("image") || t.includes("jpg") || t.includes("png")) return "#f97316";
  if (t.includes("word") || t.includes("doc")) return "#3b82f6";
  if (t.includes("excel") || t.includes("xls") || t.includes("sheet")) return "#10b981";
  return "#6366f1";
}

const KATEGORIS = ["Semua", "Laporan PIC", "RAB", "Kontrak", "Invoice", "Foto", "Lainnya"];

const FOLDER_COLORS = [
  "#f97316", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899",
  "#14b8a6", "#ef4444", "#0ea5e9", "#84cc16",
];

function LaporanModal({ detail, onClose }: { detail: LaporanDetail; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <>
    <style jsx global>{`
      @media print {
        body * { visibility: hidden !important; }
        #report-print-area, #report-print-area * { visibility: visible !important; }
        #report-print-area { position: absolute; inset: 0; width: 100%; }
      }
    `}</style>
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 px-3 py-6 print:static print:bg-white print:p-0" role="dialog" aria-modal="true" aria-label="Detail laporan PIC">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl print:max-w-none print:rounded-none print:shadow-none">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <p className="font-semibold text-slate-800">Laporan PIC Project</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="min-h-11 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300">
              Cetak / Download PDF
            </button>
            <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300">
              Tutup
            </button>
          </div>
        </div>

        <article id="report-print-area" className="p-5 sm:p-8 print:p-0">
          <div className="border-b-2 border-orange-500 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Laporan PIC Project</p>
            <h2 className="mt-1 text-xl font-bold text-[#0F4C75]">{detail.proyek_nama || "Proyek"}</h2>
            <p className="mt-1 text-sm text-slate-500">{detail.termin_nama || "Tanpa termin"} · {fmtDate(detail.tanggal)}</p>
          </div>

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-400">PIC Project</dt><dd className="mt-1 font-semibold text-slate-700">{detail.pic_nama}</dd></div>
            <div><dt className="text-slate-400">Status</dt><dd className="mt-1 font-semibold text-slate-700">{detail.status}</dd></div>
            <div className="sm:col-span-2"><dt className="text-slate-400">Pekerjaan</dt><dd className="mt-1 text-slate-700">{detail.pekerjaan.map((item) => item.nama).filter(Boolean).join(", ") || "-"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-slate-400">Kegiatan</dt><dd className="mt-1 whitespace-pre-wrap leading-6 text-slate-700">{detail.kegiatan}</dd></div>
            {detail.kendala && <div className="sm:col-span-2"><dt className="text-slate-400">Kendala</dt><dd className="mt-1 whitespace-pre-wrap leading-6 text-slate-700">{detail.kendala}</dd></div>}
          </dl>

          <section className="mt-7">
            <h3 className="text-sm font-bold text-slate-700">Dokumentasi ({detail.images.length})</h3>
            {detail.images.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">Tidak ada foto pada laporan ini.</p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2">
                {detail.images.map((src, index) => (
                  <figure key={`${src}-${index}`} className="break-inside-avoid overflow-hidden rounded-xl border border-slate-200 print:rounded-none">
                    <img
                      src={`${STORAGE_BASE}${detail.thumbnails[index] || src}`}
                      alt={`Dokumentasi laporan ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[4/3] w-full object-cover print:h-auto print:object-contain"
                      onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = `${STORAGE_BASE}${src}`; }}
                    />
                    <figcaption className="px-3 py-2 text-xs text-slate-500">Foto {index + 1}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>
        </article>
      </div>
    </div>
    </>
  );
}

export default function DokumenPage() {
  const [items, setItems] = useState<DokumenItem[]>([]);
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [search, setSearch] = useState("");
  const [kategori, setKategori] = useState("Semua");
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState<LaporanDetail | null>(null);
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);
  const [reportError, setReportError] = useState("");

  async function openReport(reportId: string) {
    setLoadingReportId(reportId);
    setReportError("");
    try {
      setReportDetail(await portalApi.dokumenDetail(reportId));
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Laporan gagal dimuat");
    } finally {
      setLoadingReportId(null);
    }
  }

  const fetchData = useCallback((q: string, kat: string) => {
    setLoading(true);
    Promise.all([portalApi.me(), portalApi.dokumen(q || undefined, kat === "Semua" ? undefined : kat)])
      .then(([p, docs]) => { setProject(p); setItems(docs); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData("", "Semua"); }, [fetchData]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchData(search, kategori);
    setActiveFolder(null);
  }

  function handleKategori(kat: string) {
    setKategori(kat);
    fetchData(search, kat);
    setActiveFolder(null);
  }

  // Group items by folder_name
  const folders: Folder[] = (() => {
    const map = new Map<string, DokumenItem[]>();
    for (const item of items) {
      const key = item.folder_name || "Dokumen Lainnya";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).map(([name, folderItems]) => ({ name, items: folderItems }));
  })();

  const currentFolderItems = activeFolder
    ? (folders.find((f) => f.name === activeFolder)?.items ?? [])
    : [];

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[#0F4C75] mb-1">
        {(project?.nama_proyek as string) ?? "Proyek"}
      </h1>
      <p className="text-sm text-slate-400 flex items-center gap-1 mb-5">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="6" r="3" stroke="#94a3b8" strokeWidth="1.2"/>
        </svg>
        {(project?.alamat as string) ?? "-"}
      </p>

      {/* Search */}
      {!activeFolder && (
        <>
          <form onSubmit={handleSearch} className="relative mb-4">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
              <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 12l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari folder dokumen"
              className="min-h-11 w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white placeholder:text-slate-300"
            />
          </form>

          {/* Kategori filter */}
          <div className="flex gap-2 flex-wrap mb-5">
            {KATEGORIS.map((k) => (
              <button
                key={k}
                onClick={() => handleKategori(k)}
                className={`min-h-11 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  kategori === k
                    ? "bg-orange-500 text-white"
                    : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeFolder ? (
        /* ── Inside folder view ──────────────────────────────── */
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-5">
            <button
              onClick={() => setActiveFolder(null)}
              className="min-h-11 flex items-center gap-1.5 text-orange-500 hover:text-orange-600 text-sm font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Dokumen
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 text-sm font-semibold">{activeFolder}</span>
            <span className="ml-auto text-xs text-slate-400">{currentFolderItems.length} file</span>
          </div>

          {currentFolderItems.length === 0 ? (
            <div className="text-center py-16 text-slate-400">Folder kosong</div>
          ) : (
            <div className="space-y-2">
              {currentFolderItems.map((doc) => (
                <div key={doc.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 hover:shadow-md transition flex items-center gap-3">
                  {/* File icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: getFileIcon(doc.file_type) + "20" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M5 3h7l4 4v11a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z"
                        stroke={getFileIcon(doc.file_type)} strokeWidth="1.5"/>
                      <path d="M12 3v4h4" stroke={getFileIcon(doc.file_type)} strokeWidth="1.5" strokeLinejoin="round"/>
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0F4C75] truncate">{doc.nama_file}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      {doc.kategori && <span className="text-orange-500 font-medium">{doc.kategori}</span>}
                      <span>{timeAgo(doc.tanggal_upload)}</span>
                      <span>•</span>
                      <span>{fmtDate(doc.tanggal_upload)}</span>
                    </div>
                    {doc.deskripsi && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{doc.deskripsi}</p>
                    )}
                    {doc.source === "laporan_pic" && (
                      <p className="mt-1 text-xs text-slate-500">{doc.pic_nama || "PIC"} · {doc.image_count ?? 0} foto</p>
                    )}
                  </div>

                  {doc.source === "laporan_pic" && doc.report_id ? (
                    <button
                      type="button"
                      onClick={() => openReport(doc.report_id!)}
                      disabled={loadingReportId === doc.report_id}
                      className="min-h-11 shrink-0 rounded-xl border border-orange-200 px-3 text-xs font-semibold text-orange-600 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:cursor-wait disabled:opacity-50"
                    >
                      {loadingReportId === doc.report_id ? "Memuat..." : "Buka laporan"}
                    </button>
                  ) : doc.file_url ? (
                    <a
                      href={`${STORAGE_BASE}${doc.file_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl p-2 text-slate-400 transition hover:bg-orange-50 hover:text-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-300"
                      title="Download"
                      aria-label={`Download ${doc.nama_file}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M9 2v9M6 9l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 13v1.5a1 1 0 001 1h12a1 1 0 001-1V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : folders.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Belum ada dokumen</div>
      ) : (
        /* ── Folder grid view ────────────────────────────────── */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {folders.map((folder, i) => {
            const color = FOLDER_COLORS[i % FOLDER_COLORS.length];
            return (
              <button
                type="button"
                key={folder.name}
                onClick={() => setActiveFolder(folder.name)}
                className="group overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                {/* Folder visual */}
                <div
                  className="h-24 flex items-center justify-center relative"
                  style={{ backgroundColor: color + "18" }}
                >
                  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" className="group-hover:scale-105 transition">
                    <path
                      d="M2 8a2 2 0 012-2h5l2 2h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8z"
                      fill={color}
                      fillOpacity="0.85"
                    />
                    <path
                      d="M2 10h20"
                      stroke={color}
                      strokeOpacity="0.5"
                      strokeWidth="1"
                    />
                  </svg>
                  {/* Count badge */}
                  <div
                    className="absolute top-2 right-2 text-white text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: color }}
                  >
                    {folder.items.length} file
                  </div>
                </div>

                <div className="px-3 py-2.5">
                  <p className="text-sm font-semibold text-slate-700 truncate">{folder.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {folder.items.map((d) => d.kategori).filter(Boolean).slice(0, 2).join(", ") || "Dokumen"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {reportError && (
        <div role="alert" className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {reportError}
        </div>
      )}
      {reportDetail && <LaporanModal detail={reportDetail} onClose={() => setReportDetail(null)} />}
    </div>
  );
}
