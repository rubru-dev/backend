"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, ExternalLink, FilePlus2, PackageCheck, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { projectStockApi } from "@/lib/api/projectStock";
import { PBStatusBadge, PB_STATUS_OPTIONS } from "@/components/pb-status-badge";
import { useAuthStore } from "@/store/authStore";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PBReceiveDialog } from "@/components/pb-receive-dialog";

const fmtDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-");
const prLink = (admId: string) => `/finance/administrasi-projek?proyek=${admId}&tab=pr`;

type ReviewAction = { pb: any; status: "Ditolak" | "Draft" };

export default function FinancePBProjekPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const isFinance = useAuthStore((state) => state.hasPermission("finance", "pb_projek"));
  const canAccess = isSuperAdmin || isFinance;
  const canReceive = useAuthStore((state) => state.isSuperAdmin() || state.hasPermission("project_stock", "receive"));

  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [review, setReview] = useState<ReviewAction | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [approveTarget, setApproveTarget] = useState<{ pb: any; status: "Disetujui Finance" | "Disetujui" } | null>(null);
  const [receiveTarget, setReceiveTarget] = useState<any | null>(null);

  // Jangan pakai initialData: dengan staleTime global 60 detik, initialData kosong
  // dianggap fresh sehingga PB dari PIC tidak pernah diambil dari server.
  const rows = useQuery<any[]>({ queryKey: ["finance-pb-projek"], queryFn: projectStockApi.listPBAll, enabled: hasHydrated && canAccess, staleTime: 0 });
  const refresh = () => { for (const key of ["finance-pb-projek", "pb-list-all", "project-pb", "project-stock", "pb-stock-options"]) qc.invalidateQueries({ queryKey: [key] }); };
  const onError = (fallback: string) => (e: any) => { toast.error(e?.response?.data?.detail || fallback); refresh(); };

  const update = useMutation({
    mutationFn: ({ id, status, catatan }: { id: string; status: string; catatan?: string }) => projectStockApi.updatePBStatus(id, status, catatan),
    onSuccess: (_r, v) => {
      toast.success(v.status === "Disetujui Finance" ? "PB disetujui Finance, menunggu Super Admin" : v.status === "Disetujui" ? "PB disetujui Super Admin, siap dibuat PR" : v.status === "Ditolak" ? "PB ditolak" : "PB dikembalikan ke PIC untuk revisi");
      setReview(null); setApproveTarget(null); refresh();
    },
    onError: onError("Gagal memperbarui PB"),
  });
  const createPr = useMutation({
    mutationFn: (id: string) => projectStockApi.createPRFromPB(id),
    onSuccess: (result) => { toast.success(`PR ${result.nomor_pr} berhasil dibuat`); refresh(); router.push(prLink(result.adm_finance_project_id)); },
    onError: onError("Gagal membuat PR dari PB"),
  });
  const receive = useMutation({
    mutationFn: ({ id, tanggal, items, requestId }: { id: string; tanggal: string; items: { pb_item_id: string; qty: number }[]; requestId: string }) => projectStockApi.receivePB(id, tanggal, items, requestId),
    onSuccess: () => { toast.success("Barang diterima, Barang Masuk tercatat di Stock Opname"); setReceiveTarget(null); refresh(); },
    onError: onError("Gagal mencatat penerimaan barang"),
  });
  const busy = update.isPending || createPr.isPending || receive.isPending;

  const data = rows.data ?? [];
  const projects = useMemo(() => [...new Set(data.map((pb) => pb.project_name).filter(Boolean))].sort(), [data]);
  const filtered = data.filter((pb) => (!projectFilter || pb.project_name === projectFilter) && (!statusFilter || pb.status === statusFilter));
  const counts = {
    finance: data.filter((pb) => pb.status === "Diajukan").length,
    sa: data.filter((pb) => pb.status === "Disetujui Finance" || (pb.status === "Disetujui" && !pb.sa_approved_at)).length,
    pr: data.filter((pb) => pb.status === "Disetujui" && pb.sa_approved_at && !pb.pr_id).length,
  };

  const openReview = (pb: any, status: ReviewAction["status"]) => { setReviewNote(""); setReview({ pb, status }); };

  const actions = (pb: any) => {
    const canReview = ["Diajukan", "Disetujui Finance", "Disetujui"].includes(pb.status) && !pb.pr_id;
    const needsSa = pb.status === "Disetujui Finance" || (pb.status === "Disetujui" && !pb.sa_approved_at);
    return <div className="flex flex-wrap justify-end gap-1">
      {pb.status === "Diajukan" && (isFinance
        ? <button type="button" className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60" disabled={busy} onClick={() => setApproveTarget({ pb, status: "Disetujui Finance" })}><CheckCircle2 className="h-3.5 w-3.5" />Setujui (Finance)</button>
        : <span className="self-center text-xs text-muted-foreground">Menunggu Finance</span>)}
      {needsSa && (isSuperAdmin
        ? <button type="button" className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60" disabled={busy} onClick={() => setApproveTarget({ pb, status: "Disetujui" })}><ShieldCheck className="h-3.5 w-3.5" />Setujui (Super Admin)</button>
        : <span className="self-center text-xs text-muted-foreground">Menunggu Super Admin</span>)}
      {pb.status === "Disetujui" && pb.sa_approved_at && !pb.pr_id && <button type="button" className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60" disabled={busy} onClick={() => createPr.mutate(pb.id)}><FilePlus2 className="h-3.5 w-3.5" />{createPr.isPending && createPr.variables === pb.id ? "Membuat PR..." : "Buat PR"}</button>}
      {canReview && <>
        <button type="button" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-60" disabled={busy} onClick={() => openReview(pb, "Draft")}><RotateCcw className="h-3.5 w-3.5" />Minta Revisi</button>
        <button type="button" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60" disabled={busy} onClick={() => openReview(pb, "Ditolak")}><XCircle className="h-3.5 w-3.5" />Tolak</button>
      </>}
      {canReceive && ["Diproses PR", "Sebagian Diterima"].includes(pb.status) && (pb.pr_ready_to_receive
        ? <button type="button" className="inline-flex min-h-11 items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60" disabled={busy} onClick={() => setReceiveTarget(pb)}><PackageCheck className="h-3.5 w-3.5" />Catat Penerimaan</button>
        : <span className="max-w-44 self-center text-right text-xs text-muted-foreground">Menunggu PR disetujui dan ditandatangani Head Finance</span>)}
      {pb.pr_id && pb.adm_finance_project_id && <Link href={prLink(pb.adm_finance_project_id)} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"><ExternalLink className="h-3.5 w-3.5" />Lihat PR</Link>}
    </div>;
  };

  if (!hasHydrated) return <div role="status" className="rounded-lg border bg-background p-6 text-sm text-muted-foreground">Memeriksa akses PB Projek...</div>;
  if (!canAccess) return <div role="alert" className="rounded-lg border bg-background p-6 text-sm text-muted-foreground">Anda tidak memiliki akses PB Projek Finance. Hubungi Super Admin untuk mengaktifkan permission.</div>;

  return <div className="space-y-5 p-4 md:p-6">
    <div><h1 className="flex items-center gap-2 text-2xl font-bold"><ClipboardCheck className="h-6 w-6 text-teal-600" /> PB Projek</h1><p className="mt-1 text-sm text-muted-foreground">PB dari PIC disetujui Finance, lalu Super Admin, baru bisa dibuat menjadi PR.</p></div>

    <div className="grid gap-3 sm:grid-cols-3">
      {[{ label: "Menunggu Finance", value: counts.finance, status: "Diajukan" }, { label: "Menunggu Super Admin", value: counts.sa, status: "Disetujui Finance" }, { label: "Siap Dibuat PR", value: counts.pr, status: "Disetujui" }].map((c) => <button key={c.label} type="button" onClick={() => setStatusFilter(statusFilter === c.status ? "" : c.status)} className={`rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/40 ${statusFilter === c.status ? "border-teal-500 ring-1 ring-teal-500" : ""}`}><div className="text-xs text-muted-foreground">{c.label}</div><div className="text-2xl font-bold">{c.value}</div></button>)}
    </div>

    <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2"><label className="space-y-1 text-sm font-medium">Filter Projek<select className="h-10 w-full rounded-md border bg-background px-3 font-normal" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}><option value="">Semua projek</option>{projects.map((name) => <option key={name} value={name}>{name}</option>)}</select></label><label className="space-y-1 text-sm font-medium">Filter Status<select className="h-10 w-full rounded-md border bg-background px-3 font-normal" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">Semua status</option>{PB_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status === "Disetujui" ? "Disetujui Super Admin" : status}</option>)}</select></label></div>

    <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[1240px] text-sm"><thead className="bg-muted/50"><tr><th className="px-3 py-3 text-left">No. PB</th><th className="px-3 py-3 text-left">Nama Projek</th><th className="px-3 py-3 text-left">PIC / Pengaju</th><th className="px-3 py-3 text-left">Item</th><th className="px-3 py-3 text-left">Status PB</th><th className="px-3 py-3 text-left">Approval</th><th className="px-3 py-3 text-left">PR</th><th className="px-3 py-3 text-right">Aksi</th></tr></thead>
      <tbody className="divide-y">{filtered.map((pb) => <tr key={pb.id} className="align-top">
        <td className="px-3 py-3 font-medium">{pb.nomor_pb}<div className="text-xs font-normal text-muted-foreground">{pb.submitted_at ? "Dikirim" : "Disimpan"} {fmtDate(pb.submitted_at ?? pb.created_at)}</div></td>
        <td className="px-3 py-3"><div className="font-medium">{pb.project_name}</div><div className="text-xs text-muted-foreground">{pb.project_type === "interior" ? "Interior" : "Sipil"} · #{pb.project_id}</div></td>
        <td className="px-3 py-3">{(pb.pic_names ?? []).join(", ") || "-"}<div className="text-xs text-muted-foreground">Pengaju: {pb.creator || "-"}</div></td>
        <td className="max-w-[300px] px-3 py-3"><ul className="space-y-0.5">{pb.items.map((i: any) => <li key={i.id}>{i.nama_item}: <b>{i.qty} {i.satuan}</b>{i.catatan && <span className="text-xs text-muted-foreground">, {i.catatan}</span>}</li>)}</ul>{pb.catatan && <div className="mt-1 text-xs text-muted-foreground">Catatan: {pb.catatan}</div>}</td>
        <td className="px-3 py-3"><PBStatusBadge status={pb.status} />{pb.status === "Ditolak" && pb.catatan_review && <div className="mt-1.5 max-w-[200px] rounded bg-red-50 px-2 py-1 text-xs text-red-800"><b>Alasan ({pb.reviewer}):</b> {pb.catatan_review}</div>}</td>
        <td className="px-3 py-3 text-xs"><ApprovalLine label="Finance" name={pb.finance_approver} at={pb.finance_approved_at} /><ApprovalLine label="Super Admin" name={pb.sa_approver} at={pb.sa_approved_at} /></td>
        <td className="px-3 py-3">{pb.pr_id ? <><div className="font-medium">{pb.nomor_pr || "PR sudah dibuat"}</div>{pb.pr_status && <div className="text-xs text-muted-foreground">{pb.pr_status}</div>}</> : <span className="text-muted-foreground">Belum dibuat</span>}</td>
        <td className="px-3 py-3">{actions(pb)}</td>
      </tr>)}
      {rows.isLoading && <tr><td colSpan={8} className="px-4 py-10 text-center">Memuat daftar PB...</td></tr>}
      {rows.isError && <tr><td colSpan={8} className="px-4 py-10 text-center text-red-600">Gagal memuat daftar PB. <button type="button" className="underline" onClick={() => rows.refetch()}>Coba lagi</button></td></tr>}
      {rows.isSuccess && !filtered.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Belum ada PB yang sesuai filter.</td></tr>}
      </tbody></table></div>

    <Dialog open={Boolean(approveTarget)} onOpenChange={(open) => !open && setApproveTarget(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{approveTarget?.status === "Disetujui" ? "Approval Super Admin" : "Approval Finance"}: {approveTarget?.pb.nomor_pb}</DialogTitle><DialogDescription>{approveTarget?.status === "Disetujui" ? "Setelah disetujui Super Admin, Finance bisa membuat PR dari PB ini." : "Setelah disetujui Finance, PB diteruskan ke Super Admin untuk approval final."}</DialogDescription></DialogHeader>
        <div className="max-h-64 overflow-y-auto rounded-md border text-sm"><table className="w-full"><tbody className="divide-y">{(approveTarget?.pb.items ?? []).map((i: any) => <tr key={i.id}><td className="px-3 py-2">{i.nama_item}{i.catatan && <div className="text-xs text-muted-foreground">{i.catatan}</div>}</td><td className="px-3 py-2 text-right font-semibold">{i.qty} {i.satuan}</td></tr>)}</tbody></table></div>
        <DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={() => setApproveTarget(null)}>Batal</Button><Button type="button" className={approveTarget?.status === "Disetujui" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-emerald-600 hover:bg-emerald-700"} disabled={update.isPending} onClick={() => approveTarget && update.mutate({ id: approveTarget.pb.id, status: approveTarget.status })}>{update.isPending ? "Menyimpan..." : "Setujui"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(review)} onOpenChange={(open) => !open && setReview(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{review?.status === "Ditolak" ? "Tolak" : "Minta Revisi"} {review?.pb.nomor_pb}</DialogTitle><DialogDescription>{review?.status === "Ditolak" ? "PB dibatalkan dan kuota item dikembalikan. PIC perlu membuat PB baru." : "PB dikembalikan ke PIC sebagai Draft untuk diperbaiki, lalu dikirim ulang. Approval sebelumnya akan direset."}</DialogDescription></DialogHeader>
        <label className="block space-y-1 text-sm font-medium">{review?.status === "Ditolak" ? "Alasan penolakan" : "Yang perlu diperbaiki"} <span className="text-red-600">*</span><textarea autoFocus className="min-h-[96px] w-full rounded-md border bg-background px-3 py-2 text-sm font-normal" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder={review?.status === "Ditolak" ? "Contoh: barang sudah tersedia di gudang" : "Contoh: qty semen terlalu banyak, maksimal 20 sak"} /></label>
        <DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={() => setReview(null)}>Batal</Button><Button type="button" variant={review?.status === "Ditolak" ? "destructive" : "default"} className={review?.status === "Draft" ? "bg-orange-500 hover:bg-orange-600" : undefined} disabled={!reviewNote.trim() || update.isPending} onClick={() => review && update.mutate({ id: review.pb.id, status: review.status, catatan: reviewNote.trim() })}>{update.isPending ? "Menyimpan..." : review?.status === "Ditolak" ? "Tolak PB" : "Kembalikan ke PIC"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <PBReceiveDialog pb={receiveTarget} pending={receive.isPending} onClose={() => setReceiveTarget(null)} onSubmit={(tanggal, items, requestId) => receiveTarget && receive.mutate({ id: receiveTarget.id, tanggal, items, requestId })} />
  </div>;
}

function ApprovalLine({ label, name, at }: { label: string; name?: string | null; at?: string | null }) {
  return <div className={`flex items-center gap-1 ${name ? "text-emerald-700" : "text-muted-foreground"}`}>{name ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="inline-block h-3.5 w-3.5 rounded-full border" />}<span>{label}{name ? `: ${name} · ${fmtDate(at)}` : ""}</span></div>;
}
