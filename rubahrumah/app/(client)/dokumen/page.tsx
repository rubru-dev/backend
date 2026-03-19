"use client";
import { useState, useEffect, useCallback } from "react";
import { portalApi, STORAGE_BASE } from "@/lib/apiClient";

interface DokumenItem {
  id: number;
  nama_file: string;
  folder_name: string | null;
  deskripsi: string | null;
  kategori: string | null;
  file_type: string | null;
  tanggal_upload: string | null;
  file_url: string | null;
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

const KATEGORIS = ["Semua", "RAB", "Kontrak", "Invoice", "Foto", "Lainnya"];

const FOLDER_COLORS = [
  "#f97316", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899",
  "#14b8a6", "#ef4444", "#0ea5e9", "#84cc16",
];

export default function DokumenPage() {
  const [items, setItems] = useState<DokumenItem[]>([]);
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [search, setSearch] = useState("");
  const [kategori, setKategori] = useState("Semua");
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

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
              className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white placeholder:text-slate-300"
            />
          </form>

          {/* Kategori filter */}
          <div className="flex gap-2 flex-wrap mb-5">
            {KATEGORIS.map((k) => (
              <button
                key={k}
                onClick={() => handleKategori(k)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
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
              className="flex items-center gap-1.5 text-orange-500 hover:text-orange-600 text-sm font-medium"
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
                  </div>

                  {doc.file_url && (
                    <a
                      href={`${STORAGE_BASE}${doc.file_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition shrink-0"
                      title="Download"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M9 2v9M6 9l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 13v1.5a1 1 0 001 1h12a1 1 0 001-1V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </a>
                  )}
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
              <div
                key={folder.name}
                onClick={() => setActiveFolder(folder.name)}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition cursor-pointer group overflow-hidden"
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
