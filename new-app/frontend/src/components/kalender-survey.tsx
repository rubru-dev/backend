"use client";

import { useState, useRef } from "react";
import type { ReactNode } from "react";
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
  CalendarDays, CheckCircle, XCircle, Clock,
  MapPin, Phone, User, ChevronLeft, ChevronRight, Upload, RefreshCw, FileDown, List, Loader2, ZoomIn, X,
} from "lucide-react";

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

/** Tambah timestamp + nama lokasi di sudut kanan bawah foto via Canvas */
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

interface KalenderSurveyProps {
  modul: "sales-admin" | "telemarketing" | "golden" | "filter-air";
  showAll?: boolean;
  useGoldenSurveyReportTemplate?: boolean;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const GOLDEN_PEST_TYPES = ["Rayap", "Tikus", "Nyamuk", "Semut", "Lalat", "Kecoa", "Kutu"];

type GoldenSurveyReportForm = {
  surveyor: string;
  jenis_bangunan: string;
  luas_area: string;
  area_disurvey: { area: string; keterangan: string }[];
  hama: { jenis: string; status: string; keterangan: string }[];
  temuan: { area: string; jenis: string; severity?: string; keterangan: string }[];
  treatment: { metode: string; area: string; keterangan: string }[];
  material: { item: string; jumlah: string; keterangan: string }[];
  foto_area: { dokumentasi: string[]; keterangan: string }[];
  foto_temuan: { dokumentasi: string[]; keterangan: string }[];
};

function defaultGoldenSurveyReportForm(item?: any): GoldenSurveyReportForm {
  return {
    surveyor: item?.pic_survey ?? "",
    jenis_bangunan: "",
    luas_area: item?.luasan_tanah != null ? String(item.luasan_tanah) : "",
    area_disurvey: [{ area: "", keterangan: "" }],
    hama: GOLDEN_PEST_TYPES.map((jenis, index) => ({ jenis, status: index === 0 ? "Ditemukan" : "Tidak Ditemukan", keterangan: "" })),
    temuan: [{ area: "", jenis: "", severity: "Sedang", keterangan: "" }],
    treatment: [{ metode: "", area: "", keterangan: "" }],
    material: [{ item: "", jumlah: "", keterangan: "" }],
    foto_area: [{ dokumentasi: [], keterangan: "" }],
    foto_temuan: [{ dokumentasi: [], keterangan: "" }],
  };
}

function normalizeGoldenPhotoRows(rows: any[], fallback: { dokumentasi: string[]; keterangan: string }[]) {
  if (!Array.isArray(rows)) return fallback;
  return rows.length ? rows.map((row) => ({
    dokumentasi: Array.isArray(row?.dokumentasi)
      ? row.dokumentasi
      : row?.dokumentasi
        ? [String(row.dokumentasi)]
        : [],
    keterangan: row?.keterangan ?? "",
  })) : fallback;
}

function parseGoldenSurveyReportForm(raw: string | null | undefined, item?: any): GoldenSurveyReportForm {
  const fallback = defaultGoldenSurveyReportForm(item);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type !== "golden_survey_report") return { ...fallback, surveyor: fallback.surveyor, luas_area: fallback.luas_area };
    const data = parsed.data ?? {};
    return {
      ...fallback,
      ...data,
      area_disurvey: Array.isArray(data.area_disurvey) && data.area_disurvey.length ? data.area_disurvey : fallback.area_disurvey,
      hama: Array.isArray(data.hama) && data.hama.length ? data.hama.map((row: any) => ({ jenis: row?.jenis ?? "", status: row?.status === "Tidak Ditemukan" ? "Tidak Ditemukan" : "Ditemukan", keterangan: row?.keterangan ?? "" })) : fallback.hama,
      temuan: Array.isArray(data.temuan) && data.temuan.length ? data.temuan.map((row: any) => ({ area: row?.area ?? "", jenis: row?.jenis ?? "", severity: row?.severity ?? "Sedang", keterangan: row?.keterangan ?? "" })) : fallback.temuan,
      treatment: Array.isArray(data.treatment) && data.treatment.length ? data.treatment : fallback.treatment,
      material: Array.isArray(data.material) && data.material.length ? data.material : fallback.material,
      foto_area: normalizeGoldenPhotoRows(data.foto_area, fallback.foto_area),
      foto_temuan: normalizeGoldenPhotoRows(data.foto_temuan, fallback.foto_temuan),
    };
  } catch {
    return fallback;
  }
}

function serializeGoldenSurveyReportForm(form: GoldenSurveyReportForm) {
  return JSON.stringify({ type: "golden_survey_report", data: form });
}

