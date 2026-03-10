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
import { Camera, CheckCircle, Clock, XCircle, ChevronLeft, Upload, ChevronRight } from "lucide-react";

const api = {
  getProjects: () => apiClient.get("/finance/tukang-absen/projects").then((r) => r.data),
  getMyTukang: (pid: number) => apiClient.get(`/finance/tukang-absen/${pid}/my-tukang`).then((r) => r.data),
  getMyAbsen: (pid: number) => apiClient.get(`/finance/tukang-absen/${pid}/my-absen`).then((r) => r.data),
  submitAbsen: (pid: number, data: { foto: string; tanggal: string }) =>
    apiClient.post(`/finance/tukang-absen/${pid}/submit`, data).then((r) => r.data),
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Pending:  { label: "Menunggu",  color: "secondary",    icon: <Clock className="h-3 w-3" /> },
  Disetujui:{ label: "Disetujui", color: "default",      icon: <CheckCircle className="h-3 w-3" /> },
  Ditolak:  { label: "Ditolak",   color: "destructive",  icon: <XCircle className="h-3 w-3" /> },
};

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default function AbsenTukangPage() {
  const qc = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<{ id: number; nama_proyek: string; klien?: string } | null>(null);
  const [openUpload, setOpenUpload] = useState(false);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [viewFoto, setViewFoto] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFotoPreview(reader.result as string);
    reader.readAsDataURL(file);
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
                {(projects ?? []).map((p: any) => (
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

      {/* Project selected: tukang info + absen */}
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
              {/* Tukang info card */}
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

              {/* Upload absen button */}
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
              {/* Button to upload for past dates */}
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
            </>
          )}
        </>
      )}

      {/* Upload Dialog */}
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
          <DialogHeader><DialogTitle>Foto Absensi</DialogTitle></DialogHeader>
          {viewFoto && <img src={viewFoto} alt="Foto absensi" className="w-full rounded-lg object-contain max-h-96" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
