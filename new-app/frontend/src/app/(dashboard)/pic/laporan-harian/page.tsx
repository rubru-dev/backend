"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { laporanPicApi } from "@/lib/api/laporanPic";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { HardHat, Upload, X, Trash2, Calendar, Building2, Home, FileDown, Filter } from "lucide-react";

// Di browser pakai path relatif agar gambar di-proxy lewat Next.js (rewrite /storage/* di next.config.js),
// sama seperti apiClient. URL absolut ke backend gagal saat diakses non-localhost / lewat proxy, dan
// membuat fetch() PDF jadi cross-origin (diblok CORS) sehingga gambar hilang.
const API_BASE = typeof window === "undefined" ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") : "";

export default function PICLaporanHarianPage() {
  const qc = useQueryClient();
  const [projectType, setProjectType] = useState<"sipil" | "interior">("sipil");
  const [projectId, setProjectId] = useState("");
  const [kegiatan, setKegiatan] = useState("");
  const [kendala, setKendala] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // Filter + PDF
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterProject, setFilterProject] = useState("all");
  const [downloading, setDownloading] = useState(false);

  const { data: options = [] } = useQuery({
    queryKey: ["laporan-pic-options", projectType],
    queryFn: () => laporanPicApi.projekOptions(projectType),
  });
  useEffect(() => setProjectId(""), [projectType]);

  const { data: mine = [] } = useQuery({
    queryKey: ["laporan-pic-mine"],
    queryFn: () => laporanPicApi.listMine(),
  });

  // Opsi projek unik dari laporan sendiri (untuk filter)
  const projectFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    mine.forEach((r) =>
      map.set(`${r.project_type}:${r.project_id}`, `${r.project_type === "interior" ? "Interior" : "Sipil"} · ${r.project_nama ?? "#" + r.project_id}`)
    );
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [mine]);

  const filtered = useMemo(
    () =>
      mine.filter((r) => {
        if (filterProject !== "all" && `${r.project_type}:${r.project_id}` !== filterProject) return false;
        const d = (r.tanggal ?? "").slice(0, 10);
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      }),
    [mine, filterProject, fromDate, toDate]
  );

  const fmt = (d: string) => format(new Date(d), "d MMM yyyy", { locale: idLocale });
  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const [{ pdf }, { saveAs }, { getLogoBase64 }, { LaporanPicPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("file-saver"),
        import("@/lib/get-logo"),
        import("@/components/laporan-pic-pdf"),
      ]);
      const logo = await getLogoBase64();
      const toB64 = async (u: string): Promise<string> => {
        try {
          const res = await fetch(u);
          const blob = await res.blob();
          return await new Promise<string>((resolve) => {
            const fr = new FileReader();
            fr.onloadend = () => resolve(fr.result as string);
            fr.onerror = () => resolve("");
            fr.readAsDataURL(blob);
          });
        } catch {
          return "";
        }
      };
      const rows = await Promise.all(
        filtered.map(async (r) => ({
          tanggal: r.tanggal ? fmt(r.tanggal) : "-",
          project_type: r.project_type,
          project_nama: r.project_nama ?? `#${r.project_id}`,
          pic_name: r.user?.name ?? "PIC",
          kegiatan: r.kegiatan,
          kendala: r.kendala,
          images: (await Promise.all((r.images || []).map((p) => toB64(`${API_BASE}${p}`)))).filter(Boolean),
        }))
      );
      const periode =
        fromDate || toDate
          ? `${fromDate ? fmt(fromDate) : "Awal"} — ${toDate ? fmt(toDate) : "Sekarang"}`
          : "Semua tanggal";
      const projek = filterProject === "all" ? "Semua projek" : projectFilterOptions.find((o) => o.value === filterProject)?.label ?? "-";
      const meta = { periode, projek, total: rows.length, dicetak: format(new Date(), "d MMM yyyy HH:mm", { locale: idLocale }) };
      const blob = await pdf(<LaporanPicPdf reports={rows as any} logo={logo} meta={meta} />).toBlob();
      saveAs(blob, `laporan-pic-project-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
    } catch {
      toast.error("Gagal membuat PDF.");
    } finally {
      setDownloading(false);
    }
  };

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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Laporan Saya</h2>
          <button
            onClick={downloadPdf}
            disabled={downloading || filtered.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-orange-500 px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" /> {downloading ? "Menyiapkan…" : "Download PDF"}
          </button>
        </div>

        {/* Filter */}
        <div className="mb-4 grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-4">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground sm:col-span-4">
            <Filter className="h-3.5 w-3.5" /> Filter
          </div>
          <label className="text-xs">Dari tanggal
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputCls} />
          </label>
          <label className="text-xs">Sampai tanggal
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputCls} />
          </label>
          <label className="text-xs sm:col-span-2">Projek
            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className={inputCls}>
              <option value="all">Semua projek</option>
              {projectFilterOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <div className="text-xs text-muted-foreground sm:col-span-4">
            Menampilkan <b>{filtered.length}</b> dari {mine.length} laporan.
            {(fromDate || toDate || filterProject !== "all") && (
              <button onClick={() => { setFromDate(""); setToDate(""); setFilterProject("all"); }} className="ml-2 text-orange-600 hover:underline">Reset</button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            {mine.length === 0 ? "Belum ada laporan." : "Tidak ada laporan yang cocok dengan filter."}
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
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
