"use client";

import { useState, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Hammer, CheckCircle, Clock, MapPin, Phone, ChevronLeft, ChevronRight,
  CalendarDays, Loader2, X, ImageIcon, Plus, FileDown, List, User, ZoomIn,
} from "lucide-react";

interface Props {
  modul: "golden" | "filter-air";
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/** Ambil koordinat GPS + nama lokasi via Nominatim reverse geocoding */
async function getLocation(): Promise<{ lat: number; lng: number; name: string } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=id`,
            { headers: { "User-Agent": "RubahRumahApp/1.0" } },
          );
          const d = await r.json();
          const a = d.address ?? {};
          const parts = [a.road, a.suburb ?? a.neighbourhood, a.city ?? a.town ?? a.county]
            .filter(Boolean);
          const name = parts.length ? parts.join(", ") : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          resolve({ lat, lng, name });
        } catch {
          resolve({ lat, lng, name: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
        }
      },
      () => resolve(null),
      { timeout: 8000, maximumAge: 60000 },
    );
  });
}

/** Gambar timestamp + nama lokasi di sudut kanan bawah via Canvas */
async function addTimestamp(dataUrl: string, coords?: { lat: number; lng: number; name: string } | null): Promise<string> {
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
      const maxW = img.width * 0.85;
      function truncate(text: string) {
        if (ctx.measureText(text).width <= maxW) return text;
        while (text.length > 5 && ctx.measureText(text + "…").width > maxW) text = text.slice(0, -1);
        return text + "…";
      }
      const locStr = coords ? truncate(coords.name) : null;
      const lines = [ts, ...(locStr ? [locStr] : [])];

      const lineH = fontSize + Math.round(fontSize * 0.35);
      const pad = Math.round(fontSize * 0.5);
      const maxLineW = Math.max(...lines.map((l) => ctx.measureText(l).width));
      const boxH = lineH * lines.length + pad * 0.5;
      const boxX = img.width - maxLineW - pad * 2 - 6;
      const boxY = img.height - boxH - 6;

      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(boxX, boxY, maxLineW + pad * 2, boxH);
      ctx.fillStyle = "#FFE600";
      lines.forEach((line, i) => {
        ctx.fillText(line, boxX + pad, boxY + lineH * (i + 1) - Math.round(fontSize * 0.1));
      });
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.src = dataUrl;
  });
}

function parseFotos(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type === "golden_after_report") {
      return Array.isArray(parsed.data?.dokumentasi)
        ? parsed.data.dokumentasi.map((row: any) => row?.src).filter(Boolean)
        : [];
    }
    return Array.isArray(parsed) ? parsed : [raw];
  } catch { return [raw]; }
}

function hasPengerjaanPayload(raw: string | null | undefined) {
  if (!raw) return false;
  const value = String(raw).trim();
  return value.length > 2 && value !== "[]";
}

type AfterReport = {
  technician: string;
  luas_bangunan: string;
  status: string;
  detail: { area: string; treatment: string; status: string; keterangan: string }[];
  material: { item: string; jumlah: string; keterangan: string }[];
  dokumentasi: { src: string; label: string; keterangan: string; badge?: string }[];
  catatan_teknisi: string;
  tanda_tangan: string;
};

function defaultAfterReport(item?: any, fotos: string[] = []): AfterReport {
  return {
    technician: item?.pic_survey ?? "",
    luas_bangunan: item?.luasan_tanah != null ? `${item.luasan_tanah} m2` : "",
    status: "Selesai",
    detail: [{ area: "", treatment: "", status: "Teratasi", keterangan: "" }],
    material: [{ item: "", jumlah: "", keterangan: "" }],
    dokumentasi: fotos.map((src, i) => ({ src, label: i === 0 ? "Area Pengerjaan" : `Dokumentasi ${i + 1}`, keterangan: "" })),
    catatan_teknisi: "",
    tanda_tangan: "",
  };
}

function parseAfterReport(raw: string | null | undefined, item?: any): AfterReport {
  const legacyFotos = parseFotos(raw);
  if (!raw) return defaultAfterReport(item);
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type === "golden_after_report") {
      const data = parsed.data ?? {};
      return {
        ...defaultAfterReport(item),
        ...data,
        detail: Array.isArray(data.detail) && data.detail.length ? data.detail : defaultAfterReport(item).detail,
        material: Array.isArray(data.material) && data.material.length ? data.material : defaultAfterReport(item).material,
        dokumentasi: Array.isArray(data.dokumentasi) ? data.dokumentasi.filter((row: any) => row?.src) : [],
      };
    }
  } catch {}
  return defaultAfterReport(item, legacyFotos);
}

function serializeAfterReport(report: AfterReport) {
  return { type: "golden_after_report", data: report };
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
    s.isSuperAdmin() || s.hasAnyRole("Head Golden")
  );
  const canSchedule = useAuthStore((s) =>
    s.isSuperAdmin() || s.hasAnyRole("Head Golden", "Sales Admin Golden")
  );
  const currentUserName = useAuthStore((s) => s.user?.name ?? "");

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
  const [pdfClientIds, setPdfClientIds] = useState<string[]>([]);

  // Dialog: set tanggal pengerjaan
  const [scheduleItem, setScheduleItem] = useState<any | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [schedulePic, setSchedulePic] = useState("");

  // Dialog: approve pengerjaan (upload foto) — only canApprove
  const [approveItem, setApproveItem] = useState<any | null>(null);
  const [approveFotos, setApproveFotos] = useState<string[]>([]);
  const [approveReport, setApproveReport] = useState<AfterReport>(() => defaultAfterReport());
  const [approveProcessing, setApproveProcessing] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  // Dialog: upload bukti foto saja (tanpa approve) — semua user
  const [buktiFotoItem, setBuktiFotoItem] = useState<any | null>(null);
  const [buktiFotos, setBuktiFotos] = useState<string[]>([]);
  const [buktiReport, setBuktiReport] = useState<AfterReport>(() => defaultAfterReport());
  const [buktiProcessing, setBuktiProcessing] = useState(false);
  const buktiFotoRef = useRef<HTMLInputElement>(null);

  // Lightbox
  const [viewFoto, setViewFoto] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<"approve" | "bukti" | null>(null);

  // Fetch all approved-survey leads
  const { data, isLoading } = useQuery({
    queryKey: ["pengerjaan-kalender", modul],
    queryFn: () => apiClient.get(`/bd/${modul}/pengerjaan-kalender`).then((r) => r.data),
  });
  const items: any[] = Array.isArray(data) ? data : [];

  const { data: picUsers } = useQuery({
    queryKey: ["pengerjaan-pic-users", modul],
    queryFn: () =>
      apiClient
        .get("/bd/survey-pic-users", {
          params: modul === "golden" || modul === "filter-air" ? { sub_role: "Mitra" } : undefined,
        })
        .then((r) => r.data),
  });
  const picUserList: any[] = Array.isArray(picUsers) ? picUsers : [];

  function openScheduleDialog(item: any) {
    setScheduleItem(item);
    setScheduleDate(item.tanggal_pengerjaan ? String(item.tanggal_pengerjaan).split("T")[0] : "");
    setSchedulePic(item.pic_survey ?? "");
  }

  // ── mutations ────────────────────────────────────────────────────────────────

  const scheduleMut = useMutation({
    mutationFn: ({ id, tanggal, pic }: { id: number; tanggal: string; pic?: string }) =>
      apiClient.patch(`/bd/${modul}/leads/${id}/pengerjaan-schedule`, {
        tanggal_pengerjaan: tanggal,
        pic_survey: pic || null,
      }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Tanggal pengerjaan berhasil diset");
      qc.invalidateQueries({ queryKey: ["pengerjaan-kalender", modul] });
      setScheduleItem(null);
      setScheduleDate("");
      setSchedulePic("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal set tanggal"),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, report }: { id: number; report: AfterReport }) =>
      apiClient.post(`/bd/${modul}/leads/${id}/approve-pengerjaan`, { foto_pengerjaan: serializeAfterReport(report) }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Pengerjaan selesai disetujui");
      qc.invalidateQueries({ queryKey: ["pengerjaan-kalender", modul] });
      setApproveItem(null);
      setApproveFotos([]);
      setApproveReport(defaultAfterReport());
      setDetailMode(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal approve pengerjaan"),
  });

  const buktimut = useMutation({
    mutationFn: ({ id, report }: { id: number; report: AfterReport }) =>
      apiClient.patch(`/bd/${modul}/leads/${id}/bukti-pengerjaan`, { foto_pengerjaan: serializeAfterReport(report) }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Foto pengerjaan disimpan");
      qc.invalidateQueries({ queryKey: ["pengerjaan-kalender", modul] });
      setBuktiFotoItem(null);
      setBuktiFotos([]);
      setBuktiReport(defaultAfterReport());
      setDetailMode(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menyimpan foto"),
  });

  // ── foto handler ─────────────────────────────────────────────────────────────

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setApproveProcessing(true);
    const coords = await getLocation();
    const results: string[] = [];
    for (const file of files) {
      const raw = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.readAsDataURL(file);
      });
      results.push(await addTimestamp(raw, coords));
    }
    setApproveFotos((prev) => [...prev, ...results]);
    setApproveReport((prev) => ({
      ...prev,
      dokumentasi: [...prev.dokumentasi, ...results.map((src, i) => ({ src, label: `Dokumentasi ${prev.dokumentasi.length + i + 1}`, keterangan: "" }))],
    }));
    setApproveProcessing(false);
    e.target.value = "";
  }

  async function handleBuktiFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setBuktiProcessing(true);
    const coords = await getLocation();
    const results: string[] = [];
    for (const file of files) {
      const raw = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.readAsDataURL(file);
      });
      results.push(await addTimestamp(raw, coords));
    }
    setBuktiFotos((prev) => [...prev, ...results]);
    setBuktiReport((prev) => ({
      ...prev,
      dokumentasi: [...prev.dokumentasi, ...results.map((src, i) => ({ src, label: `Dokumentasi ${prev.dokumentasi.length + i + 1}`, keterangan: "" }))],
    }));
    setBuktiProcessing(false);
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
  const uniquePengerjaanClients: { id: string; nama: string }[] = Array.from(
    new Map(
      items
        .filter((i: any) => i.tanggal_pengerjaan || i.tanggal_survey)
        .map((i: any) => [String(i.id), { id: String(i.id), nama: String(i.nama ?? "Tanpa Nama") }])
    ).values()
  );

  function openApproveDialog(item: any) {
    const report = parseAfterReport(item.foto_pengerjaan, item);
    setApproveItem(item);
    setApproveReport(report);
    setApproveFotos(report.dokumentasi.map((row) => row.src).filter(Boolean));
    setDetailMode("approve");
  }

  function openBuktiDialog(item: any) {
    const report = parseAfterReport(item.foto_pengerjaan, item);
    setBuktiFotoItem(item);
    setBuktiReport(report);
    setBuktiFotos(report.dokumentasi.map((row) => row.src).filter(Boolean));
    setDetailMode("bukti");
  }

  function closeAfterDetail() {
    setDetailMode(null);
    setApproveItem(null);
    setApproveFotos([]);
    setApproveReport(defaultAfterReport());
    setBuktiFotoItem(null);
    setBuktiFotos([]);
    setBuktiReport(defaultAfterReport());
  }

  function syncReportPhotos(report: AfterReport, fotos: string[]) {
    return {
      ...report,
      dokumentasi: fotos.map((src, index) => {
        const existing = report.dokumentasi.find((row) => row.src === src) ?? report.dokumentasi[index];
        return {
          src,
          label: existing?.label || (index === 0 ? "Area Pengerjaan" : `Dokumentasi ${index + 1}`),
          keterangan: existing?.keterangan || "",
          badge: existing?.badge || "",
        };
      }),
    };
  }

  function escapeHtml(value: unknown) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function buildAfterReportPageHtml(item: any, pageIndex = 0) {
    const report = parseAfterReport(item.foto_pengerjaan, item);
    const tgl = item.tanggal_pengerjaan
      ? new Date(String(item.tanggal_pengerjaan).split("T")[0] + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : "-";
    const nomor = `RB-GL-SRV/${String(item.id).padStart(3, "0")}/${new Date().getFullYear()}`;
    const detailRows = report.detail
      .filter((row) => row.area || row.treatment || row.status || row.keterangan)
      .map((row) => `<tr><td>${escapeHtml(row.area || "-")}</td><td><em>${escapeHtml(row.treatment || "-")}</em></td><td class="status-ok">${escapeHtml(row.status || "Teratasi")}</td><td>${escapeHtml(row.keterangan || "-")}</td></tr>`)
      .join("");
    const materialCards = report.material
      .filter((row) => row.item || row.jumlah || row.keterangan)
      .map((row) => `<div class="material-card"><div class="material-icon">Tools</div><div><strong>${escapeHtml(row.item || "Material")}</strong><p>${escapeHtml(row.jumlah || "-")}${row.keterangan ? ` - ${escapeHtml(row.keterangan)}` : ""}</p></div></div>`)
      .join("");
    const photos: AfterReport["dokumentasi"] = report.dokumentasi.length
      ? report.dokumentasi
      : parseFotos(item.foto_pengerjaan).map((src, i) => ({ src, label: `Dokumentasi ${i + 1}`, keterangan: "" }));
    const photoCards = photos.map((row, i) => `<figure class="${i === 2 ? "photo-wide" : ""}"><div class="photo-frame"><img src="${escapeHtml(row.src)}"/></div><figcaption><strong>${escapeHtml(row.label || `Dokumentasi ${i + 1}`)}</strong>${row.badge ? `<span>${escapeHtml(row.badge)}</span>` : ""}<p>${escapeHtml(row.keterangan || "")}</p></figcaption></figure>`).join("");
    const signature = report.tanda_tangan
      ? `<img class="signature-img" src="${escapeHtml(report.tanda_tangan)}" />`
      : `<div class="signature-placeholder">[ Digital Signature ]</div>`;
    const printedAt = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    return `<div class="page ${pageIndex > 0 ? "page-break" : ""}">
      ${letterheadHtml()}
      <header class="doc-head">
        <h1>Laporan Hasil Pengerjaan<br/>Rubru Pest</h1>
        <div class="mono">Official Service Report<br/>No: ${escapeHtml(nomor)}</div>
      </header>
      <section class="section"><h2>1. Informasi Pengerjaan</h2><div class="info-grid">
        <div class="info"><span>Customer</span><strong>${escapeHtml(item.nama)}</strong></div>
        <div class="info"><span>Technician</span><strong>${escapeHtml(report.technician || item.pic_survey || "-")}</strong></div>
        <div class="info"><span>Date & Time</span><strong>${escapeHtml(tgl)}</strong></div>
        <div class="info"><span>Location</span><strong>${escapeHtml(item.alamat || "-")}</strong></div>
        <div class="info"><span>Luas Bangunan (m2)</span><strong>${escapeHtml(report.luas_bangunan || (item.luasan_tanah ? `${item.luasan_tanah} m2` : "-"))}</strong></div>
        <div class="info"><span>Status</span><strong class="status-ok">${escapeHtml(report.status || "Selesai")}</strong></div>
      </div></section>
      <section class="section"><h2>2. Detail Pengerjaan</h2><table><thead><tr><th>Area</th><th>Jenis Treatment</th><th>Status</th><th>Keterangan</th></tr></thead><tbody>${detailRows || "<tr><td colspan='4'>-</td></tr>"}</tbody></table></section>
      <section class="section"><h2>3. Alat & Material Terpakai</h2><div class="material-grid">${materialCards || "<div class='empty-box'>-</div>"}</div></section>
      <section class="section"><h2>4. Dokumentasi After Pengerjaan</h2><div class="photo-grid">${photoCards || "<div class='empty-box'>Belum ada dokumentasi foto</div>"}</div></section>
      <section class="section note"><strong>Catatan Teknisi</strong><p>${escapeHtml(report.catatan_teknisi || "-")}</p></section>
      <footer class="signature"><p>Bekasi, ${printedAt}</p><p><strong>Hormat Kami,</strong></p>${signature}<p><strong>Rubru Pest Manajemen</strong></p></footer>
      <div class="footer">End of Service Report</div>
    </div>`;
  }

  function afterReportPrintStyles() {
    return `*{box-sizing:border-box} body{margin:0;background:#fff;color:#111c2c;font-family:Inter,Arial,sans-serif;font-size:13px;line-height:1.45}.page{width:210mm;min-height:297mm;margin:0 auto;padding:18mm 16mm;background:#fff}.page-break{break-before:page;page-break-before:always}.letterhead{display:flex;gap:18px;align-items:center;border-bottom:1px solid #ddc1b1;padding:0 0 14px;margin-bottom:16px}.letterhead img{width:104px;height:78px;object-fit:contain;flex:0 0 auto}.letterhead-text{display:flex;min-height:78px;flex-direction:column;justify-content:center}.company{font-weight:800;font-size:17px;margin-bottom:5px;text-transform:uppercase}.company-detail{font-size:11px;line-height:1.45;color:#564336}.doc-head{border:1px solid #e5d4c8;padding:10px 12px;margin-bottom:18px}.doc-head h1{margin:0;color:#974800;font-size:24px;line-height:1.1;text-transform:uppercase}.mono{font-family:"Courier New",monospace;color:#585e6c;font-size:11px;text-transform:uppercase}.section{margin-top:20px}.section h2{border-left:4px solid #f27f22;padding-left:10px;font-size:16px;margin:0 0 10px}.info-grid{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #ddc1b1}.info{padding:10px;border-right:1px solid #ddc1b1;border-bottom:1px solid #ddc1b1}.info span{display:block;font-size:10px;color:#564336;text-transform:uppercase;font-weight:700}.info strong{display:block;margin-top:4px}table{width:100%;border-collapse:collapse}th{background:#111c2c;color:#fff;text-align:left;font-size:12px;padding:9px}td{border:1px solid #ddc1b1;padding:9px;vertical-align:top}.status-ok{color:#f27f22;font-weight:800}.material-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.material-card{display:flex;gap:14px;align-items:center;border:1px solid #ddc1b1;padding:14px}.material-icon{min-width:40px;height:40px;border-radius:10px;background:#dde2f3;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#414754}.material-card strong{display:block}.material-card p{margin:2px 0 0;color:#564336}.photo-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.photo-wide{grid-column:1/-1}.photo-frame{aspect-ratio:4/3;border:1px solid #ddc1b1;background:#f9f9ff;display:flex;align-items:center;justify-content:center;overflow:hidden}.photo-frame img{width:100%;height:100%;object-fit:contain}.photo-wide .photo-frame{aspect-ratio:21/9}figure{margin:0}figure figcaption{font-size:11px;color:#564336;margin-top:5px}figure span{float:right;background:#f27f22;color:#fff;border-radius:999px;padding:2px 7px;font-weight:800}.note{border:1px solid #ddc1b1;background:#f0f3ff;padding:14px}.signature{margin-top:28px;border-top:1px solid #ddc1b1;padding-top:20px;text-align:center}.signature-img{height:80px;max-width:180px;object-fit:contain}.signature-placeholder{height:80px;display:flex;align-items:center;justify-content:center;color:#8a7264}.footer{text-align:center;margin-top:24px;color:#ddc1b1;text-transform:uppercase;letter-spacing:.12em;font-size:10px}.empty-box{grid-column:1/-1;border:1px solid #ddc1b1;color:#8a7264;padding:14px;text-align:center}@media print{@page{size:A4;margin:0}.page{margin:0}}`;
  }

