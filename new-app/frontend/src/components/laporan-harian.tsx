"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, ClipboardList, Bold, Italic, List, Printer, Link2, Upload, FileText, ExternalLink, X, Loader2 } from "lucide-react";

interface LaporanHarianProps {
  modul: string;
  color?: string;
}

// ── Markdown helpers ──────────────────────────────────────────────────────────

function wrapSelection(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  onChange: (v: string) => void,
  prefix: string,
  suffix: string = prefix,
) {
  const el = ref.current;
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const selected = value.substring(start, end);
  const next = value.substring(0, start) + prefix + selected + suffix + value.substring(end);
  onChange(next);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + prefix.length, end + prefix.length);
  });
}

function insertBullet(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  onChange: (v: string) => void,
) {
  const el = ref.current;
  if (!el) return;
  const start = el.selectionStart;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const next = value.substring(0, lineStart) + "- " + value.substring(lineStart);
  onChange(next);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + 2, start + 2);
  });
}

/** Render simple markdown to HTML (bold, italic, bullet lists) */
function renderMarkdown(text: string): string {
  if (!text) return "";
  let s = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  const lines = s.split("\n");
  const out: string[] = [];
  let inList = false;
  for (const line of lines) {
    if (line.startsWith("- ")) {
      if (!inList) { out.push('<ul class="list-disc pl-4 my-0.5 space-y-0.5">'); inList = true; }
      out.push(`<li class="text-sm leading-snug">${line.slice(2)}</li>`);
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      if (line.trim()) out.push(`<p class="text-sm leading-snug">${line}</p>`);
    }
  }
  if (inList) out.push("</ul>");
  return out.join("");
}

// ── Markdown toolbar + textarea ───────────────────────────────────────────────

function MarkdownEditor({
  value,
  onChange,
  placeholder,
  minHeight = "110px",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring">
      <div className="flex items-center gap-0.5 px-2 py-1 bg-muted/40 border-b">
        <button
          type="button"
          title="Bold (Ctrl+B)"
          className="p-1.5 rounded hover:bg-muted transition-colors"
          onMouseDown={(e) => { e.preventDefault(); wrapSelection(ref, value, onChange, "**"); }}
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Italic (Ctrl+I)"
          className="p-1.5 rounded hover:bg-muted transition-colors"
          onMouseDown={(e) => { e.preventDefault(); wrapSelection(ref, value, onChange, "*"); }}
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <button
          type="button"
          title="Bullet list"
          className="p-1.5 rounded hover:bg-muted transition-colors"
          onMouseDown={(e) => { e.preventDefault(); insertBullet(ref, value, onChange); }}
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <span className="ml-auto text-[10px] text-muted-foreground select-none pr-1">
          **tebal**&nbsp;&nbsp;*miring*&nbsp;&nbsp;- poin
        </span>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ minHeight }}
        className="w-full px-3 py-2 text-sm resize-y focus:outline-none bg-background font-mono leading-relaxed"
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === "b") { e.preventDefault(); wrapSelection(ref, value, onChange, "**"); }
          if (e.ctrlKey && e.key === "i") { e.preventDefault(); wrapSelection(ref, value, onChange, "*"); }
        }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const today = new Date().toISOString().split("T")[0];
const EMPTY = { tanggal_mulai: today, tanggal_selesai: today, kegiatan: "", kendala: "", user_id: "" };

