"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, PackageCheck, PackagePlus, Pencil, Plus, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { laporanPicApi } from "@/lib/api/laporanPic";
import { projectStockApi } from "@/lib/api/projectStock";
import { PBStatusBadge } from "@/components/pb-status-badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PBReceiveDialog } from "@/components/pb-receive-dialog";

type ProjectType = "sipil" | "interior";
type FormRow = { key: number; stock_item_id: string; qty: string; catatan: string };

let rowKey = 0;
const emptyRow = (): FormRow => ({ key: ++rowKey, stock_item_id: "", qty: "", catatan: "" });
const fmtDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-");

export default function PBProjekPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"form" | "list">("form");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [projectType, setProjectType] = useState<ProjectType>("sipil");
  const [projectId, setProjectId] = useState("");
  const [rows, setRows] = useState<FormRow[]>([emptyRow()]);
  const [catatan, setCatatan] = useState("");
  const [submitTarget, setSubmitTarget] = useState<any | null>(null);
  const [submitChecked, setSubmitChecked] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [receiveTarget, setReceiveTarget] = useState<any | null>(null);

  const projects = useQuery({ queryKey: ["pb-project-options", projectType], queryFn: () => laporanPicApi.projekOptions(projectType) });
  const stock = useQuery<any[]>({ queryKey: ["pb-stock-options", projectType, projectId], queryFn: () => projectStockApi.list(projectType, projectId), enabled: Boolean(projectId), staleTime: 0 });
  // Jangan pakai initialData: dengan staleTime global 60 detik, initialData kosong
  // dianggap fresh sehingga daftar PB tidak pernah diambil dari server.
  const pbList = useQuery<any[]>({ queryKey: ["pb-list-all"], queryFn: projectStockApi.listPBAll, enabled: tab === "list", staleTime: 0 });

  const stockItems = stock.data ?? [];
  const stockById = useMemo(() => new Map(stockItems.map((item) => [String(item.id), item])), [stockItems]);
  const rowErrors = rows.map((row) => {
    if (!row.stock_item_id) return row.qty ? "Pilih item" : null;
    const item = stockById.get(row.stock_item_id);
    const qty = Number(row.qty);
    if (!row.qty || qty <= 0) return "Qty wajib diisi";
    if (item && qty > item.sisa_pengajuan) return `Maksimal ${item.sisa_pengajuan} ${item.satuan}`;
    return null;
  });
  const filledRows = rows.filter((row) => row.stock_item_id);
  const canSave = filledRows.length > 0 && rowErrors.every((e) => !e);

  const refreshAll = () => {
    for (const key of ["pb-list-all", "finance-pb-projek", "pb-stock-options", "project-pb", "project-stock"]) qc.invalidateQueries({ queryKey: [key] });
  };
  const resetForm = () => { setEditingId(null); setRows([emptyRow()]); setCatatan(""); };
  const apiError = (fallback: string) => (e: any) => { toast.error(e?.response?.data?.detail || fallback); refreshAll(); };

  const save = useMutation({
    mutationFn: () => {
      const payload = { catatan: catatan || null, items: filledRows.map((row) => ({ stock_item_id: row.stock_item_id, qty: Number(row.qty), catatan: row.catatan || null })) };
      return editingId ? projectStockApi.updatePB(editingId, payload) : projectStockApi.createPB(projectType, projectId, payload);
    },
    onSuccess: () => { toast.success(editingId ? "Draft PB diperbarui" : "Draft PB tersimpan. Periksa lagi lalu klik Kirim ke Finance."); resetForm(); refreshAll(); setTab("list"); },
    onError: apiError("Gagal menyimpan draft PB"),
  });
  const submit = useMutation({
    mutationFn: (id: string) => projectStockApi.submitPB(id),
    onSuccess: () => { toast.success("PB terkirim ke Finance"); setSubmitTarget(null); refreshAll(); },
    onError: apiError("Gagal mengirim PB"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => projectStockApi.deletePB(id),
    onSuccess: () => { toast.success("Draft PB dihapus"); setDeleteTarget(null); if (deleteTarget?.id === editingId) resetForm(); refreshAll(); },
    onError: apiError("Gagal menghapus PB"),
  });
  const receive = useMutation({
    mutationFn: ({ id, tanggal, items }: { id: string; tanggal: string; items: { pb_item_id: string; qty: number }[] }) => projectStockApi.receivePB(id, tanggal, items),
    onSuccess: () => { toast.success("Barang diterima, Barang Masuk tercatat di Stock Opname"); setReceiveTarget(null); refreshAll(); },
    onError: apiError("Gagal mencatat penerimaan barang"),
  });

  const changeProjectType = (value: ProjectType) => { setProjectType(value); setProjectId(""); setRows([emptyRow()]); };
  const changeProject = (value: string) => { setProjectId(value); setRows([emptyRow()]); };
  const updateRow = (key: number, patch: Partial<FormRow>) => setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const removeRow = (key: number) => setRows((prev) => (prev.length === 1 ? [emptyRow()] : prev.filter((row) => row.key !== key)));
  const setRowQty = (row: FormRow, value: string) => {
    if (value !== "" && (Number.isNaN(Number(value)) || Number(value) < 0)) return;
    const item = stockById.get(row.stock_item_id);
    updateRow(row.key, { qty: item && Number(value) > item.sisa_pengajuan ? String(item.sisa_pengajuan) : value });
  };

  const startEdit = (pb: any) => {
    setEditingId(pb.id);
    setProjectType(pb.project_type);
    setProjectId(pb.project_id);
    setCatatan(pb.catatan ?? "");
    setRows(pb.items.length ? pb.items.map((i: any) => ({ key: ++rowKey, stock_item_id: i.stock_item_id, qty: String(i.qty), catatan: i.catatan ?? "" })) : [emptyRow()]);
    setTab("form");
  };

  const projectLocked = Boolean(editingId);

  return <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
    <div><h1 className="flex items-center gap-2 text-2xl font-bold"><PackagePlus className="h-6 w-6 text-orange-500" /> PB Projek</h1><p className="mt-1 text-sm text-muted-foreground">Ajukan kebutuhan alat atau material untuk projek yang ditugaskan kepada Anda. PB disimpan sebagai Draft dulu, lalu dikirim ke Finance setelah dicek.</p></div>
    <div className="flex gap-1 border-b" role="tablist" aria-label="Menu PB Projek">
      <button type="button" role="tab" aria-selected={tab === "form"} className={`border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === "form" ? "border-orange-500 text-orange-600" : "border-transparent text-muted-foreground"}`} onClick={() => setTab("form")}><PackagePlus className="mr-1.5 inline h-4 w-4" />{editingId ? "Edit PB" : "Buat PB"}</button>
      <button type="button" role="tab" aria-selected={tab === "list"} className={`border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === "list" ? "border-orange-500 text-orange-600" : "border-transparent text-muted-foreground"}`} onClick={() => setTab("list")}><ClipboardList className="mr-1.5 inline h-4 w-4" />Daftar PB</button>
    </div>

    {tab === "form" ? <div className="space-y-4">
      {editingId && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800"><span>Sedang mengedit draft PB. Projek tidak bisa diganti.</span><button type="button" className="font-semibold underline" onClick={resetForm}>Batal edit</button></div>}
      <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">Jenis Projek<select className="h-10 w-full rounded-md border bg-background px-3 font-normal disabled:opacity-60" value={projectType} disabled={projectLocked} onChange={(e) => changeProjectType(e.target.value as ProjectType)}><option value="sipil">Projek Sipil</option><option value="interior">Projek Interior</option></select></label>
        <label className="space-y-1 text-sm font-medium">Nama Projek<select className="h-10 w-full rounded-md border bg-background px-3 font-normal disabled:opacity-60" value={projectId} disabled={projectLocked} onChange={(e) => changeProject(e.target.value)}><option value="">Pilih projek yang ditugaskan</option>{(projects.data ?? []).map((p) => <option key={p.id} value={String(p.id)}>{p.nama}</option>)}</select></label>
      </div>

      {projectId && <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Item yang Diajukan</h2><span className="text-xs text-muted-foreground">Item diambil dari Stock Opname projek ini</span></div>
        {stock.isLoading ? <p className="py-6 text-center text-sm text-muted-foreground">Memuat item Stock Opname...</p>
          : stockItems.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Belum ada item Stock Opname pada projek ini. Minta tim projek mengisi Stock Opname terlebih dahulu.</p>
          : <>
            <div className="hidden grid-cols-[2rem_minmax(0,2.2fr)_9rem_minmax(0,1.6fr)_2.5rem] gap-2 px-1 text-xs font-semibold text-muted-foreground md:grid"><span>No</span><span>Item</span><span>Qty</span><span>Catatan</span><span /></div>
            {rows.map((row, index) => {
              const item = stockById.get(row.stock_item_id);
              const taken = new Set(rows.filter((r) => r.key !== row.key).map((r) => r.stock_item_id));
              return <div key={row.key} className="grid gap-2 rounded-md border bg-muted/20 p-2 md:grid-cols-[2rem_minmax(0,2.2fr)_9rem_minmax(0,1.6fr)_2.5rem] md:items-start md:border-0 md:bg-transparent md:p-0">
                <span className="pt-2 text-sm font-semibold text-muted-foreground">{index + 1}.</span>
                <div>
                  <select aria-label={`Item baris ${index + 1}`} className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={row.stock_item_id} onChange={(e) => updateRow(row.key, { stock_item_id: e.target.value, qty: "" })}>
                    <option value="">Pilih alat / material</option>
                    {(["Alat", "Material"] as const).map((jenis) => <optgroup key={jenis} label={jenis}>{stockItems.filter((s) => s.jenis === jenis).map((s) => <option key={s.id} value={String(s.id)} disabled={taken.has(String(s.id)) || (s.sisa_pengajuan <= 0 && String(s.id) !== row.stock_item_id)}>{s.nama_item}, sisa {s.sisa_pengajuan} {s.satuan}{taken.has(String(s.id)) ? " (sudah dipilih)" : ""}</option>)}</optgroup>)}
                  </select>
                  {item && <p className="mt-1 text-xs text-muted-foreground">Qty Total {item.qty_total} {item.satuan} · Sisa pengajuan <b>{item.sisa_pengajuan} {item.satuan}</b></p>}
                </div>
                <div>
                  <div className="flex items-center gap-1"><input aria-label={`Qty baris ${index + 1}`} className="h-10 w-full rounded-md border bg-background px-2 text-right text-sm" type="number" min="0" max={item?.sisa_pengajuan} disabled={!item} value={row.qty} onChange={(e) => setRowQty(row, e.target.value)} placeholder="0" /><span className="w-10 truncate text-xs text-muted-foreground">{item?.satuan}</span></div>
                  {rowErrors[index] && <p className="mt-1 text-xs text-red-600">{rowErrors[index]}</p>}
                </div>
                <input aria-label={`Catatan baris ${index + 1}`} className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={row.catatan} onChange={(e) => updateRow(row.key, { catatan: e.target.value })} placeholder="Spesifikasi / merk (opsional)" />
                <button type="button" aria-label={`Hapus baris ${index + 1}`} className="inline-flex h-10 w-10 items-center justify-center rounded-md border text-red-600 hover:bg-red-50" onClick={() => removeRow(row.key)}><Trash2 className="h-4 w-4" /></button>
              </div>;
            })}
            <button type="button" className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50" disabled={rows.length >= stockItems.length} onClick={() => setRows((prev) => [...prev, emptyRow()])}><Plus className="h-4 w-4" />Tambah Item</button>
            <label className="block space-y-1 text-sm font-medium">Catatan PB<textarea className="min-h-[72px] w-full rounded-md border bg-background px-3 py-2 text-sm font-normal" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Keperluan / kebutuhan tanggal (opsional)" /></label>
          </>}
      </div>}

      {projectId && stockItems.length > 0 && <div className="flex justify-end gap-2">
        {editingId && <Button type="button" variant="outline" onClick={resetForm}>Batal</Button>}
        <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60" disabled={save.isPending || !canSave} onClick={() => save.mutate()}><Save className="h-4 w-4" />{save.isPending ? "Menyimpan..." : editingId ? "Simpan Perubahan Draft" : "Simpan sebagai Draft"}</button>
      </div>}
    </div>

    : <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[1100px] text-sm"><thead className="bg-muted/50"><tr><th className="px-3 py-3 text-left">No. PB</th><th className="px-3 py-3 text-left">Projek</th><th className="px-3 py-3 text-left">Item</th><th className="px-3 py-3 text-left">Status</th><th className="px-3 py-3 text-left">Approval</th><th className="px-3 py-3 text-left">PR</th><th className="px-3 py-3 text-right">Aksi</th></tr></thead>
      <tbody className="divide-y">{(pbList.data ?? []).map((pb) => <tr key={pb.id} className="align-top">
        <td className="px-3 py-3 font-medium">{pb.nomor_pb}<div className="text-xs font-normal text-muted-foreground">{fmtDate(pb.created_at)}</div></td>
        <td className="px-3 py-3">{pb.project_name}<div className="text-xs text-muted-foreground">{pb.project_type === "interior" ? "Interior" : "Sipil"}</div></td>
        <td className="max-w-[300px] px-3 py-3"><ul className="space-y-0.5">{pb.items.map((i: any) => <li key={i.id}>{i.nama_item}: <b>{i.qty} {i.satuan}</b>{i.catatan && <span className="text-xs text-muted-foreground">, {i.catatan}</span>}</li>)}</ul></td>
        <td className="px-3 py-3"><PBStatusBadge status={pb.status} revisi={pb.status === "Draft" && Boolean(pb.catatan_review)} />{pb.catatan_review && ["Draft", "Ditolak"].includes(pb.status) && <div className="mt-1.5 max-w-[220px] rounded bg-orange-50 px-2 py-1 text-xs text-orange-800"><b>{pb.status === "Ditolak" ? "Alasan" : "Revisi"} ({pb.reviewer}):</b> {pb.catatan_review}</div>}</td>
        <td className="px-3 py-3 text-xs"><ApprovalLine label="Finance" name={pb.finance_approver} at={pb.finance_approved_at} /><ApprovalLine label="Super Admin" name={pb.sa_approver} at={pb.sa_approved_at} /></td>
        <td className="px-3 py-3">{pb.pr_id ? (pb.nomor_pr || "PR dibuat") : "-"}</td>
        <td className="px-3 py-3"><div className="flex justify-end gap-1">
          {pb.status === "Draft" && <>
            <button type="button" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted" onClick={() => startEdit(pb)}><Pencil className="h-3.5 w-3.5" />Edit</button>
            <button type="button" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50" onClick={() => setDeleteTarget(pb)}><Trash2 className="h-3.5 w-3.5" />Hapus</button>
            <button type="button" className="inline-flex items-center gap-1 rounded-md bg-orange-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-orange-600" onClick={() => { setSubmitChecked(false); setSubmitTarget(pb); }}><Send className="h-3.5 w-3.5" />Kirim ke Finance</button>
          </>}
          {["Diproses PR", "Sebagian Diterima"].includes(pb.status) && <button type="button" className="inline-flex min-h-10 items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white" onClick={() => setReceiveTarget(pb)}><PackageCheck className="h-3.5 w-3.5" />Catat Penerimaan</button>}
        </div></td>
      </tr>)}
      {pbList.isLoading && <tr><td colSpan={7} className="px-4 py-10 text-center">Memuat daftar PB...</td></tr>}
      {pbList.isError && <tr><td colSpan={7} className="px-4 py-10 text-center text-red-600">Gagal memuat daftar PB. <button type="button" className="underline" onClick={() => pbList.refetch()}>Coba lagi</button></td></tr>}
      {pbList.isSuccess && !(pbList.data ?? []).length && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Belum ada PB dari projek yang ditugaskan kepada Anda.</td></tr>}
      </tbody></table></div>}

    {/* Konfirmasi kedua: review isi PB sebelum dikirim ke Finance */}
    <Dialog open={Boolean(submitTarget)} onOpenChange={(open) => !open && setSubmitTarget(null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Kirim {submitTarget?.nomor_pb} ke Finance?</DialogTitle><DialogDescription>Periksa kembali item dan qty. Setelah dikirim, PB tidak bisa diedit kecuali Finance mengembalikannya untuk revisi.</DialogDescription></DialogHeader>
        <div className="space-y-2 text-sm"><div className="text-muted-foreground">Projek: <b className="text-foreground">{submitTarget?.project_name}</b></div>
          <div className="max-h-64 overflow-y-auto rounded-md border"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">Qty</th></tr></thead><tbody className="divide-y">{(submitTarget?.items ?? []).map((i: any) => <tr key={i.id}><td className="px-3 py-2">{i.nama_item}{i.catatan && <div className="text-xs text-muted-foreground">{i.catatan}</div>}</td><td className="px-3 py-2 text-right font-semibold">{i.qty} {i.satuan}</td></tr>)}</tbody></table></div>
          {submitTarget?.catatan && <p className="text-xs text-muted-foreground">Catatan: {submitTarget.catatan}</p>}
          <label className="flex items-start gap-2 rounded-md bg-muted/40 p-2"><input type="checkbox" className="mt-0.5" checked={submitChecked} onChange={(e) => setSubmitChecked(e.target.checked)} /><span>Saya sudah memeriksa item dan qty di atas sudah benar.</span></label>
        </div>
        <DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={() => { const pb = submitTarget; setSubmitTarget(null); startEdit(pb); }}><Pencil className="mr-1 h-4 w-4" />Edit dulu</Button><Button type="button" className="bg-orange-500 hover:bg-orange-600" disabled={!submitChecked || submit.isPending} onClick={() => submit.mutate(submitTarget.id)}><Send className="mr-1 h-4 w-4" />{submit.isPending ? "Mengirim..." : "Ya, Kirim ke Finance"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
      <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Hapus draft {deleteTarget?.nomor_pb}?</DialogTitle><DialogDescription>Draft yang dihapus tidak bisa dikembalikan.</DialogDescription></DialogHeader>
        <DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button><Button type="button" variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate(deleteTarget.id)}>Hapus</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <PBReceiveDialog pb={receiveTarget} pending={receive.isPending} onClose={() => setReceiveTarget(null)} onSubmit={(tanggal, items) => receiveTarget && receive.mutate({ id: receiveTarget.id, tanggal, items })} />
  </div>;
}

function ApprovalLine({ label, name, at }: { label: string; name?: string | null; at?: string | null }) {
  return <div className={`flex items-center gap-1 ${name ? "text-emerald-700" : "text-muted-foreground"}`}>{name ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="inline-block h-3.5 w-3.5 rounded-full border" />}<span>{label}{name ? `: ${name} · ${fmtDate(at)}` : ""}</span></div>;
}
