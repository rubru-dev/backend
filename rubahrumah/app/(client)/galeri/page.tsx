"use client";
import { useState, useEffect, useCallback } from "react";
import { portalApi, STORAGE_BASE } from "@/lib/apiClient";

interface GaleriItem {
  id: number;
  judul: string;
  deskripsi: string | null;
  tanggal_foto: string | null;
  file_url: string | null;
}

function fmtDate(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const COLORS = [
  "from-amber-300 to-amber-500",
  "from-orange-300 to-orange-500",
  "from-amber-400 to-amber-600",
  "from-yellow-300 to-yellow-500",
  "from-amber-300 to-amber-500",
  "from-orange-200 to-orange-400",
];

function ConstructionIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none" className="opacity-30">
      <rect x="6" y="18" width="36" height="24" rx="3" fill="white"/>
      <path d="M24 6L6 18h36L24 6z" fill="white"/>
      <rect x="18" y="27" width="12" height="15" rx="2" fill="#92400e"/>
      <rect x="8" y="22" width="8" height="8" rx="1" fill="#fbbf24"/>
      <rect x="32" y="22" width="8" height="8" rx="1" fill="#fbbf24"/>
    </svg>
  );
}

export default function GaleriPage() {
  const [items, setItems] = useState<GaleriItem[]>([]);
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback((q: string) => {
    setLoading(true);
    Promise.all([portalApi.me(), portalApi.galeri(q || undefined)])
      .then(([p, gal]) => { setProject(p); setItems(gal); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(""); }, [fetchData]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchData(search);
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
      <form onSubmit={handleSearch} className="relative mb-5">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 12l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari dokumentasi"
          className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white placeholder:text-slate-300"
        />
      </form>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Belum ada foto dokumentasi</div>
      ) : (
        /* Grid — 2 cols on mobile, 3 on md, 4 on lg */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {items.map((item, i) => {
            const color = COLORS[i % COLORS.length];
            return (
              <div key={item.id} className="rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition group">
                <div className={`aspect-video bg-gradient-to-br ${color} flex items-center justify-center relative`}>
                  {item.file_url ? (
                    <img
                      src={`${STORAGE_BASE}${item.file_url}`}
                      alt={item.judul}
                      className="w-full h-full object-cover absolute inset-0"
                    />
                  ) : (
                    <ConstructionIcon />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/30 p-2">
                    <p className="text-white text-xs font-medium">{fmtDate(item.tanggal_foto)}</p>
                    <p className="text-white/80 text-xs truncate">{item.judul}</p>
                  </div>
                </div>
                <div className="bg-white px-3 py-2 border border-t-0 border-slate-100 rounded-b-2xl">
                  <p className="text-xs font-semibold text-slate-600 truncate">{item.judul}</p>
                  {item.deskripsi && (
                    <p className="text-xs text-slate-400 truncate">{item.deskripsi}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
