"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, Plus, Trash2, Warehouse } from "lucide-react";

type Wh = { id: number; nama: string; jumlah_item: number };
type Stock = { id: number; nama_barang: string; quantity: number; price: number; satuan: string | null; supplier: string | null; total_harga: number };
type Detail = { id: number; nama: string; stok: Stock[] };

const IDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);

export default function GudangWorkshopPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [warehouseName, setWarehouseName] = useState("Workshop");
  const [form, setForm] = useState({ nama_barang: "", quantity: "1", satuan: "pcs", price: "0", supplier: "" });

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

  const createWarehouse = useMutation({
    mutationFn: (nama: string) => apiClient.post("/projek/warehouse", { nama }).then((r) => r.data),
    onSuccess: (res) => {
      toast.success("Gudang/workshop ditambahkan");
      setSelectedId(Number(res.id));
      qc.invalidateQueries({ queryKey: ["projek-warehouse"] });
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

  function printPdf() {
    window.print();
  }

  return (
    <div className="p-6 space-y-5">
      <style jsx global>{`
        @media print {
          aside, header, .print-hidden { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Warehouse className="h-6 w-6 text-teal-600" /> Gudang/Workshop</h1>
          <p className="text-sm text-muted-foreground">Pencatatan alat dan material in-house yang tersedia di workshop.</p>
        </div>
        <Button variant="outline" onClick={printPdf} disabled={!detail || detail.stok.length === 0} className="print-hidden">
          <Download className="h-4 w-4 mr-1.5" /> Download PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <div className="rounded-lg border bg-white p-4 space-y-3 print-hidden">
          <p className="text-sm font-semibold">Lokasi Gudang</p>
          <div className="space-y-1">
            {warehouses.map((w) => (
              <button key={w.id} onClick={() => setSelectedId(w.id)} className={`w-full text-left rounded-md px-3 py-2 text-sm border ${activeId === w.id ? "bg-teal-50 border-teal-200 text-teal-800" : "hover:bg-slate-50"}`}>
                <span className="font-medium">{w.nama}</span>
                <span className="block text-xs text-muted-foreground">{w.jumlah_item} item</span>
              </button>
            ))}
          </div>
          <div className="pt-2 border-t space-y-2">
            <Input value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} placeholder="Nama gudang/workshop" />
            <Button size="sm" className="w-full" disabled={!warehouseName.trim() || createWarehouse.isPending} onClick={() => createWarehouse.mutate(warehouseName)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Lokasi
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

          <div className="rounded-xl border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
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
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Memuat...</td></tr>
                ) : !detail || detail.stok.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Belum ada item gudang/workshop.</td></tr>
                ) : detail.stok.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium">{s.nama_barang}</td>
                    <td className="px-4 py-3 text-right">{s.quantity}</td>
                    <td className="px-4 py-3">{s.satuan ?? "-"}</td>
                    <td className="px-4 py-3 text-right">{IDR(s.price)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{IDR(s.total_harga)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.supplier ?? "-"}</td>
                    <td className="px-4 py-3 print-hidden"><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteStock.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
