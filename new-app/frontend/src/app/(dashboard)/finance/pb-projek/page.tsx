"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { projectStockApi } from "@/lib/api/projectStock";

export default function FinancePBProjekPage() {
  const qc = useQueryClient();
  const rows = useQuery<any[]>({ queryKey: ["finance-pb-projek"], queryFn: () => apiClient.get("/project-stock/pb").then((r) => r.data), initialData: [] });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiClient.patch(`/project-stock/pb/${id}/status`, { status }),
    onSuccess: () => { toast.success("Status PB diperbarui"); qc.invalidateQueries({ queryKey: ["finance-pb-projek"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal memperbarui PB"),
  });
  const createPr = useMutation({
    mutationFn: (id: string) => projectStockApi.createPRFromPB(id),
    onSuccess: (result) => { toast.success(`PR ${result.nomor_pr} berhasil dibuat`); qc.invalidateQueries({ queryKey: ["finance-pb-projek"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal membuat PR dari PB"),
  });

  return <div className="space-y-5 p-4 md:p-6">
    <div><h1 className="flex items-center gap-2 text-2xl font-bold"><ClipboardCheck className="h-6 w-6 text-teal-600" /> PB Projek</h1><p className="mt-1 text-sm text-muted-foreground">Review PB per projek, setujui, lalu teruskan menjadi PR Administrasi Projek.</p></div>
    <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[1020px] text-sm"><thead className="bg-muted/50"><tr><th className="px-3 py-3 text-left">No. PB</th><th className="px-3 py-3 text-left">Projek</th><th className="px-3 py-3 text-left">Pengaju</th><th className="px-3 py-3 text-left">Item</th><th className="px-3 py-3 text-left">Status</th><th className="px-3 py-3 text-left">PR</th><th className="px-3 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y">
      {rows.data.map((pb) => <tr key={pb.id}><td className="px-3 py-3 font-medium">{pb.nomor_pb}</td><td className="px-3 py-3">{pb.project_type === "interior" ? "Interior" : "Sipil"} #{pb.project_id}</td><td className="px-3 py-3">{pb.creator || "-"}</td><td className="px-3 py-3">{pb.items.map((i: any) => `${i.nama_item} (${i.qty} ${i.satuan})`).join(", ")}</td><td className="px-3 py-3"><span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{pb.status}</span></td><td className="px-3 py-3">{pb.pr_id ? <span className="text-emerald-700">PR sudah dibuat</span> : "-"}</td><td className="px-3 py-3 text-right"><div className="flex justify-end gap-1">{pb.status === "Diajukan" && <><button type="button" className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white" disabled={update.isPending} onClick={() => update.mutate({ id: pb.id, status: "Disetujui" })}>Setujui</button><button type="button" className="rounded-md border px-2.5 py-1.5 text-xs font-semibold text-red-700" disabled={update.isPending} onClick={() => update.mutate({ id: pb.id, status: "Ditolak" })}>Tolak</button></>}{pb.status === "Disetujui" && !pb.pr_id && <button type="button" className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-semibold text-white" disabled={createPr.isPending} onClick={() => createPr.mutate(pb.id)}><FilePlus2 className="h-3.5 w-3.5" /> Buat PR</button>}</div></td></tr>)}
      {rows.isLoading && <tr><td colSpan={7} className="px-4 py-10 text-center">Memuat...</td></tr>}{!rows.isLoading && !rows.data.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Belum ada PB Projek.</td></tr>}
    </tbody></table></div>
  </div>;
}
