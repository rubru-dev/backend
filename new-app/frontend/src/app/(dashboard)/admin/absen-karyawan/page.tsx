"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CheckCircle, XCircle, Clock, Settings, Users, AlertTriangle,
  MapPin, Eye, ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ?? "http://localhost:8000";

const api = {
  getConfig: () => apiClient.get("/absen-karyawan/config").then((r) => r.data),
  updateConfig: (data: any) => apiClient.put("/absen-karyawan/admin/config", data).then((r) => r.data),
  getPending: () => apiClient.get("/absen-karyawan/admin/pending").then((r) => r.data),
  getList: (params: any) => apiClient.get("/absen-karyawan/admin/list", { params }).then((r) => r.data),
  getKaryawanList: () => apiClient.get("/absen-karyawan/admin/karyawan-list").then((r) => r.data),
  approve: (id: string) => apiClient.patch(`/absen-karyawan/admin/${id}/approve`).then((r) => r.data),
  reject: (id: string, catatan: string) =>
    apiClient.patch(`/absen-karyawan/admin/${id}/reject`, { catatan }).then((r) => r.data),
};

const STATUS_STYLE: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  Hadir:     { color: "bg-green-100 text-green-700 border-green-200",    label: "Hadir",              icon: <CheckCircle className="h-3 w-3" /> },
  Terlambat: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Terlambat",          icon: <Clock className="h-3 w-3" /> },
  Pending:   { color: "bg-blue-100 text-blue-700 border-blue-200",       label: "Menunggu Approval",  icon: <Clock className="h-3 w-3" /> },
  Disetujui: { color: "bg-green-100 text-green-700 border-green-200",    label: "Disetujui",          icon: <CheckCircle className="h-3 w-3" /> },
  Ditolak:   { color: "bg-red-100 text-red-700 border-red-200",          label: "Ditolak",            icon: <XCircle className="h-3 w-3" /> },
};

