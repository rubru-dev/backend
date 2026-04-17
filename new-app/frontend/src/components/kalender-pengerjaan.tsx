"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Hammer, CheckCircle, Clock, MapPin, Phone, ChevronLeft, ChevronRight,
  CalendarDays, Loader2, X, ImageIcon, Plus, FileDown, List, User,
} from "lucide-react";

interface Props {
  modul: "golden";
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/** Gambar timestamp di sudut kanan bawah via Canvas */
async function addTimestamp(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const now = new Date();
      const ts = now.toLocaleString("id-ID", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });
      const fontSize = Math.max(14, Math.round(img.width * 0.028));
      ctx.font = `bold ${fontSize}px monospace`;
      const textWidth = ctx.measureText(ts).width;
      const pad = Math.round(fontSize * 0.5);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(img.width - textWidth - pad * 2 - 6, img.height - fontSize - pad * 2 - 6, textWidth + pad * 2, fontSize + pad + 4);
      ctx.fillStyle = "#FFE600";
      ctx.fillText(ts, img.width - textWidth - pad - 6, img.height - pad - 8);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.src = dataUrl;
  });
}

function parseFotos(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [raw];
  } catch { return [raw]; }
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(String(s).split("T")[0] + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}
function fmtDateShort(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(String(s).split("T")[0] + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric", month: "short",
  });
}

const MONTH_NAMES_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

