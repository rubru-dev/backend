"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Camera, CheckCircle, Clock, XCircle, ChevronLeft, Upload, ChevronRight,
  Plus, X, Loader2, ImageIcon, Building2, Users, ChevronDown,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MAX_FILE_MB = 30;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

const api = {
  getProjects: () => apiClient.get("/finance/tukang-absen/projects").then((r) => r.data),
  getMyTukang: (pid: number) => apiClient.get(`/finance/tukang-absen/${pid}/my-tukang`).then((r) => r.data),
  getMyAbsen: (pid: number) => apiClient.get(`/finance/tukang-absen/${pid}/my-absen`).then((r) => r.data),
  submitAbsen: (pid: number, data: { foto: string; tanggal: string }) =>
    apiClient.post(`/finance/tukang-absen/${pid}/submit`, data).then((r) => r.data),
  getMyBon: (pid: number) => apiClient.get(`/finance/tukang-absen/${pid}/my-bon`).then((r) => r.data),
  submitBon: (pid: number, data: any) =>
    apiClient.post(`/finance/tukang-absen/${pid}/submit-bon`, data).then((r) => r.data),
};

type Project = {
  id: number;
  nama_proyek: string;
  klien?: string;
  lokasi?: string;
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Pending:   { label: "Menunggu",  color: "secondary",   icon: <Clock className="h-3 w-3" /> },
  Disetujui: { label: "Disetujui", color: "default",     icon: <CheckCircle className="h-3 w-3" /> },
  Ditolak:   { label: "Ditolak",   color: "destructive", icon: <XCircle className="h-3 w-3" /> },
};

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

/** Gambar timestamp di sudut kanan bawah foto menggunakan Canvas */
async function addTimestamp(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const now = new Date();
      const ts = now.toLocaleString("id-ID", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });

      const fontSize = Math.max(14, Math.round(img.width * 0.028));
      ctx.font = `bold ${fontSize}px monospace`;
      const textWidth = ctx.measureText(ts).width;
      const pad = Math.round(fontSize * 0.5);

      // Background semi-transparan
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(
        img.width - textWidth - pad * 2 - 6,
        img.height - fontSize - pad * 2 - 6,
        textWidth + pad * 2,
        fontSize + pad + 4,
      );

      // Teks kuning
      ctx.fillStyle = "#FFE600";
      ctx.fillText(ts, img.width - textWidth - pad - 6, img.height - pad - 8);

      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.src = dataUrl;
  });
}

function validateFile(file: File): boolean {
  if (file.size > MAX_FILE_BYTES) {
    toast.error(`File terlalu besar. Maksimal ${MAX_FILE_MB}MB`);
    return false;
  }
  return true;
}