export function LaporanHarian({ modul, color = "text-primary" }: LaporanHarianProps) {
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [filterMulai, setFilterMulai] = useState("");
  const [filterSelesai, setFilterSelesai] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<any>(null);

  // Docs/Link per laporan
  const [docForm, setDocForm] = useState({ title: "", url: "", catatan: "" });
  const [docMode, setDocMode] = useState<"url" | "file">("url");
  const [docFile, setDocFile] = useState<File | null>(null);
  const docFileRef = useRef<HTMLInputElement>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["laporan-harian", modul, filterMulai, filterSelesai],
    queryFn: () =>
      apiClient
        .get("/laporan-harian", {
          params: {
            modul,
            tanggal_mulai: filterMulai || undefined,
            tanggal_selesai: filterSelesai || undefined,
          },
        })
        .then((r) => r.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ["laporan-users"],
    queryFn: () => apiClient.get("/laporan-harian/users").then((r) => r.data),
    staleTime: 60_000,
  });
  const users: { id: number; name: string }[] = Array.isArray(usersData) ? usersData : [];

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (d: any) => apiClient.post("/laporan-harian", d).then((r) => r.data),
    onSuccess: () => {
      toast.success("Laporan harian berhasil disimpan");
      qc.invalidateQueries({ queryKey: ["laporan-harian", modul] });
      setOpen(false);
      setForm({ ...EMPTY });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menyimpan laporan"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/laporan-harian/${id}`).then((r) => r.data),
    onSuccess: () => {
      toast.success("Laporan dihapus");
      qc.invalidateQueries({ queryKey: ["laporan-harian", modul] });
      setConfirmDelete(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal hapus"),
  });

  const { data: lapDocs = [] } = useQuery<any[]>({
    queryKey: ["laporan-docs", viewItem?.id],
    queryFn: () => apiClient.get(`/laporan-harian/${viewItem.id}/docs`).then((r) => r.data),
    enabled: !!viewItem,
    retry: false,
  });

  const addDocMut = useMutation({
    mutationFn: (data: { title: string; url?: string; catatan?: string; file?: File }) => {
      if (data.file) {
        const form = new FormData();
        form.append("title", data.title);
        if (data.catatan) form.append("catatan", data.catatan);
        form.append("file", data.file);
        return apiClient.post(`/laporan-harian/${viewItem.id}/docs`, form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
      }
      return apiClient.post(`/laporan-harian/${viewItem.id}/docs`, data).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success("Dokumen ditambahkan");
      qc.invalidateQueries({ queryKey: ["laporan-docs", viewItem?.id] });
      setDocForm({ title: "", url: "", catatan: "" });
      setDocFile(null);
      if (docFileRef.current) docFileRef.current.value = "";
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const deleteDocMut = useMutation({
    mutationFn: (docId: string) => apiClient.delete(`/laporan-harian/docs/${docId}`).then((r) => r.data),
    onSuccess: () => { toast.success("Dokumen dihapus"); qc.invalidateQueries({ queryKey: ["laporan-docs", viewItem?.id] }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function openCreate() {
    setForm({ ...EMPTY, user_id: currentUser ? String(currentUser.id) : "" });
    setOpen(true);
  }

  function fmtDate(d: string) {
    return new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  function fmtDateRange(mulai: string, selesai: string) {
    const m = String(mulai).split("T")[0];
    const s = String(selesai).split("T")[0];
    return m === s ? fmtDate(m) : `${fmtDate(m)} – ${fmtDate(s)}`;
  }

  const items: any[] = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);

  // ── Print / PDF ───────────────────────────────────────────────────────────────

  function handlePrint() {
    const now = new Date();
    const fmtPeriod =
      filterMulai && filterSelesai
        ? `${fmtDate(filterMulai)} s/d ${fmtDate(filterSelesai)}`
        : filterMulai
        ? `Dari ${fmtDate(filterMulai)}`
        : filterSelesai
        ? `Sampai ${fmtDate(filterSelesai)}`
        : "Semua Periode";

    const rows = items
      .map(
        (lap, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td style="white-space:nowrap">${fmtDateRange(
          String(lap.tanggal_mulai).split("T")[0],
          String(lap.tanggal_selesai).split("T")[0]
        )}</td>
        <td>${lap.user?.name ?? "—"}</td>
        <td>${renderMarkdown(lap.kegiatan)}</td>
        <td style="color:#dc2626">${lap.kendala ? lap.kendala.replace(/</g, "&lt;") : '<span style="color:#94a3b8">—</span>'}</td>
      </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"/><title>Laporan Harian — ${modul}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; padding: 28px 36px; }
  .letterhead { display: flex; align-items: center; gap: 16px; margin-bottom: 10px; }
  .letterhead-logo { height: 64px; width: auto; object-fit: contain; flex-shrink: 0; }
  .company-name { font-size: 15px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.02em; }
  .company-detail { font-size: 11px; color: #475569; margin-top: 2px; line-height: 1.6; }
  .letterhead-divider { border: none; border-top: 2px solid #1e293b; margin: 10px 0 16px; }
  h1 { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 2px; }
  .subtitle { font-size: 12px; color: #475569; margin-bottom: 2px; }
  .meta { font-size: 11px; color: #94a3b8; margin-bottom: 16px; }
  .summary { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
  .scard { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; background: #f8fafc; min-width: 90px; }
  .scard-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
  .scard-value { font-size: 22px; font-weight: 700; color: #1e293b; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; padding: 7px 10px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; }
  td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .num { text-align: center; color: #94a3b8; width: 28px; }
  ul { margin: 0; padding-left: 14px; } li { margin: 1px 0; } p { margin: 1px 0; }
  .footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
  @media print { body { padding: 16px 20px; } }
</style>
</head><body>
  <div class="letterhead">
    <img src="${window.location.origin}/images/logo.png" alt="Logo" class="letterhead-logo" onerror="this.style.display='none'"/>
    <div>
      <div class="company-name">PT. Rubah Rumah Inovasi Pemuda</div>
      <div class="company-detail">Telp: 081376405550</div>
      <div class="company-detail">Jl. Pandu II No.420. Sepanjang Jaya. Kec. Rawalumbu. Kota Bekasi. Jawa Barat 17116</div>
    </div>
  </div>
  <hr class="letterhead-divider"/>
  <h1>Laporan Harian — ${modul}</h1>
  <div class="subtitle">Periode: ${fmtPeriod}</div>
  <div class="meta">Dicetak: ${now.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} ${now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
  <div class="summary">
    <div class="scard"><div class="scard-label">Total Laporan</div><div class="scard-value">${items.length}</div></div>
    <div class="scard"><div class="scard-label">Ada Kendala</div><div class="scard-value">${items.filter((l: any) => l.kendala).length}</div></div>
    <div class="scard"><div class="scard-label">Tanpa Kendala</div><div class="scard-value">${items.filter((l: any) => !l.kendala).length}</div></div>
  </div>
  <table>
    <thead><tr>
      <th class="num">#</th>
      <th style="width:120px">Periode</th>
      <th style="width:110px">User</th>
      <th>Kegiatan</th>
      <th style="width:160px">Kendala</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px">Tidak ada data laporan</td></tr>'}</tbody>
  </table>
  <div class="footer">
    <span>PT. Rubah Rumah Inovasi Pemuda — Laporan Harian ${modul}</span>
    <span>Dibuat otomatis oleh sistem</span>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body></html>`;

    const w = window.open("", "_blank", "width=960,height=700");
    if (!w) { alert("Popup diblokir. Izinkan popup untuk mencetak."); return; }
    w.document.write(html);
    w.document.close();
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className={`h-6 w-6 ${color}`} />
            Laporan Harian
          </h1>
          <p className="text-muted-foreground">{modul} — Laporan kegiatan harian</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex items-center gap-1.5">
            <Input
              type="date" value={filterMulai}
              onChange={(e) => setFilterMulai(e.target.value)}
              className="w-36 text-sm"
            />
            <span className="text-muted-foreground text-xs">s/d</span>
            <Input
              type="date" value={filterSelesai}
              onChange={(e) => setFilterSelesai(e.target.value)}
              className="w-36 text-sm"
            />
            {(filterMulai || filterSelesai) && (
              <Button variant="ghost" size="sm" className="text-xs px-2 h-8"
                onClick={() => { setFilterMulai(""); setFilterSelesai(""); }}>
                Reset
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={isLoading || items.length === 0}>
            <Printer className="h-4 w-4 mr-1.5" /> Cetak PDF
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Isi Laporan
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Periode</TableHead>
                <TableHead className="w-36">User</TableHead>
                <TableHead>Kegiatan Hari Ini</TableHead>
                <TableHead className="w-48">Kendala</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : items.map((lap: any) => (
                    <TableRow
                      key={lap.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => setViewItem(lap)}
                    >
                      <TableCell className="font-medium text-sm whitespace-nowrap">
                        {fmtDateRange(lap.tanggal_mulai, lap.tanggal_selesai)}
                      </TableCell>
                      <TableCell className="text-sm">{lap.user?.name ?? "—"}</TableCell>
                      <TableCell className="max-w-xs">
                        <div
                          className="line-clamp-2 text-sm"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(lap.kegiatan) }}
                        />
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <p className="text-sm line-clamp-2 text-muted-foreground">{lap.kendala || "—"}</p>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmDelete(lap.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              {!isLoading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                    <ClipboardList className="mx-auto h-10 w-10 opacity-20 mb-3" />
                    <p>Belum ada laporan harian</p>
                    <p className="text-xs mt-1">Klik "Isi Laporan" untuk menambahkan</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Create dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" /> Isi Laporan Harian
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Tanggal Mulai *</Label>
                <Input
                  type="date" value={form.tanggal_mulai}
                  onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })}
                />
              </div>
              <div>
                <Label>Tanggal Selesai *</Label>
                <Input
                  type="date" value={form.tanggal_selesai}
                  min={form.tanggal_mulai}
                  onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })}
                />
              </div>
              <div>
                <Label>User *</Label>
                <Select
                  value={form.user_id}
                  onValueChange={(v) => setForm({ ...form, user_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Kegiatan Hari Ini *</Label>
              <MarkdownEditor
                value={form.kegiatan}
                onChange={(v) => setForm({ ...form, kegiatan: v })}
                placeholder={"- Kegiatan pertama\n- Kegiatan kedua\n\nCatatan tambahan..."}
                minHeight="130px"
              />
            </div>

            <div>
              <Label>Kendala</Label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm min-h-[72px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.kendala}
                onChange={(e) => setForm({ ...form, kendala: e.target.value })}
                placeholder="Kendala yang dihadapi hari ini (jika ada)..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button
                disabled={
                  !form.kegiatan || !form.user_id ||
                  !form.tanggal_mulai || !form.tanggal_selesai ||
                  createMut.isPending
                }
                onClick={() =>
                  createMut.mutate({
                    modul,
                    tanggal_mulai: form.tanggal_mulai,
                    tanggal_selesai: form.tanggal_selesai,
                    kegiatan: form.kegiatan,
                    kendala: form.kendala || null,
                    user_id: Number(form.user_id),
                  })
                }
              >
                {createMut.isPending ? "Menyimpan..." : "Simpan Laporan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View detail dialog ── */}
      <Dialog open={!!viewItem} onOpenChange={(v) => { if (!v) { setViewItem(null); setDocForm({ title: "", url: "", catatan: "" }); setDocFile(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" /> Detail Laporan Harian
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <Tabs defaultValue="detail">
              <TabsList>
                <TabsTrigger value="detail"><ClipboardList className="h-3.5 w-3.5 mr-1.5" />Detail</TabsTrigger>
                <TabsTrigger value="docs"><Link2 className="h-3.5 w-3.5 mr-1.5" />Docs/Link</TabsTrigger>
              </TabsList>

              <TabsContent value="detail" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Periode</p>
                    <p className="font-semibold">{fmtDateRange(viewItem.tanggal_mulai, viewItem.tanggal_selesai)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">User</p>
                    <p className="font-semibold">{viewItem.user?.name ?? "—"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Kegiatan Hari Ini</p>
                  <div className="border rounded-md px-4 py-3 bg-muted/20 min-h-[60px] space-y-1" dangerouslySetInnerHTML={{ __html: renderMarkdown(viewItem.kegiatan) }} />
                </div>
                {viewItem.kendala && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Kendala</p>
                    <div className="border border-red-200 rounded-md px-4 py-3 bg-red-50/50 text-sm">{viewItem.kendala}</div>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setViewItem(null)}>Tutup</Button>
                </div>
              </TabsContent>

              <TabsContent value="docs" className="mt-4 space-y-4">
                {/* Add form */}
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Tambah Dokumen</p>
                    <div className="flex gap-1 text-xs">
                      <button onClick={() => setDocMode("url")} className={`px-2.5 py-1 rounded-md font-medium transition-colors ${docMode === "url" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        <Link2 className="h-3 w-3 inline mr-1" />URL
                      </button>
                      <button onClick={() => setDocMode("file")} className={`px-2.5 py-1 rounded-md font-medium transition-colors ${docMode === "file" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        <Upload className="h-3 w-3 inline mr-1" />Upload
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Judul *</label>
                    <Input placeholder="e.g. Foto Progres, Catatan Teknis" value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} />
                  </div>
                  {docMode === "url" ? (
                    <div>
                      <label className="text-xs text-muted-foreground">URL *</label>
                      <Input placeholder="https://..." value={docForm.url} onChange={(e) => setDocForm({ ...docForm, url: e.target.value })} />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-muted-foreground">File (PDF/Image, maks 20MB)</label>
                      <div className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary/50" onClick={() => docFileRef.current?.click()}>
                        {docFile ? <p className="text-sm font-medium flex items-center justify-center gap-2"><FileText className="h-4 w-4" />{docFile.name}</p>
                          : <p className="text-sm text-muted-foreground"><Upload className="h-4 w-4 inline mr-1" />Klik pilih file</p>}
                      </div>
                      <input ref={docFileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-muted-foreground">Catatan</label>
                    <Input placeholder="Keterangan (opsional)" value={docForm.catatan} onChange={(e) => setDocForm({ ...docForm, catatan: e.target.value })} />
                  </div>
                  <Button size="sm"
                    disabled={!docForm.title || (docMode === "url" ? !docForm.url : !docFile) || addDocMut.isPending}
                    onClick={() => addDocMut.mutate(docMode === "file" ? { title: docForm.title, catatan: docForm.catatan, file: docFile! } : docForm)}
                  >
                    {addDocMut.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Menyimpan...</> : <><Plus className="h-3.5 w-3.5 mr-1.5" />Tambah</>}
                  </Button>
                </div>
                {/* List */}
                {lapDocs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Link2 className="mx-auto h-7 w-7 opacity-20 mb-2" />
                    <p className="text-sm">Belum ada dokumen.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lapDocs.map((doc: any) => {
                      const isFile = doc.url?.startsWith("/storage/");
                      const fileUrl = isFile ? `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${doc.url}` : doc.url;
                      return (
                        <div key={doc.id} className="flex items-center gap-3 border rounded-lg px-4 py-3 bg-background">
                          {isFile ? <FileText className="h-4 w-4 text-primary flex-shrink-0" /> : <Link2 className="h-4 w-4 text-primary flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:underline flex items-center gap-1">
                              {doc.title} <ExternalLink className="h-3 w-3" />
                            </a>
                            {doc.catatan && <p className="text-xs text-muted-foreground mt-0.5">{doc.catatan}</p>}
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" disabled={deleteDocMut.isPending} onClick={() => deleteDocMut.mutate(doc.id)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ── */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Laporan?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Laporan harian ini akan dihapus permanen.</p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Batal</Button>
            <Button
              variant="destructive" disabled={deleteMut.isPending}
              onClick={() => confirmDelete && deleteMut.mutate(confirmDelete)}
            >
              {deleteMut.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
