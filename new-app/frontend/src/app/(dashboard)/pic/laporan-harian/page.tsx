"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { laporanPicApi } from "@/lib/api/laporanPic";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { HardHat, Upload, X, Trash2, Calendar, Building2, Home } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function PICLaporanHarianPage() {
  const qc = useQueryClient();
  const [projectType, setProjectType] = useState<"sipil" | "interior">("sipil");
  const [projectId, setProjectId] = useState("");
  const [kegiatan, setKegiatan] = useState("");
  const [kendala, setKendala] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const { data: options = [] } = useQuery({
    queryKey: ["laporan-pic-options", projectType],
    queryFn: () => laporanPicApi.projekOptions(projectType),
  });
  useEffect(() => setProjectId(""), [projectType]);

  const { data: mine = [] } = useQuery({
    queryKey: ["laporan-pic-mine"],
    queryFn: () => laporanPicApi.listMine(),
  });

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 20));
  };

  const createMut = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("project_type", projectType);
      fd.append("project_id", projectId);
      fd.append("kegiatan", kegiatan);
      if (kendala) fd.append("kendala", kendala);
      files.forEach((f) => fd.append("images", f));
      return laporanPicApi.create(fd);
    },
    onSuccess: () => {
      toast.success("Laporan tersimpan & otomatis terhubung ke projek terpilih.");
      setKegiatan("");
      setKendala("");
      setProjectId("");
      setFiles([]);
      qc.invalidateQueries({ queryKey: ["laporan-pic-mine"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menyimpan laporan."),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => laporanPicApi.remove(id),
    onSuccess: () => {
      toast.success("Laporan dihapus.");
      qc.invalidateQueries({ queryKey: ["laporan-pic-mine"] });
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return toast.error("Pilih nama projek terlebih dahulu.");
    if (!kegiatan.trim()) return toast.error("Isi kegiatan terlebih dahulu.");
    createMut.mutate();
  };

  const inputCls =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <HardHat className="h-6 w-6 text-orange-500" /> Laporan Harian PIC Project
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilih jenis &amp; nama projek, isi kegiatan, dan unggah foto. Laporan otomatis muncul di tab
          <span className="font-medium"> Laporan PIC Project </span> pada detail projek terkait.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Jenis Projek</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { v: "sipil", label: "Projek Sipil", Icon: Building2 },
                { v: "interior", label: "Projek Interior", Icon: Home },
              ] as const).map(({ v, label, Icon }) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setProjectType(v)}
                  className={`flex items-center gap-2 rounded-md border p-2.5 text-sm transition ${
                    projectType === v
                      ? "border-orange-500 bg-orange-50 font-semibold text-orange-600"
                      : "hover:border-orange-400"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Nama Projek</label>
            <select className={inputCls} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">— Pilih projek —</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Kegiatan / Laporan</label>
          <textarea
            className={inputCls}
            rows={4}
            value={kegiatan}
            onChange={(e) => setKegiatan(e.target.value)}
            placeholder="Tuliskan kegiatan / progres yang dikerjakan hari ini…"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Kendala (opsional)</label>
          <textarea
            className={inputCls}
            rows={2}
            value={kendala}
            onChange={(e) => setKendala(e.target.value)}
            placeholder="Kendala di lapangan (jika ada)…"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Foto Dokumentasi (bisa lebih dari satu)</label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed py-4 text-sm text-muted-foreground hover:border-orange-400 hover:text-orange-600">
            <Upload className="h-4 w-4" /> Pilih / tambah foto
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {previews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {previews.map((u, i) => (
                <div key={i} className="relative">
                  <img src={u} alt={`preview ${i + 1}`} className="h-20 w-20 rounded border object-cover" />
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={createMut.isPending}
            className="rounded-md bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {createMut.isPending ? "Menyimpan…" : "Simpan Laporan"}
          </button>
        </div>
      </form>

      {/* Riwayat laporan sendiri */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Laporan Saya</h2>
        {mine.length === 0 ? (
          <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            Belum ada laporan.
          </p>
        ) : (
          <div className="space-y-3">
            {mine.map((r) => (
              <div key={r.id} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded bg-orange-50 px-2 py-0.5 font-medium text-orange-600">
                      {r.project_type === "interior" ? "Interior" : "Sipil"} · {r.project_nama ?? `#${r.project_id}`}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {r.tanggal ? format(new Date(r.tanggal), "d MMM yyyy", { locale: idLocale }) : "-"}
                    </span>
                  </div>
                  <button
                    onClick={() => delMut.mutate(r.id)}
                    className="text-muted-foreground hover:text-red-600"
                    title="Hapus laporan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{r.kegiatan}</p>
                {r.kendala && (
                  <p className="mt-1.5 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                    <span className="font-semibold">Kendala:</span> {r.kendala}
                  </p>
                )}
                {Array.isArray(r.images) && r.images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.images.map((p, i) => (
                      <a key={i} href={`${API_BASE}${p}`} target="_blank" rel="noreferrer">
                        <img src={`${API_BASE}${p}`} alt={`foto ${i + 1}`} className="h-20 w-20 rounded border object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
