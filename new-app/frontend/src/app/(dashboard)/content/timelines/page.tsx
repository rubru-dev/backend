"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { contentApi } from "@/lib/api/content";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, CheckCircle,
  AlertCircle, Clock, Pencil, Trash2, X, Upload, PenLine, ImageIcon, RefreshCw,
} from "lucide-react";
import { SignatureDialog } from "@/components/signature-dialog";

// ── Constants ──────────────────────────────────────────────────────────────

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Facebook", "Twitter", "LinkedIn"];
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const now = new Date();

// ── Types ──────────────────────────────────────────────────────────────────

type ApprovalStatus = "pending" | "approved" | "revised" | null | undefined;

interface TimelineItem {
  id: number;
  judul: string;
  deskripsi?: string;
  platform?: string;
  tanggal_publish?: string | null;
  tanggal_upload?: string | null;
  bulan?: number;
  tahun?: number;
  planning_status: ApprovalStatus;
  produksi_status: ApprovalStatus;
  upload_status: ApprovalStatus;
  catatan_revisi?: string;
  user?: { id: number; name: string };
  hd_bd_signature?: string | null;
  hd_bd_signed_at?: string | null;
  task_image?: string | null;
}

// ── Color helpers ──────────────────────────────────────────────────────────

function pillStyle(status: ApprovalStatus) {
  if (status === "approved") return "bg-green-100 border-green-400 text-green-900";
  if (status === "revised") return "bg-red-100 border-red-400 text-red-900";
  return "bg-gray-100 border-gray-300 text-gray-700";
}

function cellBg(statuses: ApprovalStatus[]) {
  if (!statuses.length) return "";
  if (statuses.every((s) => s === "approved")) return "bg-green-50 border-green-300";
  if (statuses.some((s) => s === "revised")) return "bg-red-50 border-red-300";
  return "bg-gray-50 border-gray-200";
}

function statusBadge(status: ApprovalStatus) {
  if (status === "approved")
    return <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px] px-1.5">✓ Diapprove</Badge>;
  if (status === "revised")
    return <Badge className="bg-red-100 text-red-700 border-red-300 text-[10px] px-1.5">↩ Revisi</Badge>;
  return <Badge className="bg-gray-100 text-gray-600 border-gray-300 text-[10px] px-1.5">⏳ Pending</Badge>;
}

// ── Mini calendar component ────────────────────────────────────────────────

interface CalendarProps {
  title: string;
  subtitle: string;
  color: string;
  bulan: number;
  tahun: number;
  items: TimelineItem[];
  statusKey: "planning_status" | "produksi_status" | "upload_status";
  /** Which date field to use for positioning items on the calendar */
  dateField?: "tanggal_publish" | "tanggal_upload";
  /** Only show items that have this status key set (not null) */
  requireKey?: "produksi_status" | "upload_status";
  isSuperAdmin: boolean;
  onApprove?: (id: number) => void;
  onRevisi?: (item: TimelineItem) => void;
  onEdit?: (item: TimelineItem) => void;
  onDelete?: (id: number) => void;
  onAdd?: (date: string) => void;
  onSetUploadDate?: (item: TimelineItem) => void;
  onSignHdBd?: (item: TimelineItem) => void;
  onUploadImage?: (item: TimelineItem) => void;
  onResubmit?: (id: number) => void;
  approving?: boolean;
  revisiting?: boolean;
}

