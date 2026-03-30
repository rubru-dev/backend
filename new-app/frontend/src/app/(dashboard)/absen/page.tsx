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
import { Textarea } from "@/components/ui/textarea";
import {
  Camera, CheckCircle, Clock, XCircle, ChevronLeft, Upload, ChevronRight,
  Images, Plus, Trash2, FolderOpen, AlertTriangle, X, Loader2, ImageIcon,
} from "lucide-react";

const api = {
  getProjects: () => apiClient.get("/finance/tukang-absen/projects").then((r) => r.data),
  getMyTukang: (pid: number) => apiClient.get(`/finance/tukang-absen/${pid}/my-tukang`).then((r) => r.data),
  getMyAbsen: (pid: number) => apiClient.get(`/finance/tukang-absen/${pid}/my-absen`).then((r) => r.data),
  submitAbsen: (pid: number, data: { foto: string; tanggal: string }) =>
    apiClient.post(`/finance/tukang-absen/${pid}/submit`, data).then((r) => r.data),
  getTermins: (type: string, proyekBerjalanId: string) =>
    apiClient.get(`/pic/projeks/${type}/${proyekBerjalanId}/termins`).then((r) => r.data),
  uploadFotos: (type: string, taskId: string, formData: FormData) =>
    apiClient.post(`/pic/tasks/${type}/${taskId}/fotos`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
};

type Project = {
  id: number;
  nama_proyek: string;
  klien?: string;
  lokasi?: string;
  proyek_berjalan_id?: string | null;
  jenis?: string | null;
};
type Foto = { id: string; file_path: string; keterangan?: string; kendala?: string; uploader?: string; created_at: string };
type Task = { id: string; nama_pekerjaan: string; status: string; fotos: Foto[] };
type Termin = { id: string; nama: string; urutan: number; tasks: Task[] };

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Pending:   { label: "Menunggu",  color: "secondary",   icon: <Clock className="h-3 w-3" /> },
  Disetujui: { label: "Disetujui", color: "default",     icon: <CheckCircle className="h-3 w-3" /> },
  Ditolak:   { label: "Ditolak",   color: "destructive", icon: <XCircle className="h-3 w-3" /> },
};

const STATUS_TASK: Record<string, string> = {
  "Selesai":     "bg-green-100 text-green-700",
  "Proses":      "bg-blue-100 text-blue-700",
  "Belum Mulai": "bg-gray-100 text-gray-600",
};

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function getPicType(jenis?: string | null) {
  if (!jenis) return null;
  return jenis.toLowerCase() === "interior" ? "interior" : "sipil";
}

