"use client";

import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

type KanbanFile = { id: number; name: string; uploaded_by: string; created_at: string; download_url: string };

export function BdKanbanFiles() {
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const canUpload = useAuthStore((state) => state.canCreate("bd"));
  const canDelete = useAuthStore((state) => state.canDelete("bd"));
  const { data = [], isLoading, isError } = useQuery<KanbanFile[]>({
    queryKey: ["bd-kanban-files"],
    queryFn: () => apiClient.get("/bd/kanban/files").then((response) => response.data),
  });
  const upload = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return apiClient.post("/bd/kanban/files", body, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => { toast.success("File berhasil diunggah"); qc.invalidateQueries({ queryKey: ["bd-kanban-files"] }); },
    onError: (error: any) => toast.error(error?.response?.data?.detail || "Gagal mengunggah file"),
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/bd/kanban/files/${id}`),
    onSuccess: () => { toast.success("File dihapus"); qc.invalidateQueries({ queryKey: ["bd-kanban-files"] }); },
    onError: (error: any) => toast.error(error?.response?.data?.detail || "Gagal menghapus file"),
  });

  async function download(file: KanbanFile) {
    try {
      const response = await apiClient.get(file.download_url, { responseType: "blob" });
      saveAs(response.data, file.name);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Gagal mengunduh file");
    }
  }

  return <section className="space-y-4 rounded-lg border bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">File Kanban BD</h2><p className="text-xs text-muted-foreground">Unggah dan bagikan file pendukung dalam format JPG, JPEG, PNG, PDF, PPT, atau PPTX (maks. 20 MB).</p></div>
      {canUpload && <><input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.pdf,.ppt,.pptx" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate(file); event.currentTarget.value = ""; }} /><Button onClick={() => inputRef.current?.click()} disabled={upload.isPending}><Upload className="mr-2 h-4 w-4" />{upload.isPending ? "Mengunggah..." : "Upload File"}</Button></>}
    </div>
    {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Memuat daftar file...</p> : isError ? <p className="py-8 text-center text-sm text-destructive">Gagal memuat daftar file.</p> : data.length === 0 ? <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">Belum ada file. File yang diunggah akan tersimpan di sini.</div> : <div className="divide-y rounded-lg border">{data.map((file) => <div key={file.id} className="flex flex-wrap items-center gap-3 p-3"><FileText className="h-5 w-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">Diunggah {new Date(file.created_at).toLocaleString("id-ID")} oleh {file.uploaded_by}</p></div><Button variant="outline" size="sm" onClick={() => download(file)}><Download className="mr-1.5 h-4 w-4" />Unduh</Button>{canDelete && <Button variant="ghost" size="icon" aria-label={`Hapus ${file.name}`} disabled={remove.isPending} onClick={() => { if (window.confirm(`Hapus file ${file.name}?`)) remove.mutate(file.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div>)}</div>}
  </section>;
}
