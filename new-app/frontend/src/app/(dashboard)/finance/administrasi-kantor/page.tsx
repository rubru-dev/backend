"use client";

import React, { useState, useRef } from "react";
import { getLogoBase64 } from "@/lib/get-logo";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";

import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea as TextareaUI } from "@/components/ui/textarea";
import { SignatureDialog } from "@/components/signature-dialog";
import { ReimbursePDF, ReimburseBulkPDF } from "@/components/reimburse-pdf";
import {
  Plus, Folder, Trash2, CheckCircle2, XCircle, Clock,
  PenLine, Download, AlertCircle, Upload, X, FileDown,
  Camera, ClipboardCheck, CheckCircle, MapPin, Loader2, Eye,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────
function formatRp(val: number | string) {
  return "Rp " + (Number(val) || 0).toLocaleString("id-ID");
}
const today = new Date().toISOString().split("T")[0];

const BULAN_OPTIONS = [
  { value: "1", label: "Januari" }, { value: "2", label: "Februari" },
  { value: "3", label: "Maret" }, { value: "4", label: "April" },
  { value: "5", label: "Mei" }, { value: "6", label: "Juni" },
  { value: "7", label: "Juli" }, { value: "8", label: "Agustus" },
  { value: "9", label: "September" }, { value: "10", label: "Oktober" },
  { value: "11", label: "November" }, { value: "12", label: "Desember" },
];

const _cy = new Date().getFullYear();
const TAHUN_OPTIONS = Array.from({ length: 5 }, (_, i) => String(_cy - i));

// ── API ───────────────────────────────────────────────────────────────────────
const reimburseApi = {
  users: () => apiClient.get("/finance/reimburse/users").then((r) => r.data),
  list: (params?: any) => apiClient.get("/finance/reimburse", { params }).then((r) => r.data),
  create: (data: any) => apiClient.post("/finance/reimburse", data).then((r) => r.data),
  signHead: (id: number, signature_data: string) =>
    apiClient.post(`/finance/reimburse/${id}/sign-head`, { signature_data }).then((r) => r.data),
  signAdmin: (id: number, signature_data: string) =>
    apiClient.post(`/finance/reimburse/${id}/sign-admin`, { signature_data }).then((r) => r.data),
  reject: (id: number, alasan: string) =>
    apiClient.post(`/finance/reimburse/${id}/reject`, { alasan }).then((r) => r.data),
  delete: (id: number) => apiClient.delete(`/finance/reimburse/${id}`).then((r) => r.data),
};

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; variant: any; icon: any }> = {
  Pending:   { label: "Pending",   variant: "secondary",    icon: Clock },
  Disetujui: { label: "Disetujui", variant: "default",      icon: CheckCircle2 },
  Ditolak:   { label: "Ditolak",   variant: "destructive",  icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status, variant: "outline", icon: Clock };
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">
      <Icon className="h-3 w-3" /> {cfg.label}
    </Badge>
  );
}

function SignBadge({ signed, name, at }: { signed: boolean; name?: string; at?: string }) {
  if (signed) return (
    <div className="flex items-center gap-1 text-xs text-green-700">
      <CheckCircle2 className="h-3.5 w-3.5" />
      <span className="font-medium">{name}</span>
      <span className="text-muted-foreground">· {at ? new Date(at).toLocaleDateString("id-ID") : ""}</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1 text-xs text-amber-600">
      <AlertCircle className="h-3.5 w-3.5" />
      <span>Belum ditandatangani</span>
    </div>
  );
}

// ── Item list form ─────────────────────────────────────────────────────────────
function ItemsForm({ items, setItems }: { items: any[]; setItems: (v: any[]) => void }) {
  const upd = (idx: number, key: string, val: any) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, [key]: val } : it)));
  const total = items.reduce((s, it) => s + (Number(it.jumlah) || 0), 0);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_140px_32px] gap-2 text-xs text-muted-foreground font-medium px-1">
        <span>Keterangan Bon</span><span>Jumlah (Rp)</span><span />
      </div>
      {items.map((item, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_140px_32px] gap-2">
          <Input placeholder="cth: Bensin, Makan siang, dll" value={item.deskripsi}
            onChange={e => upd(idx, "deskripsi", e.target.value)} />
          <Input type="number" min={0} value={item.jumlah}
            onChange={e => upd(idx, "jumlah", e.target.value)} />
          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive"
            disabled={items.length === 1}
            onClick={() => setItems(items.filter((_, i) => i !== idx))}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm"
        onClick={() => setItems([...items, { deskripsi: "", jumlah: 0 }])}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Bon
      </Button>
      <div className="flex justify-end pt-2 border-t">
        <span className="font-semibold">Total: {formatRp(total)}</span>
      </div>
    </div>
  );
}