export function KalenderAfterPengerjaan({ modul }: Props) {
  const qc = useQueryClient();
  const canApprove = useAuthStore((s) =>
    s.isSuperAdmin() || s.hasPermission("bd", "approve") || s.hasPermission("golden", "edit")
  );

  const now = new Date();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // PDF options dialog
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfDari, setPdfDari] = useState("");
  const [pdfSampai, setPdfSampai] = useState("");
  const [pdfPics, setPdfPics] = useState<string[]>([]);

  // Dialog: set tanggal pengerjaan
  const [scheduleItem, setScheduleItem] = useState<any | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");

  // Dialog: approve pengerjaan (upload foto)
  const [approveItem, setApproveItem] = useState<any | null>(null);
  const [approveFotos, setApproveFotos] = useState<string[]>([]);
  const [approveProcessing, setApproveProcessing] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  // Lightbox
  const [viewFoto, setViewFoto] = useState<string | null>(null);

  // Fetch all approved-survey leads
  const { data, isLoading } = useQuery({
    queryKey: ["pengerjaan-kalender", modul],
    queryFn: () => apiClient.get(`/bd/${modul}/pengerjaan-kalender`).then((r) => r.data),
  });
  const items: any[] = Array.isArray(data) ? data : [];

  // ── mutations ────────────────────────────────────────────────────────────────

  const scheduleMut = useMutation({
    mutationFn: ({ id, tanggal }: { id: number; tanggal: string }) =>
      apiClient.patch(`/bd/${modul}/leads/${id}/pengerjaan-schedule`, { tanggal_pengerjaan: tanggal }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Tanggal pengerjaan berhasil diset");
      qc.invalidateQueries({ queryKey: ["pengerjaan-kalender", modul] });
      setScheduleItem(null);
      setScheduleDate("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal set tanggal"),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, fotos }: { id: number; fotos: string[] }) =>
      apiClient.post(`/bd/${modul}/leads/${id}/approve-pengerjaan`, { foto_pengerjaan: fotos }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Pengerjaan selesai disetujui");
      qc.invalidateQueries({ queryKey: ["pengerjaan-kalender", modul] });
      setApproveItem(null);
      setApproveFotos([]);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal approve pengerjaan"),
  });

  // ── foto handler ─────────────────────────────────────────────────────────────

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setApproveProcessing(true);
    const results: string[] = [];
    for (const file of files) {
      const raw = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.readAsDataURL(file);
      });
      results.push(await addTimestamp(raw));
    }
    setApproveFotos((prev) => [...prev, ...results]);
    setApproveProcessing(false);
    e.target.value = "";
  }

  // ── derived data ─────────────────────────────────────────────────────────────

  const unscheduled = items.filter((i) => !i.tanggal_pengerjaan);
  const scheduled = items.filter((i) => i.tanggal_pengerjaan && i.pengerjaan_approval_status !== "approved");
  const selesai = items.filter((i) => i.pengerjaan_approval_status === "approved");

  // Calendar cells for scheduled items
  const byDate: Record<string, any[]> = {};
  scheduled.forEach((item) => {
    if (!item.tanggal_pengerjaan) return;
    const key = String(item.tanggal_pengerjaan).split("T")[0];
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(item);
  });
  selesai.forEach((item) => {
    if (!item.tanggal_pengerjaan) return;
    const key = String(item.tanggal_pengerjaan).split("T")[0];
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(item);
  });

  const firstDayOfWeek = new Date(tahun, bulan - 1, 1).getDay();
  const daysInMonth = new Date(tahun, bulan, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  function dateKey(day: number) {
    return `${tahun}-${String(bulan).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function cellStyle(day: number) {
    const entries = byDate[dateKey(day)];
    if (!entries?.length) return "";
    if (entries.every((e) => e.pengerjaan_approval_status === "approved")) return "bg-blue-100 border-blue-400";
    return "bg-amber-100 border-amber-400";
  }

  const selectedItems = selectedDate ? (byDate[selectedDate] ?? []) : [];

  const prevMonth = () => {
    setSelectedDate(null);
    if (bulan === 1) { setBulan(12); setTahun(tahun - 1); } else setBulan(bulan - 1);
  };
  const nextMonth = () => {
    setSelectedDate(null);
    if (bulan === 12) { setBulan(1); setTahun(tahun + 1); } else setBulan(bulan + 1);
  };

  // ── PDF ─────────────────────────────────────────────────────────────────────

  // Unique PIC names from current items
  const uniquePics: string[] = Array.from(new Set(items.map((i: any) => i.pic_survey).filter(Boolean)));

  function openPdfDialog() {
    const pad = (n: number) => String(n).padStart(2, "0");
    const lastDay = new Date(tahun, bulan, 0).getDate();
    setPdfDari(`${tahun}-${pad(bulan)}-01`);
    setPdfSampai(`${tahun}-${pad(bulan)}-${pad(lastDay)}`);
    setPdfPics([]);
    setPdfOpen(true);
  }

  function handleDownloadPdf(dari?: string, sampai?: string, pics?: string[]) {
    const filtered = items.filter((item: any) => {
      const tgl = item.tanggal_pengerjaan ? String(item.tanggal_pengerjaan).split("T")[0] : null;
      if (dari && tgl && tgl < dari) return false;
      if (sampai && tgl && tgl > sampai) return false;
      if (pics?.length && !pics.includes(item.pic_survey)) return false;
      return true;
    });

    const periodeLabel = dari && sampai
      ? `${dari} s/d ${sampai}`
      : `${MONTH_NAMES_ID[bulan - 1]} ${tahun}`;
    const picLabel = pics?.length ? ` — PIC: ${pics.join(", ")}` : "";
    const printNow = new Date();

    const statusText = (item: any) =>
      item.pengerjaan_approval_status === "approved" ? "✓ Selesai"
        : item.tanggal_pengerjaan ? "⚒ Terjadwal" : "— Belum Dijadwalkan";
    const statusClass = (item: any) =>
      item.pengerjaan_approval_status === "approved" ? "s-ok"
        : item.tanggal_pengerjaan ? "s-sched" : "s-pend";

    const rows = filtered.map((item: any, i: number) => {
      const tglPengerjaan = item.tanggal_pengerjaan
        ? new Date(String(item.tanggal_pengerjaan).split("T")[0] + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
        : "—";
      const tglSurvey = item.tanggal_survey
        ? new Date(String(item.tanggal_survey).split("T")[0] + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
        : "—";
      const fotos = parseFotos(item.foto_pengerjaan);
      const fotoHtml = fotos.length > 0
        ? `<div class="foto-grid">${fotos.map((f: string) => `<img src="${f}" style="width:100px;height:75px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0;"/>`).join(" ")}</div>`
        : "";
      return `
        <tr>
          <td class="num">${i + 1}</td>
          <td>
            <strong>${item.nama.replace(/</g, "&lt;")}</strong>
            ${item.nomor_telepon ? `<br/><span class="sub">${item.nomor_telepon}</span>` : ""}
            ${item.alamat ? `<br/><span class="sub">${String(item.alamat).replace(/</g, "&lt;")}</span>` : ""}
            ${item.luasan_tanah != null ? `<br/><span class="sub-blue">${item.luasan_tanah} m²</span>` : ""}
            ${item.catatan_survey ? `<br/><span class="sub italic">"${String(item.catatan_survey).replace(/</g, "&lt;")}"</span>` : ""}
            ${fotoHtml}
          </td>
          <td>${tglSurvey}</td>
          <td>${tglPengerjaan}</td>
          <td>${item.pic_survey ?? "—"}</td>
          <td><span class="badge ${statusClass(item)}">${statusText(item)}</span></td>
        </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"/>
<title>Kalender After Pengerjaan — ${periodeLabel}${picLabel}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',Arial,sans-serif; font-size:12px; color:#1a1a1a; background:#fff; padding:26px 34px; }
  .letterhead { display:flex; align-items:center; gap:16px; margin-bottom:8px; }
  .letterhead-logo { height:60px; width:auto; object-fit:contain; flex-shrink:0; }
  .company-name { font-size:14px; font-weight:700; color:#1e293b; text-transform:uppercase; letter-spacing:.02em; }
  .company-detail { font-size:11px; color:#475569; margin-top:2px; line-height:1.6; }
  hr.divider { border:none; border-top:2px solid #1e293b; margin:8px 0 14px; }
  h1 { font-size:16px; font-weight:700; color:#1e293b; margin-bottom:2px; }
  .meta { font-size:11px; color:#94a3b8; margin-bottom:14px; }
  .summary { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
  .scard { border:1px solid #e2e8f0; border-radius:8px; padding:8px 16px; background:#f8fafc; min-width:90px; }
  .scard-label { font-size:9px; color:#64748b; text-transform:uppercase; letter-spacing:.05em; margin-bottom:3px; }
  .scard-value { font-size:22px; font-weight:700; color:#1e293b; }
  .scard-ok .scard-value { color:#2563eb; }
  .scard-sched .scard-value { color:#d97706; }
  .scard-unsched .scard-value { color:#64748b; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th { background:#f1f5f9; padding:7px 8px; text-align:left; font-weight:600; color:#475569; border-bottom:2px solid #e2e8f0; }
  td { padding:6px 8px; border-bottom:1px solid #f1f5f9; vertical-align:top; }
  .num { text-align:center; color:#94a3b8; width:24px; }
  .sub { color:#94a3b8; font-size:10px; }
  .sub-blue { color:#2563eb; font-size:10px; font-weight:600; }
  .italic { font-style:italic; }
  .badge { font-size:9px; padding:2px 7px; border-radius:4px; font-weight:600; }
  .s-ok { background:#dbeafe; color:#1d4ed8; }
  .s-sched { background:#fef3c7; color:#d97706; }
  .s-pend { background:#f1f5f9; color:#64748b; }
  .foto-grid { display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; }
  .footer { margin-top:24px; padding-top:8px; border-top:1px solid #e2e8f0; font-size:10px; color:#94a3b8; display:flex; justify-content:space-between; }
  @media print { body { padding:14px 18px; } }
</style></head><body>
  <div class="letterhead">
    <img src="${window.location.origin}/images/logo.png" alt="Logo" class="letterhead-logo" onerror="this.style.display='none'"/>
    <div>
      <div class="company-name">PT. Rubah Rumah Inovasi Pemuda</div>
      <div class="company-detail">Telp: 081376405550</div>
      <div class="company-detail">Jl. Pandu II No.420. Sepanjang Jaya. Kec. Rawalumbu. Kota Bekasi. Jawa Barat 17116</div>
    </div>
  </div>
  <hr class="divider"/>
  <h1>Kalender After Pengerjaan — GoldenxRubahrumah</h1>
  <div class="meta">Periode: ${periodeLabel}${picLabel} &nbsp;|&nbsp; Dicetak: ${printNow.toLocaleDateString("id-ID", { weekday:"long", year:"numeric", month:"long", day:"numeric" })} ${printNow.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" })}</div>
  <div class="summary">
    <div class="scard"><div class="scard-label">Total</div><div class="scard-value">${filtered.length}</div></div>
    <div class="scard scard-ok"><div class="scard-label">Selesai</div><div class="scard-value">${filtered.filter((i: any) => i.pengerjaan_approval_status === "approved").length}</div></div>
    <div class="scard scard-sched"><div class="scard-label">Terjadwal</div><div class="scard-value">${filtered.filter((i: any) => i.tanggal_pengerjaan && i.pengerjaan_approval_status !== "approved").length}</div></div>
    <div class="scard scard-unsched"><div class="scard-label">Belum Dijadwalkan</div><div class="scard-value">${filtered.filter((i: any) => !i.tanggal_pengerjaan).length}</div></div>
  </div>
  <table>
    <thead><tr>
      <th class="num">#</th><th>Nama Client</th>
      <th style="width:90px">Tgl Survey</th>
      <th style="width:90px">Tgl Pengerjaan</th>
      <th style="width:110px">PIC Survey</th>
      <th style="width:100px">Status</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:24px">Tidak ada data pada periode ini</td></tr>'}</tbody>
  </table>
  <div class="footer">
    <span>PT. Rubah Rumah Inovasi Pemuda — Kalender After Pengerjaan</span>
    <span>Dibuat otomatis oleh sistem</span>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body></html>`;

    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { alert("Popup diblokir. Izinkan popup untuk mencetak."); return; }
    w.document.write(html);
    w.document.close();
  }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Hammer className="h-6 w-6 text-blue-500" /> Kalender After Pengerjaan
          </h2>
          <p className="text-muted-foreground text-sm">
            GoldenxRubahrumah — Jadwal pengerjaan setelah survey disetujui
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden">
            <button
              onClick={() => setView("calendar")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${view === "calendar" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Kalender
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors border-l ${view === "list" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              <List className="h-3.5 w-3.5" /> List After Pengerjaan
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={openPdfDialog} disabled={isLoading || items.length === 0}>
            <FileDown className="h-4 w-4 mr-1.5" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Belum Dijadwalkan", value: unscheduled.length, color: "text-gray-500", bg: "bg-gray-50" },
          { label: "Terjadwal", value: scheduled.length, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Selesai", value: selesai.length, color: "text-blue-600", bg: "bg-blue-50" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.bg}`}>
                  <Hammer className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── List After Pengerjaan ── */}
      {view === "list" && (
        <Card>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-8">
                Belum ada data pengerjaan.
              </p>
            ) : (
              <div className="divide-y">
                {[...items]
                  .sort((a: any, b: any) => {
                    const da = a.tanggal_pengerjaan ?? a.tanggal_survey ?? "";
                    const db = b.tanggal_pengerjaan ?? b.tanggal_survey ?? "";
                    return da.localeCompare(db);
                  })
                  .map((item: any, i: number) => {
                    const isSelesai = item.pengerjaan_approval_status === "approved";
                    const tglPengerjaan = item.tanggal_pengerjaan
                      ? new Date(String(item.tanggal_pengerjaan).split("T")[0] + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
                      : null;
                    const fotos = parseFotos(item.foto_pengerjaan);
                    return (
                      <div key={item.id} className="flex items-start gap-3 py-3 px-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="text-xs text-muted-foreground w-6 shrink-0 mt-1 font-mono">{i + 1}</div>
                        <div className={`w-1 self-stretch rounded-full shrink-0 ${isSelesai ? "bg-blue-500" : item.tanggal_pengerjaan ? "bg-amber-400" : "bg-gray-300"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{item.nama}</span>
                            {isSelesai
                              ? <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-[10px] px-1.5">✓ Selesai</Badge>
                              : item.tanggal_pengerjaan
                              ? <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] px-1.5">⚒ Terjadwal</Badge>
                              : <Badge variant="outline" className="bg-gray-100 text-gray-500 text-[10px] px-1.5">— Belum Dijadwalkan</Badge>
                            }
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                            {tglPengerjaan && (
                              <span className={`flex items-center gap-1 font-medium ${isSelesai ? "text-blue-700" : "text-amber-700"}`}>
                                <Hammer className="h-3 w-3" /> {tglPengerjaan}
                              </span>
                            )}
                            {item.tanggal_survey && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {new Date(String(item.tanggal_survey).split("T")[0] + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                            {item.pic_survey && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" /> {item.pic_survey}
                              </span>
                            )}
                            {item.nomor_telepon && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {item.nomor_telepon}
                              </span>
                            )}
                            {item.alamat && (
                              <span className="flex items-center gap-1 truncate max-w-xs">
                                <MapPin className="h-3 w-3 shrink-0" /> {item.alamat}
                              </span>
                            )}
                            {item.luasan_tanah != null && (
                              <span className="text-blue-700 font-semibold">{item.luasan_tanah} m²</span>
                            )}
                          </div>
                          {item.catatan_survey && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">"{item.catatan_survey}"</p>
                          )}
                          {fotos.length > 0 && (
                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
                              {fotos.map((f: string, fi: number) => (
                                <button key={fi} onClick={() => setViewFoto(f)}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={f} alt="foto" className="w-12 h-10 object-cover rounded border hover:opacity-80 transition-opacity" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {canApprove && !isSelesai && (
                          <div className="flex flex-col gap-1 shrink-0">
                            {item.tanggal_pengerjaan ? (
                              <Button
                                size="sm"
                                className="h-7 text-xs px-2 bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => { setApproveItem(item); setApproveFotos([]); }}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" /> Selesai
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="h-7 text-xs px-2 bg-amber-500 hover:bg-amber-600 text-white"
                                onClick={() => { setScheduleItem(item); setScheduleDate(""); }}
                              >
                                <CalendarDays className="h-3 w-3 mr-1" /> Set Jadwal
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calendar + panels */}
      {view === "calendar" && (<><Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <CardTitle className="text-lg font-bold">{MONTH_NAMES[bulan - 1]} {tahun}</CardTitle>
            <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-200 border border-amber-400 inline-block" /> Terjadwal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-200 border border-blue-400 inline-block" /> Selesai
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-7 border-b mb-1">
            {DAY_NAMES.map((d, i) => (
              <div key={d} className={`text-center text-xs font-semibold py-2 ${i === 0 ? "text-red-500" : "text-muted-foreground"}`}>{d}</div>
            ))}
          </div>
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1 mt-1">
              {Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 mt-1">
              {cells.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="h-20" />;
                const dKey = dateKey(day);
                const st = cellStyle(day);
                const isToday = dKey === todayKey;
                const isSelected = selectedDate === dKey;
                const entries = byDate[dKey] ?? [];
                const isSunday = idx % 7 === 0;
                return (
                  <button
                    key={dKey}
                    onClick={() => setSelectedDate(isSelected ? null : dKey)}
                    className={[
                      "relative h-20 rounded-lg border text-left p-1.5 transition-all overflow-hidden flex flex-col",
                      isSelected ? "border-blue-500 ring-2 ring-blue-400 bg-blue-50"
                        : entries.length > 0 ? `${st} border`
                        : "border-gray-100 hover:bg-muted/40 hover:border-gray-300",
                    ].join(" ")}
                  >
                    <span className={[
                      "text-xs font-bold leading-none shrink-0",
                      isToday ? "bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                        : isSunday ? "text-red-500" : "text-gray-700",
                    ].join(" ")}>{day}</span>
                    {entries.length > 0 && (
                      <div className="flex-1 mt-0.5 space-y-0.5 overflow-hidden">
                        {entries.slice(0, 2).map((e: any) => (
                          <div key={e.id} className={`rounded border px-1 py-0.5 ${e.pengerjaan_approval_status === "approved" ? "bg-blue-600/10 border-blue-500/40 text-blue-900" : "bg-amber-500/10 border-amber-400/40 text-amber-900"}`}>
                            <p className="text-[9px] font-semibold leading-tight truncate">{e.nama}</p>
                          </div>
                        ))}
                        {entries.length > 2 && <p className="text-[9px] text-muted-foreground pl-0.5">+{entries.length - 2} lainnya</p>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected date panel */}
      {selectedDate && selectedItems.length > 0 && (
        <Card className="border-blue-300 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-blue-800 flex items-center gap-2">
              <Hammer className="h-4 w-4" /> {fmtDate(selectedDate)}
              <Badge variant="outline" className="ml-auto text-blue-700 border-blue-300">{selectedItems.length} klien</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {selectedItems.map((item: any) => (
              <ItemCard
                key={item.id}
                item={item}
                canApprove={canApprove}
                onSchedule={() => { setScheduleItem(item); setScheduleDate(item.tanggal_pengerjaan ? String(item.tanggal_pengerjaan).split("T")[0] : ""); }}
                onApprove={() => { setApproveItem(item); setApproveFotos([]); }}
                onViewFoto={setViewFoto}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Belum Dijadwalkan */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" /> Belum Dijadwalkan
              <Badge className="ml-auto bg-gray-100 text-gray-600 border-gray-200">{unscheduled.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 max-h-80 overflow-y-auto">
            {isLoading ? <Skeleton className="h-16 w-full" /> : unscheduled.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-8">Semua sudah dijadwalkan</p>
            ) : unscheduled.map((item: any) => (
              <div key={item.id} className="flex items-start gap-2 border rounded-lg p-2.5 bg-gray-50/50">
                <div className="w-1 self-stretch rounded-full bg-gray-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{item.nama}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                    {item.alamat && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate max-w-[120px]">{item.alamat}</span></span>}
                    {item.nomor_telepon && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{item.nomor_telepon}</span>}
                    {item.luasan_tanah && <span className="text-blue-700 font-medium">{item.luasan_tanah} m²</span>}
                  </div>
                </div>
                {canApprove && (
                  <Button
                    size="sm"
                    className="h-7 text-xs px-2 bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                    onClick={() => { setScheduleItem(item); setScheduleDate(""); }}
                  >
                    <CalendarDays className="h-3 w-3 mr-1" /> Set Jadwal
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Terjadwal */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Hammer className="h-4 w-4 text-amber-600" /> Terjadwal
              <Badge className="ml-auto bg-amber-100 text-amber-700 border-amber-200">{scheduled.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 max-h-80 overflow-y-auto">
            {isLoading ? <Skeleton className="h-16 w-full" /> : scheduled.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-8">Belum ada yang terjadwal</p>
            ) : scheduled.map((item: any) => (
              <div key={item.id} className="flex items-start gap-2 border rounded-lg p-2.5 bg-amber-50/50">
                <div className="w-1 self-stretch rounded-full bg-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{item.nama}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 text-amber-700 font-medium">
                      <CalendarDays className="h-3 w-3" /> {fmtDateShort(item.tanggal_pengerjaan)}
                    </span>
                    {item.alamat && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate max-w-[120px]">{item.alamat}</span></span>}
                    {item.luasan_tanah && <span className="text-blue-700 font-medium">{item.luasan_tanah} m²</span>}
                  </div>
                </div>
                {canApprove && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      size="sm"
                      className="h-7 text-xs px-2 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => { setApproveItem(item); setApproveFotos([]); }}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" /> Selesai
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="h-6 text-xs px-2 text-amber-700"
                      onClick={() => { setScheduleItem(item); setScheduleDate(String(item.tanggal_pengerjaan).split("T")[0]); }}
                    >
                      Ubah tanggal
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Selesai */}
        {selesai.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" /> Selesai
                <Badge className="ml-auto bg-blue-100 text-blue-700 border-blue-200">{selesai.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2 max-h-64 overflow-y-auto">
              {selesai.map((item: any) => {
                const fotos = parseFotos(item.foto_pengerjaan);
                return (
                  <div key={item.id} className="flex items-start gap-2 border rounded-lg p-2.5 bg-blue-50/50">
                    <div className="w-1 self-stretch rounded-full bg-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm truncate">{item.nama}</p>
                        <CheckCircle className="h-3 w-3 text-blue-600 shrink-0" />
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                        {item.tanggal_pengerjaan && (
                          <span className="flex items-center gap-1 text-blue-700 font-medium">
                            <Hammer className="h-3 w-3" /> {fmtDateShort(item.tanggal_pengerjaan)}
                          </span>
                        )}
                        {item.alamat && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate max-w-[120px]">{item.alamat}</span></span>}
                        {item.luasan_tanah && <span className="text-blue-700 font-medium">{item.luasan_tanah} m²</span>}
                      </div>
                      {fotos.length > 0 && (
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {fotos.map((f, i) => (
                            <button key={i} onClick={() => setViewFoto(f)}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={f} alt="foto" className="w-12 h-10 object-cover rounded border hover:opacity-80 transition-opacity" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
      </>)}

      {/* ── Dialog: Set Tanggal Pengerjaan ── */}
      <Dialog open={!!scheduleItem} onOpenChange={(v) => !v && setScheduleItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-amber-500" /> Set Tanggal Pengerjaan
            </DialogTitle>
          </DialogHeader>
          {scheduleItem && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <p className="font-semibold">{scheduleItem.nama}</p>
                {scheduleItem.alamat && <p className="text-xs text-muted-foreground">{scheduleItem.alamat}</p>}
                {scheduleItem.luasan_tanah && <p className="text-xs text-blue-700 mt-0.5">{scheduleItem.luasan_tanah} m²</p>}
                {scheduleItem.catatan_survey && <p className="text-xs text-muted-foreground mt-0.5 italic">"{scheduleItem.catatan_survey}"</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Pengerjaan <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setScheduleItem(null)}>Batal</Button>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  disabled={!scheduleDate || scheduleMut.isPending}
                  onClick={() => scheduleMut.mutate({ id: scheduleItem.id, tanggal: scheduleDate })}
                >
                  {scheduleMut.isPending ? "Menyimpan..." : "Simpan Jadwal"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Approve Pengerjaan Selesai ── */}
      <Dialog open={!!approveItem} onOpenChange={(v) => { if (!v) { setApproveItem(null); setApproveFotos([]); } }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" /> Konfirmasi Pengerjaan Selesai
            </DialogTitle>
          </DialogHeader>
          {approveItem && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <p className="font-semibold">{approveItem.nama}</p>
                {approveItem.tanggal_pengerjaan && (
                  <p className="text-xs text-amber-700 font-medium mt-0.5">
                    <Hammer className="h-3 w-3 inline mr-1" />{fmtDate(approveItem.tanggal_pengerjaan)}
                  </p>
                )}
                {approveItem.luasan_tanah && <p className="text-xs text-blue-700 mt-0.5">{approveItem.luasan_tanah} m²</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  Foto Bukti Pengerjaan <span className="text-destructive">*</span>
                  <span className="text-muted-foreground font-normal text-xs">(timestamp otomatis)</span>
                </Label>

                {approveFotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {approveFotos.map((f, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f} alt={`foto-${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setApproveFotos((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fotoInputRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-xs">Tambah</span>
                    </button>
                  </div>
                )}

                {approveProcessing && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Menambahkan timestamp...
                  </div>
                )}

                {approveFotos.length === 0 && (
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                    onClick={() => fotoInputRef.current?.click()}
                  >
                    <ImageIcon className="h-7 w-7 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-400">Klik untuk tambah foto (bisa lebih dari satu)</p>
                  </div>
                )}
                <input ref={fotoInputRef} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleFotoChange} />
                {approveFotos.length > 0 && <p className="text-xs text-muted-foreground">{approveFotos.length} foto dipilih</p>}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setApproveItem(null); setApproveFotos([]); }}>Batal</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={approveFotos.length === 0 || approveMut.isPending || approveProcessing}
                  onClick={() => approveMut.mutate({ id: approveItem.id, fotos: approveFotos })}
                >
                  {approveMut.isPending ? "Menyimpan..." : "Konfirmasi Selesai"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── PDF Options Dialog ── */}
      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5 text-blue-500" /> Download PDF After Pengerjaan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Dari Tanggal</Label>
                <Input type="date" value={pdfDari} onChange={(e) => setPdfDari(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sampai Tanggal</Label>
                <Input type="date" value={pdfSampai} onChange={(e) => setPdfSampai(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Filter PIC <span className="text-muted-foreground font-normal">(opsional, bisa lebih dari satu)</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-8 text-sm justify-between font-normal">
                    {pdfPics.length === 0
                      ? <span className="text-muted-foreground">— Semua PIC —</span>
                      : <span className="truncate">{pdfPics.join(", ")}</span>}
                    <ChevronRight className="h-3.5 w-3.5 rotate-90 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  {uniquePics.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Tidak ada PIC pada data ini</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {uniquePics.map((pic) => (
                        <label key={pic} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                          <Checkbox
                            checked={pdfPics.includes(pic)}
                            onCheckedChange={(checked) =>
                              setPdfPics((prev) => checked ? [...prev, pic] : prev.filter((p) => p !== pic))
                            }
                          />
                          <span className="text-sm truncate">{pic}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {pdfPics.length > 0 && (
                    <button
                      className="mt-1 w-full text-xs text-center text-muted-foreground hover:text-foreground py-1"
                      onClick={() => setPdfPics([])}
                    >
                      Reset pilihan
                    </button>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setPdfOpen(false)}>Batal</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => { setPdfOpen(false); handleDownloadPdf(pdfDari || undefined, pdfSampai || undefined, pdfPics.length ? pdfPics : undefined); }}
              >
                <FileDown className="h-4 w-4 mr-1.5" /> Download PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {viewFoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setViewFoto(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewFoto} alt="foto" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}

// ── ItemCard helper ───────────────────────────────────────────────────────────
function ItemCard({ item, canApprove, onSchedule, onApprove, onViewFoto }: {
  item: any;
  canApprove: boolean;
  onSchedule: () => void;
  onApprove: () => void;
  onViewFoto: (f: string) => void;
}) {
  const isSelesai = item.pengerjaan_approval_status === "approved";
  const fotos = parseFotos(item.foto_pengerjaan);
  return (
    <div className="flex items-start gap-3 bg-white rounded-lg p-3 border shadow-sm">
      <div className={`w-1 self-stretch rounded-full shrink-0 ${isSelesai ? "bg-blue-500" : "bg-amber-400"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{item.nama}</span>
          {isSelesai
            ? <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-[10px] px-1.5">✓ Selesai</Badge>
            : <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] px-1.5">⚒ Terjadwal</Badge>
          }
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
          {item.alamat && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{item.alamat}</span>}
          {item.nomor_telepon && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{item.nomor_telepon}</span>}
          {item.luasan_tanah && <span className="text-blue-700 font-medium">{item.luasan_tanah} m²</span>}
        </div>
        {fotos.length > 0 && (
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {fotos.map((f: string, i: number) => (
              <button key={i} onClick={() => onViewFoto(f)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f} alt="foto" className="w-12 h-10 object-cover rounded border hover:opacity-80 transition-opacity" />
              </button>
            ))}
          </div>
        )}
      </div>
      {canApprove && !isSelesai && (
        <div className="flex flex-col gap-1 shrink-0">
          <Button size="sm" className="h-7 text-xs px-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={onApprove}>
            <CheckCircle className="h-3 w-3 mr-1" /> Selesai
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-amber-700" onClick={onSchedule}>
            Ubah tanggal
          </Button>
        </div>
      )}
    </div>
  );
}
