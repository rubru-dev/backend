"use client";

import { ChangeEvent, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

type Preview = { id: number; status: string; rows_total: number; error_count: number; errors: Array<{ sheet: string; row_number: number; message: string }>; preview: Array<{ kind: string; sheet: string; row_number: number; row: Record<string, unknown> }> };

const formatDate = (value: string | Date | null) => value ? new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-";

export default function ImportDataPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"template" | "upload" | "confirm" | "">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const history = useQuery({ queryKey: ["c-level-imports"], queryFn: () => apiClient.get("/c-level/imports").then((response) => response.data) });

  async function downloadTemplate() {
    setBusy("template"); setError("");
    try {
      const response = await apiClient.get("/c-level/template", { responseType: "blob" });
      const url = URL.createObjectURL(response.data); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "template-import-bd.xlsx"; anchor.click(); URL.revokeObjectURL(url);
    } catch (err: any) { setError(err?.response?.data?.detail || "Template belum dapat diunduh."); } finally { setBusy(""); }
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected); setPreview(null); setMessage(""); setError("");
  }

  async function uploadFile() {
    if (!file) return;
    setBusy("upload"); setError(""); setMessage("");
    try {
      const body = new FormData(); body.append("file", file);
      const response = await apiClient.post("/c-level/imports", body, { headers: { "Content-Type": "multipart/form-data" } });
      setPreview(response.data); setMessage("File terbaca. Periksa preview sebelum menyimpan ke database."); history.refetch();
    } catch (err: any) { setError(err?.response?.data?.detail || "File tidak dapat dibaca."); setPreview(err?.response?.data?.errors ? err.response.data : null); } finally { setBusy(""); }
  }

  async function confirmImport() {
    if (!preview || preview.status !== "preview") return;
    setBusy("confirm"); setError("");
    try {
      const response = await apiClient.post(`/c-level/imports/${preview.id}/confirm`);
      setMessage(`${response.data.rows_imported} baris berhasil disimpan ke database.`); setPreview(null); setFile(null); if (inputRef.current) inputRef.current.value = ""; history.refetch();
    } catch (err: any) { setError(err?.response?.data?.detail || "Import belum dapat dikonfirmasi."); } finally { setBusy(""); }
  }

  return <div className="mx-auto w-full max-w-6xl space-y-5">
    <header className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-indigo-700">BD · Data lokal</p><h1 className="text-2xl font-bold tracking-tight">Import Data Manual</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Upload data campaign dan metrik melalui template Excel resmi agar laporan BD dan Dashboard C-Level memakai sumber yang sama.</p></div><Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={downloadTemplate} disabled={busy !== ""}><Download className="h-4 w-4" />{busy === "template" ? "Menyiapkan..." : "Download Template Excel"}</Button></header>

    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-4 rounded-lg border bg-card p-4 sm:p-5"><div><h2 className="text-base font-semibold">Upload workbook</h2><p className="mt-1 text-sm text-muted-foreground">Format .xlsx atau .xls, maksimal 10 MB. Proses terdiri dari baca, preview, lalu konfirmasi.</p></div><button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-36 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/20 px-4 text-center transition-colors hover:bg-muted/40"><FileSpreadsheet className="mb-2 h-8 w-8 text-indigo-700" /><span className="text-sm font-medium">{file ? file.name : "Pilih file Excel"}</span><span className="mt-1 text-xs text-muted-foreground">Klik area ini untuk memilih file</span></button><input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={selectFile} className="hidden" /><div className="flex flex-col gap-2 sm:flex-row"><Button className="min-h-11" onClick={uploadFile} disabled={!file || busy !== ""}><Upload className="h-4 w-4" />{busy === "upload" ? "Membaca file..." : "Baca & Preview"}</Button>{preview?.status === "preview" && <Button variant="outline" className="min-h-11" onClick={confirmImport} disabled={busy !== ""}><CheckCircle2 className="h-4 w-4" />{busy === "confirm" ? "Menyimpan..." : "Konfirmasi Import"}</Button>}</div>{message && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}{error && <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
        {preview && <div className="space-y-3 rounded-md border bg-muted/20 p-3"><div className="flex flex-wrap gap-3 text-sm"><span>Total baris: <strong>{preview.rows_total}</strong></span><span>Error: <strong className={preview.error_count ? "text-destructive" : "text-emerald-700"}>{preview.error_count}</strong></span></div>{preview.errors?.length > 0 && <div className="max-h-52 overflow-y-auto rounded border bg-background p-3 text-xs">{preview.errors.map((item, index) => <p key={`${item.sheet}-${item.row_number}-${index}`} className="mb-1"><strong>{item.sheet} baris {item.row_number}:</strong> {item.message}</p>)}</div>}{preview.status === "preview" && <p className="text-xs text-muted-foreground">Preview menampilkan maksimal 100 baris. Konfirmasi hanya tersedia jika tidak ada error.</p>}</div>}
      </section>

      <aside className="space-y-4"><section className="rounded-lg border bg-card p-4"><h2 className="text-sm font-semibold">Isi workbook</h2><ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground"><li><strong className="text-foreground">campaigns</strong> untuk daftar campaign.</li><li><strong className="text-foreground">daily_metrics</strong> untuk spend, klik, reach, dan konversi harian.</li><li><strong className="text-foreground">chat_metrics</strong> untuk metrik chat dan konversi.</li><li><strong className="text-foreground">petunjuk</strong> berisi aturan pengisian template.</li></ul></section><section className="rounded-lg border bg-card p-4"><h2 className="text-sm font-semibold">Catatan keamanan</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">Data masuk ke tabel aplikasi setelah Anda menekan konfirmasi. File tidak diteruskan langsung ke AI.</p></section></aside>
    </div>

    <section className="rounded-lg border bg-card p-4 sm:p-5"><div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold">Riwayat import</h2><p className="text-sm text-muted-foreground">20 import terakhir untuk audit data manual.</p></div>{history.isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}</div>{history.isError ? <p className="text-sm text-destructive">Riwayat import belum dapat dimuat.</p> : !history.data?.length ? <p className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">Belum ada import yang selesai.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="border-b text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2">File</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Berhasil</th><th className="px-3 py-2">Error</th><th className="px-3 py-2">Pengupload</th><th className="px-3 py-2">Waktu</th></tr></thead><tbody>{history.data.map((item: any) => <tr key={item.id} className="border-b last:border-0"><td className="px-3 py-2 font-medium">{item.file_name}</td><td className="px-3 py-2">{item.status}</td><td className="px-3 py-2">{item.rows_imported}</td><td className="px-3 py-2">{item.error_count}</td><td className="px-3 py-2">{item.uploader?.name || "-"}</td><td className="px-3 py-2 text-muted-foreground">{formatDate(item.created_at)}</td></tr>)}</tbody></table></div>}</section>
  </div>;
}