// ── Bukti upload form ──────────────────────────────────────────────────────────
function BuktiForm({ buktis, setBuktis }: { buktis: any[]; setBuktis: (v: any[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setBuktis([...buktis, { data: reader.result as string, nama: file.name }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <label className="block border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:border-orange-400 transition-colors">
        <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground">Klik upload foto / struk bon (bisa lebih dari satu)</p>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg" multiple className="hidden"
          onChange={handleFile} />
      </label>
      {buktis.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {buktis.map((b, i) => (
            <div key={i} className="relative border rounded-md overflow-hidden w-20 h-20 bg-muted/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.data} alt={b.nama} className="w-full h-full object-cover" />
              <button
                className="absolute top-0 right-0 bg-red-500 text-white rounded-bl px-1 py-0.5 text-xs"
                onClick={() => setBuktis(buktis.filter((_, j) => j !== i))}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Absen Status helpers ──────────────────────────────────────────────────────
const ABSEN_STATUS_MAP: Record<string, { label: string; color: string }> = {
  Hadir:     { label: "Hadir",             color: "bg-green-100 text-green-700 border-green-200" },
  Terlambat: { label: "Terlambat",         color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  Pending:   { label: "Menunggu Approval", color: "bg-blue-100 text-blue-700 border-blue-200" },
  Disetujui: { label: "Disetujui",         color: "bg-green-100 text-green-700 border-green-200" },
  Ditolak:   { label: "Ditolak",           color: "bg-red-100 text-red-700 border-red-200" },
};

function AbsenStatusBadge({ status }: { status: string }) {
  const s = ABSEN_STATUS_MAP[status] ?? { label: status, color: "bg-gray-100 text-gray-600 border-gray-200" };
  return <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>;
}

function fmtJam(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function fmtTgl(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

// ── AbsenKaryawanTab ──────────────────────────────────────────────────────────
function AbsenKaryawanTab({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const [filterUser, setFilterUser]   = useState("");
  const [filterTgl, setFilterTgl]     = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [photoDialog, setPhotoDialog] = useState<{ masuk?: string; keluar?: string; name?: string } | null>(null);
  const [rejectOpen, setRejectOpen]   = useState<{ id: number; catatan: string } | null>(null);

  const { data: karyawanList } = useQuery({
    queryKey: ["absen-karyawan-list"],
    queryFn: () => apiClient.get("/absen-karyawan/admin/karyawan-list").then(r => r.data as any[]),
    enabled: canManage,
  });

  const { data: absenData, isLoading } = useQuery({
    queryKey: ["adm-kantor-absen", filterUser, filterTgl, filterStatus],
    queryFn: () => apiClient.get("/absen-karyawan/admin/list", {
      params: {
        ...(filterUser ? { user_id: filterUser } : {}),
        ...(filterTgl ? { tanggal: filterTgl } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
        limit: 50,
      }
    }).then(r => r.data),
    enabled: canManage,
  });

  const { data: pendingData } = useQuery({
    queryKey: ["adm-kantor-absen-pending"],
    queryFn: () => apiClient.get("/absen-karyawan/admin/pending").then(r => r.data as any[]),
    enabled: canManage,
    refetchInterval: 30000,
  });

  const approveMut = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/absen-karyawan/admin/${id}/approve`).then(r => r.data),
    onSuccess: () => {
      toast.success("Absen disetujui");
      qc.invalidateQueries({ queryKey: ["adm-kantor-absen"] });
      qc.invalidateQueries({ queryKey: ["adm-kantor-absen-pending"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menyetujui"),
  });

  const rejectMutAbsen = useMutation({
    mutationFn: ({ id, catatan }: { id: number; catatan: string }) =>
      apiClient.patch(`/absen-karyawan/admin/${id}/reject`, { catatan_reject: catatan }).then(r => r.data),
    onSuccess: () => {
      toast.success("Absen ditolak");
      qc.invalidateQueries({ queryKey: ["adm-kantor-absen"] });
      qc.invalidateQueries({ queryKey: ["adm-kantor-absen-pending"] });
      setRejectOpen(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menolak"),
  });

  const records: any[] = Array.isArray(absenData) ? absenData : absenData?.data ?? [];
  const pending: any[] = Array.isArray(pendingData) ? pendingData : [];

  if (!canManage) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <ClipboardCheck className="mx-auto h-10 w-10 opacity-20 mb-3" />
        <p>Hanya Head Finance dan Super Admin yang dapat melihat data absen karyawan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Pending approvals */}
      {pending.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="pt-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-blue-700">
              <Clock className="h-4 w-4" /> Menunggu Persetujuan ({pending.length})
            </h3>
            <div className="space-y-2">
              {pending.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between gap-3 bg-white rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.user?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtTgl(p.tanggal)} · Masuk {fmtJam(p.jam_masuk)}
                      {p.alasan_luar && <span className="ml-2 text-blue-600">"{p.alasan_luar}"</span>}
                    </p>
                    {p.jarak != null && (
                      <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {Math.round(p.jarak)}m dari kantor
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {p.foto_masuk && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                        onClick={() => setPhotoDialog({ masuk: p.foto_masuk, keluar: p.foto_keluar, name: p.user?.name })}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700 gap-1"
                      disabled={approveMut.isPending}
                      onClick={() => approveMut.mutate(p.id)}>
                      <CheckCircle className="h-3.5 w-3.5" /> Setujui
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-destructive border-destructive/30 gap-1"
                      onClick={() => setRejectOpen({ id: p.id, catatan: "" })}>
                      <XCircle className="h-3.5 w-3.5" /> Tolak
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <select className="border rounded-md px-3 py-2 text-sm" value={filterUser}
          onChange={e => setFilterUser(e.target.value)}>
          <option value="">Semua Karyawan</option>
          {(karyawanList ?? []).map((u: any) => (
            <option key={u.id} value={String(u.id)}>{u.name}</option>
          ))}
        </select>
        <Input type="date" className="h-9 text-sm w-40" value={filterTgl}
          onChange={e => setFilterTgl(e.target.value)} />
        <select className="border rounded-md px-3 py-2 text-sm" value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="Hadir">Hadir</option>
          <option value="Terlambat">Terlambat</option>
          <option value="Pending">Pending</option>
          <option value="Disetujui">Disetujui</option>
          <option value="Ditolak">Ditolak</option>
        </select>
        {(filterUser || filterTgl || filterStatus) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterUser(""); setFilterTgl(""); setFilterStatus(""); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Reset
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Karyawan</TableHead>
                <TableHead>Jam Masuk</TableHead>
                <TableHead>Jam Keluar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : records.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-sm">{fmtTgl(r.tanggal)}</TableCell>
                      <TableCell className="font-medium text-sm">{r.user?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{fmtJam(r.jam_masuk)}</TableCell>
                      <TableCell className="text-sm">{fmtJam(r.jam_keluar)}</TableCell>
                      <TableCell><AbsenStatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.di_luar_kantor
                          ? <span className="flex items-center gap-1 text-amber-600"><MapPin className="h-3 w-3" />Luar ({Math.round(r.jarak ?? 0)}m)</span>
                          : r.jarak != null
                            ? <span className="flex items-center gap-1 text-green-600"><MapPin className="h-3 w-3" />Dalam ({Math.round(r.jarak)}m)</span>
                            : "—"
                        }
                      </TableCell>
                      <TableCell>
                        {(r.foto_masuk || r.foto_keluar) && (
                          <Button size="sm" variant="ghost" className="h-7 gap-1"
                            onClick={() => setPhotoDialog({ masuk: r.foto_masuk, keluar: r.foto_keluar, name: r.user?.name })}>
                            <Camera className="h-3.5 w-3.5" /> Foto
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
              }
              {!isLoading && records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <ClipboardCheck className="mx-auto h-10 w-10 opacity-20 mb-3" />
                    <p>Belum ada data absen</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Photo Dialog */}
      <Dialog open={!!photoDialog} onOpenChange={v => { if (!v) setPhotoDialog(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" /> Foto Absen — {photoDialog?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Foto Masuk</p>
              {photoDialog?.masuk
                ? <img src={photoDialog.masuk} alt="foto masuk" className="w-full rounded-lg border" />
                : <div className="h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-xs">Belum ada foto</div>
              }
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Foto Keluar</p>
              {photoDialog?.keluar
                ? <img src={photoDialog.keluar} alt="foto keluar" className="w-full rounded-lg border" />
                : <div className="h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-xs">Belum ada foto</div>
              }
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectOpen} onOpenChange={v => { if (!v) setRejectOpen(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" /> Tolak Absen Luar Kantor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Catatan Penolakan</Label>
              <TextareaUI rows={3} placeholder="Alasan penolakan..."
                value={rejectOpen?.catatan ?? ""}
                onChange={e => setRejectOpen(prev => prev ? { ...prev, catatan: e.target.value } : null)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectOpen(null)}>Batal</Button>
              <Button variant="destructive" disabled={rejectMutAbsen.isPending}
                onClick={() => rejectOpen && rejectMutAbsen.mutate({ id: rejectOpen.id, catatan: rejectOpen.catatan })}>
                {rejectMutAbsen.isPending ? "Memproses..." : "Tolak"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdministrasiKantorPage() {
  const qc = useQueryClient();
  const { user, isSuperAdmin, hasPermission } = useAuthStore();
  const isPrivileged    = isSuperAdmin() || hasPermission("finance", "reimburse_all");
  const canSignHead     = isSuperAdmin() || hasPermission("finance", "sign_head");
  const canSignAdmin    = isSuperAdmin() || hasPermission("finance", "sign_admin");
  const canManageAbsen  = isSuperAdmin() || hasPermission("absen", "manage");

  // Form state
  const [open, setOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [showUserDrop, setShowUserDrop] = useState(false);
  const [form, setForm] = useState({
    user_id: "",
    user_name: "",
    user_role: "",
    tanggal: today,
    kategori: "Transport",
    keterangan: "",
  });
  const [formItems, setFormItems] = useState([{ deskripsi: "", jumlah: 0 }]);
  const [formBuktis, setFormBuktis] = useState<any[]>([]);

  // Table filter
  const [filterStatus, setFilterStatus] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [filterTahun, setFilterTahun] = useState("");
  const [filterDariTanggal, setFilterDariTanggal] = useState("");
  const [filterSampaiTanggal, setFilterSampaiTanggal] = useState("");

  // Signature dialog
  const [signTarget, setSignTarget] = useState<{ id: number; type: "head" | "admin" } | null>(null);

  // Reject dialog
  const [rejectDialog, setRejectDialog] = useState<{ id: number; alasan: string } | null>(null);

  // Expanded row
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Users for dropdown (always loaded, used for form + filter)
  const { data: usersData } = useQuery({
    queryKey: ["reimburse-users", user?.id],
    queryFn: reimburseApi.users,
  });
  const users: any[] = Array.isArray(usersData) ? usersData : [];
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Reimburse list
  const { data, isLoading } = useQuery({
    queryKey: ["reimburse", user?.id, filterStatus, filterUserId, filterBulan, filterTahun, filterDariTanggal, filterSampaiTanggal],
    queryFn: () => reimburseApi.list({
      ...(filterStatus ? { status: filterStatus } : {}),
      ...(filterUserId ? { user_id: filterUserId } : {}),
      ...(filterDariTanggal ? { dari_tanggal: filterDariTanggal } : {}),
      ...(filterSampaiTanggal ? { sampai_tanggal: filterSampaiTanggal } : {}),
      ...(!filterDariTanggal && !filterSampaiTanggal && filterBulan ? { bulan: filterBulan } : {}),
      ...(!filterDariTanggal && !filterSampaiTanggal && filterTahun ? { tahun: filterTahun } : {}),
    }),
    retry: false,
  });
  const items: any[] = Array.isArray(data) ? data : data?.items ?? [];

  // Mutations
  const createMut = useMutation({
    mutationFn: reimburseApi.create,
    onSuccess: () => {
      toast.success("Pengajuan reimburse berhasil dikirim");
      qc.invalidateQueries({ queryKey: ["reimburse"] });
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal mengajukan reimburse"),
  });

  const signMut = useMutation({
    mutationFn: ({ id, type, sig }: { id: number; type: "head" | "admin"; sig: string }) =>
      type === "head" ? reimburseApi.signHead(id, sig) : reimburseApi.signAdmin(id, sig),
    onSuccess: (data) => {
      toast.success(data.message || "Tanda tangan disimpan");
      qc.invalidateQueries({ queryKey: ["reimburse"] });
      setSignTarget(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menyimpan tanda tangan"),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, alasan }: { id: number; alasan: string }) => reimburseApi.reject(id, alasan),
    onSuccess: () => {
      toast.success("Reimburse ditolak");
      qc.invalidateQueries({ queryKey: ["reimburse"] });
      setRejectDialog(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menolak"),
  });

  const deleteMut = useMutation({
    mutationFn: reimburseApi.delete,
    onSuccess: () => {
      toast.success("Pengajuan dihapus");
      qc.invalidateQueries({ queryKey: ["reimburse"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menghapus"),
  });

  function resetForm() {
    const uid = !isPrivileged && user ? String(user.id) : "";
    const uname = !isPrivileged && user ? user.name : "";
    const urole = !isPrivileged && user ? (user.roles?.[0]?.name ?? "") : "";
    setForm({ user_id: uid, user_name: uname, user_role: urole, tanggal: today, kategori: "Transport", keterangan: "" });
    setFormItems([{ deskripsi: "", jumlah: 0 }]);
    setFormBuktis([]);
    setUserSearch(uname);
  }

  function handleSelectUser(u: any) {
    setForm(f => ({ ...f, user_id: String(u.id), user_name: u.name, user_role: u.roles || "" }));
    setUserSearch(u.name);
    setShowUserDrop(false);
  }

  async function handleDownloadBulkPDF() {
    if (items.length === 0) return;
    try {
      const logoUrl = await getLogoBase64();
      const parts: string[] = [];
      if (filterUserId) {
        const u = users.find(u => String(u.id) === filterUserId);
        if (u) parts.push(u.name);
      }
      if (filterDariTanggal || filterSampaiTanggal) {
        const fmt = (d: string) => d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "...";
        parts.push(`${fmt(filterDariTanggal)} – ${fmt(filterSampaiTanggal)}`);
      } else {
        if (filterBulan) parts.push(BULAN_OPTIONS.find(b => b.value === filterBulan)?.label ?? filterBulan);
        if (filterTahun) parts.push(filterTahun);
      }
      if (filterStatus) parts.push(filterStatus);
      const filterLabel = parts.length > 0 ? parts.join(" · ") : "Semua Data";

      const blob = await pdf(
        <ReimburseBulkPDF
          items={items}
          filterLabel={filterLabel}
          logoUrl={logoUrl}
        />
      ).toBlob();
      saveAs(blob, `rekap-reimburse-${filterLabel.replace(/\s+/g, "-").toLowerCase()}.pdf`);
    } catch {
      toast.error("Gagal generate PDF Rekap");
    }
  }

  async function handleDownloadPDF(r: any) {
    try {
      const logoUrl = await getLogoBase64();
      const blob = await pdf(
        <ReimbursePDF
          id={r.id}
          tanggal={r.tanggal}
          nama_karyawan={r.nama_karyawan}
          role_karyawan={r.role_karyawan}
          kategori={r.kategori}
          keterangan={r.keterangan}
          items={r.items || []}
          total={r.total}
          logoUrl={logoUrl}
          buktis={r.buktis || []}
          head_finance={r.head_finance ? { name: r.head_finance.name, at: r.head_finance_at, signature: r.head_finance_signature } : null}
          admin_finance={r.admin_finance ? { name: r.admin_finance.name, at: r.admin_finance_at, signature: r.admin_finance_signature } : null}
        />
      ).toBlob();
      saveAs(blob, `reimburse-${String(r.id).padStart(4, "0")}.pdf`);
    } catch {
      toast.error("Gagal generate PDF Reimburse");
    }
  }

  // Summary
  const totalPending = items.filter(i => i.status === "Pending").reduce((s, i) => s + (i.total || 0), 0);
  const totalDisetujui = items.filter(i => i.status === "Disetujui").reduce((s, i) => s + (i.total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Folder className="h-6 w-6 text-red-500" /> Administrasi Kantor
        </h1>
        <p className="text-muted-foreground text-sm">Reimburse pengeluaran karyawan dan rekap absen</p>
      </div>

      <Tabs defaultValue="reimburse">
        <TabsList>
          <TabsTrigger value="reimburse"><Folder className="h-3.5 w-3.5 mr-1.5" />Reimburse</TabsTrigger>
          {canManageAbsen && (
            <TabsTrigger value="absen">
              <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />Absen Karyawan
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="absen" className="mt-5">
          <AbsenKaryawanTab canManage={canManageAbsen} />
        </TabsContent>

        <TabsContent value="reimburse" className="mt-5">
        <div className="space-y-5">
        <div className="flex gap-2 items-center flex-wrap justify-end">
          {/* Filter: Karyawan — hanya untuk privileged */}
          {isPrivileged && (
            <select className="border rounded-md px-3 py-2 text-sm" value={filterUserId}
              onChange={e => setFilterUserId(e.target.value)}>
              <option value="">Semua Karyawan</option>
              {users.map(u => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
            </select>
          )}
          {/* Filter: Bulan */}
          <select className="border rounded-md px-3 py-2 text-sm" value={filterBulan}
            onChange={e => setFilterBulan(e.target.value)}>
            <option value="">Semua Bulan</option>
            {BULAN_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
          {/* Filter: Tahun */}
          <select className="border rounded-md px-3 py-2 text-sm" value={filterTahun}
            onChange={e => setFilterTahun(e.target.value)}>
            <option value="">Semua Tahun</option>
            {TAHUN_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {/* Filter: Status */}
          <select className="border rounded-md px-3 py-2 text-sm" value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Semua Status</option>
            <option value="Pending">Pending</option>
            <option value="Disetujui">Disetujui</option>
            <option value="Ditolak">Ditolak</option>
          </select>
          {/* Filter: Tanggal Range (untuk PDF) */}
          <div className="flex items-center gap-1">
            <Input type="date" className="h-9 text-sm w-36" value={filterDariTanggal}
              onChange={e => setFilterDariTanggal(e.target.value)}
              title="Dari Tanggal" />
            <span className="text-muted-foreground text-xs">–</span>
            <Input type="date" className="h-9 text-sm w-36" value={filterSampaiTanggal}
              onChange={e => setFilterSampaiTanggal(e.target.value)}
              title="Sampai Tanggal" />
            {(filterDariTanggal || filterSampaiTanggal) && (
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground"
                onClick={() => { setFilterDariTanggal(""); setFilterSampaiTanggal(""); }}
                title="Reset filter tanggal">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {/* Bulk PDF download */}
          <Button variant="outline" disabled={items.length === 0 || isLoading}
            onClick={handleDownloadBulkPDF}>
            <FileDown className="h-4 w-4 mr-2" /> Download PDF ({items.length})
          </Button>
          <Button onClick={() => { resetForm(); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Ajukan Reimburse
          </Button>
        </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Menunggu Persetujuan</p>
            <p className="text-lg font-bold text-amber-600">{formatRp(totalPending)}</p>
            <p className="text-xs text-muted-foreground">{items.filter(i => i.status === "Pending").length} pengajuan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Total Disetujui</p>
            <p className="text-lg font-bold text-green-600">{formatRp(totalDisetujui)}</p>
            <p className="text-xs text-muted-foreground">{items.filter(i => i.status === "Disetujui").length} pengajuan</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                {isPrivileged && <TableHead>Karyawan</TableHead>}
                {isPrivileged && <TableHead>Role</TableHead>}
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                {(canSignHead || canSignAdmin) && <TableHead>Tanda Tangan</TableHead>}
                <TableHead className="w-36" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: isPrivileged ? 8 : 6 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : items.map((r: any) => (
                    <React.Fragment key={r.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/30"
                        onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                        <TableCell className="whitespace-nowrap">
                          {r.tanggal ? new Date(r.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </TableCell>
                        {isPrivileged && <TableCell className="font-medium">{r.nama_karyawan || "—"}</TableCell>}
                        {isPrivileged && (
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{r.role_karyawan || "—"}</Badge>
                          </TableCell>
                        )}
                        <TableCell>{r.kategori || "—"}</TableCell>
                        <TableCell className="text-right font-semibold">{formatRp(r.total)}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        {(canSignHead || canSignAdmin) && (
                          <TableCell onClick={e => e.stopPropagation()}>
                            {r.status !== "Ditolak" && (
                              <div className="flex flex-col gap-1">
                                {canSignHead && (!r.head_finance ? (
                                  <Button size="sm" variant="outline" className="h-6 text-xs"
                                    onClick={() => setSignTarget({ id: r.id, type: "head" })}>
                                    <PenLine className="h-3 w-3 mr-1" /> Head Finance
                                  </Button>
                                ) : (
                                  <button className="text-xs text-green-600 flex items-center gap-1 hover:underline"
                                    onClick={() => setSignTarget({ id: r.id, type: "head" })}>
                                    <CheckCircle2 className="h-3 w-3" /> Head Finance
                                  </button>
                                ))}
                                {canSignAdmin && (!r.admin_finance ? (
                                  <Button size="sm" variant="outline" className="h-6 text-xs"
                                    onClick={() => setSignTarget({ id: r.id, type: "admin" })}>
                                    <PenLine className="h-3 w-3 mr-1" /> Admin Finance
                                  </Button>
                                ) : (
                                  <button className="text-xs text-green-600 flex items-center gap-1 hover:underline"
                                    onClick={() => setSignTarget({ id: r.id, type: "admin" })}>
                                    <CheckCircle2 className="h-3 w-3" /> Admin Finance
                                  </button>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        )}
                        <TableCell onClick={e => e.stopPropagation()}>
                          <div className="flex flex-col gap-1">
                            {r.status === "Disetujui" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                                onClick={() => handleDownloadPDF(r)}>
                                <Download className="h-3 w-3 mr-1" /> Cetak PDF
                              </Button>
                            )}
                            {isPrivileged && r.status === "Pending" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30"
                                onClick={() => setRejectDialog({ id: r.id, alasan: "" })}>
                                <XCircle className="h-3 w-3 mr-1" /> Tolak
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                              onClick={() => deleteMut.mutate(r.id)} disabled={deleteMut.isPending}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {expandedId === r.id && (
                        <TableRow>
                          <TableCell colSpan={isPrivileged ? 8 : 6} className="bg-muted/20 px-8 py-4">
                            <div className="grid md:grid-cols-2 gap-6">
                              {/* Detail bon */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm">Detail Bon</h4>
                                {r.keterangan && <p className="text-sm text-muted-foreground italic">{r.keterangan}</p>}
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Keterangan</TableHead>
                                      <TableHead className="text-right">Jumlah</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {(r.items || []).map((it: any, i: number) => (
                                      <TableRow key={i}>
                                        <TableCell className="text-sm">{it.deskripsi || `Item ${i + 1}`}</TableCell>
                                        <TableCell className="text-right text-sm font-medium">{formatRp(it.jumlah)}</TableCell>
                                      </TableRow>
                                    ))}
                                    <TableRow>
                                      <TableCell className="text-right font-bold">Total</TableCell>
                                      <TableCell className="text-right font-bold">{formatRp(r.total)}</TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                                {/* Signature status */}
                                <div className="space-y-1 pt-2 border-t">
                                  <p className="text-xs text-muted-foreground font-medium mb-1">Status Tanda Tangan</p>
                                  <SignBadge signed={!!r.head_finance} name={r.head_finance?.name} at={r.head_finance_at} />
                                  <div className="text-xs text-muted-foreground">Head Finance</div>
                                  <SignBadge signed={!!r.admin_finance} name={r.admin_finance?.name} at={r.admin_finance_at} />
                                  <div className="text-xs text-muted-foreground">Admin Finance</div>
                                </div>
                                {r.alasan_tolak && (
                                  <div className="border border-destructive/30 rounded-md p-3 bg-red-50">
                                    <p className="text-xs text-destructive font-medium">Alasan Penolakan:</p>
                                    <p className="text-sm text-destructive">{r.alasan_tolak}</p>
                                  </div>
                                )}
                              </div>
                              {/* Bukti bon */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm">Bukti Bon / Struk</h4>
                                {(r.buktis || []).length === 0 ? (
                                  <p className="text-sm text-muted-foreground italic">Tidak ada bukti bon.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-3">
                                    {(r.buktis || []).map((b: any, i: number) => (
                                      <div key={i} className="border rounded-md overflow-hidden w-28 h-28 bg-white">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={b.data} alt={b.nama || `bukti-${i}`} className="w-full h-full object-cover" />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
              {!isLoading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isPrivileged ? 8 : 6} className="text-center py-16 text-muted-foreground">
                    <Folder className="mx-auto h-10 w-10 opacity-20 mb-3" />
                    <p>Belum ada pengajuan reimburse</p>
                    <p className="text-xs mt-1">Klik "Ajukan Reimburse" untuk menambahkan</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" /> Ajukan Reimburse
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Karyawan picker — hanya untuk privileged; non-privileged auto-fill sendiri */}
            {isPrivileged ? (
              <div className="relative">
                <Label>Karyawan *</Label>
                <Input
                  placeholder="Cari nama karyawan..."
                  value={userSearch}
                  onChange={e => { setUserSearch(e.target.value); setShowUserDrop(true); }}
                  onFocus={() => setShowUserDrop(true)}
                  autoComplete="off"
                />
                {form.user_role && (
                  <p className="text-xs text-muted-foreground mt-1">Role: <span className="font-medium">{form.user_role}</span></p>
                )}
                {showUserDrop && filteredUsers.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border rounded-md shadow-md max-h-48 overflow-y-auto mt-1">
                    {filteredUsers.map((u: any) => (
                      <button key={u.id} type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex justify-between"
                        onClick={() => handleSelectUser(u)}>
                        <span>{u.name}</span>
                        <span className="text-muted-foreground text-xs">{u.roles || "—"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <Label>Karyawan</Label>
                <div className="border rounded-md px-3 py-2 text-sm bg-muted/30 text-muted-foreground">
                  {form.user_name || user?.name || "—"}
                  {form.user_role && <span className="ml-2 text-xs">({form.user_role})</span>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tanggal *</Label>
                <Input type="date" value={form.tanggal}
                  onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} />
              </div>
              <div>
                <Label>Kategori</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.kategori}
                  onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))}>
                  <option>Transport</option>
                  <option>Makan</option>
                  <option>Akomodasi</option>
                  <option>Peralatan Kantor</option>
                  <option>Komunikasi</option>
                  <option>Lain-lain</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Keterangan</Label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Keterangan tambahan (opsional)"
                value={form.keterangan}
                onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
              />
            </div>

            <div>
              <Label className="mb-2 block">Daftar Bon / Pengeluaran *</Label>
              <ItemsForm items={formItems} setItems={setFormItems} />
            </div>

            <div>
              <Label className="mb-2 block">Upload Bukti Bon / Struk</Label>
              <BuktiForm buktis={formBuktis} setBuktis={setFormBuktis} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Batal</Button>
              <Button
                disabled={!form.user_id || formItems.every(it => !it.jumlah) || createMut.isPending}
                onClick={() => createMut.mutate({
                  user_id: form.user_id,
                  tanggal: form.tanggal,
                  kategori: form.kategori,
                  keterangan: form.keterangan,
                  items: formItems,
                  buktis: formBuktis,
                })}
              >
                {createMut.isPending ? "Mengirim..." : "Ajukan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Dialog */}
      <SignatureDialog
        open={!!signTarget}
        onOpenChange={v => { if (!v) setSignTarget(null); }}
        title={signTarget?.type === "head" ? "Tanda Tangan Head Finance" : "Tanda Tangan Admin Finance"}
        loading={signMut.isPending}
        onSave={sig => {
          if (!signTarget) return;
          signMut.mutate({ id: signTarget.id, type: signTarget.type, sig });
        }}
      />

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={v => { if (!v) setRejectDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" /> Tolak Reimburse
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Alasan Penolakan</Label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring mt-1"
                placeholder="Jelaskan alasan penolakan..."
                value={rejectDialog?.alasan ?? ""}
                onChange={e => setRejectDialog(prev => prev ? { ...prev, alasan: e.target.value } : null)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialog(null)}>Batal</Button>
              <Button variant="destructive" disabled={rejectMut.isPending}
                onClick={() => rejectDialog && rejectMut.mutate({ id: rejectDialog.id, alasan: rejectDialog.alasan })}>
                {rejectMut.isPending ? "Memproses..." : "Tolak"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
