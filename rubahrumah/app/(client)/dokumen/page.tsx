"use client";
import { useState, useEffect, useCallback } from "react";
import { portalApi, STORAGE_BASE } from "@/lib/apiClient";

interface DokumenItem {
  id: number;
  nama_file: string;
  deskripsi: string | null;
  kategori: string | null;
  file_type: string | null;
  tanggal_upload: string | null;
  file_url: string | null;
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

const KATEGORIS = ["Semua", "RAB", "Kontrak", "Invoice", "Foto", "Lainnya"];

export default function DokumenPage() {
  const [items, setItems] = useState<DokumenItem[]>([]);
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [search, setSearch] = useState("");
  const [kategori, setKategori] = useState("Semua");
  const [loading, setLoading] = useState(true);

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
  }

  function handleKategori(kat: string) {
    setKategori(kat);
    fetchData(search, kat);
  }

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
      <form onSubmit={handleSearch} className="relative mb-4">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 12l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari dokumen proyek"
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

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Belum ada dokumen</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {items.map((doc) => (
            <div key={doc.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 hover:shadow-md transition">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 3h7l4 4v11a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="#F97316" strokeWidth="1.5"/>
                    <path d="M12 3v4h4" stroke="#F97316" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#0F4C75] truncate">{doc.nama_file}</h3>
                  {doc.kategori && (
                    <span className="text-xs text-orange-500 font-medium">{doc.kategori}</span>
                  )}
                </div>
              </div>
              {doc.deskripsi && (
                <p className="text-xs text-slate-400 leading-relaxed mb-3 line-clamp-2">{doc.deskripsi}</p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <span>{timeAgo(doc.tanggal_upload)}</span>
                  <span className="mx-0.5">•</span>
                  <span>{fmtDate(doc.tanggal_upload)}</span>
                </div>
                {doc.file_url && (
                  <a
                    href={`${STORAGE_BASE}${doc.file_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition"
                    title="Download"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2v8M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
