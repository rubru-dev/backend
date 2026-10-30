"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PBStatusBadge } from "@/components/pb-status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { projectStockApi, ProjectStockType } from "@/lib/api/projectStock";
import { useAuthStore } from "@/store/authStore";

type Props = { projectType: ProjectStockType; projectId: string | number };
type StockItem = {
  id: string;
  jenis: "Alat" | "Material";
  nama_item: string;
  satuan: string;
  qty_total: number;
  pb: number;
  sisa_pengajuan: number;
  sisa_fisik: number;
};

export function ProjectStockOpnameTab({ projectType, projectId }: Props) {
  const qc = useQueryClient();
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const [jenisTab, setJenisTab] = useState<"Alat" | "Material">("Alat");
  const [itemForm, setItemForm] = useState({ nama_item: "", satuan: "", qty_total: "", keterangan: "" });
  const [pages, setPages] = useState<Record<"Alat" | "Material", number>>({ Alat: 1, Material: 1 });
  const [deleteTarget, setDeleteTarget] = useState<StockItem | null>(null);

  const stockQuery = useQuery<StockItem[]>({
    queryKey: ["project-stock", projectType, String(projectId)],
    queryFn: () => projectStockApi.list(projectType, projectId),
  });
  const pbQuery = useQuery<any[]>({
    queryKey: ["project-pb", projectType, String(projectId)],
    queryFn: () => projectStockApi.listPB(projectType, projectId),
    staleTime: 0,
  });
  const items = useMemo(() => (stockQuery.data ?? []).filter((item) => item.jenis === jenisTab), [stockQuery.data, jenisTab]);
  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(pages[jenisTab], totalPages);
  const visibleItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => {
    if (pages[jenisTab] > totalPages) setPages((current) => ({ ...current, [jenisTab]: totalPages }));
  }, [jenisTab, pages, totalPages]);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["project-stock", projectType, String(projectId)] });
    qc.invalidateQueries({ queryKey: ["project-pb", projectType, String(projectId)] });
  };
  const addItem = useMutation({
    mutationFn: () => projectStockApi.addItem(projectType, projectId, { ...itemForm, jenis: jenisTab, qty_total: Number(itemForm.qty_total) }),
    onSuccess: () => {
      toast.success("Item Stock Opname ditambahkan");
      setItemForm({ nama_item: "", satuan: "", qty_total: "", keterangan: "" });
      invalidate();
    },
    onError: (error: any) => toast.error(error?.response?.data?.detail || "Gagal menambah item"),
  });
  const deleteItem = useMutation({
    mutationFn: (id: string) => projectStockApi.deleteItem(id),
    onSuccess: () => {
      toast.success("Item Stock Opname dihapus");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error: any) => toast.error(error?.response?.data?.detail || "Gagal menghapus item Stock Opname"),
  });

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {(["Alat", "Material"] as const).map((jenis) => <button type="button" key={jenis} onClick={() => setJenisTab(jenis)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${jenisTab === jenis ? "bg-teal-600 text-white" : "text-muted-foreground hover:bg-background"}`}>{jenis}</button>)}
      </div>
      <p className="text-xs text-muted-foreground">Pembaruan jumlah fisik dilakukan PIC melalui menu PB Projek.</p>
    </div>

    {stockQuery.isError && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><span>Data Stock Opname gagal dimuat.</span><button type="button" className="min-h-10 rounded-md border px-3 font-semibold" onClick={() => stockQuery.refetch()}>Coba lagi</button></div>}
    {stockQuery.isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Memuat Stock Opname...</p>}

    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="mb-2 text-sm font-semibold">Tambah {jenisTab}</p>
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_2fr_auto]">
        <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder={`Nama ${jenisTab.toLowerCase()}`} value={itemForm.nama_item} onChange={(event) => setItemForm({ ...itemForm, nama_item: event.target.value })} />
        <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Satuan" value={itemForm.satuan} onChange={(event) => setItemForm({ ...itemForm, satuan: event.target.value })} />
        <input className="h-10 rounded-md border bg-background px-3 text-sm" type="number" min="0" placeholder="Qty Total" value={itemForm.qty_total} onChange={(event) => setItemForm({ ...itemForm, qty_total: event.target.value })} />
        <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Keterangan" value={itemForm.keterangan} onChange={(event) => setItemForm({ ...itemForm, keterangan: event.target.value })} />
        <button type="button" className="inline-flex h-10 items-center justify-center gap-1 rounded-md border bg-background px-3 text-sm font-semibold hover:bg-muted disabled:opacity-60" disabled={addItem.isPending || !itemForm.nama_item || !itemForm.satuan || Number(itemForm.qty_total) <= 0} onClick={() => addItem.mutate()}><Plus className="h-4 w-4" />Simpan</button>
      </div>
    </div>

    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-muted/50"><tr><th className="px-3 py-3 text-left">Nama Alat/Material</th><th className="px-3 py-3 text-left">Satuan</th><th className="px-3 py-3 text-right">Qty Total</th><th className="px-3 py-3 text-right">PB</th><th className="px-3 py-3 text-right">Sisa Pengajuan</th><th className="px-3 py-3 text-right">Sisa Fisik Aktual</th><th className="px-3 py-3 text-right">Aksi</th></tr></thead>
        <tbody className="divide-y">
          {visibleItems.map((item) => <tr key={item.id} className="hover:bg-muted/20"><td className="px-3 py-2 font-medium">{item.nama_item}</td><td className="px-3 py-2">{item.satuan}</td><td className="px-3 py-2 text-right">{item.qty_total}</td><td className="px-3 py-2 text-right font-semibold text-teal-700">{item.pb}</td><td className="px-3 py-2 text-right font-semibold">{item.sisa_pengajuan}</td><td className="px-3 py-2 text-right">{item.sisa_fisik} {item.satuan}</td><td className="px-3 py-2 text-right"><button type="button" aria-label={`Hapus ${item.nama_item}`} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border px-3 text-sm font-semibold text-destructive hover:bg-destructive/5" onClick={() => setDeleteTarget(item)}><Trash2 className="h-4 w-4" />Hapus</button></td></tr>)}
          {!items.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Belum ada item {jenisTab.toLowerCase()}.</td></tr>}
        </tbody>
      </table>
    </div>
    {items.length > pageSize && <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="text-muted-foreground">Menampilkan {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, items.length)} dari {items.length} {jenisTab.toLowerCase()}</span><div className="flex items-center gap-2"><Button type="button" variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPages((current) => ({ ...current, [jenisTab]: currentPage - 1 }))}>Sebelumnya</Button><span>Halaman {currentPage} dari {totalPages}</span><Button type="button" variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPages((current) => ({ ...current, [jenisTab]: currentPage + 1 }))}>Berikutnya</Button></div></div>}

    <div className="rounded-lg border p-4"><h3 className="mb-3 font-semibold">Daftar PB Projek</h3>{pbQuery.isLoading ? <p className="text-sm text-muted-foreground">Memuat PB...</p> : pbQuery.isError ? <p role="alert" className="text-sm text-destructive">Daftar PB gagal dimuat. <button type="button" className="font-semibold underline" onClick={() => pbQuery.refetch()}>Coba lagi</button></p> : (pbQuery.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Belum ada PB.</p> : <div className="space-y-2">{(pbQuery.data ?? []).map((pb: any) => <div key={pb.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/30 px-3 py-2 text-sm"><span className="font-medium">{pb.nomor_pb}</span><span>{pb.items.map((item: any) => `${item.nama_item} (${item.qty} ${item.satuan})`).join(", ")}</span><PBStatusBadge status={pb.status} /></div>)}</div>}</div>

    <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
      <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Hapus {deleteTarget?.nama_item}?</DialogTitle><DialogDescription>{isSuperAdmin ? "Sebagai Super Admin, Anda akan menghapus item, histori stok, serta baris PB dan PR terkait. Dokumen PB atau PR yang tidak memiliki item lagi juga ikut dihapus. Tindakan ini tidak dapat dikembalikan." : "Penyesuaian fisik dan item pada Draft PB akan ikut dihapus. Item yang sudah diajukan atau sudah memiliki PR hanya dapat dihapus oleh Super Admin."}</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button><Button type="button" variant="destructive" disabled={deleteItem.isPending} onClick={() => deleteTarget && deleteItem.mutate(deleteTarget.id)}>{deleteItem.isPending ? "Menghapus..." : isSuperAdmin ? "Hapus Beserta PB/PR" : "Hapus Item"}</Button></DialogFooter></DialogContent>
    </Dialog>
  </div>;
}
