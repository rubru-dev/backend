"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { laporanPicApi } from "@/lib/api/laporanPic";
import { projectStockApi } from "@/lib/api/projectStock";

export default function PBProjekPage() {
  const qc = useQueryClient();
  const [projectType, setProjectType] = useState<"sipil" | "interior">("sipil");
  const [projectId, setProjectId] = useState("");
  const [qty, setQty] = useState<Record<string, string>>({});
  const projects = useQuery({ queryKey: ["pb-project-options", projectType], queryFn: () => laporanPicApi.projekOptions(projectType) });
  const stock = useQuery<any[]>({ queryKey: ["pb-stock-options", projectType, projectId], queryFn: () => projectStockApi.list(projectType, projectId), enabled: Boolean(projectId) });
  const pbs = useQuery<any[]>({ queryKey: ["pb-list", projectType, projectId], queryFn: () => projectStockApi.listPB(projectType, projectId), enabled: Boolean(projectId), initialData: [] });
  useEffect(() => { setProjectId(""); setQty({}); }, [projectType]);
  const create = useMutation({ mutationFn: () => projectStockApi.createPB(projectType, projectId, { items: (stock.data ?? []).filter((item) => Number(qty[item.id] || 0) > 0).map((item) => ({ stock_item_id: item.id, qty: Number(qty[item.id]) })) }), onSuccess: () => { toast.success("PB Projek berhasil diajukan"); setQty({}); qc.invalidateQueries({ queryKey: ["pb-list"] }); qc.invalidateQueries({ queryKey: ["pb-stock-options"] }); }, onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal mengajukan PB") });
  const rows = stock.data ?? [];
  return <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
    <div><h1 className="flex items-center gap-2 text-2xl font-bold"><PackagePlus className="h-6 w-6 text-orange-500" /> PB Projek</h1><p className="mt-1 text-sm text-muted-foreground">Ajukan kebutuhan alat atau material berdasarkan item Stock Opname projek.</p></div>
    <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2"><label className="space-y-1 text-sm font-medium">Jenis Projek<select className="h-10 w-full rounded-md border bg-background px-3 font-normal" value={projectType} onChange={(e) => setProjectType(e.target.value as "sipil" | "interior")}><option value="sipil">Projek Sipil</option><option value="interior">Projek Interior</option></select></label><label className="space-y-1 text-sm font-medium">Nama Projek<select className="h-10 w-full rounded-md border bg-background px-3 font-normal" value={projectId} onChange={(e) => { setProjectId(e.target.value); setQty({}); }}><option value="">Pilih projek</option>{(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}</select></label></div>
    {projectId && <><div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[720px] text-sm"><thead className="bg-muted/50"><tr><th className="px-3 py-3 text-left">Item</th><th className="px-3 py-3 text-left">Jenis</th><th className="px-3 py-3 text-right">Qty Total</th><th className="px-3 py-3 text-right">Sisa Pengajuan</th><th className="px-3 py-3 text-left">Qty PB</th></tr></thead><tbody className="divide-y">{rows.map((item) => <tr key={item.id}><td className="px-3 py-2 font-medium">{item.nama_item}</td><td className="px-3 py-2">{item.jenis}</td><td className="px-3 py-2 text-right">{item.qty_total} {item.satuan}</td><td className="px-3 py-2 text-right font-semibold">{item.sisa_pengajuan} {item.satuan}</td><td className="px-3 py-2"><input className="h-9 w-32 rounded-md border bg-background px-2 text-right" type="number" min="0" max={item.sisa_pengajuan} disabled={item.sisa_pengajuan <= 0} value={qty[item.id] ?? ""} onChange={(e) => setQty({ ...qty, [item.id]: e.target.value })} placeholder="0" /></td></tr>)}{rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Belum ada item Stock Opname pada projek ini.</td></tr>}</tbody></table></div><div className="flex justify-end"><button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60" disabled={create.isPending || !Object.values(qty).some((v) => Number(v) > 0)} onClick={() => create.mutate()}><Send className="h-4 w-4" /> Ajukan PB</button></div><div className="rounded-lg border p-4"><h2 className="mb-3 font-semibold">Histori PB Projek</h2>{(pbs.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Belum ada pengajuan.</p> : <div className="space-y-2">{pbs.data.map((pb) => <div key={pb.id} className="rounded-md bg-muted/30 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><b>{pb.nomor_pb}</b><span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{pb.status}</span></div><p className="mt-1 text-muted-foreground">{pb.items.map((i: any) => `${i.nama_item}: ${i.qty} ${i.satuan}`).join(" · ")}</p></div>)}</div>}</div></>}
  </div>;
}
