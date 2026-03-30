"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Camera, ChevronRight, Upload, Trash2, X, AlertTriangle,
  Building2, Home, FolderOpen, CheckCircle, Loader2, ImageIcon, Plus,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ?? "http://localhost:8000";

const api = {
  getProjects: () => apiClient.get("/pic/projek-list").then((r) => r.data),
  getTermins: (type: string, id: string) =>
    apiClient.get(`/pic/projeks/${type}/${id}/termins`).then((r) => r.data),
  uploadFotos: (type: string, taskId: string, formData: FormData) =>
    apiClient.post(`/pic/tasks/${type}/${taskId}/fotos`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
  deleteFoto: (type: string, fotoId: string) =>
    apiClient.delete(`/pic/fotos/${type}/${fotoId}`).then((r) => r.data),
};

type Project = { id: string; type: "sipil" | "interior"; nama_proyek: string; lokasi?: string };
type Foto = { id: string; file_path: string; keterangan?: string; kendala?: string; uploader?: string; created_at: string };
type Task = { id: string; nama_pekerjaan: string; status: string; fotos: Foto[] };
type Termin = { id: string; nama: string; urutan: number; tasks: Task[] };

const STATUS_COLOR: Record<string, string> = {
  "Selesai": "bg-green-100 text-green-700",
  "Proses": "bg-blue-100 text-blue-700",
  "Belum Mulai": "bg-gray-100 text-gray-600",
};

export default function PICDokumentasiPage() {
  const qc = useQueryClient();
  const fotoRef = useRef<HTMLInputElement>(null);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTermin, setSelectedTermin] = useState<Termin | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [fotoFiles, setFotoFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [keterangan, setKeterangan] = useState("");
  const [kendala, setKendala] = useState("");
  const [viewFoto, setViewFoto] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; type: string } | null>(null);

  const { data: projects, isLoading: loadingProjects } = useQuery<Project[]>({
    queryKey: ["pic-projek-list"],
    queryFn: api.getProjects,
  });

  const { data: terminData, isLoading: loadingTermins } = useQuery({
    queryKey: ["pic-termins", selectedProject?.type, selectedProject?.id],
    queryFn: () => api.getTermins(selectedProject!.type, selectedProject!.id),
    enabled: !!selectedProject,
  });
  const termins: Termin[] = terminData?.termins ?? [];

  const freshTask = termins.flatMap((t) => t.tasks).find((tk) => tk.id === selectedTask?.id) ?? null;

  const uploadMut = useMutation({
    mutationFn: ({ type, taskId, fd }: { type: string; taskId: string; fd: FormData }) =>
      api.uploadFotos(type, taskId, fd),
    onSuccess: () => {
      toast.success(`${fotoFiles.length} foto berhasil diupload`);
      qc.invalidateQueries({ queryKey: ["pic-termins", selectedProject?.type, selectedProject?.id] });
      setFotoFiles([]);
      setPreviews([]);
      setKeterangan("");
      setKendala("");
      if (fotoRef.current) fotoRef.current.value = "";
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal upload foto"),
  });

  const deleteMut = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) => api.deleteFoto(type, id),
    onSuccess: () => {
      toast.success("Foto dihapus");
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ["pic-termins", selectedProject?.type, selectedProject?.id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal hapus foto"),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setFotoFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setPreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    // Reset input so same file can be re-added if needed
    if (fotoRef.current) fotoRef.current.value = "";
  }

  function removeFile(idx: number) {
    setFotoFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleUpload() {
    if (!fotoFiles.length || !selectedTask || !selectedProject) return;
    const fd = new FormData();
    fotoFiles.forEach((f) => fd.append("fotos", f));
    if (keterangan) fd.append("keterangan", keterangan);
    if (kendala) fd.append("kendala", kendala);
    uploadMut.mutate({ type: selectedProject.type, taskId: selectedTask.id, fd });
  }

  function selectProject(p: Project) {
    setSelectedProject(p);
    setSelectedTermin(null);
    setSelectedTask(null);
    setPreviews([]);
    setFotoFiles([]);
    setKeterangan("");
    setKendala("");
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Camera className="h-6 w-6 text-orange-500" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Upload Dokumentasi</h1>
          <p className="text-sm text-gray-500">Upload foto progress ke item pekerjaan projek Sipil / Interior</p>
        </div>
      </div>

      {/* Breadcrumb */}
      {(selectedProject || selectedTermin || selectedTask) && (
        <div className="flex items-center gap-1.5 text-sm flex-wrap bg-orange-50 px-3 py-2 rounded-lg">
          <button onClick={() => { setSelectedProject(null); setSelectedTermin(null); setSelectedTask(null); }}
            className="text-orange-500 hover:underline font-medium">Semua Projek</button>
          {selectedProject && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
              <button onClick={() => { setSelectedTermin(null); setSelectedTask(null); }}
                className="text-orange-500 hover:underline font-medium">{selectedProject.nama_proyek}</button>
            </>
          )}
          {selectedTermin && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
              <button onClick={() => setSelectedTask(null)}
                className="text-orange-500 hover:underline font-medium">{selectedTermin.nama ?? `Termin ${selectedTermin.urutan}`}</button>
            </>
          )}
          {selectedTask && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-gray-700 font-semibold">{selectedTask.nama_pekerjaan}</span>
            </>
          )}
        </div>
      )}

      {/* STEP 1 — Pilih Projek */}
      {!selectedProject && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Langkah 1 — Pilih Projek</p>
          {loadingProjects ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : !projects?.length ? (
            <div className="text-center py-16 text-gray-400">Belum ada projek yang tersedia</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.map((p) => (
                <button key={p.id} onClick={() => selectProject(p)}
                  className="text-left p-4 rounded-xl border border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all group">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${p.type === "sipil" ? "bg-teal-100" : "bg-purple-100"}`}>
                      {p.type === "sipil"
                        ? <Building2 className="h-4 w-4 text-teal-600" />
                        : <Home className="h-4 w-4 text-purple-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-orange-600">{p.nama_proyek}</p>
                      {p.lokasi && <p className="text-xs text-gray-400 truncate">{p.lokasi}</p>}
                      <Badge className={`mt-1.5 text-xs border-0 ${p.type === "sipil" ? "bg-teal-100 text-teal-700" : "bg-purple-100 text-purple-700"}`}>
                        {p.type === "sipil" ? "Sipil" : "Interior"}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 2 — Pilih Termin */}
      {selectedProject && !selectedTermin && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Langkah 2 — Pilih Termin</p>
          {loadingTermins ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : !termins.length ? (
            <div className="text-center py-16 text-gray-400">Belum ada termin pada projek ini</div>
          ) : (
            <div className="space-y-2">
              {termins.map((t) => (
                <button key={t.id} onClick={() => setSelectedTermin(t)}
                  className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-4 w-4 text-gray-400 group-hover:text-orange-500" />
                    <div>
                      <p className="font-semibold text-sm text-gray-800 group-hover:text-orange-600">
                        {t.nama ?? `Termin ${t.urutan}`}
                      </p>
                      <p className="text-xs text-gray-400">{t.tasks.length} item pekerjaan</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-orange-500" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 3 — Pilih Item Pekerjaan */}
      {selectedProject && selectedTermin && !selectedTask && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Langkah 3 — Pilih Item Pekerjaan</p>
          {!selectedTermin.tasks.length ? (
            <div className="text-center py-16 text-gray-400">Belum ada item pekerjaan pada termin ini</div>
          ) : (
            <div className="space-y-2">
              {selectedTermin.tasks.map((tk) => {
                const fresh = termins.flatMap((t) => t.tasks).find((t) => t.id === tk.id) ?? tk;
                return (
                  <button key={tk.id} onClick={() => setSelectedTask(fresh)}
                    className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-gray-400 group-hover:text-orange-500 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm text-gray-800 group-hover:text-orange-600">
                          {fresh.nama_pekerjaan ?? `Item #${fresh.id}`}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLOR[fresh.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {fresh.status}
                          </span>
                          <span className="text-xs text-gray-400">{fresh.fotos.length} foto</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-orange-500" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STEP 4 — Upload & Galeri */}
      {selectedProject && selectedTermin && selectedTask && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Form upload */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Upload Foto</p>

            {/* Drop zone / add photos */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:border-orange-400 transition-colors"
              onClick={() => fotoRef.current?.click()}
            >
              <ImageIcon className="h-8 w-8 text-gray-300 mx-auto mb-1.5" />
              <p className="text-sm text-gray-400">Klik untuk pilih foto</p>
              <p className="text-xs text-gray-300 mt-0.5">Bisa pilih banyak sekaligus — JPG, PNG, WEBP, maks 20MB/foto</p>
            </div>
            <input ref={fotoRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />

            {/* Preview grid */}
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square">
                    <img src={src} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {/* Add more button */}
                <button
                  type="button"
                  onClick={() => fotoRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-orange-400 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-orange-500 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-xs">Tambah</span>
                </button>
              </div>
            )}

            {previews.length > 0 && (
              <p className="text-xs text-gray-500">{previews.length} foto dipilih</p>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600">
                Keterangan <span className="text-gray-400 font-normal">(opsional — berlaku untuk semua foto)</span>
              </Label>
              <Textarea rows={2} placeholder="Deskripsi progress pekerjaan..."
                value={keterangan} onChange={(e) => setKeterangan(e.target.value)}
                className="text-sm resize-none" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Kendala <span className="text-gray-400 font-normal">(opsional)</span>
              </Label>
              <Textarea rows={2} placeholder="Tuliskan kendala di lapangan jika ada..."
                value={kendala} onChange={(e) => setKendala(e.target.value)}
                className="text-sm resize-none border-amber-200 focus:border-amber-400" />
            </div>

            <Button onClick={handleUpload} disabled={!fotoFiles.length || uploadMut.isPending}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2">
              {uploadMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploadMut.isPending
                ? "Mengupload..."
                : fotoFiles.length > 0
                  ? `Upload ${fotoFiles.length} Foto`
                  : "Pilih foto dahulu"}
            </Button>
          </div>

          {/* Galeri foto */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Foto Terdokumentasi
              <span className="ml-2 font-normal normal-case text-gray-400">({freshTask?.fotos.length ?? 0} foto)</span>
            </p>

            {!freshTask?.fotos.length ? (
              <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-gray-200 text-gray-400 gap-2">
                <Camera className="h-8 w-8 text-gray-300" />
                <p className="text-sm">Belum ada foto untuk item ini</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                {freshTask.fotos.map((f) => (
                  <div key={f.id} className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="relative cursor-pointer" onClick={() => setViewFoto(`${API_URL}${f.file_path}`)}>
                      <img src={`${API_URL}${f.file_path}`} alt="doc"
                        className="w-full h-40 object-cover hover:opacity-95 transition-opacity" />
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: f.id, type: selectedProject.type }); }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="p-3 space-y-1.5">
                      {f.keterangan && <p className="text-sm text-gray-700">{f.keterangan}</p>}
                      {f.kendala && (
                        <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-100 rounded-lg p-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-amber-700">{f.kendala}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                        <span>{f.uploader ?? "—"}</span>
                        <span>{new Date(f.created_at).toLocaleDateString("id-ID", {
                          day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {viewFoto && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" onClick={() => setViewFoto(null)}>
          <button className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-1">
            <X className="h-5 w-5" />
          </button>
          <img src={viewFoto} alt="full" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}
        title="Hapus Foto?"
        description="Foto akan dihapus permanen dan tidak bisa dikembalikan."
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete)}
      />
    </div>
  );
}
