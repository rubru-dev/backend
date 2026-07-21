"use client";
import { ReactNode, useEffect, useState } from "react";
import api from "@/lib/api";
import { showAlert, showConfirm } from "@/lib/app-modal";

// ─── Paginasi (client-side, default 25/halaman) ──────────────────────────────
export type PageState<T> = { page: number; setPage: (n: number) => void; totalPages: number; total: number; perPage: number; pageRows: T[]; from: number; to: number };
export function usePagination<T>(rows: T[], perPage = 25): PageState<T> {
  const [page, setPage] = useState(1);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const start = (page - 1) * perPage;
  const pageRows = rows.slice(start, start + perPage);
  return { page, setPage, totalPages, total, perPage, pageRows, from: total ? start + 1 : 0, to: Math.min(start + perPage, total) };
}

export function Pagination<T>({ pg }: { pg: PageState<T> }) {
  if (pg.total <= pg.perPage) return null; // sembunyikan bila hanya 1 halaman
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e7f0] px-4 py-3 text-sm">
      <span className="text-ts">Menampilkan <b className="text-tp">{pg.from}–{pg.to}</b> dari {pg.total}</span>
      <div className="flex items-center gap-1">
        <button className="btn" style={{ minHeight: 32, padding: "4px 12px" }} disabled={pg.page <= 1} onClick={() => pg.setPage(pg.page - 1)}>‹ Sebelumnya</button>
        <span className="px-3 font-semibold">Hal {pg.page} / {pg.totalPages}</span>
        <button className="btn" style={{ minHeight: 32, padding: "4px 12px" }} disabled={pg.page >= pg.totalPages} onClick={() => pg.setPage(pg.page + 1)}>Berikutnya ›</button>
      </div>
    </div>
  );
}

// Paginasi server-side: digerakkan oleh total dari server, tiap ganti halaman → refetch.
export function ServerPagination({ page, total, perPage = 25, onPage, loading }: { page: number; total: number; perPage?: number; onPage: (n: number) => void; loading?: boolean }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / perPage));
  if ((total || 0) <= perPage) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e7f0] px-4 py-3 text-sm">
      <span className="text-ts">Menampilkan <b className="text-tp">{from}–{to}</b> dari {total}</span>
      <div className="flex items-center gap-1">
        <button className="btn" style={{ minHeight: 32, padding: "4px 12px" }} disabled={loading || page <= 1} onClick={() => onPage(page - 1)}>‹ Sebelumnya</button>
        <span className="px-3 font-semibold">Hal {page} / {totalPages}</span>
        <button className="btn" style={{ minHeight: 32, padding: "4px 12px" }} disabled={loading || page >= totalPages} onClick={() => onPage(page + 1)}>Berikutnya ›</button>
      </div>
    </div>
  );
}

// ─── Bulk select + delete (dipakai tabel yang mendukung hapus massal) ─────────
export function useBulkSelect() {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const setAll = (all: string[], on: boolean) => setIds(on ? new Set(all) : new Set());
  const clear = () => setIds(new Set());
  return { ids, toggle, setAll, clear, has: (id: string) => ids.has(id), list: Array.from(ids), size: ids.size };
}

// Checkbox "pilih semua" untuk header tabel.
export function SelectAllBox({ all, sel }: { all: string[]; sel: ReturnType<typeof useBulkSelect> }) {
  const checked = all.length > 0 && all.every((id) => sel.has(id));
  return <input type="checkbox" checked={checked} onChange={(e) => sel.setAll(all, e.target.checked)} onClick={(e) => e.stopPropagation()} aria-label="Pilih semua" style={{ width: 16, height: 16, cursor: "pointer" }} />;
}

// Checkbox per baris (hentikan propagasi agar tidak memicu klik baris).
export function RowBox({ id, sel }: { id: string; sel: ReturnType<typeof useBulkSelect> }) {
  return <input type="checkbox" checked={sel.has(id)} onChange={() => sel.toggle(id)} onClick={(e) => e.stopPropagation()} aria-label="Pilih baris" style={{ width: 16, height: 16, cursor: "pointer" }} />;
}

