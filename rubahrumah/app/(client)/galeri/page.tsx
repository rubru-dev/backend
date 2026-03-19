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

interface Folder {
  name: string;
  items: GaleriItem[];
  cover: GaleriItem | null;
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

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M4 10a2 2 0 012-2h14l4 4h18a2 2 0 012 2v22a2 2 0 01-2 2H6a2 2 0 01-2-2V10z" fill="white" fillOpacity="0.35"/>
      <path d="M4 18h40v18a2 2 0 01-2 2H6a2 2 0 01-2-2V18z" fill="white" fillOpacity="0.45"/>
    </svg>
  );
}

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

function PhotoModal({ photo, onClose, onPrev, onNext, hasPrev, hasNext }: {
  photo: GaleriItem;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white text-3xl leading-none"
        >
          ×
        </button>

        {/* Image */}
        <div className="relative w-full max-h-[75vh] flex items-center justify-center">
          {hasPrev && (
            <button
              onClick={onPrev}
              className="absolute left-0 z-10 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white text-xl -translate-x-1/2"
            >
              ‹
            </button>
          )}
          {photo.file_url ? (
            <img
              src={`${STORAGE_BASE}${photo.file_url}`}
              alt={photo.judul}
              className="max-w-full max-h-[75vh] rounded-xl object-contain"
            />
          ) : (
            <div className="w-80 h-60 bg-slate-700 rounded-xl flex items-center justify-center text-white/40">
              Tidak ada foto
            </div>
          )}
          {hasNext && (
            <button
              onClick={onNext}
              className="absolute right-0 z-10 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white text-xl translate-x-1/2"
            >
              ›
            </button>
          )}
        </div>

        {/* Caption */}
        <div className="mt-3 text-center">
          {photo.deskripsi && (
            <p className="text-white/80 text-sm">{photo.deskripsi}</p>
          )}
          {photo.tanggal_foto && (
            <p className="text-white/50 text-xs mt-1">{fmtDate(photo.tanggal_foto)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GaleriPage() {
  const [items, setItems] = useState<GaleriItem[]>([]);
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Navigation state
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

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
    setActiveFolder(null);
  }

  // Group items by judul → folders
  const folders: Folder[] = (() => {
    const map = new Map<string, GaleriItem[]>();
    for (const item of items) {
      const key = item.judul || "Lainnya";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).map(([name, folderItems]) => ({
      name,
      items: folderItems,
      cover: folderItems.find((i) => i.file_url) ?? folderItems[0] ?? null,
    }));
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
        <form onSubmit={handleSearch} className="relative mb-5">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M12 12l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari folder foto"
            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white placeholder:text-slate-300"
          />
        </form>
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
              Galeri
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 text-sm font-semibold">{activeFolder}</span>
            <span className="ml-auto text-xs text-slate-400">{currentFolderItems.length} foto</span>
          </div>

          {currentFolderItems.length === 0 ? (
            <div className="text-center py-16 text-slate-400">Folder kosong</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {currentFolderItems.map((item, i) => {
                const color = COLORS[i % COLORS.length];
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition group"
                    onClick={() => setLightboxIdx(i)}
                  >
                    <div className={`aspect-square bg-gradient-to-br ${color} flex items-center justify-center relative`}>
                      {item.file_url ? (
                        <img
                          src={`${STORAGE_BASE}${item.file_url}`}
                          alt={item.judul}
                          className="w-full h-full object-cover absolute inset-0 group-hover:opacity-90 transition"
                        />
                      ) : (
                        <ConstructionIcon />
                      )}
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="opacity-0 group-hover:opacity-100 transition text-white">
                          <circle cx="14" cy="14" r="12" stroke="white" strokeWidth="1.5"/>
                          <circle cx="14" cy="14" r="4" fill="white"/>
                        </svg>
                      </div>
                    </div>
                    {item.tanggal_foto && (
                      <div className="bg-white px-2 py-1.5 border border-t-0 border-slate-100 rounded-b-2xl">
                        <p className="text-xs text-slate-400">{fmtDate(item.tanggal_foto)}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : folders.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Belum ada foto dokumentasi</div>
      ) : (
        /* ── Folder grid view ────────────────────────────────── */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {folders.map((folder, i) => {
            const color = COLORS[i % COLORS.length];
            return (
              <div
                key={folder.name}
                onClick={() => setActiveFolder(folder.name)}
                className="rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition group"
              >
                {/* Cover */}
                <div className={`aspect-video bg-gradient-to-br ${color} flex items-center justify-center relative`}>
                  {folder.cover?.file_url ? (
                    <>
                      <img
                        src={`${STORAGE_BASE}${folder.cover.file_url}`}
                        alt={folder.name}
                        className="w-full h-full object-cover absolute inset-0 opacity-70"
                      />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition" />
                    </>
                  ) : (
                    <FolderIcon className="opacity-40" />
                  )}
                  {/* Photo count badge */}
                  <div className="absolute top-2 right-2 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full">
                    {folder.items.length} foto
                  </div>
                  {/* Folder icon overlay */}
                  <div className="absolute bottom-2 left-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white/80">
                      <path d="M2 8a2 2 0 012-2h5l2 2h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8z" fill="currentColor"/>
                    </svg>
                  </div>
                </div>
                {/* Folder name */}
                <div className="bg-white px-3 py-2 border border-t-0 border-slate-100 rounded-b-2xl">
                  <p className="text-xs font-semibold text-slate-700 truncate">{folder.name}</p>
                  {folder.cover?.tanggal_foto && (
                    <p className="text-xs text-slate-400 truncate">{fmtDate(folder.cover.tanggal_foto)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && currentFolderItems[lightboxIdx] && (
        <PhotoModal
          photo={currentFolderItems[lightboxIdx]}
          onClose={() => setLightboxIdx(null)}
          onPrev={() => setLightboxIdx((i) => (i! > 0 ? i! - 1 : i))}
          onNext={() => setLightboxIdx((i) => (i! < currentFolderItems.length - 1 ? i! + 1 : i))}
          hasPrev={lightboxIdx > 0}
          hasNext={lightboxIdx < currentFolderItems.length - 1}
        />
      )}
    </div>
  );
}