function KalenderTimeline({
  title, subtitle, color, bulan, tahun, items,
  statusKey, dateField = "tanggal_publish", requireKey,
  isSuperAdmin, onApprove, onRevisi, onEdit, onDelete, onAdd, onSetUploadDate,
  onSignHdBd, onUploadImage, onResubmit,
  approving, revisiting,
}: CalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Filter items visible in this calendar
  const visibleItems = requireKey
    ? items.filter((i) => i[requireKey] !== null && i[requireKey] !== undefined)
    : items;

  const byDate: Record<string, TimelineItem[]> = {};
  visibleItems.forEach((item) => {
    const dateVal = item[dateField];
    if (!dateVal) return;
    const key = String(dateVal).split("T")[0];
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(item);
  });

  const firstDay = new Date(tahun, bulan - 1, 1).getDay();
  const daysInMonth = new Date(tahun, bulan, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  function dateKey(day: number) {
    return `${tahun}-${String(bulan).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const selectedItems = selectedDate ? (byDate[selectedDate] ?? []) : [];
  const pending = visibleItems.filter((i) => i[statusKey] === "pending").length;
  const approved = visibleItems.filter((i) => i[statusKey] === "approved").length;
  const revised = visibleItems.filter((i) => i[statusKey] === "revised").length;

  return (
    <Card className={`border-t-4 ${color}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">{title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-gray-200 border border-gray-300 inline-block" /> Pending ({pending})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-200 border border-green-400 inline-block" /> Approve ({approved})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-200 border border-red-400 inline-block" /> Revisi ({revised})
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b mb-1">
          {DAY_NAMES.map((d, i) => (
            <div
              key={d}
              className={`text-center text-[10px] font-semibold py-1.5 ${i === 0 ? "text-red-500" : "text-muted-foreground"}`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="h-20" />;
            const dKey = dateKey(day);
            const entries = byDate[dKey] ?? [];
            const statuses = entries.map((e) => e[statusKey]);
            const isToday = dKey === todayKey;
            const isSelected = selectedDate === dKey;
            const isSunday = idx % 7 === 0;

            return (
              <button
                key={dKey}
                onClick={() => setSelectedDate(isSelected ? null : dKey)}
                className={[
                  "relative h-20 rounded border text-left p-1 transition-all overflow-hidden flex flex-col text-xs",
                  isSelected
                    ? "ring-2 ring-amber-400 border-amber-400 bg-amber-50"
                    : entries.length > 0
                    ? `${cellBg(statuses)} border`
                    : "border-gray-100 hover:bg-muted/30",
                ].join(" ")}
              >
                <span
                  className={[
                    "leading-none font-semibold shrink-0 text-[11px]",
                    isToday
                      ? "bg-amber-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
                      : isSunday
                      ? "text-red-500"
                      : "text-gray-600",
                  ].join(" ")}
                >
                  {day}
                </span>

                {entries.length > 0 && (
                  <div className="flex-1 mt-0.5 space-y-0.5 overflow-hidden">
                    {entries.slice(0, 2).map((e) => (
                      <div
                        key={e.id}
                        className={`rounded border px-1 py-0.5 ${pillStyle(e[statusKey])}`}
                      >
                        <p className="text-[9px] font-medium leading-tight truncate">{e.judul}</p>
                        {e.platform && (
                          <p className="text-[8px] leading-tight truncate opacity-60">{e.platform}</p>
                        )}
                      </div>
                    ))}
                    {entries.length > 2 && (
                      <p className="text-[9px] text-muted-foreground pl-0.5">+{entries.length - 2} lagi</p>
                    )}
                  </div>
                )}

                {/* Add button on hover */}
                {onAdd && entries.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected date panel */}
        {selectedDate && (
          <div className="mt-3 rounded-lg border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", {
                  weekday: "long", day: "numeric", month: "long",
                })}
              </p>
              <div className="flex items-center gap-2">
                {onAdd && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => onAdd(selectedDate)}
                  >
                    <Plus className="h-3 w-3" /> Tambah
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setSelectedDate(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {selectedItems.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                Belum ada konten di tanggal ini.
                {onAdd && " Klik tombol Tambah untuk menambahkan."}
              </p>
            ) : (
              selectedItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-2.5 bg-white rounded-lg p-2.5 border shadow-sm`}
                >
                  <div
                    className={`w-1 self-stretch rounded-full shrink-0 ${
                      item[statusKey] === "approved"
                        ? "bg-green-500"
                        : item[statusKey] === "revised"
                        ? "bg-red-400"
                        : "bg-gray-300"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold">{item.judul}</span>
                      {statusBadge(item[statusKey])}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                      {item.platform && <Badge variant="outline" className="text-[10px] px-1.5">{item.platform}</Badge>}
                      {item.user && <span>oleh {item.user.name}</span>}
                    </div>
                    {item[statusKey] === "revised" && item.catatan_revisi && (
                      <p className="mt-1 text-xs text-red-600 bg-red-50 rounded px-2 py-1 border border-red-200">
                        Catatan: {item.catatan_revisi}
                      </p>
                    )}
                    {item.task_image && (
                      <img src={item.task_image} alt="Gambar task" className="mt-1 max-h-24 rounded border object-contain" />
                    )}
                    {/* Upload date info */}
                    {dateField === "tanggal_upload" && item.tanggal_upload && (
                      <p className="mt-1 text-xs text-green-700">
                        Upload: {new Date(item.tanggal_upload + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {/* Edit/Delete for content creator */}
                    {onEdit && item[statusKey] !== "approved" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {onDelete && item[statusKey] === "pending" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {/* Set/Change upload date — for upload calendar */}
                    {onSetUploadDate && item.upload_status !== null && item.upload_status !== "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => onSetUploadDate(item)}
                      >
                        <Upload className="h-3 w-3" />
                        {item.tanggal_upload ? "Ubah" : "Atur"} Tgl
                      </Button>
                    )}
                    {/* Approve/Revisi for Super Admin */}
                    {isSuperAdmin && item[statusKey] === "pending" && onApprove && onRevisi && (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          className="h-7 w-7 bg-green-600 hover:bg-green-700 text-white"
                          title="Approve"
                          disabled={approving}
                          onClick={() => onApprove(item.id)}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 border-red-300 text-red-600 hover:bg-red-50"
                          title="Revisi"
                          disabled={revisiting}
                          onClick={() => onRevisi(item)}
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                    {/* TTD Head BD — upload calendar, superadmin only */}
                    {onSignHdBd && isSuperAdmin && item.upload_status === "approved" && (
                      item.hd_bd_signature
                        ? <Badge variant="outline" className="text-green-600 text-xs gap-1 border-green-400 h-7 px-2">
                            <CheckCircle className="h-3 w-3" /> TTD HD BD
                          </Badge>
                        : <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-violet-400 text-violet-700"
                            onClick={() => onSignHdBd(item)}>
                            <PenLine className="h-3 w-3" /> TTD Head BD
                          </Button>
                    )}
                    {/* Upload Gambar — all calendars */}
                    {onUploadImage && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => onUploadImage(item)}>
                        <ImageIcon className="h-3 w-3" />
                        {item.task_image ? "Ganti Gambar" : "Upload Gambar"}
                      </Button>
                    )}
                    {/* Submit Ulang — content creator, after revision */}
                    {onResubmit && !isSuperAdmin && item[statusKey] === "revised" && (
                      <Button size="sm" className="h-7 text-xs gap-1 bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={() => onResubmit(item.id)}>
                        <RefreshCw className="h-3 w-3" /> Submit Ulang
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  judul: "",
  platform: "Instagram",
  tanggal_publish: "",
  deskripsi: "",
  bulan: (now.getMonth() + 1).toString(),
  tahun: now.getFullYear().toString(),
};

export default function ContentTimelinePage() {
  const qc = useQueryClient();
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin() || s.hasPermission("content", "approve"));

  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<TimelineItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [revisiTarget, setRevisiTarget] = useState<{ item: TimelineItem; stage: string } | null>(null);
  const [revisiCatatan, setRevisiCatatan] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  // Upload date dialog
  const [uploadDateTarget, setUploadDateTarget] = useState<TimelineItem | null>(null);
  const [uploadDateValue, setUploadDateValue] = useState("");

  // TTD Head BD dialog
  const [sigTarget, setSigTarget] = useState<TimelineItem | null>(null);

  // Image upload dialog
  const [imageTarget, setImageTarget] = useState<TimelineItem | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Query — planning & production calendar (by bulan/tahun)
  const QK = ["content-calendar", bulan, tahun];
  const { data: rawItems = [], isLoading } = useQuery<TimelineItem[]>({
    queryKey: QK,
    queryFn: () => contentApi.calendarTimeline({ bulan, tahun }),
  });

  // Query — upload calendar (by tanggal_upload date range)
  const QK_UPLOAD = ["content-upload-calendar", bulan, tahun];
  const { data: uploadItems = [], isLoading: isLoadingUpload } = useQuery<TimelineItem[]>({
    queryKey: QK_UPLOAD,
    queryFn: () => contentApi.uploadCalendar({ bulan, tahun }),
  });

  // Query — items with upload_status set but tanggal_upload not yet entered
  const QK_PENDING_UPLOAD = ["content-upload-pending"];
  const { data: pendingUploadItems = [] } = useQuery<TimelineItem[]>({
    queryKey: QK_PENDING_UPLOAD,
    queryFn: () => contentApi.uploadPending(),
  });

  // Mutations
  const createMut = useMutation({
    mutationFn: (d: any) => contentApi.createTimeline(d),
    onSuccess: () => {
      toast.success("Konten ditambahkan");
      qc.invalidateQueries({ queryKey: QK });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => contentApi.updateTimeline(id, data),
    onSuccess: () => {
      toast.success("Konten diupdate");
      qc.invalidateQueries({ queryKey: QK });
      setEditItem(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => contentApi.deleteTimeline(id),
    onSuccess: () => {
      toast.success("Konten dihapus");
      qc.invalidateQueries({ queryKey: QK });
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: string }) => contentApi.approveTimeline(id, stage),
    onSuccess: () => {
      toast.success("Diapprove");
      qc.invalidateQueries({ queryKey: QK });
      qc.invalidateQueries({ queryKey: QK_PENDING_UPLOAD });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal approve"),
  });

  const revisiMut = useMutation({
    mutationFn: ({ id, stage, catatan }: { id: number; stage: string; catatan: string }) =>
      contentApi.revisiTimeline(id, stage, catatan),
    onSuccess: () => {
      toast.success("Ditandai revisi");
      qc.invalidateQueries({ queryKey: QK });
      setRevisiTarget(null);
      setRevisiCatatan("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const setUploadDateMut = useMutation({
    mutationFn: ({ id, tanggal_upload }: { id: number; tanggal_upload: string | null }) =>
      contentApi.updateTimeline(id, { tanggal_upload }),
    onSuccess: () => {
      toast.success("Tanggal upload disimpan");
      qc.invalidateQueries({ queryKey: QK_UPLOAD });
      qc.invalidateQueries({ queryKey: QK_PENDING_UPLOAD });
      qc.invalidateQueries({ queryKey: QK });
      setUploadDateTarget(null);
      setUploadDateValue("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menyimpan tanggal upload"),
  });

  const signHdBdMut = useMutation({
    mutationFn: ({ id, hd_bd_signature }: { id: number; hd_bd_signature: string }) =>
      contentApi.signHdBd(id, { hd_bd_signature }),
    onSuccess: () => {
      toast.success("Tanda tangan Head BD disimpan");
      qc.invalidateQueries({ queryKey: QK_UPLOAD });
      qc.invalidateQueries({ queryKey: QK });
      setSigTarget(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menyimpan TTD"),
  });

  const uploadImageMut = useMutation({
    mutationFn: ({ id, task_image }: { id: number; task_image: string }) =>
      contentApi.uploadImage(id, { task_image }),
    onSuccess: () => {
      toast.success("Gambar berhasil diupload");
      qc.invalidateQueries({ queryKey: QK });
      qc.invalidateQueries({ queryKey: QK_UPLOAD });
      setImageTarget(null);
      setImagePreview(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal upload gambar"),
  });

  const resubmitMut = useMutation({
    mutationFn: (id: number) => contentApi.resubmit(id),
    onSuccess: () => {
      toast.success("Berhasil disubmit ulang. Menunggu approval.");
      qc.invalidateQueries({ queryKey: QK });
      qc.invalidateQueries({ queryKey: QK_UPLOAD });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal submit ulang"),
  });

  // Handlers
  function openCreate(date?: string) {
    setEditItem(null);
    setForm({
      ...EMPTY_FORM,
      tanggal_publish: date ?? "",
      bulan: bulan.toString(),
      tahun: tahun.toString(),
    });
    setCreateOpen(true);
  }

  function openEdit(item: TimelineItem) {
    setEditItem(item);
    setForm({
      judul: item.judul,
      platform: item.platform ?? "Instagram",
      tanggal_publish: item.tanggal_publish ?? "",
      deskripsi: item.deskripsi ?? "",
      bulan: item.bulan?.toString() ?? bulan.toString(),
      tahun: item.tahun?.toString() ?? tahun.toString(),
    });
    setCreateOpen(true);
  }

  function openSetUploadDate(item: TimelineItem) {
    setUploadDateTarget(item);
    setUploadDateValue(item.tanggal_upload ?? "");
  }

  function handleSubmit() {
    const payload = {
      judul: form.judul,
      platform: form.platform,
      tanggal_publish: form.tanggal_publish || null,
      deskripsi: form.deskripsi || null,
      bulan: Number(form.bulan),
      tahun: Number(form.tahun),
    };
    if (editItem) {
      updateMut.mutate({ id: editItem.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  function prevMonth() {
    if (bulan === 1) { setBulan(12); setTahun(tahun - 1); } else setBulan(bulan - 1);
  }
  function nextMonth() {
    if (bulan === 12) { setBulan(1); setTahun(tahun + 1); } else setBulan(bulan + 1);
  }

  const pending = createMut.isPending || updateMut.isPending;
  const years = Array.from({ length: 4 }, (_, i) => (now.getFullYear() - 1 + i).toString());
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Stats
  const totalItems = rawItems.length;
  const planningApproved = rawItems.filter((i) => i.planning_status === "approved").length;
  const planningPending = rawItems.filter((i) => i.planning_status === "pending").length;
  const uploadApproved = uploadItems.filter((i) => i.upload_status === "approved").length;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-violet-500" />
            Timeline Konten
          </h1>
          <p className="text-muted-foreground text-sm">Alur planning → produksi → upload konten media sosial</p>
        </div>
        <Button onClick={() => openCreate()} className="gap-1.5">
          <Plus className="h-4 w-4" /> Tambah Konten
        </Button>
      </div>

      {/* ── Month nav ── */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
        <Select value={bulan.toString()} onValueChange={(v) => setBulan(Number(v))}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((m) => <SelectItem key={m} value={m.toString()}>{MONTH_NAMES[m - 1]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tahun.toString()} onValueChange={(v) => setTahun(Number(v))}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        <span className="text-sm text-muted-foreground ml-1 font-medium">
          {MONTH_NAMES[bulan - 1]} {tahun}
        </span>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Konten", value: totalItems, icon: CalendarDays, color: "text-violet-500", bg: "bg-violet-50" },
          { label: "Planning Pending", value: planningPending, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Planning Diapprove", value: planningApproved, icon: CheckCircle, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Upload Selesai", value: uploadApproved, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.bg}`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold">{isLoading ? "—" : s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="grid gap-6">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
              <CardContent><Skeleton className="h-48 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="grid gap-6">

          {/* ── 1. Kalender Timeline Planning ── */}
          <KalenderTimeline
            title="Kalender Timeline Planning"
            subtitle={`Submit konten → approval Super Admin → masuk ke Produksi. ${isSuperAdmin ? "Klik Approve / Revisi pada item." : "Konten yang disubmit akan abu-abu sampai diapprove."}`}
            color="border-violet-400"
            bulan={bulan}
            tahun={tahun}
            items={rawItems}
            statusKey="planning_status"
            isSuperAdmin={isSuperAdmin}
            onApprove={(id) => approveMut.mutate({ id, stage: "planning" })}
            onRevisi={(item) => { setRevisiTarget({ item, stage: "planning" }); setRevisiCatatan(""); }}
            onEdit={openEdit}
            onDelete={(id) => setDeleteId(id)}
            onAdd={(date) => openCreate(date)}
            onUploadImage={(item) => { setImageTarget(item); setImagePreview(null); }}
            onResubmit={(id) => resubmitMut.mutate(id)}
            approving={approveMut.isPending}
            revisiting={revisiMut.isPending}
          />

          {/* ── 2. Kalender Timeline Produksi ── */}
          <KalenderTimeline
            title="Kalender Timeline Produksi"
            subtitle={`Konten yang sudah diapprove planning. ${isSuperAdmin ? "Approve untuk mengirim ke Kalender Upload." : "Setelah diapprove, masukkan tanggal upload di bagian Kalender Upload."}`}
            color="border-blue-400"
            bulan={bulan}
            tahun={tahun}
            items={rawItems}
            statusKey="produksi_status"
            requireKey="produksi_status"
            isSuperAdmin={isSuperAdmin}
            onApprove={(id) => approveMut.mutate({ id, stage: "produksi" })}
            onRevisi={(item) => { setRevisiTarget({ item, stage: "produksi" }); setRevisiCatatan(""); }}
            onUploadImage={(item) => { setImageTarget(item); setImagePreview(null); }}
            onResubmit={(id) => resubmitMut.mutate(id)}
            approving={approveMut.isPending}
            revisiting={revisiMut.isPending}
          />

          {/* ── 3. Perlu Dijadwalkan (items approved produksi but no upload date yet) ── */}
          {pendingUploadItems.length > 0 && (
            <Card className="border-t-4 border-orange-400">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-orange-500" />
                  <CardTitle className="text-base font-bold">Perlu Tanggal Upload</CardTitle>
                  <Badge className="bg-orange-100 text-orange-700 border-orange-300">{pendingUploadItems.length}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Konten ini sudah diapprove produksi. {!isSuperAdmin ? "Silakan masukkan tanggal upload agar muncul di Kalender Upload." : "Menunggu content creator memasukkan tanggal upload."}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingUploadItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{item.judul}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.platform && <Badge variant="outline" className="text-[10px] px-1.5">{item.platform}</Badge>}
                          {item.user && <span className="text-xs text-muted-foreground">oleh {item.user.name}</span>}
                        </div>
                      </div>
                      {!isSuperAdmin && (
                        <Button
                          size="sm"
                          className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white shrink-0"
                          onClick={() => openSetUploadDate(item)}
                        >
                          <Upload className="h-3.5 w-3.5" /> Atur Tanggal Upload
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── 4. Kalender Upload ── */}
          <KalenderTimeline
            title="Kalender Upload"
            subtitle={`Konten terjadwal upload di bulan ${MONTH_NAMES[bulan - 1]} ${tahun}. ${isSuperAdmin ? "Approve untuk menandai konten telah diupload." : "Konten yang sudah dijadwalkan upload akan tampil di sini."}`}
            color="border-green-400"
            bulan={bulan}
            tahun={tahun}
            items={isLoadingUpload ? [] : uploadItems}
            statusKey="upload_status"
            dateField="tanggal_upload"
            isSuperAdmin={isSuperAdmin}
            onApprove={(id) => approveMut.mutate({ id, stage: "upload" })}
            onRevisi={(item) => { setRevisiTarget({ item, stage: "upload" }); setRevisiCatatan(""); }}
            onSetUploadDate={!isSuperAdmin ? openSetUploadDate : undefined}
            onSignHdBd={(item) => setSigTarget(item)}
            onUploadImage={(item) => { setImageTarget(item); setImagePreview(null); }}
            onResubmit={(id) => resubmitMut.mutate(id)}
            approving={approveMut.isPending}
            revisiting={revisiMut.isPending}
          />

        </div>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setEditItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Konten" : "Tambah Konten Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Judul Konten *</Label>
              <Input
                value={form.judul}
                onChange={(e) => setForm({ ...form, judul: e.target.value })}
                placeholder="Contoh: Tutorial Make Up Natural"
              />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea
                value={form.deskripsi}
                onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                placeholder="Deskripsi singkat konten..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tanggal di Kalender</Label>
                <Input
                  type="date"
                  value={form.tanggal_publish}
                  onChange={(e) => {
                    const d = e.target.value;
                    const parsed = d ? new Date(d) : null;
                    setForm({
                      ...form,
                      tanggal_publish: d,
                      bulan: parsed ? (parsed.getMonth() + 1).toString() : form.bulan,
                      tahun: parsed ? parsed.getFullYear().toString() : form.tahun,
                    });
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bulan</Label>
                <Select value={form.bulan} onValueChange={(v) => setForm({ ...form, bulan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {months.map((m) => <SelectItem key={m} value={m.toString()}>{MONTH_NAMES[m - 1]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tahun</Label>
                <Select value={form.tahun} onValueChange={(v) => setForm({ ...form, tahun: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setCreateOpen(false); setEditItem(null); }}>Batal</Button>
              <Button onClick={handleSubmit} disabled={!form.judul.trim() || pending}>
                {pending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Set Upload Date Dialog ── */}
      <Dialog open={!!uploadDateTarget} onOpenChange={(v) => { if (!v) { setUploadDateTarget(null); setUploadDateValue(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-green-600" />
              Atur Tanggal Upload
            </DialogTitle>
          </DialogHeader>
          {uploadDateTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-semibold">{uploadDateTarget.judul}</p>
                {uploadDateTarget.platform && (
                  <p className="text-xs text-muted-foreground mt-0.5">{uploadDateTarget.platform}</p>
                )}
              </div>
              <div>
                <Label>Tanggal Upload *</Label>
                <Input
                  type="date"
                  value={uploadDateValue}
                  onChange={(e) => setUploadDateValue(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Konten akan muncul di Kalender Upload pada tanggal yang dipilih.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setUploadDateTarget(null); setUploadDateValue(""); }}>
                  Batal
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!uploadDateValue || setUploadDateMut.isPending}
                  onClick={() => setUploadDateMut.mutate({
                    id: uploadDateTarget.id,
                    tanggal_upload: uploadDateValue,
                  })}
                >
                  {setUploadDateMut.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ── */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Konten?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Konten yang dihapus tidak bisa dikembalikan.</p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
            >
              {deleteMut.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Revisi Dialog ── */}
      <Dialog open={!!revisiTarget} onOpenChange={() => { setRevisiTarget(null); setRevisiCatatan(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisi Konten</DialogTitle>
          </DialogHeader>
          {revisiTarget && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-semibold">{revisiTarget.item.judul}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Stage: <span className="capitalize font-medium">{revisiTarget.stage}</span>
                </p>
              </div>
              <div>
                <Label>Catatan Revisi</Label>
                <Textarea
                  value={revisiCatatan}
                  onChange={(e) => setRevisiCatatan(e.target.value)}
                  placeholder="Jelaskan apa yang perlu diperbaiki..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRevisiTarget(null)}>Batal</Button>
                <Button
                  variant="destructive"
                  disabled={revisiMut.isPending}
                  onClick={() =>
                    revisiMut.mutate({
                      id: revisiTarget.item.id,
                      stage: revisiTarget.stage,
                      catatan: revisiCatatan,
                    })
                  }
                >
                  {revisiMut.isPending ? "Memproses..." : "Tandai Revisi"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── TTD Head BD Dialog ── */}
      <SignatureDialog
        open={!!sigTarget}
        onOpenChange={(v) => { if (!v) setSigTarget(null); }}
        title={`Tanda Tangan Head BD — ${sigTarget?.judul ?? ""}`}
        loading={signHdBdMut.isPending}
        onSave={(base64) => {
          if (sigTarget) signHdBdMut.mutate({ id: sigTarget.id, hd_bd_signature: base64 });
        }}
      />

      {/* ── Upload Gambar Dialog ── */}
      <Dialog open={!!imageTarget} onOpenChange={(v) => { if (!v) { setImageTarget(null); setImagePreview(null); if (imageInputRef.current) imageInputRef.current.value = ""; } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Upload Gambar Task
            </DialogTitle>
          </DialogHeader>
          {imageTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-semibold">{imageTarget.judul}</p>
                {imageTarget.platform && <p className="text-xs text-muted-foreground">{imageTarget.platform}</p>}
              </div>
              {imageTarget.task_image && !imagePreview && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Gambar saat ini:</p>
                  <img src={imageTarget.task_image} alt="Gambar task" className="max-h-40 rounded border object-contain w-full" />
                </div>
              )}
              <label
                className="block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => imageInputRef.current?.click()}
              >
                {imagePreview
                  ? <img src={imagePreview} alt="preview" className="max-h-40 mx-auto object-contain rounded" />
                  : <>
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Klik untuk {imageTarget.task_image ? "mengganti" : "memilih"} gambar</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG / PNG</p>
                    </>
                }
              </label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setImagePreview(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setImageTarget(null); setImagePreview(null); }}>Batal</Button>
                <Button
                  disabled={!imagePreview || uploadImageMut.isPending}
                  onClick={() => { if (imagePreview && imageTarget) uploadImageMut.mutate({ id: imageTarget.id, task_image: imagePreview }); }}
                >
                  {uploadImageMut.isPending ? "Mengupload..." : "Simpan Gambar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