  function handleDownloadDetailPdf(item: any) {
    const detailHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Laporan Hasil Pengerjaan Rubru Pest</title><style>${afterReportPrintStyles()}</style></head><body>${buildAfterReportPageHtml(item)}<script>window.onload=function(){setTimeout(window.print,400)}</script></body></html>`;
    const detailWindow = window.open("", "_blank", "width=900,height=700");
    if (!detailWindow) { alert("Popup diblokir. Izinkan popup untuk mencetak."); return; }
    detailWindow.document.write(detailHtml);
    detailWindow.document.close();
    return;

    const report = parseAfterReport(item.foto_pengerjaan, item);
    const tgl = item.tanggal_pengerjaan
      ? new Date(String(item.tanggal_pengerjaan).split("T")[0] + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : "";
    const nomor = `RB-GL-SRV/${String(item.id).padStart(3, "0")}/${new Date().getFullYear()}`;
    const detailRows = report.detail.map((row) => `<tr><td>${escapeHtml(row.area)}</td><td><em>${escapeHtml(row.treatment)}</em></td><td class="status-ok">${escapeHtml(row.status || "Teratasi")}</td><td>${escapeHtml(row.keterangan)}</td></tr>`).join("");
    const materialCards = report.material.map((row) => `<div class="material-card"><div class="material-icon">⚒</div><div><strong>${escapeHtml(row.item || "Material")}</strong><p>${escapeHtml(row.jumlah || "-")}${row.keterangan ? ` · ${escapeHtml(row.keterangan)}` : ""}</p></div></div>`).join("");
    const photos: AfterReport["dokumentasi"] = report.dokumentasi.length ? report.dokumentasi : parseFotos(item.foto_pengerjaan).map((src, i) => ({ src, label: `Dokumentasi ${i + 1}`, keterangan: "" }));
    const photoCards = photos.map((row, i) => `<figure class="${i === 2 ? "photo-wide" : ""}"><div class="photo-frame"><img src="${escapeHtml(row.src)}"/></div><figcaption><strong>${escapeHtml(row.label || `Dokumentasi ${i + 1}`)}</strong>${row.badge ? `<span>${escapeHtml(row.badge)}</span>` : ""}<p>${escapeHtml(row.keterangan || "")}</p></figcaption></figure>`).join("");
    const signature = report.tanda_tangan
      ? `<img class="signature-img" src="${escapeHtml(report.tanda_tangan)}" />`
      : `<div class="signature-placeholder">[ Digital Signature ]</div>`;
    const printedAt = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Laporan Hasil Pengerjaan Rubru Pest</title><style>
      *{box-sizing:border-box} body{margin:0;background:#fff;color:#111c2c;font-family:Inter,Arial,sans-serif;font-size:13px;line-height:1.45}.page{width:210mm;min-height:297mm;margin:0 auto;padding:18mm 16mm;background:#fff}.doc-head{border:1px solid #e5d4c8;padding:10px 12px;margin-bottom:18px}.doc-head h1{margin:0;color:#974800;font-size:24px;line-height:1.1;text-transform:uppercase}.mono{font-family:"Courier New",monospace;color:#585e6c;font-size:11px;text-transform:uppercase}.section{margin-top:20px}.section h2{border-left:4px solid #f27f22;padding-left:10px;font-size:16px;margin:0 0 10px}.info-grid{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #ddc1b1}.info{padding:10px;border-right:1px solid #ddc1b1;border-bottom:1px solid #ddc1b1}.info span{display:block;font-size:10px;color:#564336;text-transform:uppercase;font-weight:700}.info strong{display:block;margin-top:4px}table{width:100%;border-collapse:collapse}th{background:#111c2c;color:#fff;text-align:left;font-size:12px;padding:9px}td{border:1px solid #ddc1b1;padding:9px;vertical-align:top}.status-ok{color:#f27f22;font-weight:800}.material-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.material-card{display:flex;gap:14px;align-items:center;border:1px solid #ddc1b1;padding:14px}.material-icon{width:40px;height:40px;border-radius:10px;background:#dde2f3;display:flex;align-items:center;justify-content:center}.material-card strong{display:block}.material-card p{margin:2px 0 0;color:#564336}.photo-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.photo-wide{grid-column:1/-1}.photo-frame{aspect-ratio:4/3;border:1px solid #ddc1b1;background:#f9f9ff;display:flex;align-items:center;justify-content:center;overflow:hidden}.photo-frame img{width:100%;height:100%;object-fit:contain}.photo-wide .photo-frame{aspect-ratio:21/9}.photo-card figcaption,figure figcaption{font-size:11px;color:#564336;margin-top:5px}.photo-card span,figure span{float:right;background:#f27f22;color:#fff;border-radius:999px;padding:2px 7px;font-weight:800}.note{border:1px solid #ddc1b1;background:#f0f3ff;padding:14px}.signature{margin-top:28px;border-top:1px solid #ddc1b1;padding-top:20px;text-align:center}.signature-img{height:80px;max-width:180px;object-fit:contain}.signature-placeholder{height:80px;display:flex;align-items:center;justify-content:center;color:#8a7264}.footer{text-align:center;margin-top:24px;color:#ddc1b1;text-transform:uppercase;letter-spacing:.12em;font-size:10px}@media print{@page{size:A4;margin:0}.page{margin:0}}
    </style></head><body><div class="page">
      <header class="doc-head"><h1>Laporan Hasil Pengerjaan<br/>Rubru Pest</h1><div class="mono">Official Service Report<br/>No: ${escapeHtml(nomor)}</div></header>
      <section class="section"><h2>1. Informasi Pengerjaan</h2><div class="info-grid">
        <div class="info"><span>Customer</span><strong>${escapeHtml(item.nama)}</strong></div><div class="info"><span>Technician</span><strong>${escapeHtml(report.technician || item.pic_survey || "-")}</strong></div><div class="info"><span>Date & Time</span><strong>${escapeHtml(tgl)}</strong></div>
        <div class="info"><span>Location</span><strong>${escapeHtml(item.alamat || "-")}</strong></div><div class="info"><span>Luas Bangunan (m2)</span><strong>${escapeHtml(report.luas_bangunan || (item.luasan_tanah ? `${item.luasan_tanah} m2` : "-"))}</strong></div><div class="info"><span>Status</span><strong class="status-ok">${escapeHtml(report.status || "Selesai")}</strong></div>
      </div></section>
      <section class="section"><h2>2. Detail Pengerjaan</h2><table><thead><tr><th>Area</th><th>Jenis Treatment</th><th>Status</th><th>Keterangan</th></tr></thead><tbody>${detailRows || "<tr><td colspan='4'>-</td></tr>"}</tbody></table></section>
      <section class="section"><h2>3. Alat & Material Terpakai</h2><div class="material-grid">${materialCards}</div></section>
      <section class="section"><h2>4. Dokumentasi After Pengerjaan</h2><div class="photo-grid">${photoCards}</div></section>
      <section class="section note"><strong>Catatan Teknisi</strong><p>${escapeHtml(report.catatan_teknisi || "-")}</p></section>
      <footer class="signature"><p>Bekasi, ${printedAt}</p><p><strong>Hormat Kami,</strong></p>${signature}<p><strong>Rubru Pest Manajemen</strong></p></footer><div class="footer">End of Service Report</div>
    </div><script>window.onload=function(){setTimeout(window.print,400)}</script></body></html>`;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { alert("Popup diblokir. Izinkan popup untuk mencetak."); return; }
    w!.document.write(html);
    w!.document.close();
  }

