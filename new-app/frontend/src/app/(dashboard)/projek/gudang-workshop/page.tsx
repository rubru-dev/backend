"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, Pencil, Plus, Save, Trash2, Warehouse, X } from "lucide-react";

type Wh = { id: number; nama: string; jumlah_item: number };
type Stock = { id: number; nama_barang: string; quantity: number; price: number; satuan: string | null; supplier: string | null; total_harga: number };
type Detail = { id: number; nama: string; stok: Stock[] };

const IDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);

export default function GudangWorkshopPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [warehouseName, setWarehouseName] = useState("");
  const [editingWarehouse, setEditingWarehouse] = useState<{ id: number; nama: string } | null>(null);
  const [form, setForm] = useState({ nama_barang: "", quantity: "1", satuan: "pcs", price: "0", supplier: "" });
  const [editingStockId, setEditingStockId] = useState<number | null>(null);
  const [editStockForm, setEditStockForm] = useState({ nama_barang: "", quantity: "1", satuan: "pcs", price: "0", supplier: "" });

  const { data: warehouses = [] } = useQuery<Wh[]>({
    queryKey: ["projek-warehouse"],
    queryFn: () => apiClient.get("/projek/warehouse").then((r) => r.data),
  });
  const activeId = selectedId ?? warehouses[0]?.id ?? null;
  const { data: detail, isLoading } = useQuery<Detail | null>({
    queryKey: ["projek-warehouse-detail", activeId],
    queryFn: () => activeId ? apiClient.get(`/projek/warehouse/${activeId}`).then((r) => r.data) : Promise.resolve(null),
    enabled: !!activeId,
  });

  const totalNilai = useMemo(() => (detail?.stok ?? []).reduce((s, i) => s + Number(i.total_harga ?? 0), 0), [detail]);
  const tanggalCetak = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());
  const nomorDokumen = `GW-${activeId ?? "000"}-${new Intl.DateTimeFormat("id-ID", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replace(/\//g, "")}`;

  const createWarehouse = useMutation({
    mutationFn: (nama: string) => apiClient.post("/projek/warehouse", { nama }).then((r) => r.data),
    onSuccess: (res) => {
      toast.success("Gudang/workshop ditambahkan");
      setSelectedId(Number(res.id));
      setWarehouseName("");
      qc.invalidateQueries({ queryKey: ["projek-warehouse"] });
    },
  });
  const updateWarehouse = useMutation({
    mutationFn: ({ id, nama }: { id: number; nama: string }) => apiClient.patch(`/projek/warehouse/${id}`, { nama }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Gudang/workshop diupdate");
      setEditingWarehouse(null);
      qc.invalidateQueries({ queryKey: ["projek-warehouse"] });
      qc.invalidateQueries({ queryKey: ["projek-warehouse-detail", activeId] });
    },
  });
  const deleteWarehouse = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/projek/warehouse/${id}`).then((r) => r.data),
    onSuccess: (_res, id) => {
      toast.success("Gudang/workshop dihapus");
      if (activeId === id) setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["projek-warehouse"] });
      qc.invalidateQueries({ queryKey: ["projek-warehouse-detail"] });
    },
  });
  const addStock = useMutation({
    mutationFn: () => apiClient.post(`/projek/warehouse/${activeId}/stok`, {
      is_custom: true,
      nama_barang: form.nama_barang,
      quantity: Number(form.quantity || 0),
      satuan: form.satuan || null,
      price: Number(form.price || 0),
      supplier: form.supplier || null,
    }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Item dicatat");
      setForm({ nama_barang: "", quantity: "1", satuan: "pcs", price: "0", supplier: "" });
      qc.invalidateQueries({ queryKey: ["projek-warehouse-detail", activeId] });
      qc.invalidateQueries({ queryKey: ["projek-warehouse"] });
    },
  });
  const deleteStock = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/projek/warehouse/${activeId}/stok/${id}`).then((r) => r.data),
    onSuccess: () => {
      toast.success("Item dihapus");
      qc.invalidateQueries({ queryKey: ["projek-warehouse-detail", activeId] });
      qc.invalidateQueries({ queryKey: ["projek-warehouse"] });
    },
  });
  const updateStock = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/projek/warehouse/${activeId}/stok/${id}`, {
      nama_barang: editStockForm.nama_barang,
      quantity: Number(editStockForm.quantity || 0),
      satuan: editStockForm.satuan || null,
      price: Number(editStockForm.price || 0),
      supplier: editStockForm.supplier || null,
    }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Item diupdate");
      setEditingStockId(null);
      qc.invalidateQueries({ queryKey: ["projek-warehouse-detail", activeId] });
      qc.invalidateQueries({ queryKey: ["projek-warehouse"] });
    },
  });

  function startEditStock(s: Stock) {
    setEditingStockId(s.id);
    setEditStockForm({
      nama_barang: s.nama_barang,
      quantity: String(s.quantity ?? 0),
      satuan: s.satuan ?? "",
      price: String(s.price ?? 0),
      supplier: s.supplier ?? "",
    });
  }

  function printPdf() {
    window.print();
  }

  return (
    <div className="p-6 space-y-5 gudang-print-page">
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
          html, body, body > div {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: #fff !important;
          }
          .h-screen { height: auto !important; }
          .overflow-hidden { overflow: visible !important; }
          aside, header, .print-hidden { display: none !important; }
          main, main > div {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          .gudang-print-page {
            display: block !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            padding: 0 !important;
            color: #111827;
          }
          .gudang-print-title { display: none !important; }
          .gudang-print-grid {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
          }
          .gudang-print-content {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          .gudang-doc-header {
            display: flex !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            gap: 24px !important;
            border-bottom: 3px solid #f97316 !important;
            padding-bottom: 16px !important;
            margin-bottom: 0 !important;
          }
          .gudang-logo-block { display: flex !important; align-items: center !important; gap: 10px !important; }
          .gudang-logo { width: 52px !important; height: 52px !important; object-fit: contain !important; }
          .gudang-company-name { font-size: 16px !important; font-weight: 700 !important; color: #f97316 !important; line-height: 1.15 !important; }
          .gudang-company-tagline { font-size: 8px !important; color: #78716c !important; margin-top: 2px !important; }
          .gudang-company-contact { font-size: 7.5px !important; color: #78716c !important; margin-top: 2px !important; line-height: 1.35 !important; }
          .gudang-title-block { text-align: right !important; }
          .gudang-document-title { font-size: 24px !important; font-weight: 800 !important; color: #f97316 !important; letter-spacing: 2px !important; line-height: 1.1 !important; }
          .gudang-document-number { font-size: 10px !important; color: #78716c !important; margin-top: 3px !important; }
          .gudang-document-date { font-size: 8px !important; color: #78716c !important; margin-top: 3px !important; }
          .gudang-accent-bar { display: block !important; height: 4px !important; background: #f97316 !important; border-radius: 2px !important; margin: 0 0 20px !important; }
          .gudang-summary { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 8px !important; margin-bottom: 14px; }
          .gudang-summary > div { border: 1px solid #d1d5db !important; border-radius: 0 !important; padding: 10px !important; }
          .gudang-table-wrap {
            border-radius: 0 !important;
            border: 1px solid #111827 !important;
            overflow: visible !important;
          }
          .gudang-print-check { display: table-cell !important; }
          .gudang-check-box {
            display: inline-block !important;
            width: 14px !important;
            height: 14px !important;
            border: 1.5px solid #111827 !important;
            vertical-align: middle;
          }
          .gudang-table-wrap table,
          .gudang-table-wrap thead,
          .gudang-table-wrap tbody,
          .gudang-table-wrap tr {
            page-break-inside: auto;
            break-inside: auto;
          }
          .gudang-table-wrap table { font-size: 11px !important; }
          .gudang-table-wrap th { background: #111827 !important; color: #fff !important; padding: 8px !important; }
          .gudang-table-wrap td { padding: 8px !important; }
          .gudang-print-footer { display: grid !important; grid-template-columns: 1fr 220px; gap: 24px; margin-top: 24px; page-break-inside: avoid; }
        }
      `}</style>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 gudang-print-title">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Warehouse className="h-6 w-6 text-teal-600" /> Gudang/Workshop</h1>
          <p className="text-sm text-muted-foreground">Pencatatan alat dan material in-house yang tersedia di workshop.</p>
        </div>
        <Button variant="outline" onClick={printPdf} disabled={!detail || detail.stok.length === 0} className="print-hidden">
          <Download className="h-4 w-4 mr-1.5" /> Download PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 gudang-print-grid">
        <div className="rounded-lg border bg-white p-4 space-y-3 print-hidden">
          <p className="text-sm font-semibold">Lokasi Gudang</p>
          <div className="space-y-1">
            {warehouses.length === 0 && (
              <div className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                Belum ada gudang/workshop.
              </div>
            )}
            {warehouses.map((w) => (
              <div key={w.id} className={`rounded-md border ${activeId === w.id ? "bg-teal-50 border-teal-200 text-teal-800" : "hover:bg-slate-50"}`}>
                {editingWarehouse?.id === w.id ? (
                  <div className="space-y-2 p-2">
                    <Input value={editingWarehouse.nama} onChange={(e) => setEditingWarehouse({ ...editingWarehouse, nama: e.target.value })} />
                    <div className="flex gap-1">
                      <Button size="sm" className="h-8 flex-1" disabled={!editingWarehouse.nama.trim() || updateWarehouse.isPending} onClick={() => updateWarehouse.mutate({ id: w.id, nama: editingWarehouse.nama })}>
                        <Save className="h-3.5 w-3.5 mr-1" /> Simpan
                      </Button>
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setEditingWarehouse(null)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 p-2">
                    <button onClick={() => setSelectedId(w.id)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm font-medium">{w.nama}</span>
                      <span className="block text-xs text-muted-foreground">{w.jumlah_item} item</span>
                    </button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingWarehouse({ id: w.id, nama: w.nama })}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        if (window.confirm(`Hapus gudang/workshop "${w.nama}" beserta semua itemnya?`)) deleteWarehouse.mutate(w.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="pt-2 border-t space-y-2">
            <Input value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} placeholder="Nama gudang/workshop" />
            <Button size="sm" className="w-full" disabled={!warehouseName.trim() || createWarehouse.isPending} onClick={() => createWarehouse.mutate(warehouseName)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Lokasi
            </Button>
          </div>
        </div>

        <div className="space-y-4 gudang-print-content">
          <div className="hidden gudang-doc-header">
            <div className="gudang-logo-block">
              <img src="/images/logo.png" alt="RubahRumah" className="gudang-logo" />
              <div>
                <p className="gudang-company-name">RubahRumah</p>
                <p className="gudang-company-tagline">Platform Desain and Build</p>
                <p className="gudang-company-contact">Jl. Pandu II No.420. Sepanjang Jaya. Kec. Rawalumbu. Kota Bekasi. Jawa Barat 17116</p>
                <p className="gudang-company-contact">0813-7640-5550 | info.rubahrumah@gmail.com</p>
              </div>
            </div>
            <div className="gudang-title-block">
              <p className="gudang-document-title">DAFTAR GUDANG</p>
              <p className="gudang-document-number">{nomorDokumen}</p>
              <p className="gudang-document-date">Tanggal: {tanggalCetak}</p>
            </div>
          </div>
          <div className="hidden gudang-accent-bar" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 gudang-summary">
            <div className="rounded-lg border bg-white p-4"><p className="text-xs text-muted-foreground">Lokasi</p><p className="text-xl font-bold">{detail?.nama ?? "-"}</p></div>
            <div className="rounded-lg border bg-white p-4"><p className="text-xs text-muted-foreground">Total Item</p><p className="text-xl font-bold">{detail?.stok.length ?? 0}</p></div>
            <div className="rounded-lg border bg-white p-4"><p className="text-xs text-muted-foreground">Estimasi Nilai</p><p className="text-xl font-bold">{IDR(totalNilai)}</p></div>
          </div>

          <div className="rounded-lg border bg-slate-50 p-4 space-y-3 print-hidden">
            <p className="text-sm font-semibold">Tambah Alat / Material</p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2"><Label className="text-xs">Nama Item</Label><Input value={form.nama_barang} onChange={(e) => setForm({ ...form, nama_barang: e.target.value })} placeholder="Bor, tangga, cat, semen..." /></div>
              <div><Label className="text-xs">Qty</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
              <div><Label className="text-xs">Satuan</Label><Input value={form.satuan} onChange={(e) => setForm({ ...form, satuan: e.target.value })} /></div>
              <div><Label className="text-xs">Harga</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div className="md:col-span-4"><Label className="text-xs">Supplier / Catatan</Label><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Opsional" /></div>
              <div className="flex items-end"><Button className="w-full" disabled={!activeId || !form.nama_barang.trim() || addStock.isPending} onClick={() => addStock.mutate()}><Plus className="h-4 w-4 mr-1" /> Simpan</Button></div>
            </div>
          </div>

          <div className="rounded-xl border bg-white overflow-hidden gudang-table-wrap">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="hidden px-4 py-3 text-center font-medium text-gray-500 gudang-print-check">Checklist</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Item</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Qty</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Satuan</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Harga</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Supplier/Catatan</th>
                  <th className="px-4 py-3 w-12 print-hidden"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Memuat...</td></tr>
                ) : !detail || detail.stok.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Belum ada item gudang/workshop.</td></tr>
                ) : detail.stok.map((s) => editingStockId === s.id ? (
                  <tr key={s.id} className="bg-teal-50/50">
                    <td className="hidden px-4 py-3 text-center gudang-print-check"><span className="gudang-check-box" /></td>
                    <td className="px-4 py-3"><Input value={editStockForm.nama_barang} onChange={(e) => setEditStockForm({ ...editStockForm, nama_barang: e.target.value })} /></td>
                    <td className="px-4 py-3"><Input type="number" value={editStockForm.quantity} onChange={(e) => setEditStockForm({ ...editStockForm, quantity: e.target.value })} className="text-right" /></td>
                    <td className="px-4 py-3"><Input value={editStockForm.satuan} onChange={(e) => setEditStockForm({ ...editStockForm, satuan: e.target.value })} /></td>
                    <td className="px-4 py-3"><Input type="number" value={editStockForm.price} onChange={(e) => setEditStockForm({ ...editStockForm, price: e.target.value })} className="text-right" /></td>
                    <td className="px-4 py-3 text-right font-semibold">{IDR(Number(editStockForm.quantity || 0) * Number(editStockForm.price || 0))}</td>
                    <td className="px-4 py-3"><Input value={editStockForm.supplier} onChange={(e) => setEditStockForm({ ...editStockForm, supplier: e.target.value })} /></td>
                    <td className="px-4 py-3 print-hidden">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-teal-700" disabled={!editStockForm.nama_barang.trim() || updateStock.isPending} onClick={() => updateStock.mutate(s.id)}><Save className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingStockId(null)}><X className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id}>
                    <td className="hidden px-4 py-3 text-center gudang-print-check"><span className="gudang-check-box" /></td>
                    <td className="px-4 py-3 font-medium">{s.nama_barang}</td>
                    <td className="px-4 py-3 text-right">{s.quantity}</td>
                    <td className="px-4 py-3">{s.satuan ?? "-"}</td>
                    <td className="px-4 py-3 text-right">{IDR(s.price)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{IDR(s.total_harga)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.supplier ?? "-"}</td>
                    <td className="px-4 py-3 print-hidden">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditStock(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteStock.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="hidden gudang-print-footer">
            <div className="text-xs text-slate-600">
              <p className="font-semibold text-slate-900 mb-1">Catatan</p>
              <p>Dokumen ini merupakan rekap alat dan material in-house berdasarkan data Gudang/Workshop pada saat dicetak.</p>
            </div>
            <div className="text-center text-sm">
              <p>Bekasi, {tanggalCetak}</p>
              <div className="h-20" />
              <p className="border-t border-slate-900 pt-1 font-semibold">Penanggung Jawab Workshop</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
