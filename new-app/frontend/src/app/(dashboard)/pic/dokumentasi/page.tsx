"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, ChevronLeft, ChevronRight, Images, Plus, Trash2, X } from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

const api = {
  getProjects: () => apiClient.get("/finance/adm-projek").then((r) => r.data),
  getFotos: (pid: number) => apiClient.get(`/finance/adm-projek/${pid}/foto-dokumentasi`).then((r) => r.data),
  addFoto: (pid: number, data: any) => apiClient.post(`/finance/adm-projek/${pid}/foto-dokumentasi`, data).then((r) => r.data),
  deleteFoto: (pid: number, fid: string) => apiClient.delete(`/finance/adm-projek/${pid}/foto-dokumentasi/${fid}`).then((r) => r.data),
};

export default function PICDokumentasiPage() {
  const qc = useQueryClient();
  const fotoRef = useRef<HTMLInputElement>(null);
  const [selectedProject, setSelectedProject] = useState<{ id: number; nama_proyek: string; klien?: string } | null>(null);
  const [form, setForm] = useState({ judul: "", tanggal_foto: today });
  const [preview, setPreview] = useState<string | null>(null);
  const [viewFoto, setViewFoto] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ["pic-projek-list"],
    queryFn: api.getProjects,
  });
  const projectList: any[] = Array.isArray(projects) ? projects : (projects?.items ?? []);

  const { data, isLoading } = useQuery({
    queryKey: ["foto-dokumentasi", selectedProject?.id],
    queryFn: () => api.getFotos(selectedProject!.id),
    enabled: !!selectedProject,
  });
  const fotos: any[] = Array.isArray(data) ? data : [];

  const addMut = useMutation({
    mutationFn: (d: any) => api.addFoto(selectedProject!.id, d),
    onSuccess: () => {
      toast.success("Foto ditambahkan");
      qc.invalidateQueries({ queryKey: ["foto-dokumentasi", selectedProject?.id] });
      setShowForm(false);
      setForm({ judul: "", tanggal_foto: today });
      setPreview(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal upload foto"),
  });

  const deleteMut = useMutation({
    mutationFn: (fid: string) => api.deleteFoto(selectedProject!.id, fid),
    onSuccess: () => {
      toast.success("Foto dihapus");
      qc.invalidateQueries({ queryKey: ["foto-dokumentasi", selectedProject?.id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menghapus"),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    if (!preview) { toast.error("Pilih foto terlebih dahulu"); return; }
    addMut.mutate({ ...form, foto_data: preview });
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        {selectedProject && (
          <Button variant="ghost" size="icon" onClick={() => setSelectedProject(null)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Images className="h-5 w-5 text-orange-500" /> Upload Dokumentasi
          </h1>
          {selectedProject && <p className="text-sm text-muted-foreground">{selectedProject.nama_proyek}</p>}
        </div>
      </div>

      {/* Project selection */}
      {!selectedProject && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Pilih proyek untuk upload dokumentasi:</p>
          {loadingProjects
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
            : projectList.length > 0
            ? (
              <div className="border rounded-md divide-y">
                {projectList.filter((p: any) => p.status !== "selesai").map((p: any) => (
                  <button
                    key={p.id}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => setSelectedProject(p)}
                  >
                    <div>
                      <p className="font-medium text-sm">{p.nama_proyek || p.nama_project || "-"}</p>
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

      {/* Project selected: foto list + upload */}
      {selectedProject && (
        <div className="space-y-4">
          {/* Upload form toggle */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{fotos.length} foto dokumentasi</p>
            <Button size="sm" onClick={() => setShowForm((s) => !s)}>
              <Plus className="h-4 w-4 mr-1" /> Tambah Foto
            </Button>
          </div>

          {showForm && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Judul (opsional)</Label>
                    <Input value={form.judul} onChange={(e) => setForm((f) => ({ ...f, judul: e.target.value }))} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tanggal</Label>
                    <Input type="date" value={form.tanggal_foto} onChange={(e) => setForm((f) => ({ ...f, tanggal_foto: e.target.value }))} className="h-8 text-xs" />
                  </div>
                </div>
                <input ref={fotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                {preview ? (
                  <div className="relative">
                    <img src={preview} alt="preview" className="w-full max-h-48 object-contain rounded border" />
                    <button
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                      onClick={() => { setPreview(null); if (fotoRef.current) fotoRef.current.value = ""; }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label
                    className="block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50"
                    onClick={() => fotoRef.current?.click()}
                  >
                    <Camera className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Klik untuk ambil/pilih foto</p>
                  </label>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSubmit} disabled={addMut.isPending} className="h-8 text-xs">
                    {addMut.isPending ? "Mengirim..." : "Kirim Foto"}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setShowForm(false); setPreview(null); }}>Batal</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Photo grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
            </div>
          ) : fotos.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <Images className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Belum ada foto dokumentasi
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {fotos.map((foto: any) => (
                <div key={foto.id} className="relative group border rounded-lg overflow-hidden bg-muted/30">
                  <img
                    src={foto.foto_data}
                    alt={foto.judul ?? "foto"}
                    className="w-full h-36 object-cover cursor-pointer"
                    onClick={() => setViewFoto(foto.foto_data)}
                  />
                  <div className="p-2">
                    {foto.judul && <p className="text-xs font-medium truncate">{foto.judul}</p>}
                    <p className="text-[10px] text-muted-foreground">
                      {foto.tanggal_foto ? new Date(foto.tanggal_foto).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                    </p>
                  </div>
                  <button
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteMut.mutate(foto.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {viewFoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setViewFoto(null)}
        >
          <img src={viewFoto} alt="foto" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}
