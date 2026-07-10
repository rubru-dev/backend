"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Loading, Modal, PageTitle, useGet } from "@/components/erp/shared";
import { ROUTES } from "@/lib/routes";
import { showAlert, showConfirm } from "@/lib/app-modal";

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
                      <Link href={ROUTES.drawLayout(row.id)} className="btn" style={{ minHeight: 30, padding: "4px 12px", fontSize: 12 }}>Buka</Link>
                      <button
                        onClick={() => handleDelete(row)}
                        disabled={deletingId === row.id}
                        style={{ minHeight: 30, padding: "4px 12px", fontSize: 12, background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6, cursor: "pointer" }}
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

      {showModal && <CreateModal onClose={() => setShowModal(false)} onCreated={(id) => router.push(ROUTES.drawLayout(id))} />}
    </div>
  );
}
