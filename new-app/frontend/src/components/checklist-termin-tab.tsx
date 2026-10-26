"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { Check, ChevronDown, ChevronRight, Download, ImageIcon, Images, Loader2, PenLine, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { storageUrl } from "@/lib/storage-url";
import { getLogoBase64 } from "@/lib/get-logo";
import { compressUploadImage, formatUploadSize } from "@/lib/compress-upload-image";

type ChecklistItem = {
  id: string;
  task_id: string;
  termin_id: string;
  termin_nama: string;
  nama_pekerjaan: string;
  item_jenis: "RAB_AWAL" | "TAMBAHAN" | string;
  dokumentasi_paths: string[];
  dokumentasi_thumbnails?: string[];
  pic_paraf: boolean;
  client_paraf: boolean;
  status: string | null;
};

type ChecklistData = {
  items: ChecklistItem[];
  signatories: { ro: string | null; pic_project: string | null; client: string | null };
};

type ChecklistApi = {
  getChecklist: (projectId: string) => Promise<ChecklistData>;
  updateChecklistParaf: (id: string, party: "pic" | "client", value: boolean) => Promise<unknown>;
  updateChecklistItem: (id: string, data: { gambars?: File[] }) => Promise<unknown>;
};

type ChecklistProjectInfo = {
  nama_proyek?: string | null;
  lokasi?: string | null;
  lead?: { nama: string } | null;
  tipe?: string;
};

function ParafButton({ value, label, onClick, disabled }: { value: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      type="button"
      size="sm"
      variant={value ? "default" : "outline"}
      className={value ? "min-h-11 min-w-[92px] bg-emerald-600 hover:bg-emerald-700" : "min-h-11 min-w-[92px]"}
      onClick={onClick}
      disabled={disabled}
      title={value ? `Batalkan paraf ${label}` : `Paraf ${label}`}
    >
      {value ? <Check className="mr-1 h-3.5 w-3.5" /> : <PenLine className="mr-1 h-3.5 w-3.5" />}
      {value ? "Sudah" : "Paraf"}
    </Button>
  );
}

function DocumentationThumbnail({ original, thumbnail, alt, onClick }: { original: string; thumbnail?: string; alt: string; onClick: () => void }) {
  const [useOriginal, setUseOriginal] = useState(false);
  return (
    <button type="button" onClick={onClick} className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded border bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" aria-label={`Buka ${alt}`}>
      <img
        src={storageUrl(useOriginal ? original : (thumbnail || original))}
        alt={alt}
        width={48}
        height={48}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        onError={() => { if (!useOriginal) setUseOriginal(true); }}
        className="h-12 w-12 object-cover transition-opacity hover:opacity-80"
      />
    </button>
  );
}

