"use client";

import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Plus, Truck } from "lucide-react";
import { PBStatusBadge } from "@/components/pb-status-badge";
import { toast } from "sonner";
import { projectStockApi, ProjectStockType } from "@/lib/api/projectStock";

type Props = { projectType: ProjectStockType; projectId: string | number };
type StockItem = { id: string; jenis: "Alat" | "Material"; nama_item: string; satuan: string; qty_total: number; pb: number; sisa_pengajuan: number; barang_masuk: number; barang_keluar: number; dikembalikan: number; sisa_fisik: number; pb_history: any[]; history: any[] };
type WarehouseOption = { id: string; nama: string; items: { id: string; nama_barang: string; jenis: "Alat" | "Material"; quantity: number; satuan: string | null }[] };

const movementLabels: Record<string, string> = { BARANG_MASUK: "Barang Masuk", BARANG_KELUAR: "Barang Keluar", DIKEMBALIKAN: "Dikembalikan" };

export function ProjectStockOpnameTab({ projectType, projectId }: Props) {
  const qc = useQueryClient();
  const [jenisTab, setJenisTab] = useState<"Alat" | "Material">("Alat");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({ nama_item: "", satuan: "", qty_total: "", keterangan: "" });
  const [movementForm, setMovementForm] = useState({ stock_item_id: "", movement_type: "BARANG_MASUK", qty: "", tanggal: new Date().toISOString().slice(0, 10), warehouse_id: "", warehouse_stock_id: "", catatan: "" });

  const stockQuery = useQuery<StockItem[]>({ queryKey: ["project-stock", projectType, String(projectId)], queryFn: () => projectStockApi.list(projectType, projectId) });
  const pbQuery = useQuery<any[]>({ queryKey: ["project-pb", projectType, String(projectId)], queryFn: () => projectStockApi.listPB(projectType, projectId), staleTime: 0 });
  const warehousesQuery = useQuery<WarehouseOption[]>({ queryKey: ["project-stock-warehouses"], queryFn: projectStockApi.warehouses });
  const items = useMemo(() => (stockQuery.data ?? []).filter((item) => item.jenis === jenisTab), [stockQuery.data, jenisTab]);
  const invalidate = () => { qc.invalidateQueries({ queryKey: ["project-stock", projectType, String(projectId)] }); qc.invalidateQueries({ queryKey: ["project-pb", projectType, String(projectId)] }); };
  const addItem = useMutation({ mutationFn: () => projectStockApi.addItem(projectType, projectId, { ...itemForm, jenis: jenisTab, qty_total: Number(itemForm.qty_total) }), onSuccess: () => { toast.success("Item Stock Opname ditambahkan"); setItemForm({ nama_item: "", satuan: "", qty_total: "", keterangan: "" }); invalidate(); }, onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menambah item") });
  const addMovement = useMutation({ mutationFn: () => projectStockApi.movement(movementForm.stock_item_id, { ...movementForm, qty: Number(movementForm.qty) }), onSuccess: () => { toast.success("Transaksi stok dicatat"); setMovementForm({ ...movementForm, stock_item_id: "", qty: "", warehouse_stock_id: "", catatan: "" }); invalidate(); qc.invalidateQueries({ queryKey: ["project-stock-warehouses"] }); }, onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal mencatat transaksi") });

  const selectedItem = (stockQuery.data ?? []).find((item) => item.id === movementForm.stock_item_id);
  const selectedWarehouse = (warehousesQuery.data ?? []).find((warehouse) => warehouse.id === movementForm.warehouse_id);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {(["Alat", "Material"] as const).map((jenis) => <button type="button" key={jenis} onClick={() => setJenisTab(jenis)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${jenisTab === jenis ? "bg-teal-600 text-white" : "text-muted-foreground hover:bg-background"}`}>{jenis}</button>)}
      </div>
      <p className="text-xs text-muted-foreground">PB diajukan oleh PIC dari menu PIC Project → PB Projek.</p>
    </div>

    {stockQuery.isError && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><span>Data Stock Opname gagal dimuat.</span><button type="button" className="min-h-10 rounded-md border px-3 font-semibold" onClick={() => stockQuery.refetch()}>Coba lagi</button></div>}
    {stockQuery.isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Memuat Stock Opname...</p>}

    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="mb-2 text-sm font-semibold">Tambah {jenisTab}</p>
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_2fr_auto]">
        <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder={`Nama ${jenisTab.toLowerCase()}`} value={itemForm.nama_item} onChange={(e) => setItemForm({ ...itemForm, nama_item: e.target.value })} />
        <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Satuan" value={itemForm.satuan} onChange={(e) => setItemForm({ ...itemForm, satuan: e.target.value })} />
        <input className="h-10 rounded-md border bg-background px-3 text-sm" type="number" min="0" placeholder="Qty Total" value={itemForm.qty_total} onChange={(e) => setItemForm({ ...itemForm, qty_total: e.target.value })} />
        <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Keterangan" value={itemForm.keterangan} onChange={(e) => setItemForm({ ...itemForm, keterangan: e.target.value })} />
        <button type="button" className="inline-flex h-10 items-center justify-center gap-1 rounded-md border bg-background px-3 text-sm font-semibold hover:bg-muted disabled:opacity-60" disabled={addItem.isPending || !itemForm.nama_item || !itemForm.satuan || Number(itemForm.qty_total) <= 0} onClick={() => addItem.mutate()}><Plus className="h-4 w-4" /> Simpan</button>
      </div>
    </div>

    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="mb-2 flex items-center gap-1 text-sm font-semibold"><Truck className="h-4 w-4" /> Catat transaksi stok</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={movementForm.stock_item_id} onChange={(e) => setMovementForm({ ...movementForm, stock_item_id: e.target.value })}><option value="">Pilih item</option>{(stockQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.nama_item} ({item.jenis})</option>)}</select>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={movementForm.movement_type} onChange={(e) => setMovementForm({ ...movementForm, movement_type: e.target.value, warehouse_stock_id: "" })}><option value="BARANG_MASUK">Barang Masuk</option><option value="BARANG_KELUAR">Barang Keluar</option><option value="DIKEMBALIKAN">Dikembalikan</option></select>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={movementForm.warehouse_id} onChange={(e) => setMovementForm({ ...movementForm, warehouse_id: e.target.value, warehouse_stock_id: "" })}><option value="">{movementForm.movement_type === "DIKEMBALIKAN" ? "Pilih Warehouse tujuan" : "Warehouse (opsional)"}</option>{(warehousesQuery.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.nama}</option>)}</select>
        {movementForm.movement_type === "BARANG_MASUK" && movementForm.warehouse_id ? <select className="h-10 rounded-md border bg-background px-3 text-sm" value={movementForm.warehouse_stock_id} onChange={(e) => setMovementForm({ ...movementForm, warehouse_stock_id: e.target.value })}><option value="">Pilih stok sumber</option>{(selectedWarehouse?.items ?? []).filter((warehouseItem) => warehouseItem.jenis === selectedItem?.jenis).map((warehouseItem) => <option key={warehouseItem.id} value={warehouseItem.id}>{warehouseItem.nama_barang} ({warehouseItem.quantity} {warehouseItem.satuan || ""})</option>)}</select> : <div className="hidden lg:block" />}
        <input className="h-10 rounded-md border bg-background px-3 text-sm" type="number" min="0" placeholder={`Qty${selectedItem ? ` (${selectedItem.satuan})` : ""}`} value={movementForm.qty} onChange={(e) => setMovementForm({ ...movementForm, qty: e.target.value })} />
        <input className="h-10 rounded-md border bg-background px-3 text-sm" type="date" value={movementForm.tanggal} onChange={(e) => setMovementForm({ ...movementForm, tanggal: e.target.value })} />
        <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Catatan" value={movementForm.catatan} onChange={(e) => setMovementForm({ ...movementForm, catatan: e.target.value })} />
        <button type="button" className="h-10 rounded-md bg-slate-800 px-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60" disabled={addMovement.isPending || !movementForm.stock_item_id || Number(movementForm.qty) <= 0 || (movementForm.movement_type === "DIKEMBALIKAN" && !movementForm.warehouse_id) || (movementForm.movement_type === "BARANG_MASUK" && Boolean(movementForm.warehouse_id) && !movementForm.warehouse_stock_id)} onClick={() => addMovement.mutate()}>Catat</button>
      </div>
      {warehousesQuery.isError && <p role="alert" className="mt-2 text-sm text-destructive">Daftar warehouse gagal dimuat. <button type="button" className="font-semibold underline" onClick={() => warehousesQuery.refetch()}>Coba lagi</button></p>}
    </div>

    <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[980px] text-sm"><thead className="bg-muted/50"><tr><th className="w-8 px-3 py-3" /><th className="px-3 py-3 text-left">Nama Alat/Material</th><th className="px-3 py-3 text-left">Satuan</th><th className="px-3 py-3 text-right">Qty Total</th><th className="px-3 py-3 text-right">PB</th><th className="px-3 py-3 text-right">Sisa Pengajuan</th><th className="px-3 py-3 text-right">Barang Masuk</th><th className="px-3 py-3 text-right">Barang Keluar</th><th className="px-3 py-3 text-right">Dikembalikan</th><th className="px-3 py-3 text-right">Sisa Fisik</th></tr></thead><tbody className="divide-y">
      {items.map((item) => { const rowOpen = expanded?.startsWith(`${item.id}:`); return <Fragment key={item.id}>
        <tr className="hover:bg-muted/20"><td className="px-3 py-2"><button type="button" className="rounded p-1 hover:bg-muted" aria-label={`Buka histori ${item.nama_item}`} onClick={() => setExpanded(rowOpen ? null : `${item.id}:PB`)}>{rowOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button></td><td className="px-3 py-2 font-medium">{item.nama_item}</td><td className="px-3 py-2">{item.satuan}</td><td className="px-3 py-2 text-right">{item.qty_total}</td>{(["PB", "BARANG_MASUK", "BARANG_KELUAR", "DIKEMBALIKAN"] as const).map((kind) => { const value = kind === "PB" ? item.pb : kind === "BARANG_MASUK" ? item.barang_masuk : kind === "BARANG_KELUAR" ? item.barang_keluar : item.dikembalikan; const key = kind === "PB" ? "PB" : kind; return <td key={kind} className="px-3 py-2 text-right"><button type="button" className="font-semibold text-teal-700 underline-offset-2 hover:underline" onClick={() => setExpanded(`${item.id}:${key}`)}>{value}</button></td>; })}<td className="px-3 py-2 text-right font-semibold">{item.sisa_fisik}</td></tr>
        {rowOpen && <tr key={`${item.id}-history`} className="bg-slate-50"><td colSpan={11} className="px-6 py-3"><div className="mb-1 text-xs font-semibold text-slate-600">Histori {expanded?.split(":")[1] === "PB" ? "PB" : movementLabels[expanded?.split(":")[1] ?? ""]}</div>{expanded?.split(":")[1] === "PB" ? (item.pb_history.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada histori PB.</p> : <div className="space-y-1">{item.pb_history.map((h) => <div key={h.id} className="flex flex-wrap gap-x-4 text-xs"><span>{new Date(h.created_at).toLocaleDateString("id-ID")}</span><b>{h.qty} {item.satuan}</b><span>{h.nomor_pb}</span><span className="text-muted-foreground">{h.status}</span></div>)}</div>) : (item.history.filter((h) => h.type === expanded?.split(":")[1]).length === 0 ? <p className="text-xs text-muted-foreground">Belum ada histori transaksi.</p> : <div className="space-y-1">{item.history.filter((h) => h.type === expanded?.split(":")[1]).map((h) => <div key={h.id} className="flex flex-wrap gap-x-4 text-xs"><span>{new Date(h.tanggal).toLocaleDateString("id-ID")}</span><b>{h.qty} {item.satuan}</b><span>{movementLabels[h.type]}</span><span className="text-muted-foreground">{h.catatan || "-"}</span></div>)}</div>)}</td></tr>}
      </Fragment>; })}
      {!items.length && <tr><td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">Belum ada item {jenisTab.toLowerCase()}.</td></tr>}
    </tbody></table></div>

    <div className="rounded-lg border p-4"><h3 className="mb-3 font-semibold">Daftar PB Projek</h3>{pbQuery.isLoading ? <p className="text-sm text-muted-foreground">Memuat PB...</p> : pbQuery.isError ? <p role="alert" className="text-sm text-destructive">Daftar PB gagal dimuat. <button type="button" className="font-semibold underline" onClick={() => pbQuery.refetch()}>Coba lagi</button></p> : (pbQuery.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Belum ada PB.</p> : <div className="space-y-2">{(pbQuery.data ?? []).map((pb: any) => <div key={pb.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/30 px-3 py-2 text-sm"><span className="font-medium">{pb.nomor_pb}</span><span>{pb.items.map((i: any) => `${i.nama_item} (${i.qty} ${i.satuan})`).join(", ")}</span><PBStatusBadge status={pb.status} /></div>)}</div>}</div>
  </div>;
}
