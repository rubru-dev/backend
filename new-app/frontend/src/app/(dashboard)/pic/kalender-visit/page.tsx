"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarDays, Plus, Pencil, Trash2, X, Camera, CheckCircle, Clock,
  ChevronLeft, ChevronRight, Users,
} from "lucide-react";

const MONTH_NAMES = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const DAY_NAMES   = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ?? "http://localhost:8000";

const STATUS_COLOR: Record<string, string> = {
  Terjadwal:   "bg-blue-100 border-blue-400 text-blue-900",
  Berlangsung: "bg-yellow-100 border-yellow-400 text-yellow-900",
  Selesai:     "bg-green-100 border-green-400 text-green-900",
  Dibatalkan:  "bg-gray-100 border-gray-300 text-gray-500",
};

const CELL_BG: Record<string, string> = {
  Terjadwal:   "bg-blue-50 border-blue-300",
  Berlangsung: "bg-yellow-50 border-yellow-300",
  Selesai:     "bg-green-50 border-green-300",
  Dibatalkan:  "bg-gray-50 border-gray-200",
};

const picApi = {
  getAll:           (bulan: number, tahun: number) =>
    apiClient.get("/pic/kalender-visit", { params: { bulan, tahun } }).then(r => r.data),
  getMySchedule:    (bulan: number, tahun: number) =>
    apiClient.get("/pic/kalender-visit/my-schedule", { params: { bulan, tahun } }).then(r => r.data),
  getAllUsers:       () =>
    apiClient.get("/pic/pic-users").then(r => r.data as { id: string; name: string }[]),
  getProjekOptions: () =>
    apiClient.get("/pic/kalender-visit/projek-options").then(r => r.data as { id: string; type: string; label: string }[]),
  create:           (data: any) => apiClient.post("/pic/kalender-visit", data).then(r => r.data),
  update:           (id: string, data: any) => apiClient.patch(`/pic/kalender-visit/${id}`, data).then(r => r.data),
  delete:           (id: string) => apiClient.delete(`/pic/kalender-visit/${id}`).then(r => r.data),
  konfirmasi:       (id: string, data: any) => apiClient.post(`/pic/kalender-visit/${id}/konfirmasi`, data).then(r => r.data),
};

const EMPTY_FORM = { nama_projek: "", projek_id: "", projek_type: "", tanggal: "", jam: "", keterangan: "", status: "Terjadwal", pic_user_ids: [] as string[] };