export function ChecklistTerminTab({ projectId, api, projectInfo }: { projectId: string; api: ChecklistApi; projectInfo?: ChecklistProjectInfo }) {
  const qc = useQueryClient();
  const queryKey = ["checklist-termin", projectId];
  const { data, isLoading, isError } = useQuery({ queryKey, queryFn: () => api.getChecklist(projectId), staleTime: 3 * 60 * 1000 });
  const [exportingTermin, setExportingTermin] = useState<{ id: string; done: number; total: number } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expandedTermins, setExpandedTermins] = useState<Record<string, boolean>>({});
  const [gallery, setGallery] = useState<{ title: string; paths: string[]; thumbnails: string[] } | null>(null);
  const [imageTask, setImageTask] = useState<{ itemId: string; phase: "compressing" | "uploading"; current: number; total: number } | null>(null);
  const parafMutation = useMutation({
    mutationFn: ({ id, party, value }: { id: string; party: "pic" | "client"; value: boolean }) => api.updateChecklistParaf(id, party, value),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (error: any) => toast.error(error?.response?.data?.detail ?? "Paraf gagal disimpan"),
  });
  const imageMutation = useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) => api.updateChecklistItem(id, { gambars: files }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  async function uploadManualImages(itemId: string, files: File[]) {
    if (files.length > 10) {
      toast.error("Maksimal 10 foto dalam sekali upload.");
      return;
    }

    const originalBytes = files.reduce((total, file) => total + file.size, 0);
    const compressed: File[] = [];
    try {
      for (let index = 0; index < files.length; index += 1) {
        setImageTask({ itemId, phase: "compressing", current: index + 1, total: files.length });
        compressed.push(await compressUploadImage(files[index]));
      }

      setImageTask({ itemId, phase: "uploading", current: files.length, total: files.length });
      await imageMutation.mutateAsync({ id: itemId, files: compressed });
      const compressedBytes = compressed.reduce((total, file) => total + file.size, 0);
      toast.success(`Foto berhasil diunggah (${formatUploadSize(originalBytes)} menjadi ${formatUploadSize(compressedBytes)})`);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? error?.message ?? "Gambar gagal diunggah");
    } finally {
      setImageTask(null);
    }
  }

  const items = data?.items ?? [];
  const groups = useMemo(() => {
    const grouped = new Map<string, { id: string; name: string; items: ChecklistItem[] }>();
    for (const item of items) {
      const current = grouped.get(item.termin_id) ?? { id: item.termin_id, name: item.termin_nama, items: [] };
      current.items.push(item);
      grouped.set(item.termin_id, current);
    }
    return [...grouped.values()];
  }, [items]);

  async function fetchImage(url: string, attempts = 3): Promise<string> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetch(url, { cache: "force-cache" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Format foto tidak terbaca"));
          reader.onerror = () => reject(reader.error ?? new Error("Foto gagal dibaca"));
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(`Foto gagal dimuat setelah ${attempts} percobaan: ${url}. ${lastError instanceof Error ? lastError.message : ""}`);
  }

  async function exportTermin(group: { id: string; name: string; items: ChecklistItem[] }) {
    const allPaths = group.items.flatMap((item) => item.dokumentasi_paths);
    setExportingTermin({ id: group.id, done: 0, total: allPaths.length });
    try {
      const { ChecklistTerminPDF } = await import("@/components/checklist-termin-pdf");
      const logoUrl = await getLogoBase64();
      const imagesByPath = new Map<string, string>();
      const uniquePaths = Array.from(new Set(allPaths));
      for (let offset = 0; offset < uniquePaths.length; offset += 4) {
        const batch = uniquePaths.slice(offset, offset + 4);
        const values = await Promise.all(batch.map((imagePath) => fetchImage(storageUrl(imagePath))));
        batch.forEach((imagePath, index) => imagesByPath.set(imagePath, values[index]));
        const completedUnique = Math.min(offset + batch.length, uniquePaths.length);
        const completedReferences = allPaths.filter((imagePath) => imagesByPath.has(imagePath)).length;
        setExportingTermin({ id: group.id, done: completedUnique === uniquePaths.length ? allPaths.length : completedReferences, total: allPaths.length });
      }
      const pdfItems = group.items.map((item, index) => ({
        no: index + 1,
        nama_pekerjaan: item.nama_pekerjaan,
        item_jenis: item.item_jenis,
        dokumentasi_b64s: item.dokumentasi_paths.map((imagePath) => {
          const image = imagesByPath.get(imagePath);
          if (!image) throw new Error(`Foto ${imagePath} belum masuk ke PDF`);
          return image;
        }),
        pic_paraf: item.pic_paraf,
        client_paraf: item.client_paraf,
      }));
      const blob = await pdf(<ChecklistTerminPDF data={{
        namaProyek: projectInfo?.nama_proyek ?? "Proyek",
        tipeProyek: projectInfo?.tipe ?? "PROYEK",
        termin: group.name,
        klien: projectInfo?.lead?.nama ?? data?.signatories?.client,
        lokasi: projectInfo?.lokasi,
        signatories: data?.signatories ?? {},
        catatan: notes[group.name] ?? "",
        items: pdfItems,
        logoUrl,
      }} />).toBlob();
      saveAs(blob, `Checklist-${group.name}-${projectInfo?.nama_proyek ?? "Proyek"}.pdf`.replace(/[\\/:*?"<>|]/g, "-"));
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? `PDF dibatalkan agar tidak ada data hilang. ${error.message}` : "PDF dibatalkan karena foto tidak lengkap");
    } finally { setExportingTermin(null); }
  }

  function openGallery(item: ChecklistItem) {
    setGallery({
      title: item.nama_pekerjaan,
      paths: item.dokumentasi_paths,
      thumbnails: item.dokumentasi_thumbnails ?? item.dokumentasi_paths,
    });
  }

  function documentation(item: ChecklistItem) {
    if (item.dokumentasi_paths.length === 0) {
      return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ImageIcon className="h-4 w-4" />Belum ada laporan PIC</span>;
    }
    const previewPaths = item.dokumentasi_paths.slice(0, 4);
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {previewPaths.map((imagePath, imageIndex) => (
          <DocumentationThumbnail
            key={`${imagePath}-${imageIndex}`}
            original={imagePath}
            thumbnail={item.dokumentasi_thumbnails?.[imageIndex]}
            alt={`Dokumentasi ${item.nama_pekerjaan} ${imageIndex + 1}`}
            onClick={() => openGallery(item)}
          />
        ))}
        {item.dokumentasi_paths.length > 4 && (
          <button type="button" onClick={() => openGallery(item)} className="inline-flex min-h-11 items-center gap-1 rounded border px-2.5 text-xs font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" aria-label={`Buka semua ${item.dokumentasi_paths.length} foto`}>
            <Images className="h-4 w-4" />+{item.dokumentasi_paths.length - 4}
          </button>
        )}
      </div>
    );
  }

  function uploadControl(item: ChecklistItem) {
    return (
      <label className={`mt-2 inline-flex min-h-11 items-center gap-1 text-xs font-medium ${imageTask || imageMutation.isPending ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer text-primary hover:underline"}`}>
        {imageTask?.itemId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {imageTask?.itemId === item.id
          ? imageTask.phase === "compressing"
            ? `Mengompres ${imageTask.current}/${imageTask.total}`
            : "Mengunggah..."
          : "Tambah gambar manual"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          disabled={!!imageTask || imageMutation.isPending}
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            event.currentTarget.value = "";
            if (files.length) void uploadManualImages(item.id, files);
          }}
        />
      </label>
    );
  }

  if (isLoading) return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Memuat checklist dari task termin...</div>;
  if (isError) return <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Checklist gagal dimuat. Coba muat ulang halaman.</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Checklist pekerjaan per termin</h3>
          <p className="mt-1 text-sm text-muted-foreground">Item dan dokumentasi mengikuti task serta laporan PIC. Paraf dilakukan manual pada tiap item.</p>
        </div>
        <Badge variant="outline">{items.length} item pekerjaan</Badge>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">Belum ada task pekerjaan di termin proyek.</div>
      ) : groups.map((group) => {
        const expanded = expandedTermins[group.id] ?? false;
        const exportProgress = exportingTermin?.id === group.id ? exportingTermin : null;
        return (
        <section key={group.id} className="overflow-hidden rounded-lg border bg-background [content-visibility:auto] [contain-intrinsic-size:1px_240px]">
          <div className={`flex flex-wrap items-center justify-between gap-2 bg-muted/40 px-3 py-2 sm:px-4 ${expanded ? "border-b" : ""}`}>
            <button type="button" className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" onClick={() => setExpandedTermins((current) => ({ ...current, [group.id]: !expanded }))} aria-expanded={expanded}>
              {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
              <span className="truncate font-semibold">{group.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{group.items.length} pekerjaan</span>
            </button>
            <Button type="button" variant="outline" size="sm" className="min-h-11 gap-1.5" disabled={exportingTermin !== null} onClick={() => exportTermin(group)}>
              {exportProgress ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {exportProgress ? `Foto ${exportProgress.done}/${exportProgress.total}` : "Export PDF"}
            </Button>
          </div>
          {expanded && <>
          <div className="border-b px-3 py-3 sm:px-4"><label className="text-xs font-semibold text-muted-foreground">Catatan / Pekerjaan yang Masih Kurang <span className="font-normal">(opsional, ikut masuk ke PDF)</span></label><textarea className="mt-1 min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm" value={notes[group.name] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [group.name]: event.target.value }))} placeholder="Tulis pekerjaan yang masih kurang atau catatan pemeriksaan..." /></div>
          <div className="divide-y md:hidden">
            {group.items.map((item, index) => (
              <article key={item.id} className="space-y-3 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="text-xs text-muted-foreground">Pekerjaan {index + 1}</p><h5 className="font-medium leading-snug">{item.nama_pekerjaan}</h5></div>
                  <Badge variant={item.item_jenis === "TAMBAHAN" ? "secondary" : "outline"} className={item.item_jenis === "TAMBAHAN" ? "shrink-0 bg-amber-100 text-amber-800 hover:bg-amber-100" : "shrink-0"}>{item.item_jenis === "TAMBAHAN" ? "Tambahan" : "RAB Awal"}</Badge>
                </div>
                <div>{documentation(item)}{uploadControl(item)}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col items-center"><p className="mb-1 text-center text-xs text-muted-foreground">Paraf PIC</p><ParafButton value={item.pic_paraf} label="PIC" disabled={parafMutation.isPending} onClick={() => parafMutation.mutate({ id: item.id, party: "pic", value: !item.pic_paraf })} /></div>
                  <div className="flex flex-col items-center"><p className="mb-1 text-center text-xs text-muted-foreground">Paraf Client</p><ParafButton value={item.client_paraf} label="Client" disabled={parafMutation.isPending} onClick={() => parafMutation.mutate({ id: item.id, party: "client", value: !item.client_paraf })} /></div>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 text-center">No</TableHead>
                  <TableHead className="min-w-[260px]">Item Pekerjaan</TableHead>
                  <TableHead className="w-28">Jenis</TableHead>
                  <TableHead className="min-w-[220px]">Dokumentasi</TableHead>
                  <TableHead className="w-32 text-center">Paraf PIC</TableHead>
                  <TableHead className="w-32 text-center">Paraf Client</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.nama_pekerjaan}</TableCell>
                    <TableCell>
                      <Badge variant={item.item_jenis === "TAMBAHAN" ? "secondary" : "outline"} className={item.item_jenis === "TAMBAHAN" ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : ""}>
                        {item.item_jenis === "TAMBAHAN" ? "Tambahan" : "RAB Awal"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {documentation(item)}
                      {uploadControl(item)}
                    </TableCell>
                    <TableCell className="text-center">
                      <ParafButton value={item.pic_paraf} label="PIC" disabled={parafMutation.isPending} onClick={() => parafMutation.mutate({ id: item.id, party: "pic", value: !item.pic_paraf })} />
                    </TableCell>
                    <TableCell className="text-center">
                      <ParafButton value={item.client_paraf} label="Client" disabled={parafMutation.isPending} onClick={() => parafMutation.mutate({ id: item.id, party: "client", value: !item.client_paraf })} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </>}
        </section>
      ); })}

      <section className="rounded-lg border p-5">
        <h4 className="mb-5 text-center text-sm font-semibold">Mengetahui</h4>
        <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-3">
          {[
            ["RO", data?.signatories.ro],
            ["PIC Project", data?.signatories.pic_project],
            ["Client", data?.signatories.client],
          ].map(([label, name]) => (
            <div key={label} className="min-h-24">
              <div className="flex min-h-16 items-end justify-center border-b border-dashed border-foreground/50 pb-2 text-sm text-muted-foreground">Tanda tangan</div>
              <p className="mt-2 text-sm font-medium">{name || "Belum diinput"}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <Dialog open={gallery !== null} onOpenChange={(open) => { if (!open) setGallery(null); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Dokumentasi {gallery?.title}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{gallery?.paths.length ?? 0} foto. Klik foto untuk membuka file asli.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {gallery?.paths.map((imagePath, index) => (
              <a key={`${imagePath}-${index}`} href={storageUrl(imagePath)} target="_blank" rel="noreferrer" className="block min-h-11 overflow-hidden rounded border bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                <img src={storageUrl(gallery.thumbnails[index] || imagePath)} alt={`Dokumentasi ${gallery.title} ${index + 1}`} width={320} height={320} loading="lazy" decoding="async" fetchPriority="low" className="aspect-square h-auto w-full object-cover" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = storageUrl(imagePath); }} />
              </a>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
