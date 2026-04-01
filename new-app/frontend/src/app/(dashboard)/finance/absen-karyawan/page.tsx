"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardCheck, Clock, CheckCircle, XCircle, Camera, MapPin, X, Eye, Settings,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  Hadir:     { label: "Hadir",             color: "bg-green-100 text-green-700 border-green-200" },
  Terlambat: { label: "Terlambat",         color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  Pending:   { label: "Menunggu Approval", color: "bg-blue-100 text-blue-700 border-blue-200" },
  Disetujui: { label: "Disetujui",         color: "bg-green-100 text-green-700 border-green-200" },
  Ditolak:   { label: "Ditolak",           color: "bg-red-100 text-red-700 border-red-200" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: "bg-gray-100 text-gray-600 border-gray-200" };
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FinanceAbsenKaryawanPage() {
  const qc = useQueryClient();
  const { isSuperAdmin, hasPermission } = useAuthStore();
  const canManage = isSuperAdmin() || hasPermission("absen", "manage");

  const [filterUser, setFilterUser]     = useState("");
  const [filterTgl, setFilterTgl]       = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [photoDialog, setPhotoDialog]   = useState<{ masuk?: string; keluar?: string; name?: string } | null>(null);
  const [rejectOpen, setRejectOpen]     = useState<{ id: number; catatan: string } | null>(null);

  const { data: karyawanList } = useQuery({
    queryKey: ["absen-karyawan-list"],
    queryFn: () => apiClient.get("/absen-karyawan/admin/karyawan-list").then(r => r.data as any[]),
    enabled: canManage,
  });

  const { data: absenData, isLoading } = useQuery({
    queryKey: ["finance-absen", filterUser, filterTgl, filterStatus],
    queryFn: () => apiClient.get("/absen-karyawan/admin/list", {
      params: {
        ...(filterUser ? { user_id: filterUser } : {}),
        ...(filterTgl ? { tanggal: filterTgl } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
        limit: 200,
      },
    }).then(r => r.data),
    enabled: canManage,
  });

  const { data: pendingData } = useQuery({
    queryKey: ["finance-absen-pending"],
    queryFn: () => apiClient.get("/absen-karyawan/admin/pending").then(r => r.data as any[]),
    enabled: canManage,
    refetchInterval: 30000,
  });

  const approveMut = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/absen-karyawan/admin/${id}/approve`).then(r => r.data),
    onSuccess: () => {
      toast.success("Absen disetujui");
      qc.invalidateQueries({ queryKey: ["finance-absen"] });
      qc.invalidateQueries({ queryKey: ["finance-absen-pending"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menyetujui"),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, catatan }: { id: number; catatan: string }) =>
      apiClient.patch(`/absen-karyawan/admin/${id}/reject`, { catatan_reject: catatan }).then(r => r.data),
    onSuccess: () => {
      toast.success("Absen ditolak");
      qc.invalidateQueries({ queryKey: ["finance-absen"] });
      qc.invalidateQueries({ queryKey: ["finance-absen-pending"] });
      setRejectOpen(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menolak"),
  });

  const records: any[] = Array.isArray(absenData) ? absenData : absenData?.data ?? absenData?.items ?? [];
  const pending: any[] = Array.isArray(pendingData) ? pendingData : [];

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <ClipboardCheck className="h-12 w-12 opacity-20" />
        <p>Hanya Head Finance dan Super Admin yang dapat mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-sky-500" /> Absen Karyawan
        </h1>
        <p className="text-muted-foreground text-sm">Rekap & approval absen harian seluruh karyawan</p>
      </div>

      <Tabs defaultValue="rekap">
        <TabsList>
          <TabsTrigger value="rekap" className="flex items-center gap-1.5">
            <ClipboardCheck className="h-4 w-4" /> Rekap Absen
          </TabsTrigger>
          <TabsTrigger value="konfigurasi" className="flex items-center gap-1.5">
            <Settings className="h-4 w-4" /> Konfigurasi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rekap" className="space-y-6 mt-4">

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
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                : records.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-sm">{fmtTgl(r.tanggal)}</TableCell>
                      <TableCell className="font-medium text-sm">{r.user?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{fmtJam(r.jam_masuk)}</TableCell>
                      <TableCell className="text-sm">{fmtJam(r.jam_keluar)}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
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
                  <TableCell colSpan={7} className="text-center py-14 text-muted-foreground">
                    <ClipboardCheck className="mx-auto h-10 w-10 opacity-20 mb-3" />
                    <p>Belum ada data absen</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="konfigurasi" className="mt-4">
          <KonfigurasiTab />
        </TabsContent>
      </Tabs>

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
              <Textarea rows={3} placeholder="Alasan penolakan..."
                value={rejectOpen?.catatan ?? ""}
                onChange={e => setRejectOpen(prev => prev ? { ...prev, catatan: e.target.value } : null)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectOpen(null)}>Batal</Button>
              <Button variant="destructive" disabled={rejectMut.isPending}
                onClick={() => rejectOpen && rejectMut.mutate({ id: rejectOpen.id, catatan: rejectOpen.catatan })}>
                {rejectMut.isPending ? "Memproses..." : "Tolak"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── KonfigurasiTab ────────────────────────────────────────────────────────────
function KonfigurasiTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState<{
    kantor_lat: string; kantor_lng: string; radius_meter: string;
    jam_masuk_awal: string; jam_masuk_akhir: string; jam_pulang: string;
  } | null>(null);

  const { data: cfg, isLoading } = useQuery({
    queryKey: ["absen-config"],
    queryFn: () => apiClient.get("/absen-karyawan/config").then(r => r.data),
  });

  // Sync form ketika data berhasil diload
  if (cfg && !form) {
    // handled via useEffect pattern — just initialize lazily
  }

  const currentForm = form ?? (cfg ? {
    kantor_lat: String(cfg.kantor_lat),
    kantor_lng: String(cfg.kantor_lng),
    radius_meter: String(cfg.radius_meter),
    jam_masuk_awal: cfg.jam_masuk_awal,
    jam_masuk_akhir: cfg.jam_masuk_akhir,
    jam_pulang: cfg.jam_pulang,
  } : null);

  const saveMut = useMutation({
    mutationFn: (data: any) => apiClient.put("/absen-karyawan/admin/config", data).then(r => r.data),
    onSuccess: () => {
      toast.success("Konfigurasi disimpan");
      qc.invalidateQueries({ queryKey: ["absen-config"] });
      setForm(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menyimpan"),
  });

  function handleSave() {
    if (!currentForm) return;
    saveMut.mutate({
      kantor_lat: parseFloat(currentForm.kantor_lat),
      kantor_lng: parseFloat(currentForm.kantor_lng),
      radius_meter: parseInt(currentForm.radius_meter),
      jam_masuk_awal: currentForm.jam_masuk_awal,
      jam_masuk_akhir: currentForm.jam_masuk_akhir,
      jam_pulang: currentForm.jam_pulang,
    });
  }

  if (isLoading || !currentForm) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  return (
    <Card className="max-w-lg">
      <CardContent className="pt-5 space-y-4">
        <div>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-sky-500" /> Lokasi Kantor
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Latitude</Label>
              <Input className="mt-1" value={currentForm.kantor_lat}
                onChange={e => setForm({ ...currentForm, kantor_lat: e.target.value })}
                placeholder="-6.200000" />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input className="mt-1" value={currentForm.kantor_lng}
                onChange={e => setForm({ ...currentForm, kantor_lng: e.target.value })}
                placeholder="106.816000" />
            </div>
          </div>
          <div className="mt-3">
            <Label>Radius Toleransi (meter)</Label>
            <Input className="mt-1 w-40" type="number" min={10} value={currentForm.radius_meter}
              onChange={e => setForm({ ...currentForm, radius_meter: e.target.value })} />
            <p className="text-xs text-muted-foreground mt-1">Karyawan di luar radius ini dianggap luar kantor</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-500" /> Jam Kerja
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Jam Masuk Awal</Label>
              <Input className="mt-1" type="time" value={currentForm.jam_masuk_awal}
                onChange={e => setForm({ ...currentForm, jam_masuk_awal: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">Batas masuk tepat waktu</p>
            </div>
            <div>
              <Label>Jam Masuk Akhir</Label>
              <Input className="mt-1" type="time" value={currentForm.jam_masuk_akhir}
                onChange={e => setForm({ ...currentForm, jam_masuk_akhir: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">Lewat ini = terlambat</p>
            </div>
            <div>
              <Label>Jam Pulang</Label>
              <Input className="mt-1" type="time" value={currentForm.jam_pulang}
                onChange={e => setForm({ ...currentForm, jam_pulang: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Menyimpan..." : "Simpan Konfigurasi"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
