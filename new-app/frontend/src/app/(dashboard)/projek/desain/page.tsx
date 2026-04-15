"use client";
import { getLogoBase64 } from "@/lib/get-logo";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import { differenceInDays, format, eachMonthOfInterval, startOfMonth, addDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { desainApi } from "@/lib/api/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Pencil,
  Trash2,
  Palette,
  ChevronDown,
  ChevronRight,
  BarChart2,
  List,
  Printer,
  Upload,
  FileCheck,
  ExternalLink,
  CalendarRange,
  FileDown,
  Loader2,
  Link2,
  X,
  Kanban,
  GripVertical,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type DesainItem = {
  id: string;
  item_pekerjaan: string | null;
  tanggal_mulai: string | null;
  target_selesai: string | null;
  status: string | null;
  file_bukti: string | null;
  pic: { id: string; nama: string } | null;
};

type DesainTimeline = {
  id: string;
  jenis_desain: string | null;
  bulan: number | null;
  tahun: number | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  lead: { id: string; nama: string } | null;
  jumlah_item: number;
  items_selesai: number;
  progress: number;
};

type DesainTimelineDetail = DesainTimeline & {
  items: DesainItem[];
  dibuat_oleh: { id: string; nama: string } | null;
};

// ── Constants ──────────────────────────────────────────────────────────────────
const BULAN_OPTIONS = [
  { val: 1, label: "Januari" },
  { val: 2, label: "Februari" },
  { val: 3, label: "Maret" },
  { val: 4, label: "April" },
  { val: 5, label: "Mei" },
  { val: 6, label: "Juni" },
  { val: 7, label: "Juli" },
  { val: 8, label: "Agustus" },
  { val: 9, label: "September" },
  { val: 10, label: "Oktober" },
  { val: 11, label: "November" },
  { val: 12, label: "Desember" },
];

const JENIS_DESAIN_OPTIONS = ["Basic", "Standard", "Premium", "Deluxe"];

const STATUS_OPTIONS = ["Belum Mulai", "Proses", "Selesai"];

const STATUS_STYLE: Record<string, string> = {
  "Belum Mulai": "bg-gray-100 text-gray-700 border-gray-200",
  Proses: "bg-blue-100 text-blue-700 border-blue-200",
  Selesai: "bg-green-100 text-green-700 border-green-200",
};

const GANTT_BAR_COLOR: Record<string, string> = {
  "Belum Mulai": "bg-gray-400",
  Proses: "bg-blue-500",
  Selesai: "bg-green-500",
};

// ── Gantt Chart Component ──────────────────────────────────────────────────────
function GanttChart({
  items,
  onEdit,
}: {
  items: DesainItem[];
  onEdit: (item: DesainItem) => void;
}) {
  const withDates = items.filter((i) => i.tanggal_mulai || i.target_selesai);
  if (withDates.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Belum ada tanggal. Isi Tanggal Mulai & Tanggal Selesai pada pekerjaan
        untuk melihat Gantt chart.
      </div>
    );
  }

  const allTs: number[] = [];
  for (const item of items) {
    if (item.tanggal_mulai) allTs.push(new Date(item.tanggal_mulai).getTime());
    if (item.target_selesai) allTs.push(new Date(item.target_selesai).getTime());
  }
  const minDate = new Date(Math.min(...allTs));
  const maxDate = new Date(Math.max(...allTs));
  const totalDays = Math.max(differenceInDays(maxDate, minDate) + 1, 1);

  // Row 1: Month markers
  const months = eachMonthOfInterval({ start: minDate, end: maxDate });
  const monthMarkers = months.map((m) => ({
    label: format(startOfMonth(m), "MMM yyyy", { locale: idLocale }),
    left: (Math.max(differenceInDays(startOfMonth(m), minDate), 0) / totalDays) * 100,
  }));

  // Row 2: Day markers — show tanggal 1, 5, 10, 15, 20, 25 setiap bulan
  const dayMarkers: { label: string; left: number }[] = [];
  const SHOW_DAYS = [1, 5, 10, 15, 20, 25];
  let cur = new Date(minDate);
  cur.setDate(1); // mulai dari tanggal 1 bulan pertama
  while (cur <= maxDate) {
    if (SHOW_DAYS.includes(cur.getDate()) && cur >= minDate) {
      dayMarkers.push({
        label: String(cur.getDate()),
        left: (differenceInDays(cur, minDate) / totalDays) * 100,
      });
    }
    cur = addDays(cur, 1);
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Row 1: Month names */}
        <div className="flex border-b border-border/60">
          <div className="w-56 flex-shrink-0 px-2 py-1 text-xs font-semibold text-muted-foreground">
            Pekerjaan
          </div>
          <div className="flex-1 relative h-6">
            {monthMarkers.map((m, i) => (
              <span
                key={i}
                className="absolute top-1 text-[11px] font-semibold text-foreground/80 select-none whitespace-nowrap"
                style={{ left: `${m.left}%` }}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>

        {/* Row 2: Day numbers + vertical grid lines */}
        <div className="flex border-b border-border/60 mb-1">
          <div className="w-56 flex-shrink-0" />
          <div className="flex-1 relative h-5">
            {dayMarkers.map((d, i) => (
              <span
                key={i}
                className="absolute top-0.5 text-[10px] text-muted-foreground/60 select-none"
                style={{ left: `${d.left}%`, transform: "translateX(-50%)" }}
              >
                {d.label}
              </span>
            ))}
            {/* Vertical guide lines */}
            {dayMarkers.map((d, i) => (
              <div
                key={`vl-${i}`}
                className="absolute top-0 bottom-0 border-l border-border/30"
                style={{ left: `${d.left}%` }}
              />
            ))}
          </div>
        </div>

        {/* Task rows */}
        {items.map((item) => {
          const start = item.tanggal_mulai ? new Date(item.tanggal_mulai) : null;
          const end = item.target_selesai ? new Date(item.target_selesai) : null;

          let leftPct = 0;
          let widthPct = 2;
          if (start && end) {
            leftPct = (differenceInDays(start, minDate) / totalDays) * 100;
            widthPct = Math.max(
              ((differenceInDays(end, start) + 1) / totalDays) * 100,
              2
            );
          } else if (start) {
            leftPct = (differenceInDays(start, minDate) / totalDays) * 100;
          } else if (end) {
            leftPct = (differenceInDays(end, minDate) / totalDays) * 100;
          }

          const dateLabel =
            start || end
              ? `${start ? format(start, "dd/MM", { locale: idLocale }) : "?"} – ${
                  end ? format(end, "dd/MM", { locale: idLocale }) : "?"
                }`
              : null;
          const isLate =
            !!end && item.status !== "Selesai" && end < new Date(new Date().toDateString());
          const barColor = isLate ? "bg-red-500" : (GANTT_BAR_COLOR[item.status ?? ""] ?? "bg-gray-300");

          return (
            <div
              key={item.id}
              className={`flex items-center py-1 border-b last:border-0 hover:bg-muted/20 ${isLate ? "bg-red-50 hover:bg-red-100/70" : ""}`}
            >
              {/* Task name + dates */}
              <div className="w-56 flex-shrink-0 px-2">
                <div
                  className="text-sm truncate font-medium"
                  title={item.item_pekerjaan ?? ""}
                >
                  {item.item_pekerjaan ?? "—"}
                </div>
                {dateLabel && (
                  <div className="text-[10px] text-muted-foreground leading-tight">
                    {dateLabel}
                  </div>
                )}
              </div>

              {/* Bar area */}
              <div className="flex-1 relative h-9">
                {/* Vertical guide lines (faint) */}
                {dayMarkers.map((d, i) => (
                  <div
                    key={i}
                    className="absolute inset-y-0 border-l border-border/20"
                    style={{ left: `${d.left}%` }}
                  />
                ))}

                {(start || end) ? (
                  <button
                    className={`absolute top-1.5 h-6 rounded flex items-center px-2 overflow-hidden ${barColor} opacity-85 hover:opacity-100 cursor-pointer transition-opacity shadow-sm`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    onClick={() => onEdit(item)}
                    title={`Klik untuk edit | ${item.status ?? "-"} | PIC: ${item.pic?.nama ?? "-"}`}
                  >
                    <span className="text-white text-[10px] truncate leading-none font-medium">
                      {item.pic?.nama ?? item.item_pekerjaan ?? ""}
                    </span>
                  </button>
                ) : (
                  <div className="absolute top-4 left-0 right-0 border-t border-dashed border-muted-foreground/30" />
                )}
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex gap-4 mt-3 pt-3 border-t flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <div key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className={`w-3 h-3 rounded-sm ${GANTT_BAR_COLOR[s]}`} />
              {s}
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            Terlambat
          </div>
          <span className="text-xs text-muted-foreground ml-auto italic">
            Klik bar untuk edit pekerjaan
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Download helper ────────────────────────────────────────────────────────────
async function handlePrint(id: string, jenis_desain: string | null) {
  try {
    const data = await desainApi.exportData(id);
    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>${data.judul}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
  h2 { font-size: 16px; margin-bottom: 4px; }
  .meta { color: #555; margin-bottom: 16px; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f5f5f5; text-align: left; padding: 6px 8px; border: 1px solid #ddd; font-size: 11px; }
  td { padding: 6px 8px; border: 1px solid #ddd; }
  .badge-selesai { color: #166534; background: #dcfce7; border-radius: 4px; padding: 1px 6px; }
  .badge-proses  { color: #1e40af; background: #dbeafe; border-radius: 4px; padding: 1px 6px; }
  .badge-belum   { color: #374151; background: #f3f4f6; border-radius: 4px; padding: 1px 6px; }
  .progress { color: #166534; font-weight: bold; }
  @media print { button { display: none; } }
</style>
</head>
<body>
<h2>${data.judul}</h2>
<div class="meta">
  Periode: ${data.periode} &nbsp;|&nbsp; Klien: ${data.klien} &nbsp;|&nbsp;
  Progress: <span class="progress">${data.progress_total}%</span> &nbsp;|&nbsp;
  Dibuat oleh: ${data.dibuat_oleh}
</div>
<table>
  <thead>
    <tr>
      <th>#</th><th>Nama Pekerjaan</th><th>Tanggal Mulai</th>
      <th>Tanggal Selesai</th><th>PIC</th><th>Status</th>
    </tr>
  </thead>
  <tbody>
    ${data.pekerjaan
      .map(
        (p: any, i: number) => `<tr>
      <td>${i + 1}</td>
      <td>${p.nama_pekerjaan}</td>
      <td>${p.tanggal_mulai ? new Date(p.tanggal_mulai).toLocaleDateString("id-ID") : "—"}</td>
      <td>${p.tanggal_selesai ? new Date(p.tanggal_selesai).toLocaleDateString("id-ID") : "—"}</td>
      <td>${p.pic}</td>
      <td><span class="${
        p.status === "Selesai"
          ? "badge-selesai"
          : p.status === "Proses"
          ? "badge-proses"
          : "badge-belum"
      }">${p.status}</span></td>
    </tr>`
      )
      .join("")}
  </tbody>
</table>
<script>window.onload = () => window.print();<\/script>
</body></html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  } catch {
    toast.error("Gagal mengunduh data");
  }
}

// ── Main Page ──────────────────────────────────────────────────────────────────
const EMPTY_TIMELINE = {
  jenis_desain: "Basic",
  lead_id: "",
  bulan: String(new Date().getMonth() + 1),
  tahun: String(new Date().getFullYear()),
  tanggal_mulai: "",
  tanggal_selesai: "",
};

const EMPTY_ITEM = {
  item_pekerjaan: "",
  tanggal_mulai: "",
  target_selesai: "",
  status: "Belum Mulai",
  pic: "",
};

export default function ProyekDesainPage() {
  const qc = useQueryClient();

  // Expand & view state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<Record<string, "list" | "gantt" | "docs" | "kanban">>({});
  const kanbanDragItem = useRef<string | null>(null);
  const [linkForms, setLinkForms] = useState<Record<string, { title: string; url: string; catatan: string }>>({});

  // Dialog state
  const [tlDialog, setTlDialog] = useState(false);
  const [editTl, setEditTl] = useState<DesainTimeline | null>(null);
  const [tlForm, setTlForm] = useState(EMPTY_TIMELINE);
  const [confirmDeleteTl, setConfirmDeleteTl] = useState<string | null>(null);
  const [leadSearch, setLeadSearch] = useState("");

  const [itemDialog, setItemDialog] = useState(false);
  const [editItem, setEditItem] = useState<DesainItem | null>(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: timelines = [], isLoading } = useQuery<DesainTimeline[]>({
    queryKey: ["desain-timelines"],
    queryFn: () => desainApi.listTimeline(),
    retry: false,
  });

  const { data: detail } = useQuery<DesainTimelineDetail>({
    queryKey: ["desain-detail", expandedId],
    queryFn: () => desainApi.getTimeline(expandedId!),
    enabled: !!expandedId,
    retry: false,
  });

  const { data: employees = [] } = useQuery<{ id: string; nama: string }[]>({
    queryKey: ["desain-employees"],
    queryFn: () => desainApi.listEmployees(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const { data: leads = [] } = useQuery<{ id: string; nama: string; jenis?: string }[]>({
    queryKey: ["finance-leads-dropdown"],
    queryFn: () => desainApi.listLeads(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  // ── Timeline Mutations ────────────────────────────────────────────────────────
  const createTl = useMutation({
    mutationFn: (d: any) => desainApi.createTimeline(d),
    onSuccess: () => {
      toast.success("Timeline dibuat dengan 6 pekerjaan default");
      qc.invalidateQueries({ queryKey: ["desain-timelines"] });
      setTlDialog(false);
      setTlForm(EMPTY_TIMELINE);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal membuat timeline"),
  });

  const updateTl = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      desainApi.updateTimeline(id, data),
    onSuccess: () => {
      toast.success("Timeline diupdate");
      qc.invalidateQueries({ queryKey: ["desain-timelines"] });
      qc.invalidateQueries({ queryKey: ["desain-detail", expandedId] });
      setTlDialog(false);
      setEditTl(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal update"),
  });

  const deleteTl = useMutation({
    mutationFn: (id: string) => desainApi.deleteTimeline(id),
    onSuccess: () => {
      toast.success("Timeline dihapus");
      qc.invalidateQueries({ queryKey: ["desain-timelines"] });
      if (expandedId === confirmDeleteTl) setExpandedId(null);
      setConfirmDeleteTl(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal hapus"),
  });

  // ── Item Mutations ────────────────────────────────────────────────────────────
  const addItem = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      desainApi.addItem(id, data),
    onSuccess: () => {
      toast.success("Pekerjaan ditambahkan");
      qc.invalidateQueries({ queryKey: ["desain-detail", expandedId] });
      qc.invalidateQueries({ queryKey: ["desain-timelines"] });
      setItemDialog(false);
      setItemForm(EMPTY_ITEM);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal tambah"),
  });

  const updateItem = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: any }) =>
      desainApi.updateItem(itemId, data),
    onSuccess: () => {
      toast.success("Pekerjaan diupdate");
      qc.invalidateQueries({ queryKey: ["desain-detail", expandedId] });
      qc.invalidateQueries({ queryKey: ["desain-timelines"] });
      setItemDialog(false);
      setEditItem(null);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.detail || "Gagal update. Periksa apakah kamu adalah PIC pekerjaan ini."),
  });

  const deleteItem = useMutation({
    mutationFn: (itemId: string) => desainApi.deleteItem(itemId),
    onSuccess: () => {
      toast.success("Pekerjaan dihapus");
      qc.invalidateQueries({ queryKey: ["desain-detail", expandedId] });
      qc.invalidateQueries({ queryKey: ["desain-timelines"] });
      setConfirmDeleteItem(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal hapus"),
  });

  const uploadFile = useMutation({
    mutationFn: ({ itemId, file }: { itemId: string; file: File }) =>
      desainApi.uploadFileBukti(itemId, file),
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal upload file"),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────────
  function openCreateTl() {
    setEditTl(null);
    setTlForm(EMPTY_TIMELINE);
    setTlDialog(true);
  }

  function openEditTl(tl: DesainTimeline) {
    setEditTl(tl);
    setTlForm({
      jenis_desain: tl.jenis_desain ?? "",
      lead_id: tl.lead?.id ?? "",
      bulan: String(tl.bulan ?? new Date().getMonth() + 1),
      tahun: String(tl.tahun ?? new Date().getFullYear()),
      tanggal_mulai: tl.tanggal_mulai ?? "",
      tanggal_selesai: tl.tanggal_selesai ?? "",
    });
    setTlDialog(true);
  }

  function handleTlSubmit() {
    const payload = {
      jenis_desain: tlForm.jenis_desain || null,
      lead_id: tlForm.lead_id || null,
      bulan: tlForm.bulan ? Number(tlForm.bulan) : null,
      tahun: tlForm.tahun ? Number(tlForm.tahun) : null,
      tanggal_mulai: tlForm.tanggal_mulai || null,
      tanggal_selesai: tlForm.tanggal_selesai || null,
    };
    if (editTl) updateTl.mutate({ id: editTl.id, data: payload });
    else createTl.mutate(payload);
  }

  function openCreateItem() {
    setEditItem(null);
    setItemForm(EMPTY_ITEM);
    setSelectedFile(null);
    setItemDialog(true);
  }

  function openEditItem(item: DesainItem) {
    setEditItem(item);
    setItemForm({
      item_pekerjaan: item.item_pekerjaan ?? "",
      tanggal_mulai: item.tanggal_mulai
        ? item.tanggal_mulai.substring(0, 10)
        : "",
      target_selesai: item.target_selesai
        ? item.target_selesai.substring(0, 10)
        : "",
      status: item.status ?? "Belum Mulai",
      pic: item.pic?.id ?? "",
    });
    setSelectedFile(null);
    setItemDialog(true);
  }

  async function handleItemSubmit() {
    if (!expandedId) return;

    // Validate: status "Selesai" requires file
    if (itemForm.status === "Selesai" && editItem && !editItem.file_bukti && !selectedFile) {
      toast.error("Harap upload file bukti sebelum menandai pekerjaan sebagai Selesai");
      return;
    }

    const payload: any = {
      item_pekerjaan: itemForm.item_pekerjaan || null,
      tanggal_mulai: itemForm.tanggal_mulai || null,
      target_selesai: itemForm.target_selesai || null,
      status: itemForm.status,
      pic: itemForm.pic || null,
    };

    try {
      if (editItem) {
        // Upload file first if selected
        if (selectedFile) {
          await desainApi.uploadFileBukti(editItem.id, selectedFile);
        }
        updateItem.mutate({ itemId: editItem.id, data: payload });
      } else {
        // For new items, create first then optionally upload (but status "Selesai" is blocked at creation)
        addItem.mutate({ id: expandedId, data: payload });
      }
    } catch {
      toast.error("Gagal upload file bukti");
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function getView(id: string): "list" | "gantt" | "docs" | "kanban" {
    return viewMode[id] ?? "list";
  }

  function setView(id: string, view: "list" | "gantt" | "docs" | "kanban") {
    setViewMode((prev) => ({ ...prev, [id]: view }));
  }

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // ── Summary PDF filter dialog ──────────────────────────────────────────────
  const [summaryDialog, setSummaryDialog] = useState(false);
  const [summaryGenerating, setSummaryGenerating] = useState(false);
  const [pdfJenis, setPdfJenis] = useState("semua");
  const [pdfBulan, setPdfBulan] = useState("semua");
  const [pdfTahun, setPdfTahun] = useState("");
  const [pdfTglFrom, setPdfTglFrom] = useState("");
  const [pdfTglTo, setPdfTglTo] = useState("");

  async function handleSummaryPDF() {
    setSummaryGenerating(true);
    try {
      let filtered = timelines as DesainTimeline[];
      if (pdfJenis !== "semua") filtered = filtered.filter((t) => t.jenis_desain === pdfJenis);
      if (pdfBulan !== "semua") filtered = filtered.filter((t) => t.bulan === Number(pdfBulan));
      if (pdfTahun) filtered = filtered.filter((t) => t.tahun === Number(pdfTahun));
      if (pdfTglFrom) filtered = filtered.filter((t) => t.tanggal_mulai && t.tanggal_mulai >= pdfTglFrom);
      if (pdfTglTo)   filtered = filtered.filter((t) => t.tanggal_selesai && t.tanggal_selesai <= pdfTglTo);

      const logoUrl = await getLogoBase64();
      const rows = filtered.map((t) => ({
        id: t.id,
        jenis_desain: t.jenis_desain,
        klien: t.lead?.nama ?? null,
        bulan: t.bulan,
        tahun: t.tahun,
        tanggal_mulai: t.tanggal_mulai,
        tanggal_selesai: t.tanggal_selesai,
        progress: t.progress,
        jumlah_item: t.jumlah_item,
        items_selesai: t.items_selesai,
      }));

      const generatedAt = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const { default: DesainSummaryPDF } = await import("@/components/desain-summary-pdf");
      const blob = await pdf(
        <DesainSummaryPDF
          logoUrl={logoUrl}
          rows={rows}
          filters={{ jenis: pdfJenis !== "semua" ? pdfJenis : undefined, bulan: pdfBulan !== "semua" ? pdfBulan : undefined, tahun: pdfTahun || undefined, tgl_from: pdfTglFrom || undefined, tgl_to: pdfTglTo || undefined }}
          generatedAt={generatedAt}
        />
      ).toBlob();
      saveAs(blob, `summary-desain-${new Date().toISOString().slice(0, 10)}.pdf`);
      setSummaryDialog(false);
    } catch (e) {
      console.error(e);
      toast.error("Gagal generate Summary PDF");
    } finally {
      setSummaryGenerating(false);
    }
  }

  // Docs/Link — per-timeline links (fetched lazily when docs view is active)
  const { data: currentLinks = [] } = useQuery<any[]>({
    queryKey: ["desain-links", expandedId],
    queryFn: () => desainApi.getLinks(expandedId!),
    enabled: !!expandedId && (viewMode[expandedId ?? ""] === "docs"),
    retry: false,
    staleTime: 30_000,
  });
  const addLinkMut = useMutation({
    mutationFn: ({ tlId, data }: { tlId: string; data: any }) => desainApi.addLink(tlId, data),
    onSuccess: (_, vars) => {
      toast.success("Link ditambahkan");
      qc.invalidateQueries({ queryKey: ["desain-links", vars.tlId] });
      setLinkForms((prev) => ({ ...prev, [vars.tlId]: { title: "", url: "", catatan: "" } }));
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });
  const deleteLinkMut = useMutation({
    mutationFn: (linkId: string) => desainApi.deleteLink(linkId),
    onSuccess: () => { toast.success("Link dihapus"); qc.invalidateQueries({ queryKey: ["desain-links", expandedId] }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });
  const [confirmDeleteLinkId, setConfirmDeleteLinkId] = useState<string | null>(null);

  async function handleDownloadPDF(tl: DesainTimeline) {
    setDownloadingId(tl.id);
    try {
      const d = await desainApi.getTimeline(tl.id);
      const bulanLabel = BULAN_OPTIONS.find((b) => b.val === d.bulan)?.label ?? String(d.bulan ?? "");
      const judul = [d.jenis_desain, bulanLabel, d.tahun].filter(Boolean).join(" – ");
      const logoUrl = await getLogoBase64();

      const pdfData = {
        type: "desain" as const,
        judul,
        docLabel: "TIMELINE DESAIN",
        klien: d.lead?.nama ?? undefined,
        periode: (d.tanggal_mulai || d.tanggal_selesai)
          ? [
              d.tanggal_mulai ? new Date(d.tanggal_mulai).toLocaleDateString("id-ID") : "?",
              d.tanggal_selesai ? new Date(d.tanggal_selesai).toLocaleDateString("id-ID") : "?",
            ].join(" – ")
          : undefined,
        extra_info: [
          { label: "Jenis Desain", value: d.jenis_desain ?? "—" },
          { label: "Bulan / Tahun", value: `${bulanLabel} ${d.tahun ?? ""}` },
        ],
        progress: d.progress,
        dibuat_oleh: d.dibuat_oleh?.nama,
        items: (d.items ?? []).map((i: any) => ({
          nama_pekerjaan: i.item_pekerjaan ?? "—",
          tanggal_mulai: i.tanggal_mulai ?? null,
          tanggal_selesai: i.target_selesai ?? null,
          pic: i.pic?.nama ?? "—",
          status: i.status ?? "Belum Mulai",
        })),
        logoUrl,
      };

      const { ProyekPDF } = await import("@/components/projek-pdf");
      const blob = await pdf(<ProyekPDF data={pdfData} />).toBlob();
      saveAs(blob, `timeline-desain-${judul.replace(/\s+/g, "-").toLowerCase()}.pdf`);
    } catch (e) {
      console.error("PDF error:", e);
      toast.error("Gagal generate PDF");
    } finally {
      setDownloadingId(null);
    }
  }

  const items = detail?.items ?? [];
  const tlPending = createTl.isPending || updateTl.isPending;
  const itemPending = addItem.isPending || updateItem.isPending || uploadFile.isPending;
  const tlDateMin = detail?.tanggal_mulai ?? undefined;
  const tlDateMax = detail?.tanggal_selesai ?? undefined;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6 text-purple-500" />
            Projek Desain
          </h1>
          <p className="text-muted-foreground text-sm">
            Timeline pekerjaan desain dengan Gantt chart
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSummaryDialog(true)}>
            <FileDown className="h-4 w-4 mr-1.5" /> Summary PDF
          </Button>
          <Button onClick={openCreateTl}>
            <Plus className="h-4 w-4 mr-1.5" /> Tambah Timeline
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}

        {!isLoading &&
          timelines.map((tl) => {
            const isExpanded = expandedId === tl.id;
            const view = getView(tl.id);

            return (
              <Card key={tl.id} className="overflow-hidden">
                {/* Card Header */}
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {/* Expand toggle */}
                    <button
                      className="flex items-center gap-2 flex-1 text-left min-w-0"
                      onClick={() => toggleExpand(tl.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      )}
                      <Palette className="h-4 w-4 flex-shrink-0 text-purple-500" />
                      <span className="font-semibold truncate">
                        {tl.jenis_desain ?? "—"}
                      </span>
                      {tl.lead && (
                        <span className="text-sm text-muted-foreground truncate">
                          — {tl.lead.nama}
                        </span>
                      )}
                      {tl.bulan && tl.tahun && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {BULAN_OPTIONS.find((b) => b.val === tl.bulan)?.label}{" "}
                          {tl.tahun}
                        </Badge>
                      )}
                      {(tl.tanggal_mulai || tl.tanggal_selesai) && (
                        <Badge variant="outline" className="text-xs flex-shrink-0 flex items-center gap-1">
                          <CalendarRange className="h-3 w-3" />
                          {tl.tanggal_mulai
                            ? new Date(tl.tanggal_mulai).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
                            : "?"}{" "}
                          –{" "}
                          {tl.tanggal_selesai
                            ? new Date(tl.tanggal_selesai).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                            : "?"}
                        </Badge>
                      )}
                    </button>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Badge
                        className={`text-xs ${
                          tl.progress === 100
                            ? "bg-green-100 text-green-700"
                            : tl.progress > 0
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {tl.progress}%
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(tl.id);
                          openCreateItem();
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Pekerjaan
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Download / Print HTML"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrint(tl.id, tl.jenis_desain);
                        }}
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-orange-500"
                        title="Download PDF"
                        disabled={downloadingId === tl.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPDF(tl);
                        }}
                      >
                        {downloadingId === tl.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <FileDown className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditTl(tl);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteTl(tl.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="ml-6 mt-2">
                    <Progress value={tl.progress} className="h-1.5" />
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tl.items_selesai}/{tl.jumlah_item} pekerjaan selesai
                    </p>
                  </div>
                </CardHeader>

                {/* Expanded detail */}
                {isExpanded && (
                  <CardContent className="p-0 border-t">
                    {/* Date range info */}
                    {(detail?.tanggal_mulai || detail?.tanggal_selesai) && (
                      <div className="px-4 py-2 bg-purple-50 border-b text-xs text-purple-700 flex items-center gap-2">
                        <CalendarRange className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>
                          Rentang proyek:{" "}
                          <b>
                            {detail?.tanggal_mulai
                              ? new Date(detail.tanggal_mulai).toLocaleDateString("id-ID")
                              : "?"}{" "}
                            –{" "}
                            {detail?.tanggal_selesai
                              ? new Date(detail.tanggal_selesai).toLocaleDateString("id-ID")
                              : "?"}
                          </b>
                          . Tanggal pekerjaan tidak boleh melampaui rentang ini.
                        </span>
                      </div>
                    )}

                    {/* View toggle */}
                    <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
                      <button
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                          view === "list"
                            ? "bg-white shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => setView(tl.id, "list")}
                      >
                        <List className="h-3.5 w-3.5" />
                        Daftar Pekerjaan
                      </button>
                      <button
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                          view === "gantt"
                            ? "bg-white shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => setView(tl.id, "gantt")}
                      >
                        <BarChart2 className="h-3.5 w-3.5" />
                        Gantt Chart
                      </button>
                      <button
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                          view === "docs"
                            ? "bg-white shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => setView(tl.id, "docs")}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Docs/Link
                      </button>
                      <button
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                          view === "kanban"
                            ? "bg-white shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => setView(tl.id, "kanban")}
                      >
                        <Kanban className="h-3.5 w-3.5" />
                        Kanban
                      </button>
                    </div>

                    {/* LIST VIEW */}
                    {view === "list" && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8 pl-4">#</TableHead>
                            <TableHead>Nama Pekerjaan</TableHead>
                            <TableHead>Tanggal Mulai</TableHead>
                            <TableHead>Tanggal Selesai</TableHead>
                            <TableHead>PIC</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-20" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item, idx) => {
                            const isLateRow = !!item.target_selesai && item.status !== "Selesai" && new Date(item.target_selesai) < new Date(new Date().toDateString());
                            return (
                              <TableRow key={item.id} className={isLateRow ? "bg-red-50 hover:bg-red-100/70" : ""}>
                                <TableCell className="pl-4 text-muted-foreground text-sm">
                                  {idx + 1}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {item.item_pekerjaan ?? "—"}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {item.tanggal_mulai
                                    ? new Date(item.tanggal_mulai).toLocaleDateString("id-ID")
                                    : "—"}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {item.target_selesai
                                    ? new Date(item.target_selesai).toLocaleDateString("id-ID")
                                    : "—"}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {item.pic?.nama ?? (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <Badge
                                      variant="outline"
                                      className={
                                        STATUS_STYLE[item.status ?? ""] ??
                                        STATUS_STYLE["Belum Mulai"]
                                      }
                                    >
                                      {item.status ?? "Belum Mulai"}
                                    </Badge>
                                    {item.file_bukti && (
                                      <a
                                        href={`http://localhost:8000${item.file_bukti}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Lihat file bukti"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <FileCheck className="h-3.5 w-3.5 text-green-600" />
                                      </a>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => openEditItem(item)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() =>
                                        setConfirmDeleteItem(item.id)
                                      }
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {items.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                className="text-center py-8 text-muted-foreground text-sm"
                              >
                                Belum ada pekerjaan.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    )}

                    {/* GANTT VIEW */}
                    {view === "gantt" && (
                      <div className="p-4">
                        <GanttChart items={items} onEdit={openEditItem} />
                      </div>
                    )}

                    {/* KANBAN VIEW */}
                    {view === "kanban" && (
                      <div className="p-4">
                        {/* 3 status columns */}
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {(["Belum Mulai", "Proses", "Selesai"] as const).map((colStatus) => {
                            const colItems = items.filter(
                              (i) => (i.status ?? "Belum Mulai") === colStatus
                            );
                            const colColor =
                              colStatus === "Belum Mulai"
                                ? "border-gray-300 bg-gray-50"
                                : colStatus === "Proses"
                                ? "border-blue-300 bg-blue-50/50"
                                : "border-green-300 bg-green-50/50";
                            const dotColor =
                              colStatus === "Belum Mulai"
                                ? "bg-gray-400"
                                : colStatus === "Proses"
                                ? "bg-blue-500"
                                : "bg-green-500";
                            return (
                              <div
                                key={colStatus}
                                className={`flex-1 min-w-[200px] flex flex-col rounded-xl border-2 ${colColor} p-2`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => {
                                  if (kanbanDragItem.current) {
                                    updateItem.mutate({
                                      itemId: kanbanDragItem.current,
                                      data: { status: colStatus },
                                    });
                                    kanbanDragItem.current = null;
                                  }
                                }}
                              >
                                {/* Column header */}
                                <div className="flex items-center gap-1.5 mb-2 px-1">
                                  <div className={`w-2 h-2 rounded-full flex-none ${dotColor}`} />
                                  <span className="text-xs font-semibold">{colStatus}</span>
                                  <span className="ml-auto text-xs text-muted-foreground bg-white rounded-full px-1.5 border">
                                    {colItems.length}
                                  </span>
                                </div>

                                {/* Cards */}
                                <div className="flex flex-col gap-2 flex-1 min-h-[80px]">
                                  {colItems.map((item) => {
                                    const isLateCard = !!item.target_selesai && item.status !== "Selesai" && new Date(item.target_selesai) < new Date(new Date().toDateString());
                                    return (
                                    <div
                                      key={item.id}
                                      draggable
                                      onDragStart={() => { kanbanDragItem.current = item.id; }}
                                      onClick={() => openEditItem(item)}
                                      className={`rounded-lg border p-2.5 shadow-sm cursor-grab active:cursor-grabbing transition-colors group ${isLateCard ? "bg-red-50 border-red-200 hover:border-red-400" : "bg-white border-slate-200 hover:border-purple-300"}`}
                                    >
                                      <div className="flex items-start gap-1">
                                        <GripVertical
                                          size={13}
                                          className="text-muted-foreground/40 mt-0.5 flex-none opacity-0 group-hover:opacity-100"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-slate-800 leading-tight truncate">
                                            {item.item_pekerjaan ?? "—"}
                                          </p>
                                          {item.pic && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                              PIC: {item.pic.nama}
                                            </p>
                                          )}
                                          {item.target_selesai && (
                                            <p className={`text-xs mt-0.5 ${isLateCard ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                                              Deadline:{" "}
                                              {new Date(item.target_selesai).toLocaleDateString("id-ID", {
                                                day: "numeric",
                                                month: "short",
                                              })}
                                              {isLateCard && " ⚠ Terlambat"}
                                            </p>
                                          )}
                                          {item.tanggal_mulai && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                              Mulai:{" "}
                                              {new Date(item.tanggal_mulai).toLocaleDateString("id-ID", {
                                                day: "numeric",
                                                month: "short",
                                              })}
                                            </p>
                                          )}
                                          {item.file_bukti && (
                                            <span className="text-xs text-green-600 flex items-center gap-0.5 mt-0.5">
                                              <FileCheck size={11} /> File tersedia
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    );
                                  })}
                                  {colItems.length === 0 && (
                                    <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground py-4 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                                      Kosong
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3 text-right italic">
                          Drag untuk ubah status · Klik kartu untuk edit detail (deadline, tanggal, PIC)
                        </p>
                      </div>
                    )}

                    {/* DOCS/LINK VIEW */}
                    {view === "docs" && (
                      <div className="p-4 space-y-4">
                        {/* Add form */}
                        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                          <p className="text-sm font-medium">Tambah Link Baru</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Judul *</Label>
                              <Input
                                placeholder="e.g. Referensi Desain, Mood Board"
                                value={linkForms[tl.id]?.title ?? ""}
                                onChange={(e) => setLinkForms((prev) => ({ ...prev, [tl.id]: { ...prev[tl.id] ?? { title: "", url: "", catatan: "" }, title: e.target.value } }))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">URL *</Label>
                              <Input
                                placeholder="https://..."
                                value={linkForms[tl.id]?.url ?? ""}
                                onChange={(e) => setLinkForms((prev) => ({ ...prev, [tl.id]: { ...prev[tl.id] ?? { title: "", url: "", catatan: "" }, url: e.target.value } }))}
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Catatan</Label>
                            <Input
                              placeholder="Keterangan tambahan (opsional)"
                              value={linkForms[tl.id]?.catatan ?? ""}
                              onChange={(e) => setLinkForms((prev) => ({ ...prev, [tl.id]: { ...prev[tl.id] ?? { title: "", url: "", catatan: "" }, catatan: e.target.value } }))}
                            />
                          </div>
                          <Button
                            size="sm"
                            disabled={!linkForms[tl.id]?.title || !linkForms[tl.id]?.url || addLinkMut.isPending}
                            onClick={() => addLinkMut.mutate({ tlId: tl.id, data: linkForms[tl.id] })}
                          >
                            {addLinkMut.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Menyimpan...</> : <><Plus className="h-3.5 w-3.5 mr-1.5" />Tambah Link</>}
                          </Button>
                        </div>
                        {/* Link list */}
                        {currentLinks.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Link2 className="mx-auto h-7 w-7 opacity-20 mb-2" />
                            <p className="text-sm">Belum ada link. Tambahkan di atas.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {currentLinks.map((link: any) => (
                              <div key={link.id} className="flex items-center gap-3 border rounded-lg px-4 py-3 bg-background">
                                <Link2 className="h-4 w-4 text-purple-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:underline text-purple-700 flex items-center gap-1">
                                    {link.title} <ExternalLink className="h-3 w-3" />
                                  </a>
                                  {link.catatan && <p className="text-xs text-muted-foreground mt-0.5">{link.catatan}</p>}
                                  <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" disabled={deleteLinkMut.isPending} onClick={() => setConfirmDeleteLinkId(link.id)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}

        {!isLoading && timelines.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Palette className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Belum ada Timeline Desain</p>
            <p className="text-sm mt-1">
              Klik &quot;Tambah Timeline&quot; untuk membuat yang pertama
            </p>
          </div>
        )}
      </div>

      {/* ── Dialog: Create/Edit Timeline ─────────────────────────────────────── */}
      <Dialog open={tlDialog} onOpenChange={setTlDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editTl ? "Edit Timeline Desain" : "Tambah Timeline Desain"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <Label>Jenis Desain *</Label>
              <Select
                value={tlForm.jenis_desain}
                onValueChange={(v) => setTlForm({ ...tlForm, jenis_desain: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis desain" />
                </SelectTrigger>
                <SelectContent>
                  {JENIS_DESAIN_OPTIONS.map((j) => (
                    <SelectItem key={j} value={j}>
                      {j}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lead / Klien</Label>
              <Select
                value={tlForm.lead_id || "__none__"}
                onValueChange={(v) => setTlForm({ ...tlForm, lead_id: v === "__none__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih klien (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input placeholder="Cari nama klien..." value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <SelectItem value="__none__">— Tanpa klien —</SelectItem>
                  {(leads as any[]).filter((l: any) => !leadSearch || l.nama?.toLowerCase().includes(leadSearch.toLowerCase())).map((l: any) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bulan</Label>
                <Select
                  value={tlForm.bulan}
                  onValueChange={(v) => setTlForm({ ...tlForm, bulan: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih bulan" />
                  </SelectTrigger>
                  <SelectContent>
                    {BULAN_OPTIONS.map((b) => (
                      <SelectItem key={b.val} value={String(b.val)}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tahun</Label>
                <Input
                  type="number"
                  placeholder="2025"
                  value={tlForm.tahun}
                  onChange={(e) =>
                    setTlForm({ ...tlForm, tahun: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tanggal Mulai Proyek</Label>
                <Input
                  type="date"
                  value={tlForm.tanggal_mulai}
                  max={tlForm.tanggal_selesai || undefined}
                  onChange={(e) => setTlForm({ ...tlForm, tanggal_mulai: e.target.value })}
                />
              </div>
              <div>
                <Label>Tanggal Selesai Proyek</Label>
                <Input
                  type="date"
                  value={tlForm.tanggal_selesai}
                  min={tlForm.tanggal_mulai || undefined}
                  onChange={(e) => setTlForm({ ...tlForm, tanggal_selesai: e.target.value })}
                />
              </div>
            </div>
            {!editTl && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                6 pekerjaan default: Layout Eksisting, Fasad 3D, 3D Interior, RAB, Presentasi RAB, Shop Drawing
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setTlDialog(false)}>
                Batal
              </Button>
              <Button
                onClick={handleTlSubmit}
                disabled={!tlForm.jenis_desain || tlPending}
              >
                {tlPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Create/Edit Item ──────────────────────────────────────────── */}
      <Dialog
        open={itemDialog}
        onOpenChange={(open) => {
          setItemDialog(open);
          if (!open) setSelectedFile(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Edit Pekerjaan" : "Tambah Pekerjaan"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            {/* Date range constraint banner */}
            {(tlDateMin || tlDateMax) && (
              <div className="text-xs text-purple-700 bg-purple-50 rounded px-3 py-2 flex items-center gap-2">
                <CalendarRange className="h-3.5 w-3.5 flex-shrink-0" />
                Tanggal dibatasi rentang proyek:{" "}
                <b>
                  {tlDateMin ? new Date(tlDateMin).toLocaleDateString("id-ID") : "?"} –{" "}
                  {tlDateMax ? new Date(tlDateMax).toLocaleDateString("id-ID") : "?"}
                </b>
              </div>
            )}
            <div>
              <Label>Nama Pekerjaan *</Label>
              <Input
                placeholder="e.g. Pembuatan Layout Eksisting"
                value={itemForm.item_pekerjaan}
                onChange={(e) =>
                  setItemForm({ ...itemForm, item_pekerjaan: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={itemForm.tanggal_mulai}
                  min={tlDateMin}
                  max={tlDateMax}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, tanggal_mulai: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Tanggal Selesai</Label>
                <Input
                  type="date"
                  value={itemForm.target_selesai}
                  min={tlDateMin}
                  max={tlDateMax}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, target_selesai: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>PIC (Penanggung Jawab)</Label>
              <Select
                value={itemForm.pic || "__none__"}
                onValueChange={(v) => setItemForm({ ...itemForm, pic: v === "__none__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih PIC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Belum ditentukan —</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={itemForm.status}
                onValueChange={(v) => setItemForm({ ...itemForm, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── File Bukti (wajib saat status Selesai) ───────────────────── */}
            {itemForm.status === "Selesai" && editItem && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
                <Label className="text-green-800 flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4" />
                  File Bukti Penyelesaian{" "}
                  {!editItem.file_bukti && <span className="text-red-500">*</span>}
                </Label>

                {/* Existing file */}
                {editItem.file_bukti && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <FileCheck className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">File sudah ada</span>
                    <a
                      href={`http://localhost:8000${editItem.file_bukti}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 text-xs text-green-600 hover:underline flex-shrink-0"
                    >
                      Lihat <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* File input */}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-green-300 bg-white text-sm text-green-700 group-hover:border-green-400 transition-colors w-full">
                    <Upload className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {selectedFile
                        ? selectedFile.name
                        : editItem.file_bukti
                        ? "Ganti file..."
                        : "Pilih file..."}
                    </span>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.zip,.rar"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <p className="text-xs text-green-600/80">
                  {editItem.file_bukti
                    ? "Upload file baru untuk mengganti yang lama."
                    : "Wajib upload file bukti untuk menandai sebagai Selesai."}
                  {" "}Maks. 20 MB (PDF, gambar, Word, Excel, ZIP)
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setItemDialog(false)}>
                Batal
              </Button>
              <Button
                onClick={handleItemSubmit}
                disabled={
                  !itemForm.item_pekerjaan ||
                  itemPending ||
                  (itemForm.status === "Selesai" && editItem !== null && !editItem.file_bukti && !selectedFile)
                }
              >
                {itemPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Delete Timeline ───────────────────────────────────────────── */}
      <Dialog
        open={!!confirmDeleteTl}
        onOpenChange={() => setConfirmDeleteTl(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Timeline?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Semua pekerjaan dalam timeline ini juga akan dihapus. Tindakan ini
            tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfirmDeleteTl(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={deleteTl.isPending}
              onClick={() =>
                confirmDeleteTl && deleteTl.mutate(confirmDeleteTl)
              }
            >
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Summary PDF Dialog ────────────────────────────────────────────────── */}
      <Dialog open={summaryDialog} onOpenChange={setSummaryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="h-4 w-4 text-violet-600" />
              Summary PDF — Filter Desain
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <Label>Jenis Desain</Label>
              <Select value={pdfJenis} onValueChange={setPdfJenis}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Jenis</SelectItem>
                  {JENIS_DESAIN_OPTIONS.map((j) => (
                    <SelectItem key={j} value={j}>{j}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bulan</Label>
                <Select value={pdfBulan} onValueChange={setPdfBulan}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Bulan</SelectItem>
                    {BULAN_OPTIONS.map((b) => (
                      <SelectItem key={b.val} value={String(b.val)}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tahun</Label>
                <Input
                  type="number"
                  placeholder="Semua tahun"
                  value={pdfTahun}
                  onChange={(e) => setPdfTahun(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tanggal Mulai (dari)</Label>
                <Input
                  type="date"
                  value={pdfTglFrom}
                  max={pdfTglTo || undefined}
                  onChange={(e) => setPdfTglFrom(e.target.value)}
                />
              </div>
              <div>
                <Label>Tanggal Selesai (sampai)</Label>
                <Input
                  type="date"
                  value={pdfTglTo}
                  min={pdfTglFrom || undefined}
                  onChange={(e) => setPdfTglTo(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2">
              Kosongkan filter untuk memasukkan semua timeline. PDF akan dicetak dalam format landscape A4.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setSummaryDialog(false)}>Batal</Button>
              <Button
                onClick={handleSummaryPDF}
                disabled={summaryGenerating}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {summaryGenerating
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Generating...</>
                  : <><FileDown className="h-4 w-4 mr-1.5" />Download PDF</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Delete Item ───────────────────────────────────────────────── */}
      <Dialog
        open={!!confirmDeleteItem}
        onOpenChange={() => setConfirmDeleteItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Pekerjaan?</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteItem(null)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={deleteItem.isPending}
              onClick={() =>
                confirmDeleteItem && deleteItem.mutate(confirmDeleteItem)
              }
            >
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm delete link dialog */}
      <AlertDialog open={!!confirmDeleteLinkId} onOpenChange={(v) => { if (!v) setConfirmDeleteLinkId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Link?</AlertDialogTitle>
            <AlertDialogDescription>Link ini akan dihapus permanen dan tidak bisa dikembalikan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => { if (confirmDeleteLinkId) deleteLinkMut.mutate(confirmDeleteLinkId); setConfirmDeleteLinkId(null); }}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