export default function KalenderVisitPage() {
  const { isSuperAdmin, hasPermission, user, hasAnyRole } = useAuthStore();
  const canManage = isSuperAdmin() || hasPermission("pic", "view");
  const qc = useQueryClient();

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [formOpen, setFormOpen]               = useState(false);
  const [editItem, setEditItem]               = useState<any | null>(null);
  const [form, setForm]                       = useState({ ...EMPTY_FORM });
  const [konfirmasiOpen, setKonfirmasiOpen]   = useState<any | null>(null);
  const [fotoPreview, setFotoPreview]         = useState<string | null>(null);
  const [fotoBukti, setFotoBukti]             = useState<string | null>(null);
  const [catatanKonfirmasi, setCatatanKonfirmasi] = useState("");
  const [viewFotoUrl, setViewFotoUrl]         = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [filterProjekId, setFilterProjekId]   = useState("");
  const [filterPicId, setFilterPicId]         = useState("");

  const { data: allVisits = [], isLoading } = useQuery({
    queryKey: ["kalender-visit", bulan, tahun],
    queryFn:  () => picApi.getAll(bulan, tahun),
  });
  const { data: mySchedule = [] } = useQuery({
    queryKey: ["kalender-visit-my", bulan, tahun, user?.id],
    queryFn:  () => picApi.getMySchedule(bulan, tahun),
  });
  const { data: allUsers = [] } = useQuery({
    queryKey: ["pic-all-users"],
    queryFn:  picApi.getAllUsers,
  });
  const { data: projekOptions = [] } = useQuery({
    queryKey: ["kalender-visit-projek-options"],
    queryFn:  picApi.getProjekOptions,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => picApi.create(data),
    onSuccess: () => { toast.success("Jadwal dibuat"); qc.invalidateQueries({ queryKey: ["kalender-visit"] }); closeForm(); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => picApi.update(id, data),
    onSuccess: () => { toast.success("Jadwal diperbarui"); qc.invalidateQueries({ queryKey: ["kalender-visit"] }); closeForm(); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => picApi.delete(id),
    onSuccess: () => { toast.success("Jadwal dihapus"); qc.invalidateQueries({ queryKey: ["kalender-visit"] }); setSelectedDate(null); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });
  const konfirmasiMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => picApi.konfirmasi(id, data),
    onSuccess: () => {
      toast.success("Konfirmasi terkirim");
      qc.invalidateQueries({ queryKey: ["kalender-visit"] });
      qc.invalidateQueries({ queryKey: ["kalender-visit-my"] });
      closeKonfirmasi();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });

  // ── Calendar helpers ────────────────────────────────────────────────────────
  const allVisitsArr: any[] = Array.isArray(allVisits) ? allVisits : [];
  const visits: any[] = allVisitsArr.filter((v: any) => {
    if (filterProjekId && String(v.projek_id) !== filterProjekId) return false;
    if (filterPicId && !v.pics?.some((p: any) => String(p.user_id) === filterPicId)) return false;
    return true;
  });
  const myItems: any[] = Array.isArray(mySchedule) ? mySchedule : [];

  const byDate: Record<string, any[]> = {};
  visits.forEach((v: any) => {
    const key = String(v.tanggal).split("T")[0];
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(v);
  });

  const myPicMap: Record<string, any> = {};
  myItems.forEach((m: any) => { myPicMap[String(m.kalender_visit_id)] = m; });

  const firstDow    = new Date(tahun, bulan - 1, 1).getDay();
  const daysInMonth = new Date(tahun, bulan, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function dateKey(day: number) {
    return `${tahun}-${String(bulan).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  }
  function cellBg(day: number) {
    const entries = byDate[dateKey(day)];
    if (!entries?.length) return "";
    const statuses = entries.map((e: any) => e.status);
    if (statuses.some(s => s === "Terjadwal")) return CELL_BG["Terjadwal"];
    if (statuses.some(s => s === "Berlangsung")) return CELL_BG["Berlangsung"];
    if (statuses.every(s => s === "Selesai")) return CELL_BG["Selesai"];
    return CELL_BG["Dibatalkan"];
  }

  const prevMonth = () => { setSelectedDate(null); if (bulan===1){setBulan(12);setTahun(t=>t-1);}else setBulan(b=>b-1); };
  const nextMonth = () => { setSelectedDate(null); if (bulan===12){setBulan(1);setTahun(t=>t+1);}else setBulan(b=>b+1); };

  const selectedItems = selectedDate ? (byDate[selectedDate] ?? []) : [];

  // ── Form helpers ────────────────────────────────────────────────────────────
  function openCreate(prefillDate?: string) {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, tanggal: prefillDate ?? "" });
    setFormOpen(true);
  }
  function openEdit(item: any) {
    setEditItem(item);
    setForm({
      nama_projek: item.nama_projek,
      projek_id:   item.projek_id ? String(item.projek_id) : "",
      projek_type: item.projek_type ?? "",
      tanggal:     item.tanggal?.slice(0,10) ?? "",
      jam:         item.jam ?? "",
      keterangan:  item.keterangan ?? "",
      status:      item.status ?? "Terjadwal",
      pic_user_ids: item.pics?.map((p: any) => String(p.user_id)) ?? [],
    });
    setFormOpen(true);
  }
  function closeForm() { setFormOpen(false); setEditItem(null); setForm({ ...EMPTY_FORM }); }
  function closeKonfirmasi() { setKonfirmasiOpen(null); setFotoBukti(null); setFotoPreview(null); setCatatanKonfirmasi(""); }

  function handleProjekChange(val: string) {
    if (!val) { setForm(f => ({ ...f, projek_id: "", projek_type: "", nama_projek: "" })); return; }
    const opt = (projekOptions as any[]).find((p: any) => `${p.type}:${p.id}` === val);
    if (opt) setForm(f => ({ ...f, projek_id: opt.id, projek_type: opt.type, nama_projek: opt.label }));
  }

  function togglePic(uid: string) {
    setForm(f => ({
      ...f,
      pic_user_ids: f.pic_user_ids.includes(uid) ? f.pic_user_ids.filter(id => id!==uid) : [...f.pic_user_ids, uid],
    }));
  }

  function handleSubmitForm() {
    const payload = { nama_projek: form.nama_projek, projek_id: form.projek_id||null, projek_type: form.projek_type||null, tanggal: form.tanggal, jam: form.jam||null, keterangan: form.keterangan||null, status: form.status, pic_user_ids: form.pic_user_ids };
    if (editItem) updateMut.mutate({ id: String(editItem.id), data: payload });
    else createMut.mutate(payload);
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2*1024*1024) { toast.error("Ukuran foto maksimal 2MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { const r = ev.target?.result as string; setFotoPreview(r); setFotoBukti(r); };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // Stats
  const totalVisit    = visits.length;
  const terjadwal     = visits.filter(v => v.status === "Terjadwal").length;
  const selesai       = visits.filter(v => v.status === "Selesai").length;
  const dibatalkan    = visits.filter(v => v.status === "Dibatalkan").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-orange-500" /> Kalender Visit
          </h1>
          <p className="text-sm text-muted-foreground">Penjadwalan kunjungan proyek & konfirmasi PIC</p>
        </div>
        {canManage && (
          <Button onClick={() => openCreate()} className="gap-1.5 bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4" /> Tambah Jadwal
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Visit",  value: totalVisit, icon: CalendarDays, color: "text-orange-500", bg: "bg-orange-50" },
          { label: "Terjadwal",    value: terjadwal,  icon: Clock,        color: "text-blue-500",   bg: "bg-blue-50" },
          { label: "Selesai",      value: selesai,    icon: CheckCircle,  color: "text-green-600",  bg: "bg-green-50" },
          { label: "Dibatalkan",   value: dibatalkan, icon: X,            color: "text-gray-500",   bg: "bg-gray-50" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.bg}`}>
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={filterProjekId || "__all__"}
          onValueChange={(v) => { setFilterProjekId(v === "__all__" ? "" : v); setSelectedDate(null); }}
        >
          <SelectTrigger className="w-52 text-sm h-9">
            <SelectValue placeholder="Semua Projek" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Semua Projek</SelectItem>
            {(projekOptions as any[]).map((p: any) => (
              <SelectItem key={`${p.type}:${p.id}`} value={String(p.id)}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterPicId || "__all__"}
          onValueChange={(v) => { setFilterPicId(v === "__all__" ? "" : v); setSelectedDate(null); }}
        >
          <SelectTrigger className="w-44 text-sm h-9">
            <SelectValue placeholder="Semua PIC" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Semua PIC</SelectItem>
            {(allUsers as any[]).map((u: any) => (
              <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(filterProjekId || filterPicId) && (
          <Button variant="ghost" size="sm" className="text-xs h-9 px-3"
            onClick={() => { setFilterProjekId(""); setFilterPicId(""); setSelectedDate(null); }}>
            Reset Filter
          </Button>
        )}
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <CardTitle className="text-lg font-bold">{MONTH_NAMES[bulan-1]} {tahun}</CardTitle>
            <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground pt-1 flex-wrap">
            {[
              { label: "Terjadwal",   cls: "bg-blue-200 border-blue-400" },
              { label: "Berlangsung", cls: "bg-yellow-200 border-yellow-400" },
              { label: "Selesai",     cls: "bg-green-200 border-green-400" },
              { label: "Dibatalkan",  cls: "bg-gray-200 border-gray-300" },
            ].map(l => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-sm border inline-block ${l.cls}`} />
                {l.label}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b mb-1">
            {DAY_NAMES.map((d, i) => (
              <div key={d} className={`text-center text-xs font-semibold py-2 ${i===0?"text-red-500":"text-muted-foreground"}`}>{d}</div>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-7 gap-1 mt-1">
              {Array.from({length:35}).map((_,i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 mt-1">
              {cells.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="h-24" />;
                const dKey  = dateKey(day);
                const bg    = cellBg(day);
                const isToday    = dKey === todayKey;
                const isSelected = selectedDate === dKey;
                const entries    = byDate[dKey] ?? [];
                const isSunday   = idx % 7 === 0;

                return (
                  <button
                    key={dKey}
                    onClick={() => setSelectedDate(isSelected ? null : dKey)}
                    className={[
                      "relative h-24 rounded-lg border text-left p-1.5 transition-all overflow-hidden flex flex-col",
                      isSelected
                        ? "border-orange-500 ring-2 ring-orange-400 bg-orange-50"
                        : entries.length > 0
                        ? `${bg} border`
                        : "border-gray-100 hover:bg-muted/40 hover:border-gray-300",
                    ].join(" ")}
                  >
                    <span className={[
                      "text-xs font-bold leading-none shrink-0",
                      isToday ? "bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                        : isSunday ? "text-red-500" : "text-gray-700",
                    ].join(" ")}>
                      {day}
                    </span>
                    {entries.length > 0 && (
                      <div className="flex-1 mt-0.5 space-y-0.5 overflow-hidden">
                        {entries.slice(0,2).map((e: any) => (
                          <div key={e.id} className={`rounded border px-1 py-0.5 ${STATUS_COLOR[e.status] ?? "bg-gray-100 text-gray-700"}`}>
                            <p className="text-[9px] font-semibold leading-tight truncate">{e.nama_projek}</p>
                            {e.jam && <p className="text-[8px] leading-tight opacity-70">{e.jam}</p>}
                            <p className="text-[8px] leading-tight opacity-60">{e.pics?.length ?? 0} PIC</p>
                          </div>
                        ))}
                        {entries.length > 2 && (
                          <p className="text-[9px] text-muted-foreground pl-0.5">+{entries.length-2} lainnya</p>
                        )}
                      </div>
                    )}
                    {/* Dot: jadwal saya */}
                    {entries.some((e: any) => myPicMap[String(e.id)]) && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" title="Jadwal saya" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected date detail */}
      {selectedDate && (
        <Card className="border-orange-300 bg-orange-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-orange-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {new Date(selectedDate+"T00:00:00").toLocaleDateString("id-ID", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
              </span>
              {canManage && (
                <Button size="sm" className="h-7 text-xs bg-orange-500 hover:bg-orange-600 gap-1"
                  onClick={() => openCreate(selectedDate)}>
                  <Plus className="h-3.5 w-3.5" /> Tambah
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {selectedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Tidak ada jadwal</p>
            ) : selectedItems.map((v: any) => {
              const myPic = myPicMap[String(v.id)];
              return (
                <div key={v.id} className="bg-white rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{v.nama_projek}</p>
                        <Badge variant="outline" className={`text-[10px] px-1.5 ${STATUS_COLOR[v.status] ?? ""}`}>{v.status}</Badge>
                      </div>
                      {v.jam && <p className="text-xs text-muted-foreground mt-0.5">Jam: {v.jam}</p>}
                      {v.keterangan && <p className="text-xs text-muted-foreground mt-0.5">{v.keterangan}</p>}
                      {/* PIC list */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {v.pics?.map((p: any) => (
                          <div key={p.id} className="flex items-center gap-1 text-xs bg-muted rounded-full px-2 py-0.5">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span>{p.user?.name ?? "—"}</span>
                            <span className={`ml-1 text-[10px] font-semibold px-1 rounded-full ${p.status_konfirmasi==="Dikonfirmasi" ? "text-green-700 bg-green-100" : "text-gray-500 bg-gray-100"}`}>
                              {p.status_konfirmasi}
                            </span>
                            {p.foto_bukti && (
                              <button className="ml-1 text-blue-500 text-[10px] underline"
                                onClick={() => setViewFotoUrl(`${API_URL}${p.foto_bukti}`)}>
                                Foto
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          onClick={() => { if(confirm("Hapus jadwal ini?")) deleteMut.mutate(String(v.id)); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {/* Tombol konfirmasi PIC */}
                  {myPic && myPic.status_konfirmasi !== "Dikonfirmasi" && (
                    <Button size="sm" className="h-7 text-xs bg-orange-500 hover:bg-orange-600 gap-1 w-full"
                      onClick={() => setKonfirmasiOpen({ ...myPic, kalender_visit_id: v.id })}>
                      <Camera className="h-3.5 w-3.5" /> Upload Foto Konfirmasi
                    </Button>
                  )}
                  {myPic && myPic.status_konfirmasi === "Dikonfirmasi" && (
                    <p className="text-xs text-green-700 flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> Anda sudah konfirmasi kehadiran
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Dialog Tambah/Edit ── */}
      <Dialog open={formOpen} onOpenChange={v => { if(!v) closeForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-orange-500" />
              {editItem ? "Edit Jadwal Visit" : "Tambah Jadwal Visit"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Projek <span className="text-red-500">*</span></Label>
              <select
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                value={form.projek_id ? `${form.projek_type}:${form.projek_id}` : ""}
                onChange={e => handleProjekChange(e.target.value)}
              >
                <option value="">-- Pilih Projek --</option>
                {(projekOptions as any[]).filter(p => p.type==="sipil").length > 0 && (
                  <optgroup label="Projek Sipil">
                    {(projekOptions as any[]).filter(p => p.type==="sipil").map((p: any) => (
                      <option key={p.id} value={`sipil:${p.id}`}>{p.label}</option>
                    ))}
                  </optgroup>
                )}
                {(projekOptions as any[]).filter(p => p.type==="interior").length > 0 && (
                  <optgroup label="Projek Interior">
                    {(projekOptions as any[]).filter(p => p.type==="interior").map((p: any) => (
                      <option key={p.id} value={`interior:${p.id}`}>{p.label}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tanggal <span className="text-red-500">*</span></Label>
                <Input className="mt-1" type="date" value={form.tanggal}
                  onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} />
              </div>
              <div>
                <Label>Jam</Label>
                <Input className="mt-1" type="time" value={form.jam}
                  onChange={e => setForm(f => ({ ...f, jam: e.target.value }))} />
              </div>
            </div>
            {editItem && (
              <div>
                <Label>Status</Label>
                <select className="mt-1 w-full border rounded-md px-3 py-2 text-sm" value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option>Terjadwal</option>
                  <option>Berlangsung</option>
                  <option>Selesai</option>
                  <option>Dibatalkan</option>
                </select>
              </div>
            )}
            <div>
              <Label>Keterangan</Label>
              <Textarea className="mt-1" rows={2} placeholder="Catatan tambahan..."
                value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} />
            </div>
            <div>
              <Label>Pilih PIC <span className="text-red-500">*</span></Label>
              <p className="text-xs text-muted-foreground mb-1">Bisa pilih lebih dari satu</p>
              <div className="border rounded-md p-2 max-h-44 overflow-y-auto space-y-0.5">
                {(allUsers as any[]).map((u: any) => (
                  <label key={u.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 accent-orange-500"
                      checked={form.pic_user_ids.includes(String(u.id))}
                      onChange={() => togglePic(String(u.id))} />
                    <span className="text-sm">{u.name}</span>
                  </label>
                ))}
              </div>
              {form.pic_user_ids.length > 0 && (
                <p className="text-xs text-orange-600 mt-1">{form.pic_user_ids.length} karyawan dipilih</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={closeForm}>Batal</Button>
              <Button
                disabled={!form.projek_id || !form.tanggal || form.pic_user_ids.length===0 || createMut.isPending || updateMut.isPending}
                onClick={handleSubmitForm}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {(createMut.isPending||updateMut.isPending) ? "Menyimpan..." : (editItem ? "Simpan" : "Buat Jadwal")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Konfirmasi PIC ── */}
      <Dialog open={!!konfirmasiOpen} onOpenChange={v => { if(!v) closeKonfirmasi(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-orange-500" /> Konfirmasi Kehadiran
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">Upload foto sebagai bukti kehadiran di lokasi visit.</p>
            <div>
              <Label>Foto Bukti <span className="text-red-500">*</span></Label>
              {fotoPreview ? (
                <div className="mt-1 relative border rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fotoPreview} alt="preview" className="w-full max-h-48 object-cover" />
                  <button className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                    onClick={() => { setFotoPreview(null); setFotoBukti(null); }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
                  onClick={() => fileRef.current?.click()}>
                  <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Klik untuk upload foto</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">JPG/PNG, maks. 2MB</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
            </div>
            <div>
              <Label>Catatan (opsional)</Label>
              <Textarea className="mt-1" rows={2} placeholder="Catatan tambahan..."
                value={catatanKonfirmasi} onChange={e => setCatatanKonfirmasi(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeKonfirmasi}>Batal</Button>
              <Button disabled={!fotoBukti || konfirmasiMut.isPending}
                onClick={() => konfirmasiMut.mutate({ id: String(konfirmasiOpen.kalender_visit_id ?? konfirmasiOpen.id), data: { foto_bukti: fotoBukti, catatan: catatanKonfirmasi||null } })}
                className="bg-orange-500 hover:bg-orange-600">
                {konfirmasiMut.isPending ? "Mengirim..." : "Kirim Konfirmasi"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Lihat Foto ── */}
      <Dialog open={!!viewFotoUrl} onOpenChange={v => { if(!v) setViewFotoUrl(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Foto Bukti</DialogTitle></DialogHeader>
          {viewFotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewFotoUrl} alt="foto bukti" className="w-full rounded-lg max-h-[70vh] object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
