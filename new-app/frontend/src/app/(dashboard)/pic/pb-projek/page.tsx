"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, PackagePlus, Send } from "lucide-react";
import { toast } from "sonner";
import { laporanPicApi } from "@/lib/api/laporanPic";
import { projectStockApi } from "@/lib/api/projectStock";

type ProjectType = "sipil" | "interior";

export default function PBProjekPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"request" | "list">("request");
  const [projectType, setProjectType] = useState<ProjectType>("sipil");
  const [projectId, setProjectId] = useState("");
  const [qty, setQty] = useState<Record<string, string>>({});
  const projects = useQuery({ queryKey: ["pb-project-options", projectType], queryFn: () => laporanPicApi.projekOptions(projectType) });
  const stock = useQuery<any[]>({ queryKey: ["pb-stock-options", projectType, projectId], queryFn: () => projectStockApi.list(projectType, projectId), enabled: Boolean(projectId) });
  const pbList = useQuery<any[]>({ queryKey: ["pb-list-all"], queryFn: projectStockApi.listPBAll, enabled: tab === "list", initialData: [] });

  useEffect(() => { setProjectId(""); setQty({}); }, [projectType]);

  const create = useMutation({
    mutationFn: () => projectStockApi.createPB(projectType, projectId, { items: (stock.data ?? []).filter((item) => Number(qty[item.id] || 0) > 0).map((item) => ({ stock_item_id: item.id, qty: Number(qty[item.id]) })) }),
    onSuccess: () => { toast.success("PB Projek berhasil diajukan ke Finance"); setQty({}); qc.invalidateQueries({ queryKey: ["pb-list-all"] }); qc.invalidateQueries({ queryKey: ["pb-stock-options"] }); setTab("list"); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal mengajukan PB"),
  });

  const rows = stock.data ?? [];
  return <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
    <div><h1 className="flex items-center gap-2 text-2xl font-bold"><PackagePlus className="h-6 w-6 text-orange-500" /> PB Projek</h1><p className="mt-1 text-sm text-muted-foreground">Ajukan kebutuhan alat atau material untuk projek yang ditugaskan kepada Anda.</p></div>
    <div className="flex gap-1 border-b" role="tablist" aria-label="Menu PB Projek">
      <button type="button" role="tab" aria-selected={tab === "request"} className={`border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === "request" ? "border-orange-500 text-orange-600" : "border-transparent text-muted-foreground"}`} onClick={() => setTab("request")}><PackagePlus className="mr-1.5 inline h-4 w-4" />Request PB</button>
      <button type="button" role="tab" aria-selected={tab === "list"} className={`border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === "list" ? "border-orange-500 text-orange-600" : "border-transparent text-muted-foreground"}`} onClick={() => setTab("list")}><ClipboardList className="mr-1.5 inline h-4 w-4" />Daftar PB</button>
    </div>
    {tab === "request" ? <>
      <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2"><label className="space-y-1 text-sm font-medium">Jenis Projek<select className="h-10 w-full rounded-md border bg-background px-3 font-normal" value={projectType} onChange={(e) => setProjectType(e.target.value as ProjectType)}><option value="sipil">Projek Sipil</option><option value="interior">Projek Interior</option></select></label><label className="space-y-1 text-sm font-medium">Nama Projek<select className="h-10 w-full rounded-md border bg-background px-3 font-normal" value={projectId} onChange={(e) => { setProjectId(e.target.value); setQty({}); }}><option value="">Pilih projek yang ditugaskan</option>{(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}</select></label></div>
      {projectId && <><div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[720px] text-sm"><thead className="bg-muted/50"><tr><th className="px-3 py-3 text-left">Item</th><th className="px-3 py-3 text-left">Jenis</th><th className="px-3 py-3 text-right">Qty Total</th><th className="px-3 py-3 text-right">Sisa Pengajuan</th><th className="px-3 py-3 text-left">Qty PB</th></tr></thead><tbody className="divide-y">{rows.map((item) => <tr key={item.id}><td className="px-3 py-2 font-medium">{item.nama_item}</td><td className="px-3 py-2">{item.jenis}</td><td className="px-3 py-2 text-right">{item.qty_total} {item.satuan}</td><td className="px-3 py-2 text-right font-semibold">{item.sisa_pengajuan} {item.satuan}</td><td className="px-3 py-2"><input className="h-9 w-32 rounded-md border bg-background px-2 text-right" type="number" min="0" max={item.sisa_pengajuan} disabled={item.sisa_pengajuan <= 0} value={qty[item.id] ?? ""} onChange={(e) => setQty({ ...qty, [item.id]: e.target.value })} placeholder="0" /></td></tr>)}{rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Belum ada item Stock Opname pada projek ini.</td></tr>}</tbody></table></div><div className="flex justify-end"><button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60" disabled={create.isPending || !Object.values(qty).some((v) => Number(v) > 0)} onClick={() => create.mutate()}><Send className="h-4 w-4" />Ajukan PB ke Finance</button></div></>}
    </> : <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[980px] text-sm"><thead className="bg-muted/50"><tr><th className="px-3 py-3 text-left">No. PB</th><th className="px-3 py-3 text-left">Projek</th><th className="px-3 py-3 text-left">Item</th><th className="px-3 py-3 text-left">Tanggal</th><th className="px-3 py-3 text-left">Status</th><th className="px-3 py-3 text-left">PR</th></tr></thead><tbody className="divide-y">{(pbList.data ?? []).map((pb) => <tr key={pb.id}><td className="px-3 py-3 font-medium">{pb.nomor_pb}</td><td className="px-3 py-3">{pb.project_name}<div className="text-xs text-muted-foreground">{pb.project_type === "interior" ? "Interior" : "Sipil"}</div></td><td className="px-3 py-3">{pb.items.map((i: any) => `${i.nama_item}: ${i.qty} ${i.satuan}`).join(", ")}</td><td className="px-3 py-3">{pb.created_at ? new Date(pb.created_at).toLocaleDateString("id-ID") : "-"}</td><td className="px-3 py-3">{pb.status}</td><td className="px-3 py-3">{pb.pr_id ? "PR dibuat" : "Belum dibuat"}</td></tr>)}{pbList.isLoading && <tr><td colSpan={6} className="px-4 py-10 text-center">Memuat daftar PB...</td></tr>}{!pbList.isLoading && !(pbList.data ?? []).length && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Belum ada PB dari projek yang ditugaskan kepada Anda.</td></tr>}</tbody></table></div>}
  </div>;
}
