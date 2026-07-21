"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type Konva from "konva";
import api from "@/lib/api";
import { Loading, Modal, PageTitle, useGet } from "@/components/erp/shared";
import { ROUTES } from "@/lib/routes";
import { showAlert, showConfirm } from "@/lib/app-modal";
import { downloadName } from "@/lib/download-name";
import type { LayoutData } from "@/components/draw-layout/layout-export";

// Konva renderer pulled in only when a download is triggered (keeps it off the list bundle / SSR).
const LayoutExport = dynamic(() => import("@/components/draw-layout/layout-export"), { ssr: false });

type LayoutRow = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { name: string } | null;
};

const dateLabel = (v: string) => new Date(v).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) { showAlert({ title: "Nama kosong", message: "Isi nama layout terlebih dahulu." }); return; }
    setSaving(true);
    try {
      const r = await api.post("/draw-layouts", { name: name.trim() });
      onCreated(r.data.data.id);
    } catch (e: any) {
      showAlert({ title: "Gagal membuat", message: e?.response?.data?.error || "Layout gagal dibuat.", tone: "danger" });
      setSaving(false);
    }
  };

  return (
    <Modal open title="Buat Layout Baru" onClose={onClose}>
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-semibold">Nama Layout</span>
          <input
            autoFocus
            className="mt-2"
            placeholder="mis. Layout Denah Mr. A"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
          />
          <p className="mt-2 text-xs text-ts">Beri nama yang mudah dikenali. Setelah dibuat, kamu langsung masuk ke editor menggambar.</p>
        </label>
        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" disabled={saving} onClick={submit}>{saving ? "Membuat…" : "Buat & Buka"}</button>
        </div>
      </div>
    </Modal>
  );
}