export default function AbsenTukangPage() {
  const qc = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [openUpload, setOpenUpload] = useState(false);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [viewFoto, setViewFoto] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dokumentasi state
  const [dokStep, setDokStep] = useState<"termin" | "task" | "upload">("termin");
  const [dokTermin, setDokTermin] = useState<Termin | null>(null);
  const [dokTask, setDokTask] = useState<Task | null>(null);
  const [dokFiles, setDokFiles] = useState<File[]>([]);
  const [dokPreviews, setDokPreviews] = useState<string[]>([]);
  const [dokKeterangan, setDokKeterangan] = useState("");
  const [dokKendala, setDokKendala] = useState("");
  const [showDok, setShowDok] = useState(false);
  const dokInputRef = useRef<HTMLInputElement>(null);

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

  const picType = getPicType(selectedProject?.jenis);
  const proyekBerjalanId = selectedProject?.proyek_berjalan_id;

  const { data: terminData, isLoading: loadingTermins } = useQuery({
    queryKey: ["tukang-dok-termins", proyekBerjalanId, picType],
    queryFn: () => api.getTermins(picType!, String(proyekBerjalanId!)),
    enabled: !!picType && !!proyekBerjalanId && showDok,
    retry: false,
  });
  const termins: Termin[] = terminData?.termins ?? [];

  // Fresh task data after upload
  const freshTask = termins.flatMap((t) => t.tasks).find((tk) => tk.id === dokTask?.id) ?? dokTask;

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

  const uploadDokMut = useMutation({
    mutationFn: ({ type, taskId, fd }: { type: string; taskId: string; fd: FormData }) =>
      api.uploadFotos(type, taskId, fd),
    onSuccess: () => {
      toast.success(`${dokFiles.length} foto berhasil diupload`);
      qc.invalidateQueries({ queryKey: ["tukang-dok-termins", proyekBerjalanId, picType] });
      setDokFiles([]);
      setDokPreviews([]);
      setDokKeterangan("");
      setDokKendala("");
      if (dokInputRef.current) dokInputRef.current.value = "";
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal upload foto"),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleDokFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setDokFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setDokPreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removeDokFile(idx: number) {
    setDokFiles((prev) => prev.filter((_, i) => i !== idx));
    setDokPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleUploadDok() {
    if (!dokFiles.length || !dokTask || !picType) return;
    const fd = new FormData();
    dokFiles.forEach((f) => fd.append("fotos", f));
    if (dokKeterangan) fd.append("keterangan", dokKeterangan);
    if (dokKendala) fd.append("kendala", dokKendala);
    uploadDokMut.mutate({ type: picType, taskId: dokTask.id, fd });
  }

  function resetDok() {
    setDokStep("termin");
    setDokTermin(null);
    setDokTask(null);
    setDokFiles([]);
    setDokPreviews([]);
    setDokKeterangan("");
    setDokKendala("");
  }

  function openDok() {
    resetDok();
    setShowDok(true);
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
          <Button variant="ghost" size="icon" onClick={() => { setSelectedProject(null); setShowDok(false); resetDok(); }}>
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
                    onClick={() => { setSelectedProject(p); setShowDok(false); resetDok(); }}
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

              {/* Foto Dokumentasi — termin/task flow */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Images className="h-4 w-4 text-blue-500" /> Foto Dokumentasi
                    </CardTitle>
                    {!showDok && picType && proyekBerjalanId && (
                      <Button size="sm" variant="outline" onClick={openDok}>
                        <Plus className="h-3 w-3 mr-1" /> Tambah
                      </Button>
                    )}
                    {showDok && (
                      <Button size="sm" variant="ghost" onClick={() => { setShowDok(false); resetDok(); }}>
                        <X className="h-3.5 w-3.5 mr-1" /> Tutup
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {!picType || !proyekBerjalanId ? (
                  <CardContent className="pt-0 pb-4">
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Dokumentasi termin belum tersedia — proyek belum terhubung ke projek Sipil/Interior.
                    </p>
                  </CardContent>
                ) : showDok ? (
                  <CardContent className="pt-0 space-y-4">

                    {/* Breadcrumb mini */}
                    {(dokTermin || dokTask) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
                        <button onClick={() => { setDokStep("termin"); setDokTermin(null); setDokTask(null); setDokFiles([]); setDokPreviews([]); }}
                          className="text-blue-500 hover:underline">Termin</button>
                        {dokTermin && (
                          <>
                            <ChevronRight className="h-3 w-3" />
                            <button onClick={() => { setDokStep("task"); setDokTask(null); setDokFiles([]); setDokPreviews([]); }}
                              className="text-blue-500 hover:underline">{dokTermin.nama ?? `Termin ${dokTermin.urutan}`}</button>
                          </>
                        )}
                        {dokTask && (
                          <>
                            <ChevronRight className="h-3 w-3" />
                            <span className="font-medium text-foreground truncate max-w-[160px]">{dokTask.nama_pekerjaan}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Step: Pilih Termin */}
                    {dokStep === "termin" && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Pilih Termin</p>
                        {loadingTermins ? (
                          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
                        ) : termins.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">Belum ada termin</p>
                        ) : (
                          termins.map((t) => (
                            <button key={t.id}
                              onClick={() => { setDokTermin(t); setDokStep("task"); }}
                              className="w-full text-left p-3 rounded-lg border hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-between group">
                              <div className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4 text-muted-foreground group-hover:text-blue-500" />
                                <div>
                                  <p className="text-sm font-medium group-hover:text-blue-600">{t.nama ?? `Termin ${t.urutan}`}</p>
                                  <p className="text-xs text-muted-foreground">{t.tasks.length} item pekerjaan</p>
                                </div>
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-500" />
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    {/* Step: Pilih Task */}
                    {dokStep === "task" && dokTermin && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Pilih Item Pekerjaan</p>
                        {dokTermin.tasks.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">Belum ada item pekerjaan</p>
                        ) : (
                          dokTermin.tasks.map((tk) => {
                            const fresh = termins.flatMap((t) => t.tasks).find((t) => t.id === tk.id) ?? tk;
                            return (
                              <button key={tk.id}
                                onClick={() => { setDokTask(fresh); setDokStep("upload"); setDokFiles([]); setDokPreviews([]); }}
                                className="w-full text-left p-3 rounded-lg border hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 flex-shrink-0" />
                                  <div>
                                    <p className="text-sm font-medium group-hover:text-blue-600">{fresh.nama_pekerjaan}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_TASK[fresh.status] ?? "bg-gray-100 text-gray-600"}`}>
                                        {fresh.status}
                                      </span>
                                      <span className="text-xs text-muted-foreground">{fresh.fotos.length} foto</span>
                                    </div>
                                  </div>
                                </div>
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-500" />
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* Step: Upload */}
                    {dokStep === "upload" && dokTask && (
                      <div className="space-y-3">
                        {/* Drop zone */}
                        <div
                          className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                          onClick={() => dokInputRef.current?.click()}
                        >
                          <ImageIcon className="h-7 w-7 text-gray-300 mx-auto mb-1" />
                          <p className="text-xs text-gray-400">Klik untuk pilih foto (bisa lebih dari satu)</p>
                          <p className="text-xs text-gray-300 mt-0.5">JPG, PNG — maks 20MB/foto</p>
                        </div>
                        <input ref={dokInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleDokFileChange} />

                        {/* Preview grid */}
                        {dokPreviews.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {dokPreviews.map((src, idx) => (
                              <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border">
                                <img src={src} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                                <button type="button" onClick={() => removeDokFile(idx)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                            <button type="button" onClick={() => dokInputRef.current?.click()}
                              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-blue-500 transition-colors">
                              <Plus className="h-4 w-4" />
                              <span className="text-xs">Tambah</span>
                            </button>
                          </div>
                        )}
                        {dokPreviews.length > 0 && (
                          <p className="text-xs text-muted-foreground">{dokPreviews.length} foto dipilih</p>
                        )}

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">
                            Keterangan <span className="font-normal text-muted-foreground">(opsional)</span>
                          </Label>
                          <Textarea rows={2} placeholder="Deskripsi progress..."
                            value={dokKeterangan} onChange={(e) => setDokKeterangan(e.target.value)}
                            className="text-sm resize-none" />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            Kendala <span className="font-normal text-muted-foreground">(opsional)</span>
                          </Label>
                          <Textarea rows={2} placeholder="Kendala di lapangan..."
                            value={dokKendala} onChange={(e) => setDokKendala(e.target.value)}
                            className="text-sm resize-none border-amber-200" />
                        </div>

                        <Button className="w-full" disabled={!dokFiles.length || uploadDokMut.isPending} onClick={handleUploadDok}>
                          {uploadDokMut.isPending
                            ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Mengupload...</>
                            : <><Upload className="h-4 w-4 mr-1.5" />{dokFiles.length > 0 ? `Upload ${dokFiles.length} Foto` : "Pilih foto dahulu"}</>}
                        </Button>

                        {/* Existing fotos for this task */}
                        {(freshTask?.fotos?.length ?? 0) > 0 && (
                          <div className="pt-2 border-t space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground">Foto Tersimpan ({freshTask!.fotos.length})</p>
                            <div className="grid grid-cols-3 gap-2">
                              {freshTask!.fotos.map((f) => {
                                const url = `${process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ?? "http://localhost:8000"}${f.file_path}`;
                                return (
                                  <div key={f.id} className="aspect-square rounded-lg overflow-hidden border cursor-pointer" onClick={() => setViewFoto(url)}>
                                    <img src={url} alt="dok" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                ) : (
                  <CardContent className="pt-0 pb-4">
                    <p className="text-xs text-muted-foreground">Tekan "Tambah" untuk upload foto dokumentasi per item pekerjaan.</p>
                  </CardContent>
                )}
              </Card>
            </>
          )}
        </>
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
              {fotoPreview ? (
                <img src={fotoPreview} alt="preview" className="max-h-48 mx-auto object-contain rounded" />
              ) : (
                <>
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Klik untuk memilih foto</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG / PNG, maks 5MB</p>
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
            {fotoPreview && (
              <Button variant="outline" size="sm" onClick={() => { setFotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                Ganti Foto
              </Button>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setOpenUpload(false); setFotoPreview(null); }}>Batal</Button>
              <Button disabled={!fotoPreview || submitMut.isPending} onClick={handleSubmit}>
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
          {viewFoto && <img src={viewFoto} alt="foto" className="w-full rounded-lg object-contain max-h-96" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