  function openPdfDialog() {
    const pad = (n: number) => String(n).padStart(2, "0");
    const lastDay = new Date(tahun, bulan, 0).getDate();
    setPdfDari(`${tahun}-${pad(bulan)}-01`);
    setPdfSampai(`${tahun}-${pad(bulan)}-${pad(lastDay)}`);
    setPdfPics([]);
    setPdfClientIds([]);
    setPdfOpen(true);
  }

  function letterheadHtml() {
    return `
      <div class="letterhead">
        <img src="${window.location.origin}/images/offer-logos/rubru-pest-logo.jpeg" alt="Rubru Pest" onerror="this.style.display='none'"/>
        <div class="letterhead-text">
          <div class="company">PT. Rubah Rumah Inovasi Pemuda</div>
          <div class="company-detail">Jl. Pandu II No. 420, Kel. Sepanjang Jaya, Kec. Rawalumbu, Kota Bekasi, Jawa Barat</div>
          <div class="company-detail">Telp : +62 813 - 7640 - 5550</div>
          <div class="company-detail">Website : rubahrumah.com</div>
        </div>
      </div>
    `;
  }

  function handleDownloadPdf(dari?: string, sampai?: string, pics?: string[], clientIds?: string[]) {
    const filtered = items.filter((item: any) => {
      const tgl = item.tanggal_pengerjaan ? String(item.tanggal_pengerjaan).split("T")[0] : null;
      if ((dari || sampai) && !tgl) return false;
      if (dari && tgl && tgl < dari) return false;
      if (sampai && tgl && tgl > sampai) return false;
      if (pics?.length && !pics.includes(item.pic_survey)) return false;
      if (clientIds?.length && !clientIds.includes(String(item.id))) return false;
      return true;
    });

    const pages = filtered.map((item: any, index: number) => buildAfterReportPageHtml(item, index)).join("");
    const emptyPage = `<div class="page">${letterheadHtml()}<header class="doc-head"><h1>Laporan Hasil Pengerjaan<br/>Rubru Pest</h1></header><div class="empty-box">Tidak ada data pada filter ini</div></div>`;
    const detailHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Laporan Hasil Pengerjaan Rubru Pest</title><style>${afterReportPrintStyles()}</style></head><body>${pages || emptyPage}<script>
      window.onload = function() {
        var imgs = document.querySelectorAll('img');
        if (!imgs.length) { setTimeout(window.print, 300); return; }
        var n = 0, total = imgs.length;
        function done() { n++; if (n >= total) setTimeout(window.print, 300); }
        imgs.forEach(function(img) { if (img.complete) done(); else { img.onload = done; img.onerror = done; } });
      };
    </script></body></html>`;
    const detailWindow = window.open("", "_blank", "width=900,height=700");
    if (!detailWindow) { alert("Popup diblokir. Izinkan popup untuk mencetak."); return; }
    detailWindow.document.write(detailHtml);
    detailWindow.document.close();
    return;

    const periodeLabel = dari && sampai
      ? `${dari} s/d ${sampai}`
      : `${MONTH_NAMES_ID[bulan - 1]} ${tahun}`;
    const picLabel = pics?.length ? ` — PIC: ${(pics ?? []).join(", ")}` : "";
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
        ? `<div class="foto-grid">${fotos.map((f: string) => `<img src="${f}" style="width:180px;height:135px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0;"/>`).join(" ")}</div>`
        : "";
      return `
        <tr>
          <td class="num">${i + 1}</td>
          <td>
            <strong>${item.nama.replace(/</g, "&lt;")}</strong>
            ${item.nomor_telepon ? `<br/><span class="sub">${item.nomor_telepon}</span>` : ""}
            ${item.alamat ? `<br/><span class="sub">${String(item.alamat).replace(/</g, "&lt;")}</span>` : ""}
            ${item.luasan_tanah != null ? `<br/><span class="sub-blue">${item.luasan_tanah} m²</span>` : ""}
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
  body { font-family:Inter,'Segoe UI',Arial,sans-serif; font-size:12px; color:#111c2c; background:#fff; padding:26px 34px; }
  .letterhead { display:flex; gap:18px; align-items:center; border-bottom:1px solid #ddc1b1; padding:0 0 14px; margin-bottom:16px; }
  .letterhead img { width:104px; height:78px; object-fit:contain; flex:0 0 auto; }
  .letterhead-text { display:flex; min-height:78px; flex-direction:column; justify-content:center; }
  .company { font-weight:800; font-size:17px; margin-bottom:5px; text-transform:uppercase; }
  .company-detail { font-size:11px; line-height:1.45; color:#564336; }
  h1 { color:#974800; font-size:20px; line-height:1.1; margin:0 0 4px; text-transform:uppercase; letter-spacing:.2px; }
  .meta { font-size:11px; color:#5e6473; margin-bottom:14px; }
  .summary { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
  .scard { border:1px solid #ddc1b1; border-radius:4px; padding:8px 16px; background:#fff; min-width:90px; }
  .scard-label { font-size:9px; color:#5e6473; text-transform:uppercase; letter-spacing:.05em; margin-bottom:3px; }
  .scard-value { font-size:22px; font-weight:800; color:#111c2c; }
  .scard-ok .scard-value { color:#f27f22; }
  .scard-sched .scard-value { color:#974800; }
  .scard-unsched .scard-value { color:#5e6473; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th { background:#111c2c; padding:7px 8px; text-align:left; font-weight:700; color:#fff; border:1px solid #111c2c; text-transform:uppercase; }
  td { padding:7px 8px; border:1px solid #ddc1b1; vertical-align:top; }
  .num { text-align:center; color:#5e6473; width:24px; }
  .sub { color:#5e6473; font-size:10px; }
  .sub-blue { color:#974800; font-size:10px; font-weight:700; }
  .italic { font-style:italic; }
  .badge { font-size:9px; padding:3px 7px; border-radius:2px; font-weight:800; }
  .s-ok { background:#ffdbc7; color:#974800; }
  .s-sched { background:#fef3c7; color:#974800; }
  .s-pend { background:#f0f3ff; color:#5e6473; }
  .foto-grid { display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; }
  .footer { margin-top:24px; padding-top:8px; border-top:1px solid #ddc1b1; font-size:10px; color:#5e6473; display:flex; justify-content:space-between; }
  @media print { body { padding:14px 18px; } }
</style></head><body>
  ${letterheadHtml()}
  <h1>Kalender After Pengerjaan<br/>Rubru Pest</h1>
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
  <script>
    window.onload = function() {
      var imgs = document.querySelectorAll('img');
      if (!imgs.length) { setTimeout(window.print, 300); return; }
      var n = 0, total = imgs.length;
      function done() { n++; if (n >= total) setTimeout(window.print, 300); }
      imgs.forEach(function(img) { if (img.complete) done(); else { img.onload = done; img.onerror = done; } });
    };
  </script>
</body></html>`;

    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { alert("Popup diblokir. Izinkan popup untuk mencetak."); return; }
    w!.document.write(html);
    w!.document.close();
  }

  // ── render ───────────────────────────────────────────────────────────────────

  if (detailMode && (approveItem || buktiFotoItem)) {
    const activeItem = detailMode === "approve" ? approveItem : buktiFotoItem;
    const activeReport = detailMode === "approve" ? approveReport : buktiReport;
    const setActiveReport = detailMode === "approve" ? setApproveReport : setBuktiReport;
    const activeFotos = detailMode === "approve" ? approveFotos : buktiFotos;
    const setActiveFotos = detailMode === "approve" ? setApproveFotos : setBuktiFotos;
    const processing = detailMode === "approve" ? approveProcessing : buktiProcessing;
    const inputRef = detailMode === "approve" ? fotoInputRef : buktiFotoRef;
    const handleChange = detailMode === "approve" ? handleFotoChange : handleBuktiFotoChange;
    const pending = detailMode === "approve" ? approveMut.isPending : buktimut.isPending;
    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Detail After Pengerjaan</h2>
            <p className="text-sm text-muted-foreground">{activeItem?.nama} - Rubru Pest service report</p>
          </div>
          <Button variant="outline" onClick={closeAfterDetail}>Kembali</Button>
        </div>
        <Card>
          <CardContent className="space-y-4 pt-4">
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <p className="font-semibold">{activeItem?.nama}</p>
              {activeItem?.tanggal_pengerjaan && <p className="text-xs text-amber-700 font-medium mt-0.5"><Hammer className="h-3 w-3 inline mr-1" />{fmtDate(activeItem.tanggal_pengerjaan)}</p>}
              {activeItem?.alamat && <p className="text-xs text-muted-foreground">{activeItem.alamat}</p>}
              {activeItem?.luasan_tanah && <p className="text-xs text-blue-700 mt-0.5">{activeItem.luasan_tanah} m2</p>}
            </div>
            <AfterReportFields report={activeReport} setReport={setActiveReport} canAssignSignature={detailMode === "approve" && canApprove} />
            <div className="space-y-2">
              <Label>Dokumentasi After Pengerjaan</Label>
              {activeFotos.length > 0 && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {activeFotos.map((f, idx) => (
                    <div key={idx} className="relative group aspect-[4/3] overflow-hidden rounded-lg border bg-muted/20">
                      <img src={f} alt={`foto-${idx}`} className="h-full w-full object-cover" onClick={() => setViewFoto(f)} />
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFotos((prev) => prev.filter((_, i) => i !== idx));
                          setActiveReport((prev) => ({ ...prev, dokumentasi: prev.dokumentasi.filter((_, i) => i !== idx) }));
                        }}
                        className="absolute right-1 top-1 rounded-full bg-red-500 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {processing && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Menambahkan timestamp...</div>}
              <div className="rounded-lg border-2 border-dashed p-4 text-center cursor-pointer hover:border-amber-400 transition-colors" onClick={() => inputRef.current?.click()}>
                <ImageIcon className="mx-auto mb-1 h-7 w-7 text-gray-300" />
                <p className="text-xs text-gray-400">Klik untuk tambah foto dokumentasi</p>
              </div>
              <input ref={inputRef} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleChange} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeAfterDetail}>Batal</Button>
              <Button
                className={detailMode === "approve" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"}
                disabled={activeFotos.length === 0 || pending || processing}
                onClick={() => {
                  if (!activeItem) return;
                  const report = syncReportPhotos(activeReport, activeFotos);
                  if (detailMode === "approve") approveMut.mutate({ id: activeItem.id, report });
                  else buktimut.mutate({ id: activeItem.id, report });
                }}
              >
                {pending ? "Menyimpan..." : detailMode === "approve" ? "Konfirmasi Selesai" : "Simpan Detail"}
              </Button>
            </div>
          </CardContent>
        </Card>
        {viewFoto && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setViewFoto(null)}>
            <img src={viewFoto} alt="foto" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
          </div>
        )}
      </div>
    );
  }

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    const hasDetail = hasPengerjaanPayload(item.foto_pengerjaan);
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
                          {hasDetail && <p className="mt-1.5 text-xs text-blue-700 font-medium">Dokumentasi/detail tersimpan</p>}
                        </div>
                        {!isSelesai && (
                          <div className="flex flex-col gap-1 shrink-0">
                            {item.tanggal_pengerjaan ? (
                              <>
                                {canApprove && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs px-2 bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => openApproveDialog(item)}
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" /> Selesai
                                  </Button>
                                )}
                                {!canApprove && currentUserName === item.pic_survey && (
                                  <Button
                                    size="sm" variant="outline"
                                    className="h-7 text-xs px-2"
                                    onClick={() => openBuktiDialog(item)}
                                  >
                                    <ImageIcon className="h-3 w-3 mr-1" /> Upload Foto
                                  </Button>
                                )}
                              </>
                            ) : canSchedule ? (
                              <Button
                                size="sm"
                                className="h-7 text-xs px-2 bg-amber-500 hover:bg-amber-600 text-white"
                                onClick={() => openScheduleDialog(item)}
                              >
                                <CalendarDays className="h-3 w-3 mr-1" /> Set Jadwal
                              </Button>
                            ) : null}
                          </div>
                        )}
                        {isSelesai && hasDetail && (
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2 shrink-0" onClick={() => handleDownloadDetailPdf(item)}>
                            <FileDown className="h-3 w-3 mr-1" /> PDF Detail
                          </Button>
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
                canSchedule={canSchedule}
                currentUserName={currentUserName}
                onSchedule={() => openScheduleDialog(item)}
                onApprove={() => openApproveDialog(item)}
                onUploadBukti={() => openBuktiDialog(item)}
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
                {canSchedule && (
                  <Button
                    size="sm"
                    className="h-7 text-xs px-2 bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                    onClick={() => openScheduleDialog(item)}
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
                {canApprove || canSchedule ? (
                  <div className="flex flex-col gap-1 shrink-0">
                    {canApprove && (
                      <Button
                        size="sm"
                        className="h-7 text-xs px-2 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => openApproveDialog(item)}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" /> Selesai
                      </Button>
                    )}
                    {canSchedule && (
                      <Button
                        size="sm" variant="ghost"
                        className="h-6 text-xs px-2 text-amber-700"
                        onClick={() => openScheduleDialog(item)}
                      >
                        Ubah tanggal
                      </Button>
                    )}
                  </div>
                ) : currentUserName === item.pic_survey ? (
                  <Button
                    size="sm" variant="outline"
                    className="h-7 text-xs px-2 shrink-0"
                    onClick={() => openBuktiDialog(item)}
                  >
                    <ImageIcon className="h-3 w-3 mr-1" /> Upload Foto
                  </Button>
                ) : null}
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
                const hasDetail = hasPengerjaanPayload(item.foto_pengerjaan);
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
                      {hasDetail && <p className="mt-1.5 text-xs text-blue-700 font-medium">Dokumentasi/detail tersimpan</p>}
                    </div>
                    {hasDetail && (
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2 shrink-0" onClick={() => handleDownloadDetailPdf(item)}>
                        <FileDown className="h-3 w-3 mr-1" /> PDF Detail
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
      </>)}

      {/* ── Dialog: Set Tanggal Pengerjaan ── */}
      <Dialog open={!!scheduleItem} onOpenChange={(v) => { if (!v) { setScheduleItem(null); setSchedulePic(""); } }}>
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
              <div className="space-y-1.5">
                <Label>PIC After Pengerjaan <span className="text-destructive">*</span></Label>
                {picUserList.length > 0 ? (
                  <Select value={schedulePic} onValueChange={setSchedulePic}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih PIC" />
                    </SelectTrigger>
                    <SelectContent>
                      {picUserList.map((u: any) => (
                        <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={schedulePic}
                    onChange={(e) => setSchedulePic(e.target.value)}
                    placeholder="Nama PIC"
                  />
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setScheduleItem(null); setSchedulePic(""); }}>Batal</Button>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  disabled={!scheduleDate || !schedulePic || scheduleMut.isPending}
                  onClick={() => scheduleMut.mutate({ id: scheduleItem.id, tanggal: scheduleDate, pic: schedulePic })}
                >
                  {scheduleMut.isPending ? "Menyimpan..." : "Simpan Jadwal"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Approve Pengerjaan Selesai ── */}
      <Dialog open={!!approveItem} onOpenChange={(v) => { if (!v) { setApproveItem(null); setApproveFotos([]); setApproveReport(defaultAfterReport()); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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

              <AfterReportFields
                report={approveReport}
                setReport={setApproveReport}
                canAssignSignature={canApprove}
              />

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  Foto Bukti Pengerjaan
                </Label>

                {approveFotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {approveFotos.map((f, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f} alt={`foto-${idx}`} className="w-full h-full object-cover" onClick={() => setViewFoto(f)} />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                          <ZoomIn className="h-5 w-5 text-white" />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setApproveFotos((prev) => prev.filter((_, i) => i !== idx));
                            setApproveReport((prev) => ({ ...prev, dokumentasi: prev.dokumentasi.filter((_, i) => i !== idx) }));
                          }}
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
                    <p className="text-xs text-gray-400">Klik untuk upload foto bukti pengerjaan</p>
                  </div>
                )}
                <input ref={fotoInputRef} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleFotoChange} />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setApproveItem(null); setApproveFotos([]); setApproveReport(defaultAfterReport()); }}>Batal</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={approveFotos.length === 0 || approveMut.isPending || approveProcessing}
                  onClick={() => approveMut.mutate({ id: approveItem.id, report: syncReportPhotos(approveReport, approveFotos) })}
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
              <Label className="text-xs">Filter Client Pengerjaan <span className="text-muted-foreground font-normal">(opsional, bisa lebih dari satu)</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-8 text-sm justify-between font-normal">
                    {pdfClientIds.length === 0
                      ? <span className="text-muted-foreground">Semua client pengerjaan</span>
                      : <span className="truncate">{pdfClientIds.length} client dipilih</span>}
                    <ChevronRight className="h-3.5 w-3.5 rotate-90 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2" align="start">
                  {uniquePengerjaanClients.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Tidak ada client pengerjaan pada data ini</p>
                  ) : (
                    <div className="space-y-1 max-h-56 overflow-y-auto">
                      {uniquePengerjaanClients.map((client) => (
                        <label key={client.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                          <Checkbox
                            checked={pdfClientIds.includes(client.id)}
                            onCheckedChange={(checked) =>
                              setPdfClientIds((prev) => checked ? [...prev, client.id] : prev.filter((id) => id !== client.id))
                            }
                          />
                          <span className="text-sm truncate">{client.nama}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {pdfClientIds.length > 0 && (
                    <button
                      className="mt-1 w-full text-xs text-center text-muted-foreground hover:text-foreground py-1"
                      onClick={() => setPdfClientIds([])}
                    >
                      Reset pilihan client
                    </button>
                  )}
                </PopoverContent>
              </Popover>
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
                onClick={() => { setPdfOpen(false); handleDownloadPdf(pdfDari || undefined, pdfSampai || undefined, pdfPics.length ? pdfPics : undefined, pdfClientIds.length ? pdfClientIds : undefined); }}
              >
                <FileDown className="h-4 w-4 mr-1.5" /> Download PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Upload Foto Bukti (tanpa approve) ── */}
      <Dialog open={!!buktiFotoItem} onOpenChange={(v) => { if (!v) { setBuktiFotoItem(null); setBuktiFotos([]); setBuktiReport(defaultAfterReport()); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-amber-600" /> Upload Foto Pengerjaan
            </DialogTitle>
          </DialogHeader>
          {buktiFotoItem && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <p className="font-semibold">{buktiFotoItem.nama}</p>
                {buktiFotoItem.tanggal_pengerjaan && (
                  <p className="text-xs text-amber-700 font-medium mt-0.5">
                    <Hammer className="h-3 w-3 inline mr-1" />{fmtDate(buktiFotoItem.tanggal_pengerjaan)}
                  </p>
                )}
              </div>
              <AfterReportFields
                report={buktiReport}
                setReport={setBuktiReport}
                canAssignSignature={false}
              />
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  Foto Bukti Pengerjaan <span className="text-destructive">*</span>
                  <span className="text-muted-foreground font-normal text-xs">(timestamp otomatis)</span>
                </Label>
                {buktiFotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {buktiFotos.map((f, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f} alt={`foto-${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setBuktiFotos((prev) => prev.filter((_, i) => i !== idx));
                            setBuktiReport((prev) => ({ ...prev, dokumentasi: prev.dokumentasi.filter((_, i) => i !== idx) }));
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => buktiFotoRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-amber-400 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-amber-500 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-xs">Tambah</span>
                    </button>
                  </div>
                )}
                {buktiProcessing && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Menambahkan timestamp...
                  </div>
                )}
                {buktiFotos.length === 0 && (
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-amber-400 transition-colors"
                    onClick={() => buktiFotoRef.current?.click()}
                  >
                    <ImageIcon className="h-7 w-7 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-400">Klik untuk tambah foto (bisa lebih dari satu)</p>
                  </div>
                )}
                <input ref={buktiFotoRef} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleBuktiFotoChange} />
                {buktiFotos.length > 0 && <p className="text-xs text-muted-foreground">{buktiFotos.length} foto dipilih</p>}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setBuktiFotoItem(null); setBuktiFotos([]); setBuktiReport(defaultAfterReport()); }}>Batal</Button>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  disabled={buktiFotos.length === 0 || buktimut.isPending || buktiProcessing}
                  onClick={() => buktimut.mutate({ id: buktiFotoItem.id, report: syncReportPhotos(buktiReport, buktiFotos) })}
                >
                  {buktimut.isPending ? "Menyimpan..." : "Simpan Foto"}
                </Button>
              </div>
            </div>
          )}
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
function AfterReportFields({ report, setReport, canAssignSignature }: {
  report: AfterReport;
  setReport: Dispatch<SetStateAction<AfterReport>>;
  canAssignSignature: boolean;
}) {
  const patchRow = (key: "detail" | "material", index: number, patch: Record<string, string>) => {
    setReport((prev) => ({ ...prev, [key]: prev[key].map((row, i) => i === index ? { ...row, ...patch } : row) }));
  };
  const addRow = (key: "detail" | "material") => {
    setReport((prev) => ({
      ...prev,
      [key]: key === "detail"
        ? [...prev.detail, { area: "", treatment: "", status: "Teratasi", keterangan: "" }]
        : [...prev.material, { item: "", jumlah: "", keterangan: "" }],
    }));
  };
  const removeRow = (key: "detail" | "material", index: number) => {
    setReport((prev) => ({ ...prev, [key]: prev[key].length <= 1 ? prev[key] : prev[key].filter((_, i) => i !== index) }));
  };
  const uploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReport((prev) => ({ ...prev, tanda_tangan: String(reader.result ?? "") }));
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  return (
    <div className="space-y-3 rounded-lg border bg-white p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Technician</Label>
          <Input value={report.technician} onChange={(e) => setReport((p) => ({ ...p, technician: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Luas Bangunan</Label>
          <Input value={report.luas_bangunan} onChange={(e) => setReport((p) => ({ ...p, luas_bangunan: e.target.value }))} placeholder="300 m2" />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold">Detail Pengerjaan</p>
        {report.detail.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_100px_1fr_28px] gap-2">
            <Input value={row.area} onChange={(e) => patchRow("detail", i, { area: e.target.value })} placeholder="Area" />
            <Input value={row.treatment} onChange={(e) => patchRow("detail", i, { treatment: e.target.value })} placeholder="Jenis treatment" />
            <Input value={row.status} onChange={(e) => patchRow("detail", i, { status: e.target.value })} placeholder="Status" />
            <Input value={row.keterangan} onChange={(e) => patchRow("detail", i, { keterangan: e.target.value })} placeholder="Keterangan" />
            <Button type="button" variant="ghost" size="icon" disabled={report.detail.length <= 1} onClick={() => removeRow("detail", i)}><X className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => addRow("detail")}>Tambah Detail</Button>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold">Alat & Material Terpakai</p>
        {report.material.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_100px_1fr_28px] gap-2">
            <Input value={row.item} onChange={(e) => patchRow("material", i, { item: e.target.value })} placeholder="Item" />
            <Input value={row.jumlah} onChange={(e) => patchRow("material", i, { jumlah: e.target.value })} placeholder="Jumlah" />
            <Input value={row.keterangan} onChange={(e) => patchRow("material", i, { keterangan: e.target.value })} placeholder="Keterangan" />
            <Button type="button" variant="ghost" size="icon" disabled={report.material.length <= 1} onClick={() => removeRow("material", i)}><X className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => addRow("material")}>Tambah Material</Button>
      </div>
      <div className="space-y-1">
        <Label>Catatan Teknisi</Label>
        <textarea className="min-h-[70px] w-full rounded-md border px-3 py-2 text-sm" value={report.catatan_teknisi} onChange={(e) => setReport((p) => ({ ...p, catatan_teknisi: e.target.value }))} />
      </div>
      {canAssignSignature && (
        <div className="space-y-2 rounded-md border border-dashed p-2">
          <p className="text-sm font-semibold">Tanda Tangan</p>
          {report.tanda_tangan && <img src={report.tanda_tangan} alt="Tanda tangan" className="h-16 max-w-40 object-contain" />}
          <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-1.5 text-xs">
            Upload tanda tangan
            <input type="file" accept="image/*" className="hidden" onChange={uploadSignature} />
          </label>
          {report.tanda_tangan && <Button type="button" size="sm" variant="ghost" onClick={() => setReport((p) => ({ ...p, tanda_tangan: "" }))}>Hapus</Button>}
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, canApprove, canSchedule, currentUserName, onSchedule, onApprove, onUploadBukti, onViewFoto }: {
  item: any;
  canApprove: boolean;
  canSchedule: boolean;
  currentUserName: string;
  onSchedule: () => void;
  onApprove: () => void;
  onUploadBukti: () => void;
  onViewFoto: (f: string) => void;
}) {
  const isSelesai = item.pengerjaan_approval_status === "approved";
  const hasDetail = hasPengerjaanPayload(item.foto_pengerjaan);
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
        {hasDetail && <p className="mt-1.5 text-xs text-blue-700 font-medium">Dokumentasi/detail tersimpan</p>}
      </div>
      {!isSelesai && (
        <div className="flex flex-col gap-1 shrink-0">
          {canApprove && (
            <Button size="sm" className="h-7 text-xs px-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={onApprove}>
              <CheckCircle className="h-3 w-3 mr-1" /> Selesai
            </Button>
          )}
          {canSchedule && (
            <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-amber-700" onClick={onSchedule}>
              Ubah tanggal
            </Button>
          )}
          {!canApprove && !canSchedule && currentUserName === item.pic_survey && (
            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={onUploadBukti}>
              <ImageIcon className="h-3 w-3 mr-1" /> Upload Foto
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
