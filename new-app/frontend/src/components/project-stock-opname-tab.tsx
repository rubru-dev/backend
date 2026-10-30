"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { PBStatusBadge } from "@/components/pb-status-badge";
import { projectStockApi, ProjectStockType } from "@/lib/api/projectStock";

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
  const [jenisTab, setJenisTab] = useState<"Alat" | "Material">("Alat");
  const [itemForm, setItemForm] = useState({ nama_item: "", satuan: "", qty_total: "", keterangan: "" });
  const [physicalDrafts, setPhysicalDrafts] = useState<Record<string, string>>({});

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
  const updatePhysical = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) => projectStockApi.updatePhysicalStock(id, qty),
    onSuccess: (_result, variables) => {
      toast.success("Sisa fisik diperbarui");
      setPhysicalDrafts((current) => {
        const next = { ...current };
        delete next[variables.id];
        return next;
      });
      invalidate();
    },
    onError: (error: any) => toast.error(error?.response?.data?.detail || "Gagal memperbarui sisa fisik"),
  });

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {(["Alat", "Material"] as const).map((jenis) => <button type="button" key={jenis} onClick={() => setJenisTab(jenis)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${jenisTab === jenis ? "bg-teal-600 text-white" : "text-muted-foreground hover:bg-background"}`}>{jenis}</button>)}
      </div>
      <p className="text-xs text-muted-foreground">PIC cukup memperbarui jumlah fisik aktual. PB tetap diajukan dari menu PB Projek.</p>
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
          {items.map((item) => {
            const draft = physicalDrafts[item.id] ?? String(item.sisa_fisik);
            const qty = Number(draft);
            const invalid = draft === "" || !Number.isFinite(qty) || qty < 0 || qty > item.qty_total;
            const saving = updatePhysical.isPending && updatePhysical.variables?.id === item.id;
            return <tr key={item.id} className="hover:bg-muted/20"><td className="px-3 py-2 font-medium">{item.nama_item}</td><td className="px-3 py-2">{item.satuan}</td><td className="px-3 py-2 text-right">{item.qty_total}</td><td className="px-3 py-2 text-right font-semibold text-teal-700">{item.pb}</td><td className="px-3 py-2 text-right font-semibold">{item.sisa_pengajuan}</td><td className="px-3 py-2"><label className="ml-auto flex w-36 items-center gap-2"><span className="sr-only">Sisa fisik {item.nama_item}</span><input className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-right text-sm" type="number" min="0" max={item.qty_total} step="any" value={draft} onChange={(event) => setPhysicalDrafts((current) => ({ ...current, [item.id]: event.target.value }))} /><span className="text-xs text-muted-foreground">{item.satuan}</span></label></td><td className="px-3 py-2 text-right"><button type="button" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50" disabled={invalid || qty === item.sisa_fisik || updatePhysical.isPending} onClick={() => updatePhysical.mutate({ id: item.id, qty })}><Save className="h-4 w-4" />{saving ? "Menyimpan..." : "Simpan"}</button></td></tr>;
          })}
          {!items.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Belum ada item {jenisTab.toLowerCase()}.</td></tr>}
        </tbody>
      </table>
    </div>

    <div className="rounded-lg border p-4"><h3 className="mb-3 font-semibold">Daftar PB Projek</h3>{pbQuery.isLoading ? <p className="text-sm text-muted-foreground">Memuat PB...</p> : pbQuery.isError ? <p role="alert" className="text-sm text-destructive">Daftar PB gagal dimuat. <button type="button" className="font-semibold underline" onClick={() => pbQuery.refetch()}>Coba lagi</button></p> : (pbQuery.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Belum ada PB.</p> : <div className="space-y-2">{(pbQuery.data ?? []).map((pb: any) => <div key={pb.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/30 px-3 py-2 text-sm"><span className="font-medium">{pb.nomor_pb}</span><span>{pb.items.map((item: any) => `${item.nama_item} (${item.qty} ${item.satuan})`).join(", ")}</span><PBStatusBadge status={pb.status} /></div>)}</div>}</div>
  </div>;
}
