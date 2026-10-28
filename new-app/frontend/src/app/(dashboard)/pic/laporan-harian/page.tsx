"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { laporanPicApi } from "@/lib/api/laporanPic";
import { HardHat, Home, Images, List, Loader2, X, Building2 } from "lucide-react";
import { NativeCameraButton } from "@/components/native-camera-button";
import { compressUploadImage } from "@/lib/compress-upload-image";

function insertBullet(ref: React.RefObject<HTMLTextAreaElement | null>, value: string, onChange: (value: string) => void) {
  const textarea = ref.current;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  onChange(value.slice(0, lineStart) + "- " + value.slice(lineStart));
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start + 2, start + 2);
  });
}

function BulletTextarea({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-orange-500/40">
      <div className="flex items-center gap-1 border-b bg-muted/40 px-2 py-1">
        <button type="button" title="Tambahkan bullet list" aria-label="Tambahkan bullet list" className="rounded p-1.5 hover:bg-muted"
          onMouseDown={(event) => { event.preventDefault(); insertBullet(ref, value, onChange); }}>
          <List className="h-4 w-4" />
        </button>
        <span className="text-xs text-muted-foreground">Satu poin untuk setiap kegiatan atau kendala</span>
      </div>
      <textarea ref={ref} rows={7} value={value} onChange={(event) => onChange(event.target.value)}
        placeholder={"- Cek progres pekerjaan\n- Koordinasi dengan tim lapangan\n- Kendala: material belum datang"}
        className="w-full resize-y bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none" />
    </div>
  );
}

