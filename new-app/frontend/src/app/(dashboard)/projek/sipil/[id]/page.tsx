"use client";
import { getLogoBase64 } from "@/lib/get-logo";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import { RappSipilView } from "@/components/rapp-sipil";
import { differenceInDays, format, eachMonthOfInterval, startOfMonth, addDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { sipilApi } from "@/lib/api/content";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Pencil, Trash2, Building2, ChevronLeft, ChevronDown, ChevronRight,
  BarChart2, List, CalendarRange, Layers, FileDown, Loader2, ClipboardList,
  Link2, ExternalLink, X, Upload, FileText, PackageSearch, Boxes, Camera, ImageIcon,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────────
type Task = {
  id: string;
  nama_pekerjaan: string | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  status: string | null;
  pic: { id: string; nama: string } | null;
};

type Termin = {
  id: string;
  urutan: number;
  nama: string | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  progress: number;
  jumlah_task: number;
  tasks_selesai: number;
  tasks: Task[];
};

type ProjekDetail = {
  id: string;
  nama_proyek: string | null;
  lead: { id: string; nama: string } | null;
  lokasi: string | null;
  nilai_rab: number;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  progress: number;
  jumlah_termin: number;
  jumlah_task: number;
  tasks_selesai: number;
  dibuat_oleh: { id: string; nama: string } | null;
  termins: Termin[];
};

// ── Constants ───────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = ["Belum Mulai", "Proses", "Selesai"];
const STATUS_STYLE: Record<string, string> = {
  "Belum Mulai": "bg-gray-100 text-gray-700 border-gray-200",
  Proses: "bg-blue-100 text-blue-700 border-blue-200",
  Selesai: "bg-green-100 text-green-700 border-green-200",
};
const GANTT_BAR_COLOR: Record<string, string> = {
  "Belum Mulai": "bg-gray-400",
  Proses: "bg-teal-500",
  Selesai: "bg-green-500",
};

const EMPTY_TERMIN = { nama: "", tanggal_mulai: "", tanggal_selesai: "" };
const EMPTY_TASK = { nama_pekerjaan: "", tanggal_mulai: "", tanggal_selesai: "", status: "Belum Mulai", pic: "" };

// ── Gantt Chart ─────────────────────────────────────────────────────────────────
function GanttChart({ termins, filterTerminId, onEditTask, onFotoTask }: {
  termins: Termin[];
  filterTerminId: string;
  onEditTask: (task: Task, termin: Termin) => void;
  onFotoTask?: (task: Task, termin: Termin) => void;
}) {
  const filtered = filterTerminId === "all" ? termins : termins.filter((t) => t.id === filterTerminId);
  const allTasks = filtered.flatMap((t) => t.tasks.map((tk) => ({ ...tk, _terminId: t.id, _terminNama: t.nama })));
  const withDates = allTasks.filter((tk) => tk.tanggal_mulai || tk.tanggal_selesai);

  if (withDates.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Belum ada tanggal. Isi Tanggal Mulai & Tanggal Selesai pada pekerjaan untuk melihat Gantt chart.
      </div>
    );
  }

  const allTs: number[] = [];
  for (const tk of withDates) {
    if (tk.tanggal_mulai) allTs.push(new Date(tk.tanggal_mulai).getTime());
    if (tk.tanggal_selesai) allTs.push(new Date(tk.tanggal_selesai).getTime());
  }
  for (const t of filtered) {
    if (t.tanggal_mulai) allTs.push(new Date(t.tanggal_mulai).getTime());
    if (t.tanggal_selesai) allTs.push(new Date(t.tanggal_selesai).getTime());
  }

  const minDate = new Date(Math.min(...allTs));
  const maxDate = new Date(Math.max(...allTs));
  const totalDays = Math.max(differenceInDays(maxDate, minDate) + 1, 1);

  const months = eachMonthOfInterval({ start: minDate, end: maxDate });
  const monthMarkers = months.map((m) => ({
    label: format(startOfMonth(m), "MMM yyyy", { locale: idLocale }),
    left: (Math.max(differenceInDays(startOfMonth(m), minDate), 0) / totalDays) * 100,
  }));

  const dayMarkers: { label: string; left: number }[] = [];
  const SHOW_DAYS = [1, 5, 10, 15, 20, 25];
  let cur = new Date(minDate);
  cur.setDate(1);
  while (cur <= maxDate) {
    if (SHOW_DAYS.includes(cur.getDate()) && cur >= minDate) {
      dayMarkers.push({ label: String(cur.getDate()), left: (differenceInDays(cur, minDate) / totalDays) * 100 });
    }
    cur = addDays(cur, 1);
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[750px]">
        <div className="flex border-b border-border/60">
          <div className="w-64 flex-shrink-0 px-2 py-1 text-xs font-semibold text-muted-foreground">Pekerjaan</div>
          <div className="flex-1 relative h-6">
            {monthMarkers.map((m, i) => (
              <span key={i} className="absolute top-1 text-[11px] font-semibold text-foreground/80 select-none whitespace-nowrap" style={{ left: `${m.left}%` }}>{m.label}</span>
            ))}
          </div>
        </div>
        <div className="flex border-b border-border/60 mb-1">
          <div className="w-64 flex-shrink-0" />
          <div className="flex-1 relative h-5">
            {dayMarkers.map((d, i) => (
              <span key={i} className="absolute top-0.5 text-[10px] text-muted-foreground/60 select-none" style={{ left: `${d.left}%`, transform: "translateX(-50%)" }}>{d.label}</span>
            ))}
            {dayMarkers.map((d, i) => (
              <div key={`vl-${i}`} className="absolute top-0 bottom-0 border-l border-border/30" style={{ left: `${d.left}%` }} />
            ))}
          </div>
        </div>

        {filtered.map((termin) => (
          <div key={termin.id}>
            <div className="flex items-center bg-teal-50 border-b border-teal-100">
              <div className="w-64 flex-shrink-0 px-2 py-1.5">
                <div className="text-xs font-semibold text-teal-700 flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {termin.nama ?? `Termin ${termin.urutan}`}
                  {(termin.tanggal_mulai || termin.tanggal_selesai) && (
                    <span className="font-normal text-teal-600 ml-1">
                      ({termin.tanggal_mulai ? new Date(termin.tanggal_mulai).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "?"} – {termin.tanggal_selesai ? new Date(termin.tanggal_selesai).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "?"})
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 relative h-7">
                {termin.tanggal_mulai && termin.tanggal_selesai && (() => {
                  const s = new Date(termin.tanggal_mulai);
                  const e = new Date(termin.tanggal_selesai);
                  const leftPct = (differenceInDays(s, minDate) / totalDays) * 100;
                  const widthPct = Math.max(((differenceInDays(e, s) + 1) / totalDays) * 100, 1);
                  return <div className="absolute top-1.5 h-3 rounded-sm bg-teal-200 opacity-70" style={{ left: `${leftPct}%`, width: `${widthPct}%` }} />;
                })()}
              </div>
            </div>

            {termin.tasks.map((task) => {
              const start = task.tanggal_mulai ? new Date(task.tanggal_mulai) : null;
              const end = task.tanggal_selesai ? new Date(task.tanggal_selesai) : null;
              let leftPct = 0, widthPct = 2;
              if (start && end) {
                leftPct = (differenceInDays(start, minDate) / totalDays) * 100;
                widthPct = Math.max(((differenceInDays(end, start) + 1) / totalDays) * 100, 2);
              } else if (start) leftPct = (differenceInDays(start, minDate) / totalDays) * 100;
              else if (end) leftPct = (differenceInDays(end, minDate) / totalDays) * 100;

              const dateLabel = start || end
                ? `${start ? format(start, "dd/MM", { locale: idLocale }) : "?"} – ${end ? format(end, "dd/MM", { locale: idLocale }) : "?"}`
                : null;
              const isLate = !!end && task.status !== "Selesai" && end < new Date(new Date().toDateString());
              const barColor = isLate ? "bg-red-500" : (GANTT_BAR_COLOR[task.status ?? ""] ?? "bg-gray-300");

              return (
                <div key={task.id} className={`flex items-center py-1 border-b last:border-0 hover:bg-muted/20 ${isLate ? "bg-red-50 hover:bg-red-100/70" : ""}`}>
                  <div className="w-64 flex-shrink-0 px-2 pl-5 flex items-center gap-1">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate font-medium">{task.nama_pekerjaan ?? "—"}</div>
                      {dateLabel && <div className="text-[10px] text-muted-foreground leading-tight">{dateLabel}</div>}
                    </div>
                    {onFotoTask && (
                      <button className="text-blue-400 hover:text-blue-600 flex-shrink-0 p-0.5 rounded" title="Upload Foto" onClick={() => onFotoTask(task, termin)}>
                        <Camera className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 relative h-9">
                    {dayMarkers.map((d, i) => (
                      <div key={i} className="absolute inset-y-0 border-l border-border/20" style={{ left: `${d.left}%` }} />
                    ))}
                    {(start || end) ? (
                      <button
                        className={`absolute top-1.5 h-6 rounded flex items-center px-2 overflow-hidden ${barColor} opacity-85 hover:opacity-100 cursor-pointer transition-opacity shadow-sm`}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        onClick={() => onEditTask(task, termin)}
                      >
                        <span className="text-white text-[10px] truncate leading-none font-medium">{task.pic?.nama ?? task.nama_pekerjaan ?? ""}</span>
                      </button>
                    ) : (
                      <div className="absolute top-4 left-0 right-0 border-t border-dashed border-muted-foreground/30" />
                    )}
                  </div>
                </div>
              );
            })}
            {termin.tasks.length === 0 && (
              <div className="flex items-center py-2 border-b">
                <div className="w-64 flex-shrink-0 px-2 pl-5">
                  <span className="text-xs text-muted-foreground italic">Belum ada pekerjaan</span>
                </div>
                <div className="flex-1" />
              </div>
            )}
          </div>
        ))}

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
          <span className="text-xs text-muted-foreground ml-auto italic">Klik bar untuk edit · <Camera className="h-3 w-3 inline text-blue-400" /> untuk foto</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Detail Page ─────────────────────────────────────────────────────────────
export default function ProyekSipilDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { isSuperAdmin, hasPermission } = useAuthStore();
  const sa = isSuperAdmin();
  const canTabTermin     = sa || hasPermission("projek_sipil", "termin");
  const canTabGantt      = sa || hasPermission("projek_sipil", "gantt");
  const canTabDocs       = sa || hasPermission("projek_sipil", "docs");
  const canTabRapp       = sa || hasPermission("projek_sipil", "rapp");
  const canTabStockOpname= sa || hasPermission("projek_sipil", "stock_opname");
  const canTabDokumentasi= true;
  const defaultTab = canTabTermin ? "termin" : canTabGantt ? "gantt" : canTabDocs ? "docs" : canTabRapp ? "rapp" : canTabStockOpname ? "stock-opname" : "dokumentasi";

  const [expandedTermins, setExpandedTermins] = useState<Record<string, boolean>>({});
  const [ganttFilter, setGanttFilter] = useState("all");
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingSoPdf, setDownloadingSoPdf] = useState(false);

  // Termin dialog
  const [terminDialog, setTerminDialog] = useState(false);
  const [editTermin, setEditTermin] = useState<Termin | null>(null);
  const [terminForm, setTerminForm] = useState(EMPTY_TERMIN);
  const [confirmDeleteTermin, setConfirmDeleteTermin] = useState<string | null>(null);

  // Task dialog
  const [taskDialog, setTaskDialog] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK);
  const [taskTermin, setTaskTermin] = useState<Termin | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<string | null>(null);

  // Foto dialog
  const [fotoTask, setFotoTask] = useState<Task | null>(null);
  const [fotoFiles, setFotoFiles] = useState<File[]>([]);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const { data: detail, isLoading } = useQuery<ProjekDetail>({
    queryKey: ["sipil-detail", id],
    queryFn: () => sipilApi.getProjek(id),
    enabled: !!id,
    retry: false,
  });

  const { data: employees = [] } = useQuery<{ id: string; nama: string }[]>({
    queryKey: ["sipil-employees"],
    queryFn: () => sipilApi.listEmployees(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const addTermin = useMutation({
    mutationFn: (data: any) => sipilApi.addTermin(id, data),
    onSuccess: () => { toast.success("Termin ditambahkan"); qc.invalidateQueries({ queryKey: ["sipil-detail", id] }); qc.invalidateQueries({ queryKey: ["sipil-projeks"] }); setTerminDialog(false); setTerminForm(EMPTY_TERMIN); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const updateTermin = useMutation({
    mutationFn: ({ tid, data }: { tid: string; data: any }) => sipilApi.updateTermin(tid, data),
    onSuccess: () => { toast.success("Termin diupdate"); qc.invalidateQueries({ queryKey: ["sipil-detail", id] }); setTerminDialog(false); setEditTermin(null); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const deleteTermin = useMutation({
    mutationFn: (tid: string) => sipilApi.deleteTermin(tid),
    onSuccess: () => { toast.success("Termin dihapus"); qc.invalidateQueries({ queryKey: ["sipil-detail", id] }); qc.invalidateQueries({ queryKey: ["sipil-projeks"] }); setConfirmDeleteTermin(null); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const addTask = useMutation({
    mutationFn: ({ terminId, data }: { terminId: string; data: any }) => sipilApi.addTask(terminId, data),
    onSuccess: () => { toast.success("Pekerjaan ditambahkan"); qc.invalidateQueries({ queryKey: ["sipil-detail", id] }); qc.invalidateQueries({ queryKey: ["sipil-projeks"] }); setTaskDialog(false); setTaskForm(EMPTY_TASK); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const updateTask = useMutation({
    mutationFn: ({ tid, data }: { tid: string; data: any }) => sipilApi.updateTask(tid, data),
    onSuccess: () => { toast.success("Pekerjaan diupdate"); qc.invalidateQueries({ queryKey: ["sipil-detail", id] }); qc.invalidateQueries({ queryKey: ["sipil-projeks"] }); setTaskDialog(false); setEditTask(null); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const deleteTask = useMutation({
    mutationFn: (tid: string) => sipilApi.deleteTask(tid),
    onSuccess: () => { toast.success("Pekerjaan dihapus"); qc.invalidateQueries({ queryKey: ["sipil-detail", id] }); qc.invalidateQueries({ queryKey: ["sipil-projeks"] }); setConfirmDeleteTask(null); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  // Foto
  const { data: taskFotos = [], isLoading: loadingFotos } = useQuery<any[]>({
    queryKey: ["sipil-task-fotos", fotoTask?.id],
    queryFn: () => sipilApi.getTaskFotos(fotoTask!.id),
    enabled: !!fotoTask,
  });
  const uploadFotoMut = useMutation({
    mutationFn: ({ taskId, files }: { taskId: string; files: File[] }) => sipilApi.uploadTaskFotos(taskId, files),
    onSuccess: () => { toast.success("Foto diupload"); qc.invalidateQueries({ queryKey: ["sipil-task-fotos", fotoTask?.id] }); setFotoFiles([]); if (fotoInputRef.current) fotoInputRef.current.value = ""; },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal upload"),
  });
  const deleteFotoMut = useMutation({
    mutationFn: (fotoId: string) => sipilApi.deleteTaskFoto(fotoId),
    onSuccess: () => { toast.success("Foto dihapus"); qc.invalidateQueries({ queryKey: ["sipil-task-fotos", fotoTask?.id] }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  // Docs/Link
  const [linkForm, setLinkForm] = useState({ title: "", url: "", catatan: "" });
  const [docsMode, setDocsMode] = useState<"url" | "file">("url");
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const docFileRef = useRef<HTMLInputElement>(null);
  const { data: links = [], isLoading: linksLoading } = useQuery<any[]>({
    queryKey: ["sipil-links", id],
    queryFn: () => sipilApi.getLinks(id),
    enabled: !!id,
    retry: false,
  });
  const addLinkMut = useMutation({
    mutationFn: (data: any) => sipilApi.addLink(id, data),
    onSuccess: () => {
      toast.success("Dokumen ditambahkan");
      qc.invalidateQueries({ queryKey: ["sipil-links", id] });
      setLinkForm({ title: "", url: "", catatan: "" });
      setSelectedDocFile(null);
      if (docFileRef.current) docFileRef.current.value = "";
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });
  const deleteLinkMut = useMutation({
    mutationFn: (lid: string) => sipilApi.deleteLink(lid),
    onSuccess: () => { toast.success("Dokumen dihapus"); qc.invalidateQueries({ queryKey: ["sipil-links", id] }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  // Stock Opname
  const [soTab, setSoTab] = useState<"items" | "log">("items");
  const [soForm, setSoForm] = useState({ item_ref_type: "", item_ref_id: "", item_nama: "", item_satuan: "", qty_pakai: "", tanggal: new Date().toISOString().slice(0, 10), catatan: "" });
  const [soDialog, setSoDialog] = useState(false);

  const { data: rappSummary = [], isLoading: loadingRapp } = useQuery<any[]>({
    queryKey: ["sipil-rapp-summary", id],
    queryFn: () => sipilApi.getRappSummary(id),
    enabled: !!id,
    retry: false,
  });
  const { data: usageLogs = [], isLoading: loadingLogs } = useQuery<any[]>({
    queryKey: ["sipil-usage-logs", id],
    queryFn: () => sipilApi.getUsageLogs(id),
    enabled: !!id,
    retry: false,
  });
  const addUsageMut = useMutation({
    mutationFn: (data: any) => sipilApi.addUsageLog(id, data),
    onSuccess: () => {
      toast.success("Penggunaan dicatat");
      qc.invalidateQueries({ queryKey: ["sipil-usage-logs", id] });
      setSoDialog(false);
      setSoForm({ item_ref_type: "", item_ref_id: "", item_nama: "", item_satuan: "", qty_pakai: "", tanggal: new Date().toISOString().slice(0, 10), catatan: "" });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });
  const deleteUsageMut = useMutation({
    mutationFn: (lid: string) => sipilApi.deleteUsageLog(lid),
    onSuccess: () => { toast.success("Log dihapus"); qc.invalidateQueries({ queryKey: ["sipil-usage-logs", id] }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  // Dokumentasi PIC
  const { data: dokumentasiData, isLoading: loadingDokumentasi } = useQuery({
    queryKey: ["sipil-dokumentasi-pic", id],
    queryFn: () => sipilApi.getDokumentasiPic(id),
    enabled: !!id,
    retry: false,
  });

  function openCatatDialog(item: { id: string; nama: string; sat: string | null; type: string }) {
    setSoForm({ item_ref_type: item.type, item_ref_id: String(item.id), item_nama: item.nama, item_satuan: item.sat ?? "", qty_pakai: "", tanggal: new Date().toISOString().slice(0, 10), catatan: "" });
    setSoDialog(true);
  }

  // usage totals per item
  const usageTotals: Record<string, number> = {};
  for (const log of usageLogs) {
    const key = `${log.item_ref_type}:${log.item_ref_id}`;
    usageTotals[key] = (usageTotals[key] ?? 0) + log.qty_pakai;
  }

  function openCreateTermin() { setEditTermin(null); setTerminForm(EMPTY_TERMIN); setTerminDialog(true); }
  function openEditTermin(t: Termin) { setEditTermin(t); setTerminForm({ nama: t.nama ?? "", tanggal_mulai: t.tanggal_mulai ?? "", tanggal_selesai: t.tanggal_selesai ?? "" }); setTerminDialog(true); }
  function handleTerminSubmit() {
    const payload = { nama: terminForm.nama || null, tanggal_mulai: terminForm.tanggal_mulai || null, tanggal_selesai: terminForm.tanggal_selesai || null };
    if (editTermin) updateTermin.mutate({ tid: editTermin.id, data: payload });
    else addTermin.mutate(payload);
  }

  function openCreateTask(termin: Termin) { setEditTask(null); setTaskTermin(termin); setTaskForm(EMPTY_TASK); setTaskDialog(true); }
  function openEditTask(task: Task, termin: Termin) { setEditTask(task); setTaskTermin(termin); setTaskForm({ nama_pekerjaan: task.nama_pekerjaan ?? "", tanggal_mulai: task.tanggal_mulai ?? "", tanggal_selesai: task.tanggal_selesai ?? "", status: task.status ?? "Belum Mulai", pic: task.pic?.id ?? "" }); setTaskDialog(true); }
  function handleTaskSubmit() {
    const payload = { nama_pekerjaan: taskForm.nama_pekerjaan || null, tanggal_mulai: taskForm.tanggal_mulai || null, tanggal_selesai: taskForm.tanggal_selesai || null, status: taskForm.status, pic: taskForm.pic || null };
    if (editTask) updateTask.mutate({ tid: editTask.id, data: payload });
    else if (taskTermin) addTask.mutate({ terminId: taskTermin.id, data: payload });
  }

  function toggleTermin(tid: string) { setExpandedTermins((prev) => ({ ...prev, [tid]: !(prev[tid] !== false) })); }

  async function fetchImageBase64(url: string): Promise<string | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  }

  async function handleDownloadPDF() {
    if (!detail) return;
    setDownloadingPdf(true);
    try {
      const logoUrl = await getLogoBase64();
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      // Fetch fotos for all tasks
      const taskFotosMap: Record<string, string[]> = {};
      await Promise.all(
        detail.termins.flatMap((t) => t.tasks).map(async (task) => {
          try {
            const fotos = await sipilApi.getTaskFotos(task.id);
            if (fotos.length > 0) {
              const b64s = await Promise.all(fotos.map((f: any) => fetchImageBase64(`${apiBase}${f.file_path}`)));
              taskFotosMap[task.id] = b64s.filter(Boolean) as string[];
            }
          } catch {}
        })
      );
      const pdfData = {
        type: "sipil" as const,
        judul: detail.nama_proyek ?? "Proyek Sipil",
        docLabel: "PROYEK SIPIL",
        klien: detail.lead?.nama,
        lokasi: detail.lokasi ?? undefined,
        nilai_rab: detail.nilai_rab > 0 ? detail.nilai_rab : undefined,
        periode: (detail.tanggal_mulai || detail.tanggal_selesai)
          ? [detail.tanggal_mulai ? new Date(detail.tanggal_mulai).toLocaleDateString("id-ID") : "?", detail.tanggal_selesai ? new Date(detail.tanggal_selesai).toLocaleDateString("id-ID") : "?"].join(" – ")
          : undefined,
        progress: detail.progress,
        dibuat_oleh: detail.dibuat_oleh?.nama,
        termins: (detail.termins ?? []).map((t) => ({
          nama: t.nama ?? `Termin ${t.urutan}`,
          tanggal_mulai: t.tanggal_mulai ?? null,
          tanggal_selesai: t.tanggal_selesai ?? null,
          tasks: (t.tasks ?? []).map((tk) => ({ nama_pekerjaan: tk.nama_pekerjaan ?? "—", tanggal_mulai: tk.tanggal_mulai ?? null, tanggal_selesai: tk.tanggal_selesai ?? null, pic: tk.pic?.nama ?? "—", status: tk.status ?? "Belum Mulai", fotos: taskFotosMap[tk.id] || [] })),
        })),
        logoUrl,
      };
      const { ProyekPDF } = await import("@/components/projek-pdf");
      const blob = await pdf(<ProyekPDF data={pdfData} />).toBlob();
      saveAs(blob, `proyek-sipil-${(detail.nama_proyek ?? "proyek").replace(/\s+/g, "-").toLowerCase()}.pdf`);
    } catch { toast.error("Gagal generate PDF"); }
    finally { setDownloadingPdf(false); }
  }

  async function handleDownloadSoPDF() {
    if (!detail) return;
    setDownloadingSoPdf(true);
    try {
      const logoUrl = await getLogoBase64();
      // Build flat items per termin from rappSummary
      const terminsPdf = rappSummary.map((t: any) => ({
        id: String(t.id),
        urutan: t.urutan,
        nama: t.nama,
        items: [
          ...(t.material_kategoris ?? []).flatMap((k: any) =>
            k.items.map((i: any) => ({ id: String(i.id), nama: i.nama, vol: i.vol, sat: i.sat, type: "material", _kategori: k.nama }))
          ),
          ...(t.sipil_items ?? []).map((i: any) => ({ id: String(i.id), nama: i.nama, vol: i.vol, sat: i.sat, type: "sipil", _kategori: "Item Sipil" })),
          ...(t.vendor_kategoris ?? []).flatMap((k: any) =>
            k.items.map((i: any) => ({ id: String(i.id), nama: i.nama, vol: i.vol, sat: i.sat, type: "vendor", _kategori: k.nama }))
          ),
        ],
      }));
      // Rebuild usageTotals using string ids (PDF data)
      const totals: Record<string, number> = {};
      for (const log of usageLogs) {
        const key = `${log.item_ref_type}:${log.item_ref_id}`;
        totals[key] = (totals[key] ?? 0) + log.qty_pakai;
      }
      const tanggalCetak = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      const { SipilStockOpnamePDF } = await import("@/components/sipil-stock-opname-pdf");
      const blob = await pdf(
        <SipilStockOpnamePDF data={{
          proyekNama: detail.nama_proyek ?? "Proyek Sipil",
          lokasi: detail.lokasi ?? null,
          termins: terminsPdf,
          logs: usageLogs,
          usageTotals: totals,
          logoUrl,
          tanggalCetak,
        }} />
      ).toBlob();
      saveAs(blob, `stock-opname-${(detail.nama_proyek ?? "proyek").replace(/\s+/g, "-").toLowerCase()}.pdf`);
    } catch { toast.error("Gagal generate PDF"); }
    finally { setDownloadingSoPdf(false); }
  }

  const termins = detail?.termins ?? [];
  const projekDateMin = detail?.tanggal_mulai ?? undefined;
  const projekDateMax = detail?.tanggal_selesai ?? undefined;

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (!detail) return (
    <div className="text-center py-20 text-muted-foreground">
      <p>Proyek tidak ditemukan.</p>
      <Button variant="link" onClick={() => router.push("/projek/sipil")}>Kembali ke daftar</Button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5 flex-shrink-0" onClick={() => router.push("/projek/sipil")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Building2 className="h-5 w-5 text-teal-500 flex-shrink-0" />
            <h1 className="text-xl font-bold">{detail.nama_proyek ?? "Proyek Sipil"}</h1>
            {detail.lead && <span className="text-sm text-muted-foreground">— {detail.lead.nama}</span>}
            <Badge className={`ml-auto ${detail.progress === 100 ? "bg-green-100 text-green-700" : detail.progress > 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{detail.progress}%</Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 flex-wrap text-sm text-muted-foreground">
            {detail.lokasi && <span>📍 {detail.lokasi}</span>}
            {detail.nilai_rab > 0 && <span className="text-teal-600 font-medium">Rp {detail.nilai_rab.toLocaleString("id-ID")}</span>}
            {(detail.tanggal_mulai || detail.tanggal_selesai) && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <CalendarRange className="h-3 w-3" />
                {detail.tanggal_mulai ? new Date(detail.tanggal_mulai).toLocaleDateString("id-ID") : "?"}{" – "}
                {detail.tanggal_selesai ? new Date(detail.tanggal_selesai).toLocaleDateString("id-ID") : "?"}
              </Badge>
            )}
          </div>
          <Progress value={detail.progress} className="h-1.5 mt-2 max-w-sm" />
          <p className="text-xs text-muted-foreground mt-0.5">{detail.tasks_selesai}/{detail.jumlah_task} pekerjaan selesai</p>
        </div>
        <Button variant="outline" size="sm" disabled={downloadingPdf} onClick={handleDownloadPDF} className="flex-shrink-0">
          {downloadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <FileDown className="h-3.5 w-3.5 mr-1" />}
          PDF
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {canTabTermin      && <TabsTrigger value="termin"><List className="h-3.5 w-3.5 mr-1.5" />Daftar Termin</TabsTrigger>}
          {canTabGantt       && <TabsTrigger value="gantt"><BarChart2 className="h-3.5 w-3.5 mr-1.5" />Gantt Chart</TabsTrigger>}
          {canTabDocs        && <TabsTrigger value="docs"><Link2 className="h-3.5 w-3.5 mr-1.5" />Docs/Link</TabsTrigger>}
          {canTabRapp        && <TabsTrigger value="rapp"><ClipboardList className="h-3.5 w-3.5 mr-1.5" />RAPP</TabsTrigger>}
          {canTabStockOpname && <TabsTrigger value="stock-opname"><PackageSearch className="h-3.5 w-3.5 mr-1.5" />Stock Opname</TabsTrigger>}
          {canTabDokumentasi && <TabsTrigger value="dokumentasi"><Camera className="h-3.5 w-3.5 mr-1.5" />Dokumentasi</TabsTrigger>}
        </TabsList>

        {/* Daftar Termin */}
        <TabsContent value="termin" className="mt-4 space-y-2">
          {(detail.tanggal_mulai || detail.tanggal_selesai) && (
            <div className="px-4 py-2 bg-teal-50 border border-teal-100 rounded-md text-xs text-teal-700 flex items-center gap-2">
              <CalendarRange className="h-3.5 w-3.5 flex-shrink-0" />
              Rentang proyek: <b>{detail.tanggal_mulai ? new Date(detail.tanggal_mulai).toLocaleDateString("id-ID") : "?"} – {detail.tanggal_selesai ? new Date(detail.tanggal_selesai).toLocaleDateString("id-ID") : "?"}</b>
            </div>
          )}

          <div className="divide-y border rounded-lg overflow-hidden">
            {termins.map((termin) => {
              const isExpanded = expandedTermins[termin.id] !== false;
              return (
                <div key={termin.id}>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <button className="flex items-center gap-2 flex-1 min-w-0 text-left" onClick={() => toggleTermin(termin.id)}>
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />}
                      <Layers className="h-3.5 w-3.5 flex-shrink-0 text-teal-600" />
                      <span className="font-semibold text-sm">{termin.nama ?? `Termin ${termin.urutan}`}</span>
                      {(termin.tanggal_mulai || termin.tanggal_selesai) && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1 flex-shrink-0">
                          <CalendarRange className="h-3 w-3" />
                          {termin.tanggal_mulai ? new Date(termin.tanggal_mulai).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "?"} – {termin.tanggal_selesai ? new Date(termin.tanggal_selesai).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "?"}
                        </Badge>
                      )}
                      <Badge className={`text-xs ml-1 flex-shrink-0 ${termin.progress === 100 ? "bg-green-100 text-green-700" : termin.progress > 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{termin.progress}%</Badge>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{termin.tasks_selesai}/{termin.jumlah_task} selesai</span>
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => openCreateTask(termin)}><Plus className="h-3 w-3 mr-1" /> Pekerjaan</Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditTermin(termin)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setConfirmDeleteTermin(termin.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <>
                      {(termin.tanggal_mulai || termin.tanggal_selesai) && (
                        <div className="px-4 py-1.5 bg-teal-50/50 border-b text-xs text-teal-600 flex items-center gap-1.5">
                          <CalendarRange className="h-3 w-3 flex-shrink-0" />
                          Rentang termin: <b>{termin.tanggal_mulai ? new Date(termin.tanggal_mulai).toLocaleDateString("id-ID") : "?"} – {termin.tanggal_selesai ? new Date(termin.tanggal_selesai).toLocaleDateString("id-ID") : "?"}</b>
                        </div>
                      )}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8 pl-6">#</TableHead>
                            <TableHead>Nama Pekerjaan</TableHead>
                            <TableHead>Tgl Mulai</TableHead>
                            <TableHead>Tgl Selesai</TableHead>
                            <TableHead>PIC</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-20" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {termin.tasks.map((task, idx) => {
                            const isLateRow = !!task.tanggal_selesai && task.status !== "Selesai" && new Date(task.tanggal_selesai) < new Date(new Date().toDateString());
                            return (
                            <TableRow key={task.id} className={isLateRow ? "bg-red-50 hover:bg-red-100/70" : ""}>
                              <TableCell className="pl-6 text-muted-foreground text-sm">{idx + 1}</TableCell>
                              <TableCell className="font-medium">{task.nama_pekerjaan ?? "—"}</TableCell>
                              <TableCell className="text-sm">{task.tanggal_mulai ? new Date(task.tanggal_mulai).toLocaleDateString("id-ID") : "—"}</TableCell>
                              <TableCell className="text-sm">{task.tanggal_selesai ? new Date(task.tanggal_selesai).toLocaleDateString("id-ID") : "—"}</TableCell>
                              <TableCell className="text-sm">{task.pic?.nama ?? <span className="text-muted-foreground">—</span>}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={STATUS_STYLE[task.status ?? ""] ?? STATUS_STYLE["Belum Mulai"]}>{task.status ?? "Belum Mulai"}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" title="Foto Pekerjaan" onClick={() => setFotoTask(task)}><Camera className="h-3 w-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTask(task, termin)}><Pencil className="h-3 w-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setConfirmDeleteTask(task.id)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            );
                          })}
                          {termin.tasks.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">
                                Belum ada pekerjaan.{" "}
                                <button className="text-primary underline" onClick={() => openCreateTask(termin)}>Tambah pekerjaan</button>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </div>
              );
            })}

            {termins.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <Layers className="mx-auto h-8 w-8 opacity-20 mb-2" />
                <p className="text-sm">Belum ada termin.</p>
              </div>
            )}
          </div>

          <Button size="sm" variant="outline" onClick={openCreateTermin}><Plus className="h-3.5 w-3.5 mr-1.5" /> Tambah Termin</Button>
        </TabsContent>

        {/* Gantt Chart */}
        <TabsContent value="gantt" className="mt-4">
          {termins.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-muted-foreground">Filter Termin:</span>
              <Select value={ganttFilter} onValueChange={setGanttFilter}>
                <SelectTrigger className="h-8 text-sm w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Termin</SelectItem>
                  {termins.map((t) => <SelectItem key={t.id} value={t.id}>{t.nama ?? `Termin ${t.urutan}`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="border rounded-lg p-4">
            <GanttChart termins={termins} filterTerminId={ganttFilter} onEditTask={(task, termin) => openEditTask(task, termin)} onFotoTask={(task) => setFotoTask(task)} />
          </div>
        </TabsContent>

        {/* Docs/Link */}
        <TabsContent value="docs" className="mt-4 space-y-4">
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Tambah Dokumen</p>
              <div className="flex gap-1 text-xs">
                <button onClick={() => setDocsMode("url")} className={`px-3 py-1 rounded-md font-medium transition-colors ${docsMode === "url" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <Link2 className="h-3 w-3 inline mr-1" />URL / Link
                </button>
                <button onClick={() => setDocsMode("file")} className={`px-3 py-1 rounded-md font-medium transition-colors ${docsMode === "file" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <Upload className="h-3 w-3 inline mr-1" />Upload File
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Judul *</Label>
              <Input placeholder="e.g. RAB Final, Gambar Kerja, Foto Progres" value={linkForm.title} onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })} />
            </div>
            {docsMode === "url" ? (
              <div>
                <Label className="text-xs">URL *</Label>
                <Input placeholder="https://..." value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} />
              </div>
            ) : (
              <div>
                <Label className="text-xs">File (PDF/Image, maks 20MB)</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => docFileRef.current?.click()}
                >
                  {selectedDocFile ? (
                    <p className="text-sm font-medium text-teal-700 flex items-center justify-center gap-2">
                      <FileText className="h-4 w-4" />{selectedDocFile.name}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground"><Upload className="h-4 w-4 inline mr-1" />Klik untuk pilih file</p>
                  )}
                </div>
                <input ref={docFileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => setSelectedDocFile(e.target.files?.[0] ?? null)} />
              </div>
            )}
            <div>
              <Label className="text-xs">Catatan</Label>
              <Input placeholder="Keterangan tambahan (opsional)" value={linkForm.catatan} onChange={(e) => setLinkForm({ ...linkForm, catatan: e.target.value })} />
            </div>
            <Button
              size="sm"
              disabled={!linkForm.title || (docsMode === "url" ? !linkForm.url : !selectedDocFile) || addLinkMut.isPending}
              onClick={() => addLinkMut.mutate(docsMode === "file" ? { title: linkForm.title, catatan: linkForm.catatan, file: selectedDocFile! } : linkForm)}
            >
              {addLinkMut.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Menyimpan...</> : <><Plus className="h-3.5 w-3.5 mr-1.5" />Tambah Dokumen</>}
            </Button>
          </div>

          {linksLoading ? (
            <div className="space-y-2">{[1,2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : links.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Link2 className="mx-auto h-8 w-8 opacity-20 mb-2" />
              <p className="text-sm">Belum ada dokumen. Tambahkan link atau upload file di atas.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link: any) => {
                const isFile = link.url?.startsWith("/storage/");
                const fileUrl = isFile ? `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${link.url}` : link.url;
                return (
                  <div key={link.id} className="flex items-center gap-3 border rounded-lg px-4 py-3 bg-background">
                    {isFile ? <FileText className="h-4 w-4 text-teal-600 flex-shrink-0" /> : <Link2 className="h-4 w-4 text-teal-600 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:underline text-teal-700 flex items-center gap-1">
                        {link.title} <ExternalLink className="h-3 w-3" />
                      </a>
                      {link.catatan && <p className="text-xs text-muted-foreground mt-0.5">{link.catatan}</p>}
                      {!isFile && <p className="text-xs text-muted-foreground truncate">{link.url}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" disabled={deleteLinkMut.isPending} onClick={() => deleteLinkMut.mutate(link.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Stock Opname */}
        <TabsContent value="stock-opname" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <button onClick={() => setSoTab("items")} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${soTab === "items" ? "bg-teal-600 text-white" : "text-muted-foreground hover:text-foreground"}`}>
                <Boxes className="h-3.5 w-3.5 inline mr-1.5" />Item RAPP
              </button>
              <button onClick={() => setSoTab("log")} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${soTab === "log" ? "bg-teal-600 text-white" : "text-muted-foreground hover:text-foreground"}`}>
                <ClipboardList className="h-3.5 w-3.5 inline mr-1.5" />Riwayat Penggunaan
                {usageLogs.length > 0 && <span className="ml-1.5 bg-teal-100 text-teal-700 text-xs rounded-full px-1.5 py-0.5">{usageLogs.length}</span>}
              </button>
            </div>
            <Button variant="outline" size="sm" disabled={downloadingSoPdf} onClick={handleDownloadSoPDF}>
              {downloadingSoPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <FileDown className="h-3.5 w-3.5 mr-1" />}
              Download PDF
            </Button>
          </div>

          {soTab === "items" && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex items-center gap-2">
                <PackageSearch className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                Item dari RAPP ditampilkan sebagai referensi — jumlah RAPP tidak berkurang. Tekan <b>Catat</b> untuk mencatat penggunaan harian.
              </div>
              {loadingRapp ? (
                <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : rappSummary.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <PackageSearch className="mx-auto h-8 w-8 opacity-20 mb-2" />
                  <p className="text-sm">Belum ada item RAPP. Tambahkan item di tab RAPP terlebih dahulu.</p>
                </div>
              ) : (
                rappSummary.map((termin: any) => {
                  const allItems: any[] = [
                    ...(termin.material_kategoris ?? []).flatMap((k: any) =>
                      k.items.map((i: any) => ({ ...i, _kategori: k.nama }))
                    ),
                    ...(termin.sipil_items ?? []).map((i: any) => ({ ...i, _kategori: "Item Sipil" })),
                    ...(termin.vendor_kategoris ?? []).flatMap((k: any) =>
                      k.items.map((i: any) => ({ ...i, _kategori: k.nama }))
                    ),
                  ];
                  if (allItems.length === 0) return null;
                  return (
                    <div key={termin.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-teal-50 border-b px-4 py-2 flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5 text-teal-600" />
                        <span className="font-semibold text-sm text-teal-700">{termin.nama ?? `Termin ${termin.urutan}`}</span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Kategori</TableHead>
                            <TableHead className="text-right">Vol RAPP</TableHead>
                            <TableHead>Sat</TableHead>
                            <TableHead className="text-right">Total Dipakai</TableHead>
                            <TableHead className="w-20" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allItems.map((item: any) => {
                            const key = `${item.type}:${item.id}`;
                            const total = usageTotals[key] ?? 0;
                            const overuse = item.vol !== null && total > item.vol;
                            return (
                              <TableRow key={key}>
                                <TableCell className="font-medium text-sm">{item.nama}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{item._kategori}</TableCell>
                                <TableCell className="text-right text-sm text-muted-foreground">
                                  {item.vol !== null ? item.vol.toLocaleString("id-ID", { maximumFractionDigits: 4 }) : "—"}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{item.sat ?? "—"}</TableCell>
                                <TableCell className="text-right">
                                  <span className={`text-sm font-medium ${overuse ? "text-red-600" : total > 0 ? "text-teal-700" : "text-muted-foreground"}`}>
                                    {total > 0 ? total.toLocaleString("id-ID", { maximumFractionDigits: 4 }) : "—"}
                                  </span>
                                  {overuse && <span className="ml-1 text-xs text-red-500">(melebihi RAPP)</span>}
                                </TableCell>
                                <TableCell>
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openCatatDialog(item)}>
                                    <Plus className="h-3 w-3 mr-1" />Catat
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {soTab === "log" && (
            <div className="border rounded-lg overflow-hidden">
              {loadingLogs ? (
                <div className="p-4 space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : usageLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="mx-auto h-8 w-8 opacity-20 mb-2" />
                  <p className="text-sm">Belum ada riwayat penggunaan.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty Pakai</TableHead>
                      <TableHead>Sat</TableHead>
                      <TableHead>Catatan</TableHead>
                      <TableHead>Dicatat oleh</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {new Date(log.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{log.item_nama}</TableCell>
                        <TableCell className="text-right text-sm font-medium text-teal-700">
                          {log.qty_pakai.toLocaleString("id-ID", { maximumFractionDigits: 4 })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.item_satuan ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.catatan ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.created_by?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" disabled={deleteUsageMut.isPending} onClick={() => deleteUsageMut.mutate(log.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </TabsContent>

        {/* RAPP */}
        <TabsContent value="rapp" className="mt-4">
          <RappSipilView
            termins={termins.map((t) => ({ id: t.id, urutan: t.urutan, nama: t.nama }))}
            projekNama={detail.nama_proyek ?? null}
            projekLokasi={detail.lokasi ?? null}
          />
        </TabsContent>

        {/* Dokumentasi PIC */}
        <TabsContent value="dokumentasi" className="mt-4 space-y-6">
          {loadingDokumentasi ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !dokumentasiData?.termins?.some((t: any) => t.tasks?.some((tk: any) => tk.fotos?.length > 0)) ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Camera className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm">Belum ada dokumentasi yang diupload oleh PIC.</p>
            </div>
          ) : (
            dokumentasiData.termins.map((termin: any) => {
              const tasksWithFotos = termin.tasks.filter((tk: any) => tk.fotos?.length > 0);
              if (tasksWithFotos.length === 0) return null;
              return (
                <div key={termin.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="h-4 w-4 text-teal-600 flex-shrink-0" />
                    <h3 className="font-semibold text-sm">{termin.nama ?? `Termin ${termin.urutan}`}</h3>
                  </div>
                  <div className="space-y-4 pl-6">
                    {tasksWithFotos.map((task: any) => (
                      <div key={task.id} className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-3 text-slate-700">{task.nama_pekerjaan ?? "—"}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {task.fotos.map((foto: any) => {
                            const fotoUrl = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${foto.file_path}`;
                            return (
                              <div key={foto.id} className="space-y-1">
                                <a href={fotoUrl} target="_blank" rel="noreferrer" className="block">
                                  <img src={fotoUrl} alt="Dokumentasi" className="w-full h-28 object-cover rounded border hover:opacity-90 transition-opacity" />
                                </a>
                                {foto.keterangan && <p className="text-xs text-slate-600">{foto.keterangan}</p>}
                                {foto.kendala && (
                                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded">⚠ {foto.kendala}</p>
                                )}
                                <p className="text-[10px] text-muted-foreground">{foto.uploader ?? "—"} · {new Date(foto.created_at).toLocaleDateString("id-ID")}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Termin */}
      <Dialog open={terminDialog} onOpenChange={setTerminDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editTermin ? "Edit Termin" : "Tambah Termin"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            {(projekDateMin || projekDateMax) && (
              <div className="text-xs text-teal-700 bg-teal-50 rounded px-3 py-2 flex items-center gap-2">
                <CalendarRange className="h-3.5 w-3.5 flex-shrink-0" />
                Tanggal dibatasi rentang proyek: <b>{projekDateMin ? new Date(projekDateMin).toLocaleDateString("id-ID") : "?"} – {projekDateMax ? new Date(projekDateMax).toLocaleDateString("id-ID") : "?"}</b>
              </div>
            )}
            <div>
              <Label>Nama Termin</Label>
              <Input placeholder="e.g. Termin 1 - Pondasi" value={terminForm.nama} onChange={(e) => setTerminForm({ ...terminForm, nama: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tgl Mulai</Label>
                <Input type="date" value={terminForm.tanggal_mulai} min={projekDateMin} max={terminForm.tanggal_selesai || projekDateMax} onChange={(e) => setTerminForm({ ...terminForm, tanggal_mulai: e.target.value })} />
              </div>
              <div>
                <Label>Tgl Selesai</Label>
                <Input type="date" value={terminForm.tanggal_selesai} min={terminForm.tanggal_mulai || projekDateMin} max={projekDateMax} onChange={(e) => setTerminForm({ ...terminForm, tanggal_selesai: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setTerminDialog(false)}>Batal</Button>
              <Button onClick={handleTerminSubmit} disabled={addTermin.isPending || updateTermin.isPending}>
                {(addTermin.isPending || updateTermin.isPending) ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Task */}
      <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editTask ? "Edit Pekerjaan" : "Tambah Pekerjaan"}
              {taskTermin && <span className="font-normal text-muted-foreground text-sm ml-2">— {taskTermin.nama ?? `Termin ${taskTermin.urutan}`}</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            {(taskTermin?.tanggal_mulai || taskTermin?.tanggal_selesai) && (
              <div className="text-xs text-teal-700 bg-teal-50 rounded px-3 py-2 flex items-center gap-2">
                <CalendarRange className="h-3.5 w-3.5 flex-shrink-0" />
                Tanggal dibatasi rentang termin: <b>{taskTermin.tanggal_mulai ? new Date(taskTermin.tanggal_mulai).toLocaleDateString("id-ID") : "?"} – {taskTermin.tanggal_selesai ? new Date(taskTermin.tanggal_selesai).toLocaleDateString("id-ID") : "?"}</b>
              </div>
            )}
            <div>
              <Label>Nama Pekerjaan *</Label>
              <Input placeholder="e.g. Galian Pondasi" value={taskForm.nama_pekerjaan} onChange={(e) => setTaskForm({ ...taskForm, nama_pekerjaan: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tgl Mulai</Label>
                <Input type="date" value={taskForm.tanggal_mulai} min={taskTermin?.tanggal_mulai || undefined} max={taskTermin?.tanggal_selesai || undefined} onChange={(e) => setTaskForm({ ...taskForm, tanggal_mulai: e.target.value })} />
              </div>
              <div>
                <Label>Tgl Selesai</Label>
                <Input type="date" value={taskForm.tanggal_selesai} min={taskTermin?.tanggal_mulai || undefined} max={taskTermin?.tanggal_selesai || undefined} onChange={(e) => setTaskForm({ ...taskForm, tanggal_selesai: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>PIC</Label>
              <Select value={taskForm.pic || "__none__"} onValueChange={(v) => setTaskForm({ ...taskForm, pic: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Pilih PIC" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Belum ditentukan —</SelectItem>
                  {employees.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={taskForm.status} onValueChange={(v) => setTaskForm({ ...taskForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setTaskDialog(false)}>Batal</Button>
              <Button onClick={handleTaskSubmit} disabled={!taskForm.nama_pekerjaan || addTask.isPending || updateTask.isPending}>
                {(addTask.isPending || updateTask.isPending) ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Termin */}
      <Dialog open={!!confirmDeleteTermin} onOpenChange={() => setConfirmDeleteTermin(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Termin?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Semua pekerjaan dalam termin ini juga akan dihapus.</p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfirmDeleteTermin(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteTermin.isPending} onClick={() => confirmDeleteTermin && deleteTermin.mutate(confirmDeleteTermin)}>Hapus</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Task */}
      <Dialog open={!!confirmDeleteTask} onOpenChange={() => setConfirmDeleteTask(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Pekerjaan?</DialogTitle></DialogHeader>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfirmDeleteTask(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteTask.isPending} onClick={() => confirmDeleteTask && deleteTask.mutate(confirmDeleteTask)}>Hapus</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Foto Task */}
      <Dialog open={!!fotoTask} onOpenChange={(open) => { if (!open) { setFotoTask(null); setFotoFiles([]); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-blue-600" />
              Foto Pekerjaan — {fotoTask?.nama_pekerjaan ?? ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {/* Upload area */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Upload Foto (JPG/PNG, maks 10 foto, 20MB/file)</Label>
              <div
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => fotoInputRef.current?.click()}
              >
                <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">{fotoFiles.length > 0 ? `${fotoFiles.length} file dipilih` : "Klik untuk pilih foto"}</p>
                <input ref={fotoInputRef} type="file" className="hidden" accept="image/*" multiple onChange={(e) => setFotoFiles(Array.from(e.target.files ?? []))} />
              </div>
              {fotoFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {fotoFiles.map((f, i) => (
                    <div key={i} className="relative group">
                      <img src={URL.createObjectURL(f)} className="h-16 w-16 object-cover rounded border" alt={f.name} />
                      <button className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setFotoFiles((prev) => prev.filter((_, j) => j !== i))}><X className="h-2.5 w-2.5" /></button>
                    </div>
                  ))}
                </div>
              )}
              {fotoFiles.length > 0 && (
                <Button size="sm" className="mt-2" disabled={uploadFotoMut.isPending} onClick={() => fotoTask && uploadFotoMut.mutate({ taskId: fotoTask.id, files: fotoFiles })}>
                  {uploadFotoMut.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Mengupload...</> : <><Upload className="h-3.5 w-3.5 mr-1.5" />Upload {fotoFiles.length} Foto</>}
                </Button>
              )}
            </div>
            {/* Existing fotos */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Foto Tersimpan ({taskFotos.length})</p>
              {loadingFotos ? (
                <div className="grid grid-cols-3 gap-2">{[1,2,3].map((i) => <div key={i} className="h-24 bg-muted rounded animate-pulse" />)}</div>
              ) : taskFotos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="mx-auto h-8 w-8 opacity-20 mb-2" />
                  <p className="text-sm">Belum ada foto.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                  {taskFotos.map((foto: any) => {
                    const fotoUrl = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${foto.file_path}`;
                    return (
                    <div key={foto.id} className="relative group rounded border overflow-hidden">
                      <a href={fotoUrl} target="_blank" rel="noreferrer">
                        <img src={fotoUrl} className="w-full h-24 object-cover" alt={foto.original_name ?? "foto"} />
                      </a>
                      <div className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-0.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-[10px] truncate">{foto.original_name ?? "foto"}</span>
                        <button onClick={() => deleteFotoMut.mutate(foto.id)} className="text-red-300 hover:text-red-100 ml-1 flex-shrink-0"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end pt-1">
              <Button variant="outline" onClick={() => { setFotoTask(null); setFotoFiles([]); }}>Tutup</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Catat Penggunaan */}
      <Dialog open={soDialog} onOpenChange={setSoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle><PackageSearch className="h-4 w-4 inline mr-2" />Catat Penggunaan Harian</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="bg-muted/50 rounded-md px-3 py-2 text-sm">
              <span className="text-muted-foreground text-xs">Item:</span>
              <p className="font-medium">{soForm.item_nama}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Qty Dipakai *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0"
                  value={soForm.qty_pakai}
                  onChange={(e) => setSoForm({ ...soForm, qty_pakai: e.target.value })}
                />
              </div>
              <div>
                <Label>Satuan</Label>
                <Input
                  placeholder={soForm.item_satuan || "—"}
                  value={soForm.item_satuan}
                  onChange={(e) => setSoForm({ ...soForm, item_satuan: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Tanggal *</Label>
              <Input
                type="date"
                value={soForm.tanggal}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setSoForm({ ...soForm, tanggal: e.target.value })}
              />
            </div>
            <div>
              <Label>Catatan</Label>
              <Input placeholder="Keterangan (opsional)" value={soForm.catatan} onChange={(e) => setSoForm({ ...soForm, catatan: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setSoDialog(false)}>Batal</Button>
              <Button
                disabled={!soForm.qty_pakai || parseFloat(soForm.qty_pakai) <= 0 || addUsageMut.isPending}
                onClick={() => addUsageMut.mutate({ item_ref_type: soForm.item_ref_type, item_ref_id: soForm.item_ref_id, item_nama: soForm.item_nama, item_satuan: soForm.item_satuan || null, qty_pakai: soForm.qty_pakai, tanggal: soForm.tanggal, catatan: soForm.catatan || null })}
              >
                {addUsageMut.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Menyimpan...</> : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