export function KalenderSurvey({ modul, showAll, useGoldenSurveyReportTemplate }: KalenderSurveyProps) {
  const qc = useQueryClient();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [filterUserId, setFilterUserId] = useState<string>("_all");
  const pdfLabel = useGoldenSurveyReportTemplate ? "Laporan Survey Golden" : "Kalender Survey";

  // PDF options dialog
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfDari, setPdfDari] = useState("");
  const [pdfSampai, setPdfSampai] = useState("");
  const [pdfPics, setPdfPics] = useState<string[]>([]);
  const [pdfClientIds, setPdfClientIds] = useState<string[]>([]);
  const canApprove = useAuthStore((s) =>
    s.isSuperAdmin() || s.hasAnyRole("Head Golden")
  );
  const canSchedule = useAuthStore((s) =>
    s.isSuperAdmin() || s.hasAnyRole("Head Golden", "Sales Admin Golden")
  );
  const currentUserName = useAuthStore((s) => s.user?.name ?? "");

  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectAlasan, setRejectAlasan] = useState("");
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    tanggal_survey: "", jam_survey: "", pic_survey: "",
  });
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; id: number | null; fotos: string[]; luasan: string; catatan: string }>({ open: false, id: null, fotos: [], luasan: "", catatan: "" });
  const [approveProcessing, setApproveProcessing] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const [listFotoProcessing, setListFotoProcessing] = useState(false);

  // List detail modal
  const [listDetailItem, setListDetailItem] = useState<any | null>(null);
  const [listDetailFotos, setListDetailFotos] = useState<string[]>([]);
  const [listDetailLuasan, setListDetailLuasan] = useState("");
  const [listDetailCatatan, setListDetailCatatan] = useState("");
  const [goldenReportForm, setGoldenReportForm] = useState<GoldenSurveyReportForm>(() => defaultGoldenSurveyReportForm());
  const listFotoRef = useRef<HTMLInputElement>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // ── API ─────────────────────────────────────────────────────────────────────

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["survey-kalender", modul, bulan, tahun, showAll, filterUserId],
    queryFn: () =>
      apiClient
        .get(`/bd/${modul}/survey-kalender`, {
          params: {
            bulan,
            tahun,
            ...(showAll ? { show_all: "true" } : {}),
            ...(filterUserId !== "_all" ? { user_id: filterUserId } : {}),
          },
        })
        .then((r) => r.data),
    retry: 1,
  });

  const { data: surveyUsers } = useQuery({
    queryKey: ["survey-kalender-users"],
    queryFn: () => apiClient.get("/bd/survey-kalender/users").then((r) => r.data),
    enabled: !!showAll,
  });
  const surveyUserList: any[] = Array.isArray(surveyUsers) ? surveyUsers : [];

  const { data: picUsers } = useQuery({
    queryKey: ["survey-pic-users", modul],
    queryFn: () =>
      apiClient
        .get("/bd/survey-pic-users", {
          params: modul === "golden" || modul === "filter-air" ? { sub_role: "Mitra" } : undefined,
        })
        .then((r) => r.data),
  });
  const picUserList: any[] = Array.isArray(picUsers) ? picUsers : [];

  const approveMut = useMutation({
    mutationFn: ({ id, foto_survey, luasan_tanah, catatan_survey }: { id: number; foto_survey: string[]; luasan_tanah?: string; catatan_survey?: string }) =>
      apiClient.post(`/bd/${modul}/leads/${id}/approve-survey`, { foto_survey, luasan_tanah: luasan_tanah || undefined, catatan_survey: catatan_survey || undefined }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Survey disetujui");
      qc.invalidateQueries({ queryKey: ["survey-kalender", modul] });
      setApproveDialog({ open: false, id: null, fotos: [], luasan: "", catatan: "" });
      closeListDetail();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menyetujui"),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, alasan }: { id: number; alasan: string }) =>
      apiClient
        .post(`/bd/${modul}/leads/${id}/reject-survey`, { alasan })
        .then((r) => r.data),
    onSuccess: () => {
      toast.success("Survey ditolak");
      qc.invalidateQueries({ queryKey: ["survey-kalender", modul] });
      setRejectId(null);
      setRejectAlasan("");
      closeListDetail();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menolak"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) =>
      apiClient.patch(`/bd/${modul}/leads/${id}/survey`, body).then((r) => r.data),
    onSuccess: () => {
      toast.success("Jadwal diupdate");
      qc.invalidateQueries({ queryKey: ["survey-kalender", modul] });
      setScheduleId(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal update jadwal"),
  });

  const buktimut = useMutation({
    mutationFn: ({ id, foto_survey, luasan_tanah, catatan_survey }: { id: number; foto_survey: string[]; luasan_tanah?: string; catatan_survey?: string }) =>
      apiClient.patch(`/bd/${modul}/leads/${id}/bukti-survey`, { foto_survey, luasan_tanah: luasan_tanah || undefined, catatan_survey: catatan_survey || undefined }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Bukti survey disimpan");
      qc.invalidateQueries({ queryKey: ["survey-kalender", modul] });
      closeListDetail();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menyimpan bukti"),
  });

  // ── Derived data ─────────────────────────────────────────────────────────────

  const items: any[] = Array.isArray(data) ? data : (data?.items ?? []);

  const byDate: Record<string, any[]> = {};
  items.forEach((item: any) => {
    if (!item.tanggal_survey) return;
    const key = String(item.tanggal_survey).split("T")[0];
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
    const statuses = entries.map((e) => e.survey_approval_status);
    if (statuses.every((s) => s === "approved")) return "bg-green-100 border-green-400";
    if (statuses.some((s) => !s || s === "pending")) return "bg-red-100 border-red-400";
    return "bg-gray-100 border-gray-300";
  }

  function entryPillStyle(status: string | null) {
    if (status === "approved") return "bg-green-600/10 border-green-500/40 text-green-800";
    if (status === "rejected") return "bg-gray-200/60 border-gray-300 text-gray-500";
    return "bg-red-500/10 border-red-400/40 text-red-900";
  }

  const prevMonth = () => {
    setSelectedDate(null);
    if (bulan === 1) { setBulan(12); setTahun(tahun - 1); } else setBulan(bulan - 1);
  };
  const nextMonth = () => {
    setSelectedDate(null);
    if (bulan === 12) { setBulan(1); setTahun(tahun + 1); } else setBulan(bulan + 1);
  };

  const selectedItems = selectedDate ? (byDate[selectedDate] ?? []) : [];
  const pendingItems = items.filter((i) => !i.survey_approval_status || i.survey_approval_status === "pending");
  const approvedItems = items.filter((i) => i.survey_approval_status === "approved");
  const rejectedItems = items.filter((i) => i.survey_approval_status === "rejected");

  function openEditSchedule(item: any) {
    setScheduleId(item.id);
    setScheduleForm({
      tanggal_survey: String(item.tanggal_survey ?? "").split("T")[0],
      jam_survey: item.jam_survey ?? "",
      pic_survey: item.pic_survey ?? "",
    });
  }

  function openReschedule(item: any) {
    setScheduleId(item.id);
    setScheduleForm({
      tanggal_survey: "",
      jam_survey: item.jam_survey ?? "",
      pic_survey: item.pic_survey ?? "",
    });
  }

  // Parse foto_survey from DB — stored as JSON array or legacy single string
  function parseFotos(raw: string | null | undefined): string[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw];
    } catch {
      return [raw];
    }
  }

  function closeListDetail() {
    setListDetailItem(null);
    setListDetailFotos([]);
    setListDetailLuasan("");
    setListDetailCatatan("");
    setGoldenReportForm(defaultGoldenSurveyReportForm());
  }

  function openListDetail(item: any) {
    setListDetailItem(item);
    setListDetailFotos(parseFotos(item.foto_survey));
    setListDetailLuasan(item.luasan_tanah != null ? String(item.luasan_tanah) : "");
    setListDetailCatatan(item.catatan_survey ?? "");
    setGoldenReportForm(parseGoldenSurveyReportForm(item.catatan_survey, item));
  }

  function updateGoldenReport<K extends keyof GoldenSurveyReportForm>(key: K, value: GoldenSurveyReportForm[K]) {
    setGoldenReportForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateGoldenReportRow<K extends keyof GoldenSurveyReportForm>(
    key: K,
    index: number,
    patch: Record<string, any>
  ) {
    setGoldenReportForm((prev) => {
      const rows = Array.isArray(prev[key]) ? ([...(prev[key] as any[])] as any[]) : [];
      rows[index] = { ...(rows[index] ?? {}), ...patch };
      return { ...prev, [key]: rows };
    });
  }

  function addGoldenReportRow<K extends keyof GoldenSurveyReportForm>(key: K, row: any) {
    setGoldenReportForm((prev) => {
      const rows = Array.isArray(prev[key]) ? ([...(prev[key] as any[])] as any[]) : [];
      return { ...prev, [key]: [...rows, row] };
    });
  }

  function removeGoldenReportRow<K extends keyof GoldenSurveyReportForm>(key: K, index: number) {
    setGoldenReportForm((prev) => {
      const rows = Array.isArray(prev[key]) ? ([...(prev[key] as any[])] as any[]) : [];
      if (rows.length <= 1) return prev;
      return { ...prev, [key]: rows.filter((_, i) => i !== index) };
    });
  }

  function goldenReportPhotos() {
    return [...goldenReportForm.foto_area, ...goldenReportForm.foto_temuan]
      .flatMap((row) => Array.isArray(row.dokumentasi) ? row.dokumentasi : [])
      .filter(Boolean);
  }

  function listDetailPayload() {
    if (!useGoldenSurveyReportTemplate) {
      return {
        luasan_tanah: listDetailLuasan || undefined,
        catatan_survey: listDetailCatatan || undefined,
      };
    }
    return {
      luasan_tanah: goldenReportForm.luas_area || undefined,
      catatan_survey: serializeGoldenSurveyReportForm(goldenReportForm),
    };
  }

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setApproveProcessing(true);
    const coords = await getLocation();
    const raws = await Promise.all(files.map(readFileAsDataUrl));
    const stamped = await Promise.all(raws.map((r) => addTimestamp(r, coords)));
    setApproveDialog((s) => ({ ...s, fotos: [...s.fotos, ...stamped] }));
    setApproveProcessing(false);
    e.target.value = "";
  }

  async function handleListFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setListFotoProcessing(true);
    const coords = await getLocation();
    const raws = await Promise.all(files.map(readFileAsDataUrl));
    const stamped = await Promise.all(raws.map((r) => addTimestamp(r, coords)));
    setListDetailFotos((prev) => [...prev, ...stamped]);
    setListFotoProcessing(false);
    e.target.value = "";
  }

  async function handleGoldenReportPhotoChange(
    e: React.ChangeEvent<HTMLInputElement>,
    key: "foto_area" | "foto_temuan",
    index: number
  ) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setListFotoProcessing(true);
    const raws = await Promise.all(files.map(readFileAsDataUrl));
    setGoldenReportForm((prev) => {
      const rows = [...prev[key]];
      const current = rows[index] ?? { dokumentasi: [], keterangan: "" };
      rows[index] = { ...current, dokumentasi: [...(current.dokumentasi ?? []), ...raws] };
      return { ...prev, [key]: rows };
    });
    setListFotoProcessing(false);
    e.target.value = "";
  }

  function formatDate(s: string) {
    return new Date(s + "T00:00:00").toLocaleDateString("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }

  function formatDateShort(s: string) {
    return new Date(s + "T00:00:00").toLocaleDateString("id-ID", {
      day: "numeric", month: "short",
    });
  }

  function statusBadge(status: string | null) {
    if (status === "approved")
      return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-[10px] px-1.5">✓ Disetujui</Badge>;
    if (status === "rejected")
      return <Badge variant="outline" className="bg-gray-100 text-gray-500 text-[10px] px-1.5">✕ Ditolak</Badge>;
    return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 text-[10px] px-1.5">⏳ Menunggu</Badge>;
  }

  // ── PDF Download ──────────────────────────────────────────────────────────────

  const MONTH_NAMES_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

  // Unique PIC names from current items
  const uniquePics: string[] = Array.from(new Set(items.map((i: any) => i.pic_survey).filter(Boolean)));
  const uniqueSurveyClients: { id: string; nama: string }[] = Array.from(
    new Map(items.filter((i: any) => i.tanggal_survey).map((i: any) => [String(i.id), { id: String(i.id), nama: String(i.nama ?? "Tanpa Nama") }])).values()
  );

  function openPdfDialog() {
    // Pre-fill dengan bulan aktif
    const pad = (n: number) => String(n).padStart(2, "0");
    const lastDay = new Date(tahun, bulan, 0).getDate();
    setPdfDari(`${tahun}-${pad(bulan)}-01`);
    setPdfSampai(`${tahun}-${pad(bulan)}-${pad(lastDay)}`);
    setPdfPics([]);
    setPdfClientIds([]);
    setPdfOpen(true);
  }

  function escapeHtml(value: unknown) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function handleDownloadGoldenSurveyPdf(filtered: any[], dari?: string, sampai?: string, pics?: string[]) {
    const periodeLabel = dari && sampai
      ? `${dari} s/d ${sampai}`
      : `${MONTH_NAMES_ID[bulan - 1]} ${tahun}`;
    const picLabel = pics?.length ? ` - PIC: ${pics.join(", ")}` : "";
    const today = new Date();
    const printedAt = today.toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });
    const fallbackItems = filtered.length ? filtered : [{
      nama: "",
      tanggal_survey: "",
      jam_survey: "",
      alamat: "",
      pic_survey: "",
      luasan_tanah: "",
      foto_survey: null,
    }];

    const sections = fallbackItems.map((item: any, idx: number) => {
      const dateKeyValue = item.tanggal_survey ? String(item.tanggal_survey).split("T")[0] : "";
      const tgl = dateKeyValue
        ? new Date(`${dateKeyValue}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
        : "";
      const nomor = `RB-GL-SVR/${String(idx + 1).padStart(3, "0")}/${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
      const lokasi = escapeHtml(item.alamat || "");
      const report = parseGoldenSurveyReportForm(item.catatan_survey, item);
      const reportValue = (value: unknown, fallback = "") => escapeHtml(value || fallback);
      const docImagesHtml = (images: string[]) => images.length
        ? `<div class="doc-grid">${images.map((src) => `<img src="${escapeHtml(src)}" class="doc-img" />`).join("")}</div>`
        : `<span class="muted">Belum ada dokumentasi</span>`;
      const areaCardsHtml = report.area_disurvey.map((row) => `<div class="area-card"><div class="area-title">${reportValue(row.area, "Area")}</div><div class="area-note">${reportValue(row.keterangan, "N/A")}</div></div>`).join("");
      const pestCardsHtml = report.hama.map((row) => {
        const found = row.status === "Ditemukan";
        return `<div class="pest-card ${found ? "is-found" : ""}">
          <div class="pest-icon">${found ? "!" : "-"}</div>
          <div class="pest-body"><div class="pest-name">${reportValue(row.jenis)}</div><div class="pest-note">${reportValue(row.keterangan, "N/A")}</div></div>
          <span class="status-chip ${found ? "found" : "not-found"}">${found ? "FOUND" : "NOT FOUND"}</span>
        </div>`;
      }).join("");
      const findingRowsHtml = report.temuan.map((row) => `<tr><td>${reportValue(row.area)}</td><td>${reportValue(row.jenis)}</td><td class="severity ${String(row.severity ?? "").toLowerCase()}">${reportValue(row.severity, "Sedang")}</td></tr>`).join("");
      const treatmentCardsHtml = report.treatment.map((row) => `<div class="treatment-card">
        <div class="treatment-row"><span>METHOD</span><strong>${reportValue(row.metode, "Spraying")}</strong></div>
        <div class="treatment-row"><span>AREA</span><strong>${reportValue(row.area, "Area treatment")}</strong></div>
        <div class="treatment-notes"><span>NOTES</span><p>${reportValue(row.keterangan, "-")}</p></div>
      </div>`).join("");
      const materialCardsHtml = report.material.map((row) => `<div class="material-card"><strong>${reportValue(row.item, "Item")}</strong><span>${reportValue(row.jumlah, "Qty: -")}</span>${row.keterangan ? `<small>${reportValue(row.keterangan)}</small>` : ""}</div>`).join("");
      const photoCardsHtml = (rows: { dokumentasi: string[]; keterangan: string }[]) => rows.map((row) => row.dokumentasi.length
        ? row.dokumentasi.map((src) => `<figure class="photo-card"><div class="photo-frame"><img src="${escapeHtml(src)}" /></div><figcaption>${reportValue(row.keterangan, "Dokumentasi survey")}</figcaption></figure>`).join("")
        : `<div class="photo-empty">${reportValue(row.keterangan, "Belum ada dokumentasi")}</div>`
      ).join("");
      const fotoAreaRowsHtml = photoCardsHtml(report.foto_area);
      const fotoTemuanRowsHtml = photoCardsHtml(report.foto_temuan);
      return `
        <section class="report">
          <div class="page">
            ${letterheadHtml()}
            <div class="report-title">
              <h1>Laporan Hasil Survey<br/>Rubru Pest</h1>
              <p class="number">Nomor : ${nomor}</p>
            </div>
            <div class="info-grid">
              <div class="info-card"><span>Customer</span><strong>${escapeHtml(item.nama || "-")}</strong></div>
              <div class="info-card"><span>Surveyor</span><strong>${reportValue(report.surveyor, "-")}</strong></div>
              <div class="info-card wide"><span>Date & Time</span><strong>${escapeHtml(tgl)}${item.jam_survey ? ` - ${escapeHtml(item.jam_survey)}` : ""}</strong></div>
              <div class="info-card"><span>Location</span><strong>${lokasi || "-"}</strong></div>
              <div class="info-card"><span>Type</span><strong>${reportValue(report.jenis_bangunan, "-")}${report.luas_area ? ` (${reportValue(report.luas_area)})` : ""}</strong></div>
            </div>
            <h2>Area yang Disurvey</h2>
            <div class="stack">${areaCardsHtml}</div>
            <h2>Jenis Hama yang Ditemukan</h2>
            <div class="stack">${pestCardsHtml}</div>
            <h2>5. Detail Temuan Lapangan</h2>
            <table class="findings-table"><thead><tr><th>Area</th><th>Type</th><th>Severity</th></tr></thead><tbody>${findingRowsHtml}</tbody></table>
          </div>

          <div class="page">
            ${letterheadHtml()}
            <h2>Rekomendasi Treatment</h2>
            <div class="stack">${treatmentCardsHtml}</div>
            <h2>Kebutuhan Alat/Material</h2>
            <div class="stack">${materialCardsHtml}</div>
            <h2>Dokumentasi Foto</h2>
            <h3>Foto Area Survey</h3>
            <div class="photo-grid">${fotoAreaRowsHtml}</div>
            <h3>Foto Temuan Hama</h3>
            <div class="photo-grid wide-photo">${fotoTemuanRowsHtml}</div>
            <div class="signature-block">
              <p class="signature-place">Bekasi, ${printedAt}</p>
              <p class="signature-title">Hormat Kami</p>
              <p class="signature-title signature-name">Rubrupest Manajemen</p>
              <p class="signature-digital">(Digital Signature)</p>
              <div class="signature-line"></div>
              <p class="signature-footer">Official Survey Report</p>
            </div>
          </div>
        </section>
      `;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"/><title>Laporan Survey Golden - ${periodeLabel}${picLabel}</title>
<style>
  * { box-sizing:border-box; }
  body { margin:0; background:#f9f9ff; color:#111c2c; font-family:Inter,Arial,Helvetica,sans-serif; font-size:13px; line-height:1.45; }
  .page { min-height:1122px; padding:34px 46px 42px; page-break-after:always; break-after:page; position:relative; overflow:hidden; background:#f9f9ff; }
  .page:last-child { page-break-after:auto; break-after:auto; }
  .letterhead { display:flex; gap:18px; align-items:center; border-bottom:1px solid #ddc1b1; padding:0 0 14px; margin-bottom:16px; }
  .letterhead img { width:104px; height:78px; object-fit:contain; flex:0 0 auto; }
  .letterhead-text { display:flex; min-height:78px; flex-direction:column; justify-content:center; }
  .company { font-weight:800; font-size:17px; margin-bottom:5px; text-transform:uppercase; }
  .company-detail { font-size:11px; line-height:1.45; color:#564336; }
  .report-title { margin:6px 0 14px; }
  h1 { color:#974800; font-size:24px; line-height:1.08; margin:0; text-transform:uppercase; letter-spacing:.2px; }
  .number { margin:6px 0 0; text-align:center; font-family:'JetBrains Mono','Courier New',monospace; font-size:11px; font-weight:700; color:#5e6473; }
  h2 { font-size:14px; line-height:1.2; margin:16px 0 8px; padding-left:9px; border-left:4px solid #f27f22; color:#111c2c; }
  h3 { color:#5e6473; font-size:11px; margin:14px 0 7px; text-transform:uppercase; letter-spacing:.05em; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px; }
  .info-card, .area-card, .pest-card, .material-card { background:#fff; border:1px solid #ddc1b1; border-radius:4px; padding:10px; break-inside:avoid; }
  .info-card.wide { grid-column:1 / -1; }
  .info-card span, .treatment-row span, .treatment-notes span { display:block; color:#5e6473; font-family:'JetBrains Mono','Courier New',monospace; font-size:9px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
  .info-card strong { display:block; margin-top:4px; font-size:13px; }
  .stack { display:grid; gap:8px; }
  .area-card { background:#ffdbc7; border-color:#ffb688; }
  .area-title { font-weight:800; }
  .area-note, .pest-note, .material-card small { color:#564336; font-size:11px; }
  .pest-card { display:grid; grid-template-columns:30px 1fr auto; gap:10px; align-items:center; border-color:#dde2f3; background:#f0f3ff; }
  .pest-card.is-found { border-color:#f27f22; background:#fff; }
  .pest-icon { width:28px; height:28px; border-radius:999px; display:flex; align-items:center; justify-content:center; background:#e7eeff; color:#5e6473; font-weight:800; }
  .is-found .pest-icon { background:#ffdbc7; color:#974800; }
  .pest-name { font-weight:800; }
  .status-chip { color:#fff; border-radius:2px; padding:3px 6px; font-size:10px; font-weight:800; }
  .status-chip.found { background:#f27f22; }
  .status-chip.not-found { background:#9b9fa1; }
  table { width:100%; border-collapse:collapse; margin:6px 0 12px; background:#fff; break-inside:avoid; }
  th, td { border:1px solid #ddc1b1; padding:7px 9px; vertical-align:top; }
  th { background:#111c2c; color:#fff; font-size:11px; text-transform:uppercase; }
  .severity { font-weight:800; color:#f27f22; }
  .severity.parah, .severity.critical { color:#ba1a1a; }
  .severity.ringan { color:#5e6473; }
  .treatment-card { background:#111c2c; border:1px solid #263142; border-radius:4px; color:#fff; padding:10px; break-inside:avoid; }
  .treatment-row { display:flex; justify-content:space-between; gap:12px; padding-bottom:8px; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,.12); }
  .treatment-notes p { margin:4px 0 0; font-style:italic; font-weight:700; }
  .material-card { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .material-card strong { margin-right:auto; }
  .material-card span { border-radius:999px; background:#dde2f3; color:#974800; font-weight:800; padding:4px 8px; }
  .photo-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .wide-photo { grid-template-columns:1fr; }
  .photo-card { margin:0; break-inside:avoid; }
  .photo-frame { width:100%; aspect-ratio:4 / 3; background:#fff; border:1px solid #ddc1b1; display:flex; align-items:center; justify-content:center; overflow:hidden; }
  .photo-frame img { width:100%; height:100%; object-fit:contain; display:block; }
  .photo-card figcaption { margin-top:5px; text-align:center; color:#564336; font-size:11px; font-style:italic; }
  .photo-empty { border:1px dashed #ddc1b1; background:#fff; color:#5e6473; padding:14px; }
  .doc-grid { display:flex; flex-wrap:wrap; gap:8px; align-items:flex-start; }
  .doc-img { width:190px; max-width:100%; height:auto; max-height:150px; object-fit:contain; border:1px solid #d1d5db; display:block; background:#fff; padding:3px; }
  .doc-grid, .doc-img, tr, table { break-inside:avoid; page-break-inside:avoid; }
  .muted { color:#6b7280; font-style:italic; }
  .signature-block { margin:24px auto 0; max-width:310px; text-align:center; border-top:1px dashed #ddc1b1; padding-top:14px; break-inside:avoid; }
  .signature-place { color:#5e6473; margin:0 0 14px; }
  .signature-title { font-weight:800; margin:0; }
  .signature-name { margin-top:0; }
  .signature-digital { color:#9b9fa1; font-style:italic; margin:28px 0 14px; }
  .signature-line { height:1px; background:#ddc1b1; margin:0 auto 9px; width:220px; }
  .signature-footer { margin:0; color:#5e6473; font-family:'JetBrains Mono','Courier New',monospace; font-size:10px; letter-spacing:.06em; text-transform:uppercase; }
  @media print { @page { size:A4 portrait; margin:0; } body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body>
${sections}
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
    w.document.write(html);
    w.document.close();
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
    // Filter items berdasarkan range tanggal & PIC
    const filtered = items.filter((item: any) => {
      const tgl = item.tanggal_survey ? String(item.tanggal_survey).split("T")[0] : null;
      if (dari && tgl && tgl < dari) return false;
      if (sampai && tgl && tgl > sampai) return false;
      if (pics?.length && !pics.includes(item.pic_survey)) return false;
      if (clientIds?.length && !clientIds.includes(String(item.id))) return false;
      return true;
    });

    if (useGoldenSurveyReportTemplate) {
      handleDownloadGoldenSurveyPdf(filtered, dari, sampai, pics);
      return;
    }

    const modulLabel = showAll ? "Semua Modul" : modul === "sales-admin" ? "Sales Admin" : modul === "golden" ? "GoldenxRubahrumah" : "Telemarketing";
    const periodeLabel = dari && sampai
      ? `${dari} s/d ${sampai}`
      : `${MONTH_NAMES_ID[bulan - 1]} ${tahun}`;
    const picLabel = pics?.length ? ` — PIC: ${pics.join(", ")}` : "";
    const now = new Date();

    const statusBadgeText = (s: string | null) =>
      s === "approved" ? "✓ Disetujui" : s === "rejected" ? "✕ Ditolak" : "⏳ Menunggu";
    const statusClass = (s: string | null) =>
      s === "approved" ? "s-ok" : s === "rejected" ? "s-rej" : "s-pend";

    const rows = filtered.map((item: any, i: number) => {
      const tgl = item.tanggal_survey ? new Date(String(item.tanggal_survey).split("T")[0] + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—";
      const fotos = parseFotos(item.foto_survey);
      const fotoHtml = fotos.length > 0
        ? fotos.map((f: string) => `<img src="${f}" style="width:180px;height:135px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0;"/>`).join(" ")
        : "";
      const approvalDetail = item.survey_approval_status === "approved"
        ? `<div class="approval-box">
            <div class="approval-title">✓ Detail Persetujuan</div>
            ${item.luasan_tanah != null ? `<div class="approval-row"><span>Luasan Tanah</span><strong>${item.luasan_tanah} m²</strong></div>` : ""}
            ${item.catatan_survey ? `<div class="approval-row"><span>Catatan</span><span>${String(item.catatan_survey).replace(/</g, "&lt;")}</span></div>` : ""}
            ${fotoHtml ? `<div class="foto-grid">${fotoHtml}</div>` : ""}
          </div>`
        : "";
      return `
        <tr>
          <td class="num">${i + 1}</td>
          <td>
            <strong>${item.nama.replace(/</g, "&lt;")}</strong>
            ${item.nomor_telepon ? `<br/><span class="sub">${item.nomor_telepon}</span>` : ""}
            ${item.alamat ? `<br/><span class="sub">${String(item.alamat).replace(/</g, "&lt;")}</span>` : ""}
            ${approvalDetail}
          </td>
          <td>${tgl}</td>
          <td>${item.jam_survey ?? "—"}</td>
          <td>${item.pic_survey ?? "—"}</td>
          <td><span class="badge ${statusClass(item.survey_approval_status)}">${statusBadgeText(item.survey_approval_status)}</span></td>
        </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"/><title>Kalender Survey — ${periodeLabel}${picLabel}</title>
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
  .scard-ok .scard-value { color:#16a34a; }
  .scard-pend .scard-value { color:#dc2626; }
  .scard-rej .scard-value { color:#64748b; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th { background:#f1f5f9; padding:7px 8px; text-align:left; font-weight:600; color:#475569; border-bottom:2px solid #e2e8f0; }
  td { padding:6px 8px; border-bottom:1px solid #f1f5f9; vertical-align:top; }
  .num { text-align:center; color:#94a3b8; width:24px; }
  .sub { color:#94a3b8; font-size:10px; }
  .badge { font-size:9px; padding:2px 7px; border-radius:4px; font-weight:600; }
  .s-ok { background:#dcfce7; color:#16a34a; }
  .s-pend { background:#fee2e2; color:#dc2626; }
  .s-rej { background:#f1f5f9; color:#64748b; }
  .approval-box { margin-top:6px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:6px 8px; }
  .approval-title { font-size:9px; font-weight:700; color:#16a34a; text-transform:uppercase; letter-spacing:.04em; margin-bottom:4px; }
  .approval-row { display:flex; gap:8px; font-size:10px; color:#374151; margin-bottom:2px; }
  .approval-row span:first-child { color:#6b7280; min-width:90px; }
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
  <h1>Kalender Survey — ${modulLabel}</h1>
  <div class="meta">Periode: ${periodeLabel} &nbsp;|&nbsp; Dicetak: ${now.toLocaleDateString("id-ID", { weekday:"long", year:"numeric", month:"long", day:"numeric" })} ${now.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" })}</div>
  <div class="summary">
    <div class="scard"><div class="scard-label">Total Survey</div><div class="scard-value">${filtered.length}</div></div>
    <div class="scard scard-ok"><div class="scard-label">Disetujui</div><div class="scard-value">${filtered.filter((i: any) => i.survey_approval_status === "approved").length}</div></div>
    <div class="scard scard-pend"><div class="scard-label">Menunggu</div><div class="scard-value">${filtered.filter((i: any) => !i.survey_approval_status || i.survey_approval_status === "pending").length}</div></div>
    <div class="scard scard-rej"><div class="scard-label">Ditolak</div><div class="scard-value">${filtered.filter((i: any) => i.survey_approval_status === "rejected").length}</div></div>
  </div>
  <table>
    <thead><tr>
      <th class="num">#</th><th>Nama Client</th><th style="width:90px">Tanggal</th>
      <th style="width:60px">Jam</th><th style="width:110px">PIC</th><th style="width:90px">Status</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:24px">Tidak ada data survey pada periode ini</td></tr>'}</tbody>
  </table>
  <div class="footer">
    <span>PT. Rubah Rumah Inovasi Pemuda — Kalender Survey ${modulLabel}</span>
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
    w.document.write(html);
    w.document.close();
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-amber-500" /> Kalender Survey
          </h1>
          <p className="text-muted-foreground text-sm">
            {showAll ? "Semua Modul (Sales Admin + Telemarketing)" : modul === "sales-admin" ? "Sales Admin" : modul === "golden" ? "GoldenxRubahrumah" : "Telemarketing"} — Jadwal survey klien
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {showAll && surveyUserList.length > 0 && (
            <Select value={filterUserId} onValueChange={setFilterUserId}>
              <SelectTrigger className="w-44 h-9 text-sm">
                <SelectValue placeholder="Filter inputter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Semua Inputter</SelectItem>
                {surveyUserList.map((u: any) => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
              <List className="h-3.5 w-3.5" /> List Survey
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={openPdfDialog} disabled={isLoading || items.length === 0}>
            <FileDown className="h-4 w-4 mr-1.5" /> Download PDF {useGoldenSurveyReportTemplate ? "Laporan" : ""}
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Survey", value: items.length, icon: CalendarDays, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Disetujui", value: approvedItems.length, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
          { label: "Menunggu", value: pendingItems.length, icon: Clock, color: "text-red-500", bg: "bg-red-50" },
          { label: "Ditolak", value: rejectedItems.length, icon: XCircle, color: "text-gray-500", bg: "bg-gray-50" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.bg}`}>
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── List Survey View ── */}
      {view === "list" && (
        <Card>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-8">
                Tidak ada jadwal survey bulan ini.
              </p>
            ) : (
              <div className="divide-y">
                {[...items]
                  .sort((a: any, b: any) => {
                    const da = a.tanggal_survey ?? "";
                    const db = b.tanggal_survey ?? "";
                    return da.localeCompare(db);
                  })
                  .map((item: any, i: number) => {
                    const tgl = item.tanggal_survey
                      ? new Date(String(item.tanggal_survey).split("T")[0] + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
                      : "—";
                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 py-3 cursor-pointer hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors"
                        onClick={() => openListDetail(item)}
                      >
                        <div className="text-xs text-muted-foreground w-6 shrink-0 mt-1 font-mono">{i + 1}</div>
                        <div
                          className={`w-1 self-stretch rounded-full shrink-0 ${
                            item.survey_approval_status === "approved" ? "bg-green-500"
                              : item.survey_approval_status === "rejected" ? "bg-gray-300"
                              : "bg-red-500"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{item.nama}</span>
                            {statusBadge(item.survey_approval_status)}
                            {showAll && item.modul && (
                              <Badge variant="outline" className="text-[10px] px-1.5">
                                {item.modul === "sales-admin" ? "Sales Admin" : item.modul === "golden" ? "Golden" : "Telemarketing"}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium text-amber-700">
                              <CalendarDays className="h-3 w-3" /> {tgl}
                            </span>
                            {item.jam_survey && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {item.jam_survey}
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
                            {item.jenis && (
                              <Badge variant="outline" className="text-[10px]">{item.jenis}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Calendar ── */}
      {view === "calendar" && (<><Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-lg font-bold">
              {MONTH_NAMES[bulan - 1]} {tahun}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-green-200 border border-green-400 inline-block" />
              Semua disetujui
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-red-200 border border-red-400 inline-block" />
              Belum / sebagian disetujui
            </span>
          </div>
          {!isLoading && !isError && items.length === 0 && (
            <p className="text-center text-xs text-muted-foreground mt-2 pb-1">
              Tidak ada jadwal survey bulan ini. Aktifkan "Rencana Survey: Ya" pada lead untuk menampilkan di kalender.
            </p>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b mb-1">
            {DAY_NAMES.map((d, i) => (
              <div
                key={d}
                className={`text-center text-xs font-semibold py-2 ${i === 0 ? "text-red-500" : "text-muted-foreground"}`}
              >
                {d}
              </div>
            ))}
          </div>

          {isError && (
            <div className="text-center py-6 text-sm text-red-600 bg-red-50 rounded-lg mt-2">
              Gagal memuat data kalender.{" "}
              <span className="underline cursor-pointer" onClick={() => qc.invalidateQueries({ queryKey: ["survey-kalender", modul] })}>
                Coba lagi
              </span>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-7 gap-1 mt-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : !isError && (
            <div className="grid grid-cols-7 gap-1 mt-1">
              {cells.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="h-24" />;

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
                      "relative h-24 rounded-lg border text-left p-1.5 transition-all overflow-hidden flex flex-col",
                      isSelected
                        ? "border-amber-500 ring-2 ring-amber-400 bg-amber-50"
                        : entries.length > 0
                        ? `${st} border`
                        : "border-gray-100 hover:bg-muted/40 hover:border-gray-300",
                    ].join(" ")}
                  >
                    {/* Date number */}
                    <span
                      className={[
                        "text-xs font-bold leading-none shrink-0",
                        isToday
                          ? "bg-amber-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                          : isSunday
                          ? "text-red-500"
                          : "text-gray-700",
                      ].join(" ")}
                    >
                      {day}
                    </span>

                    {/* Client name + location */}
                    {entries.length > 0 && (
                      <div className="flex-1 mt-0.5 space-y-0.5 overflow-hidden">
                        {entries.slice(0, 2).map((e: any) => (
                          <div
                            key={e.id}
                            className={`rounded border px-1 py-0.5 ${entryPillStyle(e.survey_approval_status)}`}
                          >
                            <p className="text-[9px] font-semibold leading-tight truncate">
                              {e.nama}
                            </p>
                            {showAll && e.modul && (
                              <p className="text-[8px] leading-tight opacity-70">{e.modul === "sales-admin" ? "SA" : e.modul === "golden" ? "GL" : "TM"}</p>
                            )}
                            {e.alamat && (
                              <p className="text-[8px] leading-tight truncate flex items-center gap-0.5 opacity-70">
                                <MapPin className="h-2 w-2 shrink-0" />
                                {e.alamat}
                              </p>
                            )}
                          </div>
                        ))}
                        {entries.length > 2 && (
                          <p className="text-[9px] text-muted-foreground pl-0.5">
                            +{entries.length - 2} lainnya
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Selected date detail panel ── */}
      {selectedDate && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {formatDate(selectedDate)}
              <Badge variant="outline" className="ml-auto text-amber-700 border-amber-300">
                {selectedItems.length} klien
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {selectedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Tidak ada jadwal survey</p>
            ) : (
              selectedItems.map((item: any) => (
                <div key={item.id} className="flex items-start gap-3 bg-white rounded-lg p-3 border shadow-sm">
                  <div
                    className={`w-1 self-stretch rounded-full shrink-0 ${
                      item.survey_approval_status === "approved"
                        ? "bg-green-500"
                        : item.survey_approval_status === "rejected"
                        ? "bg-gray-300"
                        : "bg-red-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{item.nama}</span>
                      {statusBadge(item.survey_approval_status)}
                      {showAll && item.modul && (
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          {item.modul === "sales-admin" ? "Sales Admin" : "Telemarketing"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                      {item.jam_survey && (
                        <span className="flex items-center gap-1 text-amber-700 font-semibold">
                          <Clock className="h-3 w-3" /> {item.jam_survey}
                        </span>
                      )}
                      {item.alamat && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[180px]">{item.alamat}</span>
                        </span>
                      )}
                      {item.nomor_telepon && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {item.nomor_telepon}
                        </span>
                      )}
                      {item.pic_survey && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> PIC: {item.pic_survey}
                        </span>
                      )}
                      {item.jenis && (
                        <Badge variant="outline" className="text-xs">{item.jenis}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0 items-end">
                    {canSchedule && (
                      item.survey_approval_status === "rejected" ? (
                        <Button
                          variant="outline" size="sm"
                          className="h-7 text-xs px-2 text-amber-700 border-amber-300 hover:bg-amber-50"
                          onClick={() => openReschedule(item)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Jadwal Ulang
                        </Button>
                      ) : (
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditSchedule(item)}
                        >
                          Edit jadwal
                        </Button>
                      )
                    )}
                    {canApprove && (!item.survey_approval_status || item.survey_approval_status === "pending") && (
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 text-xs px-2 text-blue-600 hover:bg-blue-50"
                        onClick={() => openListDetail(item)}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" /> Review
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Approval lists (side-by-side) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Belum Disetujui */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-500" />
              Belum Disetujui
              <Badge className="ml-auto bg-red-100 text-red-700 border-red-200">
                {pendingItems.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 max-h-80 overflow-y-auto">
            {pendingItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Tidak ada antrian approval
              </p>
            ) : (
              pendingItems.map((item: any) => (
                <div key={item.id} className="flex items-start gap-2 border rounded-lg p-2.5 bg-red-50/50">
                  <div className="w-1 self-stretch rounded-full bg-red-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.nama}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                      {item.tanggal_survey && (
                        <span className="flex items-center gap-1 text-red-700 font-medium">
                          <CalendarDays className="h-3 w-3" />
                          {formatDateShort(String(item.tanggal_survey).split("T")[0])}
                          {item.jam_survey && (
                            <span className="flex items-center gap-0.5 ml-1">
                              <Clock className="h-3 w-3" /> {item.jam_survey}
                            </span>
                          )}
                        </span>
                      )}
                      {item.alamat && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[130px]">{item.alamat}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  {canApprove && (
                    <Button
                      size="sm" variant="outline"
                      className="h-7 text-xs px-2 shrink-0"
                      onClick={() => openListDetail(item)}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" /> Review
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Sudah Disetujui */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Sudah Disetujui
              <Badge className="ml-auto bg-green-100 text-green-700 border-green-200">
                {approvedItems.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 max-h-80 overflow-y-auto">
            {approvedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Belum ada survey yang disetujui
              </p>
            ) : (
              approvedItems.map((item: any) => (
                <div key={item.id} className="flex items-start gap-2 border rounded-lg p-2.5 bg-green-50/50">
                  <div className="w-1 self-stretch rounded-full bg-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm truncate">{item.nama}</p>
                      <CheckCircle className="h-3 w-3 text-green-600 shrink-0" />
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                      {item.tanggal_survey && (
                        <span className="flex items-center gap-1 text-green-700 font-medium">
                          <CalendarDays className="h-3 w-3" />
                          {formatDateShort(String(item.tanggal_survey).split("T")[0])}
                          {item.jam_survey && (
                            <span className="flex items-center gap-0.5 ml-1">
                              <Clock className="h-3 w-3" /> {item.jam_survey}
                            </span>
                          )}
                        </span>
                      )}
                      {item.alamat && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[130px]">{item.alamat}</span>
                        </span>
                      )}
                      {item.pic_survey && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {item.pic_survey}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Ditolak */}
        {rejectedItems.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <XCircle className="h-4 w-4 text-gray-500" />
                Ditolak — Perlu Jadwal Ulang
                <Badge className="ml-auto bg-gray-100 text-gray-600 border-gray-200">{rejectedItems.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2 max-h-60 overflow-y-auto">
              {rejectedItems.map((item: any) => (
                <div key={item.id} className="flex items-start gap-2 border rounded-lg p-2.5 bg-gray-50/50">
                  <div className="w-1 self-stretch rounded-full bg-gray-300 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-gray-600">{item.nama}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                      {item.tanggal_survey && (
                        <span className="flex items-center gap-1 text-gray-500">
                          <CalendarDays className="h-3 w-3" />
                          {formatDateShort(String(item.tanggal_survey).split("T")[0])}
                        </span>
                      )}
                      {item.alamat && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[130px]">{item.alamat}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  {canSchedule && <Button
                    variant="outline" size="sm"
                    className="h-7 text-xs shrink-0 border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={() => openReschedule(item)}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Jadwal Ulang
                  </Button>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

      </div>
      </>)}

      {/* ── Reject Dialog ── */}
      <Dialog
        open={!!rejectId}
        onOpenChange={() => { setRejectId(null); setRejectAlasan(""); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Jadwal Survey</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Alasan penolakan (opsional)</Label>
              <Input
                value={rejectAlasan}
                onChange={(e) => setRejectAlasan(e.target.value)}
                placeholder="Contoh: jadwal bentrok, lokasi terlalu jauh..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectId(null)}>Batal</Button>
              <Button
                variant="destructive"
                disabled={rejectMut.isPending}
                onClick={() =>
                  rejectId && rejectMut.mutate({ id: rejectId, alasan: rejectAlasan })
                }
              >
                {rejectMut.isPending ? "Memproses..." : "Tolak Survey"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit / Reschedule Dialog ── */}
      <Dialog open={!!scheduleId} onOpenChange={() => setScheduleId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Jadwal Survey</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tanggal Survey</Label>
                <Input
                  type="date"
                  value={scheduleForm.tanggal_survey}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, tanggal_survey: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Jam Survey</Label>
                <Input
                  type="time"
                  value={scheduleForm.jam_survey}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, jam_survey: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>PIC Survey</Label>
              {picUserList.length > 0 ? (
                <Select
                  value={scheduleForm.pic_survey}
                  onValueChange={(v) => setScheduleForm({ ...scheduleForm, pic_survey: v })}
                >
                  <SelectTrigger><SelectValue placeholder="— Pilih PIC —" /></SelectTrigger>
                  <SelectContent>
                    {picUserList.map((u: any) => (
                      <SelectItem key={u.id} value={u.name}>{u.name} {u.role ? `(${u.role})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={scheduleForm.pic_survey}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, pic_survey: e.target.value })}
                  placeholder="Nama PIC"
                />
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setScheduleId(null)}>Batal</Button>
              <Button
                disabled={updateMut.isPending}
                onClick={() =>
                  scheduleId &&
                  updateMut.mutate({
                    id: scheduleId,
                    body: {
                      tanggal_survey: scheduleForm.tanggal_survey || null,
                      jam_survey: scheduleForm.jam_survey || null,
                      pic_survey: scheduleForm.pic_survey || null,
                    },
                  })
                }
              >
                {updateMut.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── List Detail Modal ── */}
      <Dialog open={!!listDetailItem} onOpenChange={(v) => { if (!v) closeListDetail(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-amber-500" />
              Detail Survey — {listDetailItem?.nama}
            </DialogTitle>
          </DialogHeader>
          {listDetailItem && (
            <div className="space-y-4">
              {/* Lead Info */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span>{statusBadge(listDetailItem.survey_approval_status)}</span>
                </div>
                {listDetailItem.tanggal_survey && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tanggal Survey</span>
                    <span className="font-medium">{formatDate(String(listDetailItem.tanggal_survey).split("T")[0])}</span>
                  </div>
                )}
                {listDetailItem.jam_survey && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Jam</span>
                    <span className="font-medium">{listDetailItem.jam_survey}</span>
                  </div>
                )}
                {listDetailItem.pic_survey && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">PIC</span>
                    <span className="font-medium">{listDetailItem.pic_survey}</span>
                  </div>
                )}
                {listDetailItem.nomor_telepon && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">No. Telepon</span>
                    <span className="font-medium">{listDetailItem.nomor_telepon}</span>
                  </div>
                )}
                {listDetailItem.alamat && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Alamat</span>
                    <span className="font-medium text-right">{listDetailItem.alamat}</span>
                  </div>
                )}
                {listDetailItem.jenis && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Jenis</span>
                    <Badge variant="outline" className="text-xs">{listDetailItem.jenis}</Badge>
                  </div>
                )}
                {listDetailItem.status && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status Lead</span>
                    <span className="font-medium">{listDetailItem.status}</span>
                  </div>
                )}
              </div>

              {useGoldenSurveyReportTemplate && (
                <GoldenSurveyReportFields
                  form={goldenReportForm}
                  disabled={listDetailItem.survey_approval_status === "approved"}
                  updateField={updateGoldenReport}
                  updateRow={updateGoldenReportRow}
                  addRow={addGoldenReportRow}
                  removeRow={removeGoldenReportRow}
                  onPhotoChange={handleGoldenReportPhotoChange}
                  onPreviewPhoto={setLightboxSrc}
                  photoProcessing={listFotoProcessing}
                />
              )}

              {!useGoldenSurveyReportTemplate && (
                <>
              {/* Luasan Tanah */}
              <div className="space-y-1.5">
                <Label>Luasan Tanah (m²)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={listDetailLuasan}
                  onChange={(e) => setListDetailLuasan(e.target.value)}
                  placeholder="Contoh: 120.5"
                  disabled={listDetailItem.survey_approval_status === "approved"}
                />
              </div>

              {/* Catatan */}
              <div className="space-y-1.5">
                <Label>Catatan Survey</Label>
                <Input
                  value={listDetailCatatan}
                  onChange={(e) => setListDetailCatatan(e.target.value)}
                  placeholder="Catatan hasil survey..."
                  disabled={listDetailItem.survey_approval_status === "approved"}
                />
              </div>
                </>
              )}

              {/* Foto Bukti Survey */}
              {!useGoldenSurveyReportTemplate && (
              <div className="space-y-1.5">
                <Label>Foto Bukti Survey {!canApprove && listDetailItem.survey_approval_status !== "approved" && <span className="text-destructive">*</span>}</Label>

                {/* Foto grid — klik untuk perbesar */}
                {listDetailFotos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {listDetailFotos.map((f, idx) => (
                      <div
                        key={idx}
                        className="relative group cursor-pointer"
                        onClick={() => setLightboxSrc(f)}
                      >
                        <img src={f} alt={`foto ${idx + 1}`} className="w-24 h-20 object-cover rounded-lg border" />
                        <div className="absolute inset-0 bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ZoomIn className="h-5 w-5 text-white" />
                        </div>
                        {/* Tombol hapus: Head Golden (full access) atau PIC assigned */}
                        {(canApprove || currentUserName === listDetailItem.pic_survey) && listDetailItem.survey_approval_status !== "approved" && (
                          <button
                            type="button"
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); setListDetailFotos((prev) => prev.filter((_, i) => i !== idx)); }}
                          >×</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload area — Head Golden (full access) atau PIC assigned */}
                {(canApprove || currentUserName === listDetailItem.pic_survey) && listDetailItem.survey_approval_status !== "approved" && (
                  <>
                    {listFotoProcessing && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Menambahkan timestamp...
                      </div>
                    )}
                    <div
                      className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => listFotoRef.current?.click()}
                    >
                      <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">Klik untuk tambah foto (timestamp otomatis, bisa lebih dari satu)</p>
                    </div>
                  </>
                )}
                <input ref={listFotoRef} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleListFotoChange} />
              </div>
              )}

              {/* Actions */}
              {listDetailItem.survey_approval_status !== "approved" && (
                <div className="flex gap-2 pt-1">
                  {canApprove ? (
                    (useGoldenSurveyReportTemplate ? goldenReportPhotos().length > 0 : listDetailFotos.length > 0) ? (
                      <>
                        <Button
                          variant="outline"
                          className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                          disabled={rejectMut.isPending || approveMut.isPending}
                          onClick={() => setRejectId(listDetailItem.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1.5" /> Tolak Survey
                        </Button>
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          disabled={approveMut.isPending}
                          onClick={() => approveMut.mutate({
                            id: listDetailItem.id,
                            foto_survey: useGoldenSurveyReportTemplate ? goldenReportPhotos() : listDetailFotos,
                            ...listDetailPayload(),
                          })}
                        >
                          <CheckCircle className="h-4 w-4 mr-1.5" />
                          {approveMut.isPending ? "Menyimpan..." : "Setujui Survey"}
                        </Button>
                      </>
                    ) : (
                      <div className="w-full text-center py-3 text-sm text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                        <Clock className="h-5 w-5 mx-auto mb-1.5 text-amber-500" />
                        {useGoldenSurveyReportTemplate ? "Menunggu PIC upload dokumentasi foto area survey atau temuan hama" : "Menunggu PIC upload bukti foto survey"}
                      </div>
                    )
                  ) : currentUserName === listDetailItem.pic_survey ? (
                    <Button
                      className="w-full"
                      disabled={(useGoldenSurveyReportTemplate ? goldenReportPhotos().length === 0 : listDetailFotos.length === 0) || buktimut.isPending || listFotoProcessing}
                      onClick={() => buktimut.mutate({
                        id: listDetailItem.id,
                        foto_survey: useGoldenSurveyReportTemplate ? goldenReportPhotos() : listDetailFotos,
                        ...listDetailPayload(),
                      })}
                    >
                      <Upload className="h-4 w-4 mr-1.5" />
                      {buktimut.isPending ? "Menyimpan..." : "Simpan Bukti Survey"}
                    </Button>
                  ) : null}
                </div>
              )}
              {listDetailItem.survey_approval_status === "rejected" && canSchedule && (
                <Button
                  variant="outline"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={() => {
                    openReschedule(listDetailItem);
                    closeListDetail();
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-1.5" /> Jadwal Ulang
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Approve with Photo Dialog ── */}
      <Dialog open={approveDialog.open} onOpenChange={(v) => !v && setApproveDialog({ open: false, id: null, fotos: [], luasan: "", catatan: "" })}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" /> Setujui Survey
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Luasan Tanah (m²)</Label>
                <Input
                  type="number" min={0} step="0.01" placeholder="120.5"
                  className="h-8 text-sm"
                  value={approveDialog.luasan}
                  onChange={(e) => setApproveDialog((s) => ({ ...s, luasan: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Catatan Survey</Label>
                <Input
                  placeholder="Catatan..."
                  className="h-8 text-sm"
                  value={approveDialog.catatan}
                  onChange={(e) => setApproveDialog((s) => ({ ...s, catatan: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Foto Bukti Survey <span className="text-destructive">*</span> <span className="text-muted-foreground font-normal">(timestamp otomatis)</span></Label>
              {approveDialog.fotos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {approveDialog.fotos.map((f, idx) => (
                    <div key={idx} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f} alt={`foto ${idx + 1}`} className="w-20 h-16 object-cover rounded-lg border" />
                      <button
                        type="button"
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setApproveDialog((s) => ({ ...s, fotos: s.fotos.filter((_, i) => i !== idx) }))}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
              {approveProcessing && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Menambahkan timestamp...
                </div>
              )}
              <div
                className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fotoInputRef.current?.click()}
              >
                <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Klik untuk tambah foto (bisa lebih dari satu)</p>
              </div>
              <input ref={fotoInputRef} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleFotoChange} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApproveDialog({ open: false, id: null, fotos: [], luasan: "", catatan: "" })}>Batal</Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={approveDialog.fotos.length === 0 || approveMut.isPending || approveProcessing}
                onClick={() => approveDialog.id && approveMut.mutate({
                  id: approveDialog.id,
                  foto_survey: approveDialog.fotos,
                  luasan_tanah: approveDialog.luasan || undefined,
                  catatan_survey: approveDialog.catatan || undefined,
                })}
              >
                {approveMut.isPending ? "Menyimpan..." : "Konfirmasi Setujui"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── PDF Options Dialog ── */}
      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5 text-amber-500" /> Download PDF {pdfLabel}
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
            {useGoldenSurveyReportTemplate && (
              <div className="space-y-1">
                <Label className="text-xs">Filter Client Survey <span className="text-muted-foreground font-normal">(opsional, bisa lebih dari satu)</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-8 text-sm justify-between font-normal">
                      {pdfClientIds.length === 0
                        ? <span className="text-muted-foreground">Semua client survey</span>
                        : <span className="truncate">{pdfClientIds.length} client dipilih</span>}
                      <ChevronRight className="h-3.5 w-3.5 rotate-90 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2" align="start">
                    {uniqueSurveyClients.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">Tidak ada client survey pada periode ini</p>
                    ) : (
                      <div className="space-y-1 max-h-56 overflow-y-auto">
                        {uniqueSurveyClients.map((client) => (
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
            )}
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
                    <p className="text-xs text-muted-foreground text-center py-2">Tidak ada PIC pada periode ini</p>
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
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => { setPdfOpen(false); handleDownloadPdf(pdfDari || undefined, pdfSampai || undefined, pdfPics.length ? pdfPics : undefined, pdfClientIds.length ? pdfClientIds : undefined); }}
              >
                <FileDown className="h-4 w-4 mr-1.5" /> Download PDF {useGoldenSurveyReportTemplate ? "Laporan" : ""}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Lightbox ── */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-1.5 hover:bg-black/70 transition-colors"
            onClick={() => setLightboxSrc(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt="Foto Survey"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

    </div>
  );
}

function GoldenRows({ title, headers, children }: { title: string; headers: string[]; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-[11px] text-muted-foreground">{headers.join(" | ")}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function GoldenSurveyReportFields({
  form,
  disabled,
  updateField,
  updateRow,
  addRow,
  removeRow,
  onPhotoChange,
  onPreviewPhoto,
  photoProcessing,
}: {
  form: GoldenSurveyReportForm;
  disabled: boolean;
  updateField: <K extends keyof GoldenSurveyReportForm>(key: K, value: GoldenSurveyReportForm[K]) => void;
  updateRow: <K extends keyof GoldenSurveyReportForm>(key: K, index: number, patch: Record<string, any>) => void;
  addRow: <K extends keyof GoldenSurveyReportForm>(key: K, row: any) => void;
  removeRow: <K extends keyof GoldenSurveyReportForm>(key: K, index: number) => void;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>, key: "foto_area" | "foto_temuan", index: number) => void;
  onPreviewPhoto: (src: string) => void;
  photoProcessing: boolean;
}) {
  const removePhoto = (key: "foto_area" | "foto_temuan", rowIndex: number, photoIndex: number) => {
    const row = form[key][rowIndex];
    updateRow(key, rowIndex, { dokumentasi: row.dokumentasi.filter((_, i) => i !== photoIndex) });
  };

  return (
    <div className="space-y-4 rounded-lg border border-[#ddc1b1] bg-[#f9f9ff] p-3">
      <div className="border-l-4 border-[#f27f22] pl-3">
        <h3 className="text-sm font-bold uppercase text-[#974800]">Laporan Hasil Survey Rubru Pest</h3>
        <p className="text-xs text-muted-foreground">Isian mengikuti referensi Field Service Precision.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Surveyor</Label>
          <Input value={form.surveyor} onChange={(e) => updateField("surveyor", e.target.value)} disabled={disabled} placeholder="Nama petugas survey" />
        </div>
        <div className="space-y-1.5">
          <Label>Jenis Bangunan</Label>
          <Select value={form.jenis_bangunan || "__none__"} onValueChange={(v) => updateField("jenis_bangunan", v === "__none__" ? "" : v)} disabled={disabled}>
            <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Pilih salah satu</SelectItem>
              {["Rumah", "Kantor", "Pabrik", "Tempat Usaha"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Luas Area</Label>
          <Input value={form.luas_area} onChange={(e) => updateField("luas_area", e.target.value)} disabled={disabled} placeholder="Contoh: 120 m2 / 2 lantai" />
        </div>
      </div>

      <GoldenRows title="2. Area yang Disurvey" headers={["Area", "Keterangan"]}>
        {form.area_disurvey.map((row, i) => (
          <div key={i} className="grid grid-cols-[28px_1fr_1fr_34px] gap-2 items-center">
            <span className="text-xs text-muted-foreground text-center">{i + 1}</span>
            <Input value={row.area} onChange={(e) => updateRow("area_disurvey", i, { area: e.target.value })} placeholder="Contoh: Dapur / Gudang / Taman" disabled={disabled} />
            <Input value={row.keterangan} onChange={(e) => updateRow("area_disurvey", i, { keterangan: e.target.value })} placeholder="Kondisi area yang diperiksa" disabled={disabled} />
            <Button type="button" variant="ghost" size="icon" disabled={disabled || form.area_disurvey.length <= 1} onClick={() => removeRow("area_disurvey", i)}>
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
        {!disabled && <Button type="button" variant="outline" size="sm" onClick={() => addRow("area_disurvey", { area: "", keterangan: "" })}>Tambah Area</Button>}
      </GoldenRows>

      <GoldenRows title="3. Jenis Hama yang Ditemukan" headers={["Jenis Hama", "Status Temuan", "Keterangan"]}>
        {form.hama.map((row, i) => (
          <div key={`${row.jenis}-${i}`} className="grid grid-cols-[1fr_160px_1.5fr_34px] gap-2 items-center">
            <Input value={row.jenis} onChange={(e) => updateRow("hama", i, { jenis: e.target.value })} placeholder="Contoh: Rayap / Tikus / Kecoa" disabled={disabled} />
            <Select value={row.status || "Ditemukan"} onValueChange={(v) => updateRow("hama", i, { status: v })} disabled={disabled}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ditemukan">Ditemukan</SelectItem>
                <SelectItem value="Tidak Ditemukan">Tidak Ditemukan</SelectItem>
              </SelectContent>
            </Select>
            <Input value={row.keterangan} onChange={(e) => updateRow("hama", i, { keterangan: e.target.value })} placeholder="Keterangan indikasi atau lokasi temuan" disabled={disabled} />
            <Button type="button" variant="ghost" size="icon" disabled={disabled || form.hama.length <= 1} onClick={() => removeRow("hama", i)}>
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
        {!disabled && <Button type="button" variant="outline" size="sm" onClick={() => addRow("hama", { jenis: "", status: "Ditemukan", keterangan: "" })}>Tambah Jenis Hama</Button>}
      </GoldenRows>

      <GoldenRows title="5. Detail Temuan Lapangan" headers={["Area Temuan", "Jenis Temuan", "Severity", "Keterangan"]}>
        {form.temuan.map((row, i) => (
          <div key={i} className="grid grid-cols-[28px_1fr_1fr_130px_1fr_34px] gap-2 items-center">
            <span className="text-xs text-muted-foreground text-center">{i + 1}</span>
            <Input value={row.area} onChange={(e) => updateRow("temuan", i, { area: e.target.value })} placeholder="Contoh: Plafon kamar" disabled={disabled} />
            <Input value={row.jenis} onChange={(e) => updateRow("temuan", i, { jenis: e.target.value })} placeholder="Contoh: Jalur rayap aktif" disabled={disabled} />
            <Select value={row.severity || "Sedang"} onValueChange={(v) => updateRow("temuan", i, { severity: v })} disabled={disabled}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ringan">Ringan</SelectItem>
                <SelectItem value="Sedang">Sedang</SelectItem>
                <SelectItem value="Parah">Parah</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Input value={row.keterangan} onChange={(e) => updateRow("temuan", i, { keterangan: e.target.value })} placeholder="Detail kondisi di lapangan" disabled={disabled} />
            <Button type="button" variant="ghost" size="icon" disabled={disabled || form.temuan.length <= 1} onClick={() => removeRow("temuan", i)}>
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
        {!disabled && <Button type="button" variant="outline" size="sm" onClick={() => addRow("temuan", { area: "", jenis: "", severity: "Sedang", keterangan: "" })}>Tambah Temuan</Button>}
      </GoldenRows>

      <GoldenRows title="6. Rekomendasi Treatment" headers={["Metode Treatment", "Area Penerapan", "Keterangan"]}>
        {form.treatment.map((row, i) => (
          <div key={i} className="grid grid-cols-[28px_1fr_1fr_1fr_34px] gap-2 items-center">
            <span className="text-xs text-muted-foreground text-center">{i + 1}</span>
            <Input value={row.metode} onChange={(e) => updateRow("treatment", i, { metode: e.target.value })} placeholder="Contoh: Spraying / Baiting / Injection" disabled={disabled} />
            <Input value={row.area} onChange={(e) => updateRow("treatment", i, { area: e.target.value })} placeholder="Area penerapan treatment" disabled={disabled} />
            <Input value={row.keterangan} onChange={(e) => updateRow("treatment", i, { keterangan: e.target.value })} placeholder="Catatan metode atau frekuensi" disabled={disabled} />
            <Button type="button" variant="ghost" size="icon" disabled={disabled || form.treatment.length <= 1} onClick={() => removeRow("treatment", i)}>
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
        {!disabled && <Button type="button" variant="outline" size="sm" onClick={() => addRow("treatment", { metode: "", area: "", keterangan: "" })}>Tambah Treatment</Button>}
      </GoldenRows>

      <GoldenRows title="7. Kebutuhan Alat / Material" headers={["Item", "Jumlah", "Keterangan"]}>
        {form.material.map((row, i) => (
          <div key={i} className="grid grid-cols-[28px_1fr_1fr_1fr_34px] gap-2 items-center">
            <span className="text-xs text-muted-foreground text-center">{i + 1}</span>
            <Input value={row.item} onChange={(e) => updateRow("material", i, { item: e.target.value })} placeholder="Contoh: Termitisida / Bait station" disabled={disabled} />
            <Input value={row.jumlah} onChange={(e) => updateRow("material", i, { jumlah: e.target.value })} placeholder="Contoh: 2 liter / 4 unit" disabled={disabled} />
            <Input value={row.keterangan} onChange={(e) => updateRow("material", i, { keterangan: e.target.value })} placeholder="Catatan kebutuhan alat/material" disabled={disabled} />
            <Button type="button" variant="ghost" size="icon" disabled={disabled || form.material.length <= 1} onClick={() => removeRow("material", i)}>
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
        {!disabled && <Button type="button" variant="outline" size="sm" onClick={() => addRow("material", { item: "", jumlah: "", keterangan: "" })}>Tambah Material</Button>}
      </GoldenRows>

      <GoldenRows title="8A. Foto Area Survey" headers={["Dokumentasi", "Keterangan"]}>
        {form.foto_area.map((row, i) => (
          <div key={i} className="grid grid-cols-[28px_1.4fr_1fr_34px] gap-2 items-start">
            <span className="text-xs text-muted-foreground text-center">{i + 1}</span>
            <div className="space-y-2">
              {row.dokumentasi.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {row.dokumentasi.map((src, photoIndex) => (
                    <div key={photoIndex} className="relative group cursor-pointer" onClick={() => onPreviewPhoto(src)}>
                      <img src={src} alt={`area survey ${i + 1}-${photoIndex + 1}`} className="h-16 w-20 rounded border object-cover" />
                      {!disabled && (
                        <button
                          type="button"
                          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); removePhoto("foto_area", i, photoIndex); }}
                        >×</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!disabled && (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground hover:border-primary/60">
                  <Upload className="h-3.5 w-3.5" /> Upload dokumentasi area
                  <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={(e) => onPhotoChange(e, "foto_area", i)} />
                </label>
              )}
            </div>
            <Input value={row.keterangan} onChange={(e) => updateRow("foto_area", i, { keterangan: e.target.value })} placeholder="Contoh: Area dapur sebelum treatment" disabled={disabled} />
            <Button type="button" variant="ghost" size="icon" disabled={disabled || form.foto_area.length <= 1} onClick={() => removeRow("foto_area", i)}>
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
        {photoProcessing && <p className="text-xs text-muted-foreground"><Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Memproses dokumentasi...</p>}
        {!disabled && <Button type="button" variant="outline" size="sm" onClick={() => addRow("foto_area", { dokumentasi: [], keterangan: "" })}>Tambah Baris Foto Area</Button>}
      </GoldenRows>

      <GoldenRows title="8B. Foto Temuan Hama" headers={["Dokumentasi", "Keterangan"]}>
        {form.foto_temuan.map((row, i) => (
          <div key={i} className="grid grid-cols-[28px_1.4fr_1fr_34px] gap-2 items-start">
            <span className="text-xs text-muted-foreground text-center">{i + 1}</span>
            <div className="space-y-2">
              {row.dokumentasi.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {row.dokumentasi.map((src, photoIndex) => (
                    <div key={photoIndex} className="relative group cursor-pointer" onClick={() => onPreviewPhoto(src)}>
                      <img src={src} alt={`temuan hama ${i + 1}-${photoIndex + 1}`} className="h-16 w-20 rounded border object-cover" />
                      {!disabled && (
                        <button
                          type="button"
                          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); removePhoto("foto_temuan", i, photoIndex); }}
                        >×</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!disabled && (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground hover:border-primary/60">
                  <Upload className="h-3.5 w-3.5" /> Upload dokumentasi temuan
                  <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={(e) => onPhotoChange(e, "foto_temuan", i)} />
                </label>
              )}
            </div>
            <Input value={row.keterangan} onChange={(e) => updateRow("foto_temuan", i, { keterangan: e.target.value })} placeholder="Contoh: Jalur rayap aktif di kusen" disabled={disabled} />
            <Button type="button" variant="ghost" size="icon" disabled={disabled || form.foto_temuan.length <= 1} onClick={() => removeRow("foto_temuan", i)}>
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
        {photoProcessing && <p className="text-xs text-muted-foreground"><Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Memproses dokumentasi...</p>}
        {!disabled && <Button type="button" variant="outline" size="sm" onClick={() => addRow("foto_temuan", { dokumentasi: [], keterangan: "" })}>Tambah Baris Foto Temuan</Button>}
      </GoldenRows>
    </div>
  );
}