function formatJam(d: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
function formatTgl(d: string | Date) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

// ── Detail dialog ─────────────────────────────────────────────────────────────
function AbsenDetailDialog({ record, onClose, onApprove, onReject }: {
  record: any; onClose: () => void;
  onApprove: () => void; onReject: (catatan: string) => void;
}) {
  const [catatan, setCatatan] = useState("");
  const [showReject, setShowReject] = useState(false);
  const s = STATUS_STYLE[record.status] ?? STATUS_STYLE["Hadir"];

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle className="text-base">Detail Absen — {record.user?.name}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{formatTgl(record.tanggal)}</span>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${s.color}`}>
            {s.icon}{s.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Masuk</p>
            <p className="font-semibold">{formatJam(record.jam_masuk)}</p>
            {record.jarak_masuk != null && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />{Math.round(record.jarak_masuk)}m dari kantor
              </p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Keluar</p>
            <p className="font-semibold">{formatJam(record.jam_keluar)}</p>
            {record.jarak_keluar != null && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />{Math.round(record.jarak_keluar)}m dari kantor
              </p>
            )}
          </div>
        </div>

        {/* Foto masuk + keluar */}
        <div className="grid grid-cols-2 gap-2">
          {record.foto_masuk && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Foto Masuk</p>
              <a href={`${API_URL}${record.foto_masuk}`} target="_blank" rel="noreferrer">
                <img src={`${API_URL}${record.foto_masuk}`} alt="masuk"
                  className="w-full h-28 object-cover rounded-lg border hover:opacity-90 transition-opacity" />
              </a>
            </div>
          )}
          {record.foto_keluar && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Foto Keluar</p>
              <a href={`${API_URL}${record.foto_keluar}`} target="_blank" rel="noreferrer">
                <img src={`${API_URL}${record.foto_keluar}`} alt="keluar"
                  className="w-full h-28 object-cover rounded-lg border hover:opacity-90 transition-opacity" />
              </a>
            </div>
          )}
        </div>

        {record.di_luar_kantor && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />Luar Kantor
            </p>
            <p className="text-xs text-amber-700">{record.alasan_luar}</p>
          </div>
        )}

        {record.catatan_reject && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-red-700 mb-1">Catatan Penolakan</p>
            <p className="text-xs text-red-700">{record.catatan_reject}</p>
          </div>
        )}

        {/* Approve / Reject actions (only for Pending) */}
        {record.status === "Pending" && !showReject && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={onApprove}>
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />Setujui
            </Button>
            <Button size="sm" variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => setShowReject(true)}>
              <XCircle className="h-3.5 w-3.5 mr-1.5" />Tolak
            </Button>
          </div>
        )}

        {record.status === "Pending" && showReject && (
          <div className="space-y-2">
            <Label className="text-xs">Catatan Penolakan</Label>
            <Textarea rows={2} placeholder="Alasan penolakan..." value={catatan}
              onChange={(e) => setCatatan(e.target.value)} className="text-sm resize-none" />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowReject(false)}>Batal</Button>
              <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={!catatan.trim()} onClick={() => onReject(catatan)}>
                Konfirmasi Tolak
              </Button>
            </div>
          </div>
        )}

        <Button variant="outline" size="sm" className="w-full" onClick={onClose}>Tutup</Button>
      </div>
    </DialogContent>
  );
}

// ── Config Tab ────────────────────────────────────────────────────────────────
function ConfigTab() {
  const qc = useQueryClient();
  const { data: cfg, isLoading } = useQuery({ queryKey: ["absen-cfg"], queryFn: api.getConfig });
  const [form, setForm] = useState<any>(null);

  if (cfg && !form) setForm({ ...cfg });

  const saveMut = useMutation({
    mutationFn: (data: any) => api.updateConfig(data),
    onSuccess: () => {
      toast.success("Konfigurasi disimpan");
      qc.invalidateQueries({ queryKey: ["absen-cfg"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menyimpan"),
  });

  if (isLoading || !form) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-5 max-w-md">
      <div className="space-y-1">
        <Label className="text-xs font-semibold">Lokasi Kantor (Latitude)</Label>
        <Input type="number" step="0.000001" value={form.kantor_lat}
          onChange={(e) => setForm({ ...form, kantor_lat: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-semibold">Lokasi Kantor (Longitude)</Label>
        <Input type="number" step="0.000001" value={form.kantor_lng}
          onChange={(e) => setForm({ ...form, kantor_lng: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-semibold">Radius Kantor (meter)</Label>
        <Input type="number" min="10" value={form.radius_meter}
          onChange={(e) => setForm({ ...form, radius_meter: e.target.value })} />
        <p className="text-xs text-muted-foreground">Karyawan dalam radius ini dianggap absen di kantor</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Jam Masuk Awal</Label>
          <Input type="time" value={form.jam_masuk_awal}
            onChange={(e) => setForm({ ...form, jam_masuk_awal: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Jam Masuk Akhir</Label>
          <Input type="time" value={form.jam_masuk_akhir}
            onChange={(e) => setForm({ ...form, jam_masuk_akhir: e.target.value })} />
          <p className="text-[10px] text-muted-foreground">Lewat ini = terlambat</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Jam Pulang</Label>
          <Input type="time" value={form.jam_pulang}
            onChange={(e) => setForm({ ...form, jam_pulang: e.target.value })} />
        </div>
      </div>
      <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} className="w-full">
        {saveMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Menyimpan...</> : "Simpan Konfigurasi"}
      </Button>
    </div>
  );
}

// ── Approval Tab ──────────────────────────────────────────────────────────────
function PendingTab() {
  const qc = useQueryClient();
  const [detailRecord, setDetailRecord] = useState<any>(null);

  const { data: pending = [], isLoading } = useQuery<any[]>({
    queryKey: ["absen-pending"],
    queryFn: api.getPending,
    refetchInterval: 30000,
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => api.approve(id),
    onSuccess: () => {
      toast.success("Disetujui");
      qc.invalidateQueries({ queryKey: ["absen-pending"] });
      qc.invalidateQueries({ queryKey: ["absen-list"] });
      setDetailRecord(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal approve"),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, catatan }: { id: string; catatan: string }) => api.reject(id, catatan),
    onSuccess: () => {
      toast.success("Ditolak");
      qc.invalidateQueries({ queryKey: ["absen-pending"] });
      qc.invalidateQueries({ queryKey: ["absen-list"] });
      setDetailRecord(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal reject"),
  });

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;

  if (pending.length === 0) return (
    <div className="text-center py-14 text-muted-foreground">
      <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
      <p className="text-sm">Tidak ada absen yang menunggu persetujuan</p>
    </div>
  );

  return (
    <>
      <div className="divide-y border rounded-xl overflow-hidden">
        {pending.map((r: any) => (
          <div key={r.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-muted/30 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{r.user?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{formatTgl(r.tanggal)} · {formatJam(r.jam_masuk)}</p>
              {r.di_luar_kantor && (
                <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />Luar Kantor — {r.alasan_luar}
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setDetailRecord(r)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 px-2"
                disabled={approveMut.isPending}
                onClick={() => approveMut.mutate(String(r.id))}>
                <CheckCircle className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" className="h-8 border-red-300 text-red-600 hover:bg-red-50 px-2"
                onClick={() => setDetailRecord(r)}>
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!detailRecord} onOpenChange={(o) => !o && setDetailRecord(null)}>
        {detailRecord && (
          <AbsenDetailDialog
            record={detailRecord}
            onClose={() => setDetailRecord(null)}
            onApprove={() => approveMut.mutate(String(detailRecord.id))}
            onReject={(catatan) => rejectMut.mutate({ id: String(detailRecord.id), catatan })}
          />
        )}
      </Dialog>
    </>
  );
}

// ── Rekap Tab ─────────────────────────────────────────────────────────────────
function RekapTab() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [filter, setFilter] = useState({ tanggal: today, user_id: "", status: "" });
  const [page, setPage] = useState(1);
  const [detailRecord, setDetailRecord] = useState<any>(null);

  const { data: karyawanList = [] } = useQuery<any[]>({
    queryKey: ["absen-karyawan-list"],
    queryFn: api.getKaryawanList,
  });

  const params = { tanggal: filter.tanggal || undefined, user_id: filter.user_id || undefined, status: filter.status || undefined, page, per_page: 25 };
  const { data, isLoading } = useQuery({
    queryKey: ["absen-list", params],
    queryFn: () => api.getList(params),
  });

  const items: any[] = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / 25);

  const approveMut = useMutation({
    mutationFn: (id: string) => api.approve(id),
    onSuccess: () => {
      toast.success("Disetujui");
      qc.invalidateQueries({ queryKey: ["absen-list"] });
      qc.invalidateQueries({ queryKey: ["absen-pending"] });
      setDetailRecord(null);
    },
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, catatan }: { id: string; catatan: string }) => api.reject(id, catatan),
    onSuccess: () => {
      toast.success("Ditolak");
      qc.invalidateQueries({ queryKey: ["absen-list"] });
      qc.invalidateQueries({ queryKey: ["absen-pending"] });
      setDetailRecord(null);
    },
  });

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Tanggal</Label>
          <Input type="date" value={filter.tanggal}
            onChange={(e) => { setFilter((f) => ({ ...f, tanggal: e.target.value })); setPage(1); }} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Karyawan</Label>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={filter.user_id}
            onChange={(e) => { setFilter((f) => ({ ...f, user_id: e.target.value })); setPage(1); }}
          >
            <option value="">Semua</option>
            {karyawanList.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={filter.status}
            onChange={(e) => { setFilter((f) => ({ ...f, status: e.target.value })); setPage(1); }}
          >
            <option value="">Semua</option>
            <option value="Hadir">Hadir</option>
            <option value="Terlambat">Terlambat</option>
            <option value="Pending">Menunggu Approval</option>
            <option value="Disetujui">Disetujui</option>
            <option value="Ditolak">Ditolak</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button variant="outline" size="sm" className="w-full" onClick={() => { setFilter({ tanggal: today, user_id: "", status: "" }); setPage(1); }}>
            Reset
          </Button>
        </div>
      </div>

      {/* Tabel */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Tidak ada data absen</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Karyawan</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Tanggal</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Masuk</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Keluar</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((r: any) => {
                  const s = STATUS_STYLE[r.status] ?? STATUS_STYLE["Hadir"];
                  return (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{r.user?.name ?? "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{formatTgl(r.tanggal)}</td>
                      <td className="px-3 py-2.5">
                        {formatJam(r.jam_masuk)}
                        {r.di_luar_kantor && <MapPin className="h-3 w-3 text-amber-500 inline ml-1" />}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{formatJam(r.jam_keluar)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${s.color}`}>
                          {s.icon}{s.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetailRecord(r)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{total} data</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>{page} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailRecord} onOpenChange={(o) => !o && setDetailRecord(null)}>
        {detailRecord && (
          <AbsenDetailDialog
            record={detailRecord}
            onClose={() => setDetailRecord(null)}
            onApprove={() => approveMut.mutate(String(detailRecord.id))}
            onReject={(catatan) => rejectMut.mutate({ id: String(detailRecord.id), catatan })}
          />
        )}
      </Dialog>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AbsenKaryawanAdminPage() {
  const { _hasHydrated, isSuperAdmin, hasPermission } = useAuthStore();

  if (_hasHydrated && !isSuperAdmin() && !hasPermission("absen", "manage")) {
    return <div className="p-6 text-muted-foreground text-sm">Anda tidak memiliki akses ke halaman ini.</div>;
  }

  const { data: pending = [] } = useQuery<any[]>({
    queryKey: ["absen-pending"],
    queryFn: api.getPending,
    refetchInterval: 30000,
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Manajemen Absen Karyawan</h1>
        <p className="text-sm text-muted-foreground">Kelola absen, approval luar kantor, dan konfigurasi jam kerja</p>
      </div>

      <Tabs defaultValue="rekap">
        <TabsList>
          <TabsTrigger value="rekap">
            <Users className="h-3.5 w-3.5 mr-1.5" />Rekap Absen
          </TabsTrigger>
          <TabsTrigger value="approval" className="relative">
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />Approval Luar Kantor
            {(pending as any[]).length > 0 && (
              <Badge className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-red-500">
                {(pending as any[]).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="h-3.5 w-3.5 mr-1.5" />Konfigurasi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rekap" className="mt-4"><RekapTab /></TabsContent>
        <TabsContent value="approval" className="mt-4"><PendingTab /></TabsContent>
        <TabsContent value="config" className="mt-4"><ConfigTab /></TabsContent>
      </Tabs>
    </div>
  );
}
