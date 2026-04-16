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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays, CheckCircle, XCircle, Clock,
  MapPin, Phone, User, ChevronLeft, ChevronRight, Upload, RefreshCw, FileDown, List,
} from "lucide-react";

interface KalenderSurveyProps {
  modul: "sales-admin" | "telemarketing" | "golden";
  showAll?: boolean;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function KalenderSurvey({ modul, showAll }: KalenderSurveyProps) {
  const qc = useQueryClient();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [filterUserId, setFilterUserId] = useState<string>("_all");
  const canApproveSurvey = useAuthStore((s) =>
    s.isSuperAdmin() ||
    s.hasPermission("bd", "approve") ||
    s.hasPermission("sales_admin", "view") ||
    s.hasPermission("telemarketing", "view")
  );

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
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; id: number | null; foto: string | null }>({ open: false, id: null, foto: null });
  const fotoInputRef = useRef<HTMLInputElement>(null);

  // List detail modal
  const [listDetailItem, setListDetailItem] = useState<any | null>(null);
  const [listDetailFoto, setListDetailFoto] = useState<string | null>(null);
  const [listDetailLuasan, setListDetailLuasan] = useState("");
  const [listDetailCatatan, setListDetailCatatan] = useState("");
  const listFotoRef = useRef<HTMLInputElement>(null);

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
          params: modul === "golden" ? { sub_role: "Mitra" } : undefined,
        })
        .then((r) => r.data),
  });
  const picUserList: any[] = Array.isArray(picUsers) ? picUsers : [];

  const approveMut = useMutation({
    mutationFn: ({ id, foto_survey, luasan_tanah, catatan_survey }: { id: number; foto_survey: string; luasan_tanah?: string; catatan_survey?: string }) =>
      apiClient.post(`/bd/${modul}/leads/${id}/approve-survey`, { foto_survey, luasan_tanah: luasan_tanah || undefined, catatan_survey: catatan_survey || undefined }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Survey disetujui");
      qc.invalidateQueries({ queryKey: ["survey-kalender", modul] });
      setApproveDialog({ open: false, id: null, foto: null });
      setListDetailItem(null);
      setListDetailFoto(null);
      setListDetailLuasan("");
      setListDetailCatatan("");
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
      setListDetailItem(null);
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

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setApproveDialog((s) => ({ ...s, foto: reader.result as string }));
    reader.readAsDataURL(file);
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

  function handleDownloadPdf() {
    const modulLabel = showAll ? "Semua Modul" : modul === "sales-admin" ? "Sales Admin" : "Telemarketing";
    const periodeLabel = `${MONTH_NAMES_ID[bulan - 1]} ${tahun}`;
    const now = new Date();

    const statusBadgeText = (s: string | null) =>
      s === "approved" ? "✓ Disetujui" : s === "rejected" ? "✕ Ditolak" : "⏳ Menunggu";
    const statusClass = (s: string | null) =>
      s === "approved" ? "s-ok" : s === "rejected" ? "s-rej" : "s-pend";

    const rows = items.map((item: any, i: number) => {
      const tgl = item.tanggal_survey ? new Date(item.tanggal_survey + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—";
      return `
        <tr>
          <td class="num">${i + 1}</td>
          <td><strong>${item.nama.replace(/</g, "&lt;")}</strong>${item.nomor_telepon ? `<br/><span class="sub">${item.nomor_telepon}</span>` : ""}</td>
          <td>${tgl}</td>
          <td>${item.jam_survey ?? "—"}</td>
          <td>${item.pic_survey ?? "—"}</td>
          <td><span class="badge ${statusClass(item.survey_approval_status)}">${statusBadgeText(item.survey_approval_status)}</span></td>
        </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"/><title>Kalender Survey — ${periodeLabel}</title>
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
    <div class="scard"><div class="scard-label">Total Survey</div><div class="scard-value">${items.length}</div></div>
    <div class="scard scard-ok"><div class="scard-label">Disetujui</div><div class="scard-value">${approvedItems.length}</div></div>
    <div class="scard scard-pend"><div class="scard-label">Menunggu</div><div class="scard-value">${pendingItems.length}</div></div>
    <div class="scard scard-rej"><div class="scard-label">Ditolak</div><div class="scard-value">${rejectedItems.length}</div></div>
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
  <script>window.onload = function() { window.print(); }</script>
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
            {showAll ? "Semua Modul (Sales Admin + Telemarketing)" : modul === "sales-admin" ? "Sales Admin" : "Telemarketing"} — Jadwal survey klien
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isLoading || items.length === 0}>
            <FileDown className="h-4 w-4 mr-1.5" /> Download PDF
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-4 gap-4">
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
                        onClick={() => {
                          setListDetailItem(item);
                          setListDetailFoto(item.foto_survey ?? null);
                          setListDetailLuasan(item.luasan_tanah != null ? String(item.luasan_tanah) : "");
                          setListDetailCatatan(item.catatan_survey ?? "");
                        }}
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
                              <p className="text-[8px] leading-tight opacity-70">{e.modul === "sales-admin" ? "SA" : "TM"}</p>
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
                    {item.survey_approval_status === "rejected" ? (
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
                    )}
                    {canApproveSurvey && (!item.survey_approval_status || item.survey_approval_status === "pending") && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-green-600 hover:bg-green-100"
                          title="Setujui"
                          disabled={approveMut.isPending}
                          onClick={() => setApproveDialog({ open: true, id: item.id, foto: null })}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-red-600 hover:bg-red-100"
                          title="Tolak"
                          onClick={() => setRejectId(item.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
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
                  {canApproveSurvey && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs px-2"
                        disabled={approveMut.isPending}
                        onClick={() => setApproveDialog({ open: true, id: item.id, foto: null })}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" /> Setujui
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        className="h-7 border-red-300 text-red-600 hover:bg-red-50 text-xs px-2"
                        onClick={() => setRejectId(item.id)}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
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
                  <Button
                    variant="outline" size="sm"
                    className="h-7 text-xs shrink-0 border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={() => openReschedule(item)}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Jadwal Ulang
                  </Button>
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
      <Dialog open={!!listDetailItem} onOpenChange={(v) => { if (!v) { setListDetailItem(null); setListDetailFoto(null); setListDetailLuasan(""); setListDetailCatatan(""); } }}>
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

              {/* Foto Bukti Survey */}
              <div className="space-y-1.5">
                <Label>Foto Bukti Survey {listDetailItem.survey_approval_status !== "approved" && <span className="text-destructive">*</span>}</Label>
                {listDetailItem.survey_approval_status === "approved" && listDetailFoto ? (
                  <img src={listDetailFoto} alt="foto survey" className="w-full max-h-52 object-contain rounded-lg border" />
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => listFotoRef.current?.click()}
                  >
                    {listDetailFoto ? (
                      <img src={listDetailFoto} alt="preview" className="max-h-40 mx-auto object-contain rounded" />
                    ) : (
                      <>
                        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Klik untuk pilih foto bukti survey</p>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={listFotoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setListDetailFoto(reader.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
              </div>

              {/* Actions */}
              {listDetailItem.survey_approval_status !== "approved" && canApproveSurvey && (
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                    disabled={rejectMut.isPending || approveMut.isPending}
                    onClick={() => {
                      setRejectId(listDetailItem.id);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" /> Tolak Survey
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={!listDetailFoto || approveMut.isPending}
                    onClick={() => approveMut.mutate({
                      id: listDetailItem.id,
                      foto_survey: listDetailFoto!,
                      luasan_tanah: listDetailLuasan || undefined,
                      catatan_survey: listDetailCatatan || undefined,
                    })}
                  >
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    {approveMut.isPending ? "Menyimpan..." : "Setujui Survey"}
                  </Button>
                </div>
              )}
              {listDetailItem.survey_approval_status === "rejected" && (
                <Button
                  variant="outline"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={() => {
                    openReschedule(listDetailItem);
                    setListDetailItem(null);
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
      <Dialog open={approveDialog.open} onOpenChange={(v) => !v && setApproveDialog({ open: false, id: null, foto: null })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" /> Setujui Survey
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Upload foto bukti pelaksanaan survey untuk menyetujui.</p>
            <div
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fotoInputRef.current?.click()}
            >
              {approveDialog.foto ? (
                <img src={approveDialog.foto} alt="preview" className="max-h-40 mx-auto object-contain rounded" />
              ) : (
                <>
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Klik untuk pilih foto</p>
                </>
              )}
            </div>
            <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApproveDialog({ open: false, id: null, foto: null })}>Batal</Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={!approveDialog.foto || approveMut.isPending}
                onClick={() => approveDialog.id && approveMut.mutate({ id: approveDialog.id, foto_survey: approveDialog.foto! })}
              >
                {approveMut.isPending ? "Menyimpan..." : "Konfirmasi Setujui"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