// ── Admin Overview Component ──────────────────────────────────────────────────
function AdminAbsenOverview() {
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [expandedTukang, setExpandedTukang] = useState<string | null>(null);
  const [viewFoto, setViewFoto] = useState<string | null>(null);

  const { data: allData = [], isLoading } = useQuery({
    queryKey: ["tukang-absen-admin-all"],
    queryFn: () => apiClient.get("/finance/tukang-absen/admin/all").then(r => r.data as any[]),
  });

  const STATUS_COLOR: Record<string, string> = {
    Disetujui: "bg-green-100 text-green-700",
    Pending: "bg-blue-100 text-blue-700",
    Ditolak: "bg-red-100 text-red-700",
  };

  function fmtTgl(d: string) { return new Date(d).toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric" }); }

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="text-orange-500" size={22} /> Absen Tukang — Semua Projek
        </h1>
        <p className="text-sm text-muted-foreground">Super Admin view: semua tukang terdaftar di semua projek aktif beserta rincian absennya</p>
      </div>

      {allData.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="mx-auto h-12 w-12 opacity-20 mb-3" />
          <p>Tidak ada projek aktif dengan tukang terdaftar</p>
        </div>
      )}

      {allData.map((proj: any) => (
        <div key={proj.id} className="border rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition"
            onClick={() => setExpandedProject(expandedProject === proj.id ? null : proj.id)}
          >
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-teal-600" />
              <div className="text-left">
                <p className="font-semibold text-sm">{proj.nama_proyek}</p>
                <p className="text-xs text-muted-foreground">{proj.klien} {proj.lokasi ? `· ${proj.lokasi}` : ""}</p>
              </div>
              <Badge variant="outline" className="text-xs">{proj.total_tukang} tukang</Badge>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedProject === proj.id ? "rotate-180" : ""}`} />
          </button>

          {expandedProject === proj.id && (
            <div className="divide-y">
              {proj.tukangs.length === 0 && (
                <p className="px-4 py-3 text-sm text-muted-foreground">Belum ada tukang terdaftar</p>
              )}
              {proj.tukangs.map((t: any) => (
                <div key={t.id} className="px-4">
                  <button
                    className="w-full flex items-center justify-between py-3 hover:opacity-80 transition"
                    onClick={() => setExpandedTukang(expandedTukang === t.id ? null : t.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${t.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                      <div className="text-left">
                        <p className="font-medium text-sm">{t.nama}</p>
                        <p className="text-xs text-muted-foreground">{t.jabatan || "—"} · {t.total_absen} hari hadir</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{t.absen.length} catatan absen</Badge>
                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expandedTukang === t.id ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {expandedTukang === t.id && (
                    <div className="pb-3">
                      {t.absen.length === 0 ? (
                        <p className="text-sm text-muted-foreground pl-5">Belum ada absen</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Tanggal</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="text-xs">Catatan</TableHead>
                              <TableHead className="text-xs w-16">Foto</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {t.absen.map((a: any) => (
                              <TableRow key={a.id}>
                                <TableCell className="text-xs py-2">{fmtTgl(a.tanggal)}</TableCell>
                                <TableCell className="py-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[a.status] ?? "bg-gray-100 text-gray-600"}`}>{a.status}</span>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground py-2">{a.catatan || "—"}</TableCell>
                                <TableCell className="py-2">
                                  {a.foto && (
                                    <button onClick={() => setViewFoto(a.foto)} className="text-xs text-blue-600 underline">Lihat</button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Foto dialog */}
      {viewFoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setViewFoto(null)}>
          <div className="relative max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <img src={viewFoto} alt="Foto absen" className="w-full rounded-xl border-4 border-white shadow-xl" />
            <button onClick={() => setViewFoto(null)} className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page Router ───────────────────────────────────────────────────────────────
export default function AbsenTukangPage() {
  const { isSuperAdmin, hasPermission } = useAuthStore();
  if (isSuperAdmin() || hasPermission("finance", "view")) {
    return <AdminAbsenOverview />;
  }
  return <AbsenTukangPageInner />;
}

function AbsenTukangPageInner() {
  const qc = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [openUpload, setOpenUpload] = useState(false);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoProcessing, setFotoProcessing] = useState(false);
  const [viewFoto, setViewFoto] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bon Material state (foto saja, multiple)
  const [showBonForm, setShowBonForm] = useState(false);
  const [bonFotos, setBonFotos] = useState<string[]>([]);
  const [bonProcessing, setBonProcessing] = useState(false);
  const bonFotoRef = useRef<HTMLInputElement>(null);
  const [viewBonFoto, setViewBonFoto] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ["tukang-projects"],
    queryFn: api.getProjects,
  });

  const { data: myTukang, isLoading: loadingTukang } = useQuery({
    queryKey: ["my-tukang", selectedProject?.id],
    queryFn: () => api.getMyTukang(selectedProject!.id),
    enabled: !!selectedProject,
    retry: false,
  });

  const { data: absenHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ["my-absen", selectedProject?.id],
    queryFn: () => api.getMyAbsen(selectedProject!.id),
    enabled: !!selectedProject && !!myTukang,
    retry: false,
  });

  const { data: myBonData } = useQuery({
    queryKey: ["my-bon", selectedProject?.id],
    queryFn: () => api.getMyBon(selectedProject!.id),
    enabled: !!selectedProject && !!myTukang,
    retry: false,
  });
  const myBons: any[] = Array.isArray(myBonData) ? myBonData : [];

  const submitBonMut = useMutation({
    mutationFn: async (fotos: string[]) => {
      for (const foto of fotos) {
        await api.submitBon(selectedProject!.id, { foto_bon: foto });
      }
    },
    onSuccess: () => {
      toast.success("Foto bon berhasil dikirim");
      qc.invalidateQueries({ queryKey: ["my-bon", selectedProject?.id] });
      setShowBonForm(false);
      setBonFotos([]);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal mengirim bon"),
  });

  const submitMut = useMutation({
    mutationFn: ({ foto }: { foto: string }) =>
      api.submitAbsen(selectedProject!.id, { foto, tanggal: selectedDate }),
    onSuccess: () => {
      toast.success("Absensi berhasil dikirim! Menunggu persetujuan Admin Finance.");
      qc.invalidateQueries({ queryKey: ["my-absen", selectedProject?.id] });
      setOpenUpload(false);
      setFotoPreview(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal mengirim absensi"),
  });

  // Absen foto: validasi ukuran + tambah timestamp
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateFile(file)) { e.target.value = ""; return; }
    setFotoProcessing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const stamped = await addTimestamp(reader.result as string);
      setFotoPreview(stamped);
      setFotoProcessing(false);
    };
    reader.readAsDataURL(file);
  }

  // Bon foto: validasi + timestamp, append ke array
  async function handleBonFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const valid = files.filter((f) => {
      if (!validateFile(f)) return false;
      return true;
    });
    if (!valid.length) { e.target.value = ""; return; }
    setBonProcessing(true);
    const results: string[] = [];
    for (const file of valid) {
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const stamped = await addTimestamp(reader.result as string);
          results.push(stamped);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    setBonFotos((prev) => [...prev, ...results]);
    setBonProcessing(false);
    e.target.value = "";
  }

  function removeBonFoto(idx: number) {
    setBonFotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit() {
    if (!fotoPreview) return;
    submitMut.mutate({ foto: fotoPreview });
  }

  const history: any[] = Array.isArray(absenHistory) ? absenHistory : [];
  const todayAbsen = history.find((a) => a.tanggal?.slice(0, 10) === today);

  function openUploadDialog() {
    setSelectedDate(today);
    setFotoPreview(null);
    setOpenUpload(true);
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        {selectedProject && (
          <Button variant="ghost" size="icon" onClick={() => setSelectedProject(null)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1 className="text-xl font-bold">Absen Tukang</h1>
          {selectedProject && <p className="text-sm text-muted-foreground">{selectedProject.nama_proyek}</p>}
        </div>
      </div>

      {/* Project selection */}
      {!selectedProject && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Pilih proyek tempat Anda bekerja:</p>
          {loadingProjects
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
            : (projects ?? []).length > 0
            ? (
              <div className="border rounded-md divide-y">
                {(projects ?? []).map((p: Project) => (
                  <button
                    key={p.id}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => setSelectedProject(p)}
                  >
                    <div>
                      <p className="font-medium text-sm">{p.nama_proyek || "-"}</p>
                      {(p.klien || p.lokasi) && (
                        <p className="text-xs text-muted-foreground">{[p.klien, p.lokasi].filter(Boolean).join(" · ")}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )
            : <p className="text-center py-8 text-muted-foreground text-sm">Tidak ada proyek aktif</p>}
        </div>
      )}

      {/* Project selected */}
      {selectedProject && (
        <>
          {loadingTukang && <Skeleton className="h-20 w-full rounded-lg" />}

          {!loadingTukang && !myTukang && (
            <Card className="border-destructive">
              <CardContent className="p-4 text-center">
                <p className="text-destructive text-sm font-medium">Anda belum terdaftar sebagai tukang di proyek ini.</p>
                <p className="text-xs text-muted-foreground mt-1">Hubungi Admin Finance untuk mendaftarkan akun Anda.</p>
              </CardContent>
            </Card>
          )}

          {myTukang && (
            <>
              {/* Tukang info */}
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{myTukang.nama}</p>
                    <p className="text-sm text-muted-foreground">{myTukang.jabatan || "Tukang"}</p>
                  </div>
                  {todayAbsen ? (
                    <Badge variant={STATUS_MAP[todayAbsen.status]?.color as any ?? "secondary"} className="gap-1">
                      {STATUS_MAP[todayAbsen.status]?.icon}
                      {STATUS_MAP[todayAbsen.status]?.label ?? todayAbsen.status}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Belum Absen</Badge>
                  )}
                </CardContent>
              </Card>

              {/* Absen buttons */}
              {!todayAbsen && (
                <Button className="w-full" size="lg" onClick={openUploadDialog}>
                  <Camera className="h-5 w-5 mr-2" /> Upload Foto Absen Hari Ini
                </Button>
              )}
              {todayAbsen && todayAbsen.status === "Ditolak" && (
                <Button className="w-full" size="lg" variant="outline" onClick={openUploadDialog}>
                  <Camera className="h-5 w-5 mr-2" /> Upload Ulang Foto Absen
                </Button>
              )}
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setFotoPreview(null); setOpenUpload(true); }}>
                <Upload className="h-3 w-3 mr-1" /> Upload Absen Tanggal Lain
              </Button>

              {/* History */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Riwayat Absensi</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingHistory
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-5 w-20 ml-auto" />
                        </div>
                      ))
                    : history.length === 0
                    ? <p className="text-center py-8 text-muted-foreground text-sm">Belum ada riwayat absensi</p>
                    : history.map((a: any) => {
                        const st = STATUS_MAP[a.status];
                        return (
                          <div key={a.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{formatDate(a.tanggal)}</p>
                              {a.catatan && <p className="text-xs text-muted-foreground">{a.catatan}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              {a.foto && (
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setViewFoto(a.foto)}>
                                  Lihat
                                </Button>
                              )}
                              <Badge variant={st?.color as any ?? "secondary"} className="gap-1 text-xs">
                                {st?.icon} {st?.label ?? a.status}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                </CardContent>
              </Card>

              {/* Bon / Struk Material — foto saja, multiple */}
              <Card>
                <CardHeader className="pb-3 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <span>🧾</span> Bon / Struk Material
                    </CardTitle>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowBonForm((s) => !s)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Tambah
                    </Button>
                  </div>
                </CardHeader>

                {showBonForm && (
                  <CardContent className="pt-0 pb-4 space-y-3">
                    {/* Drop zone foto bon */}
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-orange-400 transition-colors"
                      onClick={() => bonFotoRef.current?.click()}
                    >
                      <ImageIcon className="h-7 w-7 text-gray-300 mx-auto mb-1" />
                      <p className="text-xs text-gray-400">Klik untuk foto bon/struk (bisa lebih dari satu)</p>
                      <p className="text-xs text-gray-300 mt-0.5">JPG, PNG — maks {MAX_FILE_MB}MB/foto</p>
                    </div>
                    <input
                      ref={bonFotoRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      className="hidden"
                      onChange={handleBonFotoChange}
                    />

                    {bonProcessing && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Menambahkan timestamp...
                      </div>
                    )}

                    {/* Preview grid */}
                    {bonFotos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {bonFotos.map((src, idx) => (
                          <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt={`bon-${idx}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeBonFoto(idx)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => bonFotoRef.current?.click()}
                          className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-orange-400 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-orange-500 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          <span className="text-xs">Tambah</span>
                        </button>
                      </div>
                    )}
                    {bonFotos.length > 0 && (
                      <p className="text-xs text-muted-foreground">{bonFotos.length} foto dipilih</p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        disabled={!bonFotos.length || submitBonMut.isPending || bonProcessing}
                        onClick={() => submitBonMut.mutate(bonFotos)}
                      >
                        {submitBonMut.isPending
                          ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Mengirim...</>
                          : `Kirim ${bonFotos.length > 0 ? bonFotos.length + " Foto" : "Bon"}`}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setShowBonForm(false); setBonFotos([]); }}>
                        Batal
                      </Button>
                    </div>
                  </CardContent>
                )}

                <CardContent className="pt-0 pb-4">
                  {myBons.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">Belum ada bon material</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {myBons.map((b: any) =>
                        b.foto_bon ? (
                          <button
                            key={b.id}
                            onClick={() => setViewBonFoto(b.foto_bon)}
                            className="aspect-square rounded-lg overflow-hidden border hover:opacity-90 transition-opacity"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={b.foto_bon} alt="bon" className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <div key={b.id} className="aspect-square rounded-lg border bg-slate-50 flex items-center justify-center text-slate-300 text-2xl">
                            🧾
                          </div>
                        )
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* View Bon Foto */}
      {viewBonFoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setViewBonFoto(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewBonFoto} alt="bon" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}

      {/* Upload Absen Dialog */}
      <Dialog open={openUpload} onOpenChange={setOpenUpload}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" /> Upload Foto Absensi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm">Tanggal Absen</Label>
              <Input
                type="date"
                value={selectedDate}
                max={today}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full"
              />
            </div>
            <label
              className="block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {fotoProcessing ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Menambahkan timestamp...</p>
                </div>
              ) : fotoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fotoPreview} alt="preview" className="max-h-48 mx-auto object-contain rounded" />
              ) : (
                <>
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Klik untuk memilih foto</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG / PNG, maks {MAX_FILE_MB}MB</p>
                </>
              )}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            {fotoPreview && !fotoProcessing && (
              <Button variant="outline" size="sm" onClick={() => { setFotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                Ganti Foto
              </Button>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setOpenUpload(false); setFotoPreview(null); }}>Batal</Button>
              <Button disabled={!fotoPreview || fotoProcessing || submitMut.isPending} onClick={handleSubmit}>
                {submitMut.isPending ? "Mengirim..." : "Kirim Absensi"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Foto Dialog */}
      <Dialog open={!!viewFoto} onOpenChange={() => setViewFoto(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Foto</DialogTitle></DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {viewFoto && <img src={viewFoto} alt="foto" className="w-full rounded-lg object-contain max-h-96" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