// Bilah aksi mengambang: muncul saat ada baris terpilih. Konfirmasi + panggil endpoint bulk-delete.
export function BulkDeleteBar({ ids, endpoint, label = "item", onDone }: { ids: string[]; endpoint: string; label?: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  if (!ids.length) return null;
  const run = async () => {
    const ok = await showConfirm({ title: `Hapus ${ids.length} ${label}?`, message: `${ids.length} ${label} terpilih akan dihapus permanen dan tidak bisa dikembalikan.`, confirmLabel: "Ya, hapus", tone: "danger" });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await api.post(endpoint, { ids });
      const deleted = res.data?.deleted ?? 0;
      const failed = res.data?.failed ?? [];
      if (failed.length) showAlert({ title: "Sebagian gagal", message: `${deleted} ${label} berhasil dihapus, ${failed.length} gagal.`, tone: "danger" });
      onDone();
    } catch (e: any) {
      showAlert({ title: "Gagal menghapus", message: e?.response?.data?.error || "Hapus massal gagal.", tone: "danger" });
    } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="card flex items-center gap-4 px-5 py-3 shadow-2xl">
        <span className="text-sm font-semibold text-tp">{ids.length} {label} dipilih</span>
        <button className="danger-confirm" style={{ minHeight: 36, padding: "7px 16px" }} disabled={busy} onClick={run}>{busy ? "Menghapus…" : "🗑 Hapus terpilih"}</button>
      </div>
    </div>
  );
}
export function PageTitle({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) { return <div className="flex flex-col gap-5 border-b border-[#d9ddeb] pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-accent">Dashboard <span className="mx-1 text-ts">›</span> {title}</p><h1 className="text-3xl font-extrabold tracking-tight text-tp sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ts sm:text-base">{subtitle}</p></div>{actions && <div className="flex flex-wrap gap-3">{actions}</div>}</div>; }
export function Metric({ label, value, hint, tone = "normal" }: { label: string; value: string | number; hint?: string; tone?: "normal" | "good" | "warn" | "danger" }) { const color={normal:"text-[#181c22]",good:"text-[#16713b]",warn:"text-[#9a4f00]",danger:"text-[#ba1a1a]"}[tone]; return <div className="card min-h-[145px] p-5 sm:p-6"><p className="text-[11px] font-bold tracking-[.1em] text-ts">{label}</p><p className={`mt-4 text-4xl font-extrabold ${color}`}>{value}</p>{hint && <p className="mt-3 text-sm text-ts">{hint}</p>}</div>; }
export function Status({ value }: { value: string }) { return <span className={`badge badge-${value.toLowerCase().replaceAll("_", "-")}`}>{value.replaceAll("_", " ")}</span>; }
export function Loading() { return <div className="p-10 text-center text-ts">Memuat data...</div>; }
export function useGet<T>(url: string) { const [data,setData]=useState<T | null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const load=async()=>{setLoading(true);try{setData((await api.get(url)).data);}catch(e:any){setError(e.response?.data?.error||"Data tidak dapat dimuat");}finally{setLoading(false);}}; useEffect(()=>{load();},[url]); return {data,loading,error,reload:load}; }
export function Modal({ open, title, children, onClose, tone = "default" }: {open:boolean;title:string;children:ReactNode;onClose:()=>void;tone?:"default"|"danger"}) {
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) { setRender(true); setClosing(false); return; }
    if (!render) return;
    setClosing(true);
    const t = setTimeout(() => { setRender(false); setClosing(false); }, 170);
    return () => clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!render) return null;
  const danger = tone === "danger";
  return <div className={`fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 ${closing ? "fk-closing" : ""}`}><div className={`card max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ${danger ? "border-2 border-red-200" : ""}`}><div className="mb-5 flex justify-between"><h2 className={`text-xl font-bold ${danger ? "text-[#ba1a1a]" : ""}`}>{title}</h2><button className="text-xl" onClick={onClose}>×</button></div>{children}</div></div>;
}