export default function PICLaporanHarianPage() {
  const qc = useQueryClient();
  const [projectType, setProjectType] = useState<"sipil" | "interior">("sipil");
  const [projectId, setProjectId] = useState("");
  const [terminId, setTerminId] = useState("");
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [statusPekerjaan, setStatusPekerjaan] = useState<"On Progress" | "Selesai">("On Progress");
  const [kegiatan, setKegiatan] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [processingGallery, setProcessingGallery] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const { data: options = [] } = useQuery({
    queryKey: ["laporan-pic-options", projectType],
    queryFn: () => laporanPicApi.projekOptions(projectType),
  });
  const { data: terminOptions = [], isLoading: loadingTermins } = useQuery({
    queryKey: ["laporan-pic-termin-options", projectType, projectId],
    queryFn: () => laporanPicApi.terminOptions(projectType, projectId),
    enabled: Boolean(projectId),
  });
  const selectedTermin = terminOptions.find((termin) => termin.id === terminId);

  useEffect(() => {
    setProjectId("");
    setTerminId("");
    setTaskIds([]);
  }, [projectType]);
  useEffect(() => {
    setTerminId("");
    setTaskIds([]);
  }, [projectId]);

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const addFile = (file: File) => {
    setFiles((previous) => (previous.length < 20 ? [...previous, file] : previous));
  };

  const addGalleryFiles = async (selected: FileList | null) => {
    if (!selected?.length || processingGallery) return;
    const remainingSlots = Math.max(0, 20 - files.length);
    if (remainingSlots === 0) return;
    const candidates = Array.from(selected).slice(0, remainingSlots);
    setProcessingGallery(true);
    try {
      const processed: File[] = [];
      const failures: string[] = [];
      for (const file of candidates) {
        try {
          processed.push(await compressUploadImage(file));
        } catch (error: any) {
          failures.push(error?.message || `${file.name} gagal diproses.`);
        }
      }
      if (processed.length) setFiles((previous) => [...previous, ...processed].slice(0, 20));
      if (failures.length) toast.error(`${failures.length} foto gagal ditambahkan. ${failures[0]}`);
      if (selected.length > remainingSlots) toast.info(`Hanya ${remainingSlots} foto yang ditambahkan karena batas maksimal 20 foto.`);
    } finally {
      setProcessingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const createMut = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append("project_type", projectType);
      formData.append("project_id", projectId);
      formData.append("termin_id", terminId);
      formData.append("task_ids", JSON.stringify(taskIds));
      if (taskIds[0]) formData.append("task_id", taskIds[0]);
      formData.append("status_pekerjaan", statusPekerjaan);
      formData.append("kegiatan", kegiatan);
      formData.append("expected_file_count", String(files.length));
      files.forEach((file) => formData.append("fotos", file));
      return laporanPicApi.create(formData);
    },
    onSuccess: () => {
      toast.success("Laporan tersimpan dan terhubung ke projek terpilih.");
      setKegiatan("");
      setProjectId("");
      setTerminId("");
      setTaskIds([]);
      setStatusPekerjaan("On Progress");
      setFiles([]);
      qc.invalidateQueries({ queryKey: ["laporan-pic"] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.detail || "Gagal menyimpan laporan."),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (processingGallery) return toast.error("Tunggu sampai foto dari galeri selesai diproses.");
    if (!projectId) return toast.error("Pilih nama projek terlebih dahulu.");
    if (!terminId) return toast.error("Pilih termin terlebih dahulu.");
    if (taskIds.length === 0) return toast.error("Pilih minimal satu nama pekerjaan.");
    if (!kegiatan.trim()) return toast.error("Isi laporan terlebih dahulu.");
    createMut.mutate();
  };

  const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><HardHat className="h-6 w-6 text-orange-500" /> Laporan Harian PIC Project</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pilih projek, tulis laporan kegiatan dan kendala dalam satu field, lalu unggah foto jika diperlukan. Laporan akan muncul di tab Laporan PIC Project pada detail projek terkait.</p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Jenis Projek</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "sipil", label: "Projek Sipil", Icon: Building2 },
                { value: "interior", label: "Projek Interior", Icon: Home },
              ] as const).map(({ value, label, Icon }) => (
                <button type="button" key={value} onClick={() => setProjectType(value)} className={`flex items-center gap-2 rounded-md border p-2.5 text-sm transition ${projectType === value ? "border-orange-500 bg-orange-50 font-semibold text-orange-600" : "hover:border-orange-400"}`}>
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nama Projek</label>
            <select className={inputClass} value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="">Pilih projek</option>
              {options.map((option) => <option key={option.id} value={option.id}>{option.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Termin</label>
            <select className={inputClass} value={terminId} disabled={!projectId || loadingTermins} onChange={(event) => { setTerminId(event.target.value); setTaskIds([]); }}>
              <option value="">{loadingTermins ? "Memuat termin..." : "Pilih termin"}</option>
              {terminOptions.map((termin) => <option key={termin.id} value={termin.id}>{termin.nama || `Termin ${termin.urutan}`}</option>)}
            </select>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="block text-sm font-medium">Nama Pekerjaan</label>
              {taskIds.length > 0 && <span className="text-xs text-muted-foreground">{taskIds.length} dipilih</span>}
            </div>
            <div className={`max-h-52 overflow-y-auto rounded-md border ${!terminId ? "bg-muted/40 opacity-60" : "bg-background"}`}>
              {!terminId ? (
                <p className="p-3 text-sm text-muted-foreground">Pilih termin terlebih dahulu.</p>
              ) : (selectedTermin?.tasks ?? []).length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Belum ada item pekerjaan pada termin ini.</p>
              ) : (selectedTermin?.tasks ?? []).map((task) => {
                const checked = taskIds.includes(task.id);
                return (
                  <label key={task.id} className="flex min-h-11 cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setTaskIds((current) => checked ? current.filter((id) => id !== task.id) : current.length < 20 ? [...current, task.id] : current)}
                      className="h-4 w-4 accent-orange-500"
                    />
                    <span>{task.nama_pekerjaan || `Pekerjaan #${task.id}`}</span>
                  </label>
                );
              })}
            </div>
            {taskIds.length >= 20 && <p className="mt-1 text-xs text-amber-700">Maksimal 20 pekerjaan dalam satu laporan.</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Status Pekerjaan</label>
            <select className={inputClass} value={statusPekerjaan} disabled={taskIds.length === 0} onChange={(event) => setStatusPekerjaan(event.target.value as "On Progress" | "Selesai")}>
              <option>On Progress</option>
              <option>Selesai</option>
            </select>
            {statusPekerjaan === "Selesai" && <p className="mt-1 text-xs text-amber-700">Penyelesaian akan menunggu approval Super Admin.</p>}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Laporan Kegiatan dan Kendala *</label>
          <BulletTextarea value={kegiatan} onChange={setKegiatan} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Foto Dokumentasi (maksimal 20 foto)</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <NativeCameraButton
              label="Ambil dari Kamera"
              helperText="Membuka kamera belakang HP untuk mengambil foto baru."
              disabled={createMut.isPending || processingGallery || files.length >= 20}
              onCapture={(file) => addFile(file)}
            />
            <div className="space-y-2">
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                className="hidden"
                onChange={(event) => void addGalleryFiles(event.target.files)}
              />
              <button
                type="button"
                disabled={createMut.isPending || processingGallery || files.length >= 20}
                onClick={() => galleryInputRef.current?.click()}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-orange-300 bg-background px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-60"
              >
                {processingGallery ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Images aria-hidden="true" className="h-4 w-4" />}
                {processingGallery ? "Memproses foto..." : "Pilih dari Galeri"}
              </button>
              <p className="text-xs text-muted-foreground">Pilih satu atau beberapa foto yang sudah tersimpan di HP.</p>
            </div>
          </div>
          {files.length >= 20 && <p className="mt-2 text-xs text-amber-700">Maksimal 20 foto dalam satu laporan.</p>}
          {previews.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{previews.map((url, index) => (
            <div key={url} className="relative">
              <img src={url} alt={`preview ${index + 1}`} className="h-20 w-20 rounded border object-cover" />
              <button type="button" aria-label={`Hapus foto ${index + 1}`} onClick={() => setFiles((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"><X className="h-3 w-3" /></button>
            </div>
          ))}</div>}
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={createMut.isPending || processingGallery} className="min-h-11 rounded-md bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60">{createMut.isPending ? "Menyimpan..." : processingGallery ? "Memproses foto..." : "Simpan Laporan"}</button>
        </div>
      </form>
    </div>
  );
}