export default function DrawLayoutListPage() {
  const router = useRouter();
  const { data, loading, reload } = useGet<{ data: LayoutRow[] }>("/draw-layouts");
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const rows = data?.data ?? [];

  // ─── Download (PNG/PDF) ─────────────────────────────────────────────────────
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exportData, setExportData] = useState<LayoutData | null>(null);
  const pending = useRef<{ name: string; format: "png" | "pdf" } | null>(null);

  const openMenu = (row: LayoutRow, e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu(menu?.id === row.id ? null : { id: row.id, x: r.right, y: r.bottom + 4 });
  };

  const startExport = async (row: LayoutRow, format: "png" | "pdf") => {
    setMenu(null);
    setBusyId(row.id);
    try {
      const res = await api.get(`/draw-layouts/${row.id}`);
      const layout = res.data?.data?.data || {};
      pending.current = { name: res.data?.data?.name || row.name, format };
      setExportData({ shapes: layout.shapes, bgSrc: layout.bgSrc, bgOpacity: layout.bgOpacity });
    } catch (e: any) {
      showAlert({ title: "Gagal memuat", message: e?.response?.data?.error || "Data layout tidak dapat dimuat.", tone: "danger" });
      setBusyId(null);
    }
  };

  const onStageReady = async (stage: Konva.Stage) => {
    const meta = pending.current;
    try {
      const CW = stage.width(), CH = stage.height();
      const layers = stage.getLayers();
      const shapesLayer = layers[layers.length - 1];
      let box = shapesLayer.getClientRect({ skipTransform: false });
      let x: number, y: number, w: number, h: number;
      if (!box || box.width < 1 || box.height < 1) {
        x = 0; y = 0; w = CW; h = CH; // empty layout → full canvas
      } else {
        const pad = 48;
        x = Math.max(0, box.x - pad);
        y = Math.max(0, box.y - pad);
        w = Math.min(CW - x, box.width + pad * 2);
        h = Math.min(CH - y, box.height + pad * 2);
      }
      const pr = Math.min(2.5, 2600 / Math.max(w, h));
      const dataUrl = stage.toDataURL({ x, y, width: w, height: h, pixelRatio: pr, mimeType: "image/png" });
      const fileName = downloadName({ doc: "Layout Denah", client: meta?.name, ext: meta?.format === "pdf" ? "pdf" : "png" });

      if (meta?.format === "pdf") {
        const { jsPDF } = await import("jspdf");
        const orientation = w >= h ? "landscape" : "portrait";
        const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const margin = 10, titleGap = 7;
        pdf.setFontSize(13);
        pdf.text(meta?.name || "Layout", margin, margin + 2);
        const availW = pageW - margin * 2;
        const availH = pageH - margin * 2 - titleGap;
        const ratio = w / h;
        let dw = availW, dh = dw / ratio;
        if (dh > availH) { dh = availH; dw = dh * ratio; }
        const dx = (pageW - dw) / 2;
        const dy = margin + titleGap + (availH - dh) / 2;
        pdf.addImage(dataUrl, "PNG", dx, dy, dw, dh);
        pdf.save(fileName);
      } else {
        const a = document.createElement("a");
        a.download = fileName;
        a.href = dataUrl;
        a.click();
      }
    } catch (e: any) {
      showAlert({ title: "Gagal export", message: e?.message || "Tidak dapat membuat file.", tone: "danger" });
    } finally {
      setExportData(null);
      setBusyId(null);
      pending.current = null;
    }
  };

  const handleDelete = async (row: LayoutRow) => {
    const ok = await showConfirm({
      title: "Hapus layout?",
      message: `Layout "${row.name}" akan dihapus permanen.`,
      confirmLabel: "Ya, hapus",
      tone: "danger",
    });
    if (!ok) return;
    setDeletingId(row.id);
    try {
      await api.delete(`/draw-layouts/${row.id}`);
      reload();
    } catch (e: any) {
      showAlert({ title: "Gagal menghapus", message: e?.response?.data?.error || "Layout gagal dihapus.", tone: "danger" });
    } finally {
      setDeletingId(null);
    }
  };

  const smallBtn = { minHeight: 30, padding: "4px 12px", fontSize: 12 } as const;

  return (
    <div className="p-9">
      <PageTitle
        title="Draw Layout"
        subtitle="Denah/layout gambar tersimpan. Buat baru lalu buka untuk menggambar — perubahan tersimpan otomatis."
        actions={<button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Buat Layout</button>}
      />

      <div className="card mt-7 overflow-x-auto">
        {loading ? <Loading /> : (
          <table>
            <thead>
              <tr>
                <th>Nama Layout</th>
                <th>Dibuat oleh</th>
                <th>Terakhir diubah</th>
                <th>Dibuat</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td>
                    <Link href={ROUTES.drawLayout(row.id)} className="font-semibold text-accent hover:underline">{row.name}</Link>
                  </td>
                  <td>{row.createdBy?.name || "-"}</td>
                  <td>{dateLabel(row.updatedAt)}</td>
                  <td className="text-ts">{dateLabel(row.createdAt)}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={ROUTES.drawLayout(row.id)} className="btn" style={smallBtn}>Buka</Link>
                      <button
                        className="btn"
                        style={smallBtn}
                        disabled={busyId === row.id}
                        onClick={(e) => openMenu(row, e)}
                      >
                        {busyId === row.id ? "Menyiapkan…" : "⬇ Download ▾"}
                      </button>
                      <button
                        onClick={() => handleDelete(row)}
                        disabled={deletingId === row.id}
                        style={{ ...smallBtn, background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6, cursor: "pointer" }}
                      >
                        {deletingId === row.id ? "…" : "Hapus"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={5} className="p-10 text-center text-sm text-ts">Belum ada layout. Klik "+ Buat Layout" untuk mulai menggambar.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Download dropdown — fixed position anchored to the button, with click-away backdrop */}
      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="card fixed z-50 w-40 overflow-hidden p-1 shadow-2xl"
            style={{ left: Math.min(menu.x - 160, window.innerWidth - 168), top: menu.y }}
          >
            {(["png", "pdf"] as const).map(fmt => {
              const r = rows.find(x => x.id === menu.id);
              return (
                <button
                  key={fmt}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-[#f2f7ff]"
                  onClick={() => r && startExport(r, fmt)}
                >
                  <span>{fmt === "png" ? "🖼" : "📄"}</span>
                  <span>Download {fmt.toUpperCase()}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Hidden off-screen renderer used to capture the image */}
      {exportData && <LayoutExport data={exportData} onReady={onStageReady} />}

      {showModal && <CreateModal onClose={() => setShowModal(false)} onCreated={(id) => router.push(ROUTES.drawLayout(id))} />}
    </div>
  );
}
