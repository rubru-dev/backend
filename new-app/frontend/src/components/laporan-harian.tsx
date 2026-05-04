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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, ClipboardList, Bold, Italic, List, Printer, Link2, Upload, FileText, ExternalLink, X, Loader2, Download, PhoneCall, ChevronDown, ChevronRight } from "lucide-react";

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

// ── Constants & helpers ───────────────────────────────────────────────────────

const today = new Date().toISOString().split("T")[0];
const EMPTY = { tanggal_mulai: today, tanggal_selesai: today, kegiatan: "", kendala: "", user_id: "" };

const MODUL_TO_LEAD_MODUL: Record<string, string> = {
  "Sales Admin": "sales-admin",
  "Telemarketing": "telemarketing",
  "Golden": "golden",
};

const BULAN_OPTIONS = [
  { value: "1", label: "Januari" }, { value: "2", label: "Februari" },
  { value: "3", label: "Maret" }, { value: "4", label: "April" },
  { value: "5", label: "Mei" }, { value: "6", label: "Juni" },
  { value: "7", label: "Juli" }, { value: "8", label: "Agustus" },
  { value: "9", label: "September" }, { value: "10", label: "Oktober" },
  { value: "11", label: "November" }, { value: "12", label: "Desember" },
];
const _cy = new Date().getFullYear();
const TAHUN_OPTIONS = Array.from({ length: 5 }, (_, i) => String(_cy - i));

function safeFmtDate(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!d || d === "unknown") return "—";
  const clean = d.includes("T") ? d : d + "T00:00:00";
  const dt = new Date(clean);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("id-ID", opts ?? { day: "numeric", month: "long", year: "numeric" });
}

function safeFmtDateLong(d: string | null | undefined): string {
  return safeFmtDate(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// ── Main component ────────────────────────────────────────────────────────────

export function LaporanHarian({ modul, color = "text-primary" }: LaporanHarianProps) {
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const leadModul = MODUL_TO_LEAD_MODUL[modul] ?? null;

  const [activeSection, setActiveSection] = useState<"laporan" | "follow-up">("laporan");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [filterMulai, setFilterMulai] = useState("");
  const [filterSelesai, setFilterSelesai] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [expandedFuKey, setExpandedFuKey] = useState<string | null>(null);

  // Follow-up tab dedicated filters
  const [fuFilterUserId, setFuFilterUserId] = useState("");
  const [fuFilterBulan, setFuFilterBulan] = useState("all");
  const [fuFilterTahun, setFuFilterTahun] = useState("all");
  const [fuFilterMulai, setFuFilterMulai] = useState("");
  const [fuFilterSelesai, setFuFilterSelesai] = useState("");

  // Docs/Link per laporan
  const [docForm, setDocForm] = useState({ title: "", url: "", catatan: "" });
  const [docMode, setDocMode] = useState<"url" | "file">("url");
  const [docFile, setDocFile] = useState<File | null>(null);
  const docFileRef = useRef<HTMLInputElement>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["laporan-harian", modul, filterMulai, filterSelesai, filterUserId],
    queryFn: () =>
      apiClient
        .get("/laporan-harian", {
          params: {
            modul,
            tanggal_mulai: filterMulai || undefined,
            tanggal_selesai: filterSelesai || undefined,
            user_id: filterUserId || undefined,
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

  const fuBulanNum = fuFilterBulan !== "all" ? parseInt(fuFilterBulan) : undefined;
  const fuTahunNum = fuFilterTahun !== "all" ? parseInt(fuFilterTahun) : undefined;

  const { data: fuSummaryData, isLoading: fuSummaryLoading } = useQuery({
    queryKey: ["laporan-fu-summary", leadModul, fuFilterUserId, fuFilterBulan, fuFilterTahun, fuFilterMulai, fuFilterSelesai],
    queryFn: () =>
      apiClient.get("/laporan-harian/follow-up-summary", {
        params: {
          lead_modul: leadModul,
          user_id: fuFilterUserId || undefined,
          bulan: fuBulanNum,
          tahun: fuTahunNum,
          tanggal_mulai: (!fuBulanNum && fuFilterMulai) ? fuFilterMulai : undefined,
          tanggal_selesai: (!fuBulanNum && fuFilterSelesai) ? fuFilterSelesai : undefined,
        },
      }).then((r) => r.data),
    enabled: !!leadModul && activeSection === "follow-up",
    staleTime: 30_000,
  });
  const fuSummary: any[] = Array.isArray(fuSummaryData) ? fuSummaryData : [];

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
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<string | null>(null);

  async function handleDownloadFile(url: string, filename: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch {
      toast.error("Gagal mengunduh file");
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function openCreate() {
    setForm({ ...EMPTY, user_id: currentUser ? String(currentUser.id) : "" });
    setOpen(true);
  }

  function fmtDate(d: string) {
    return safeFmtDate(d, { day: "numeric", month: "short", year: "numeric" });
  }

  function fmtDateRange(mulai: string, selesai: string) {
    const m = String(mulai).split("T")[0];
    const s = String(selesai).split("T")[0];
    return m === s ? fmtDate(m) : `${fmtDate(m)} – ${fmtDate(s)}`;
  }

  const items: any[] = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);

  // ── Print / PDF ───────────────────────────────────────────────────────────────

  function generateFollowUpPDF(summary: any[]) {
    const now = new Date();
    const nowStr = now.toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" });

    const filterLabel = (() => {
      if (fuFilterBulan !== "all" && fuFilterTahun !== "all") {
        const bLabel = BULAN_OPTIONS.find(b => b.value === fuFilterBulan)?.label ?? fuFilterBulan;
        return `${bLabel} ${fuFilterTahun}`;
      }
      if (fuFilterTahun !== "all") return `Tahun ${fuFilterTahun}`;
      if (fuFilterMulai || fuFilterSelesai) return `${fuFilterMulai || "—"} s/d ${fuFilterSelesai || "—"}`;
      return "Semua Periode";
    })();
    const userLabel = fuFilterUserId ? (users.find(u => String(u.id) === fuFilterUserId)?.name ?? "—") : "Semua User";

    const totalFu = summary.reduce((s, g) => s + g.follow_ups.length, 0);

    const groupRows = summary.map((group, gi) => {
      const lapHarian = group.laporan_harian;
      const fuRows = (group.follow_ups as any[]).map((fu, i) => `
        <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"};border-bottom:1px solid #e2e8f0">
          <td style="padding:6px 10px;font-size:10px;color:#6b7280;text-align:center;width:24px">${i + 1}</td>
          <td style="padding:6px 10px;font-size:11px;font-weight:600;color:#0f172a;min-width:120px">${fu.lead_nama}</td>
          <td style="padding:6px 10px;font-size:11px;color:#475569;line-height:1.5">${fu.catatan ? fu.catatan.replace(/\n/g, "<br>") : '<span style="color:#94a3b8;font-style:italic">—</span>'}</td>
          <td style="padding:6px 10px;font-size:11px;color:#d97706;white-space:nowrap">${fu.next_follow_up ? safeFmtDate(fu.next_follow_up) : '<span style="color:#94a3b8">—</span>'}</td>
        </tr>`).join("");

      const lapHarianSection = lapHarian ? `
        <div style="margin:8px 0 4px;padding:8px 12px;background:#eff6ff;border-left:3px solid #3b82f6;border-radius:0 4px 4px 0;font-size:11px">
          <div style="font-weight:600;color:#1e40af;margin-bottom:2px">Laporan Harian:</div>
          <div style="color:#1e3a8a;line-height:1.6;white-space:pre-line">${lapHarian.kegiatan?.substring(0, 300) ?? "—"}${lapHarian.kegiatan?.length > 300 ? "..." : ""}</div>
          ${lapHarian.kendala ? `<div style="color:#dc2626;margin-top:4px;font-size:10px"><strong>Kendala:</strong> ${lapHarian.kendala}</div>` : ""}
        </div>` : "";

      return `
        <div style="margin-bottom:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
          <div style="background:#f8fafc;border-bottom:2px solid #e2e8f0;padding:10px 14px;display:flex;align-items:center;justify-content:space-between">
            <div>
              <span style="font-size:13px;font-weight:700;color:#0f172a">${safeFmtDateLong(group.tanggal)}</span>
              <span style="font-size:11px;color:#64748b;margin-left:10px">— ${group.user?.name ?? "—"}</span>
            </div>
            <span style="font-size:11px;font-weight:600;background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:999px">${group.follow_ups.length} follow-up</span>
          </div>
          <div style="padding:8px 14px">
            ${lapHarianSection}
            <table style="width:100%;border-collapse:collapse;margin-top:6px">
              <thead>
                <tr style="background:#f1f5f9;border-bottom:2px solid #e2e8f0">
                  <th style="padding:5px 10px;font-size:9px;color:#64748b;text-align:center;width:24px">#</th>
                  <th style="padding:5px 10px;font-size:9px;color:#64748b;text-align:left;min-width:120px">Nama Lead</th>
                  <th style="padding:5px 10px;font-size:9px;color:#64748b;text-align:left">Catatan Follow Up</th>
                  <th style="padding:5px 10px;font-size:9px;color:#64748b;text-align:left;white-space:nowrap">Next FU</th>
                </tr>
              </thead>
              <tbody>${fuRows}</tbody>
            </table>
          </div>
        </div>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ringkasan Follow Up — ${modul}</title>
  <style>* { box-sizing: border-box; } body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; }
  @media print { @page { size: A4 portrait; margin: 14mm 12mm; } body { padding: 0; } }</style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:3px solid #f59e0b;margin-bottom:16px">
    <div>
      <div style="display:flex;align-items:center;gap:10px">
        <img src="${window.location.origin}/images/logo.png" style="height:48px;object-fit:contain" onerror="this.style.display='none'"/>
        <div>
          <h1 style="margin:0;font-size:18px;color:#92400e;font-weight:700">Ringkasan Follow Up — ${modul}</h1>
          <p style="margin:3px 0 0;font-size:11px;color:#64748b">Periode: ${filterLabel} · Karyawan: ${userLabel}</p>
        </div>
      </div>
    </div>
    <div style="text-align:right"><p style="margin:0;font-size:10px;color:#94a3b8">Dicetak: ${nowStr}</p></div>
  </div>
  <div style="display:flex;gap:12px;margin-bottom:16px">
    <div style="flex:1;background:#fef3c7;border-radius:8px;padding:10px 14px">
      <div style="font-size:22px;font-weight:700;color:#92400e">${summary.length}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:1px">Hari Aktif</div>
    </div>
    <div style="flex:1;background:#e0f2fe;border-radius:8px;padding:10px 14px">
      <div style="font-size:22px;font-weight:700;color:#0284c7">${totalFu}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:1px">Total Follow Up</div>
    </div>
    <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:10px 14px">
      <div style="font-size:22px;font-weight:700;color:#16a34a">${summary.filter(g => g.laporan_harian).length}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:1px">Ada Laporan Harian</div>
    </div>
  </div>
  ${groupRows || '<p style="text-align:center;color:#94a3b8;padding:32px">Tidak ada data follow up</p>'}
  <div style="margin-top:16px;padding-top:8px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between">
    <span style="font-size:10px;color:#94a3b8">PT. Rubah Rumah Inovasi Pemuda — Ringkasan Follow Up ${modul}</span>
    <span style="font-size:10px;color:#94a3b8">${nowStr}</span>
  </div>
  <script>window.onload = () => { window.print(); }</script>
</body></html>`;

    const w = window.open("", "_blank", "width=960,height=700");
    if (!w) { alert("Popup diblokir. Izinkan popup untuk mencetak."); return; }
    w.document.write(html);
    w.document.close();
  }

  async function handlePrint() {
    const now = new Date();
    const fmtPeriod =
      filterMulai && filterSelesai
        ? `${safeFmtDate(filterMulai)} s/d ${safeFmtDate(filterSelesai)}`
        : filterMulai
        ? `Dari ${safeFmtDate(filterMulai)}`
        : filterSelesai
        ? `Sampai ${safeFmtDate(filterSelesai)}`
        : "Semua Periode";
    const selectedUser = filterUserId ? users.find(u => String(u.id) === filterUserId) : null;
    const userLabel = selectedUser ? selectedUser.name : "Semua Karyawan";

    // Fetch follow-up summary for the same period (if modul supports it)
    let fuLookup: Record<string, any[]> = {};
    if (leadModul) {
      try {
        const fuResp = await apiClient.get("/laporan-harian/follow-up-summary", {
          params: {
            lead_modul: leadModul,
            tanggal_mulai: filterMulai || undefined,
            tanggal_selesai: filterSelesai || undefined,
            user_id: filterUserId || undefined,
          },
        });
        const fuData: any[] = Array.isArray(fuResp.data) ? fuResp.data : [];
        for (const group of fuData) {
          const key = `${group.tanggal}_${String(group.user?.id ?? "")}`;
          fuLookup[key] = group.follow_ups ?? [];
        }
      } catch { /* ignore */ }
    }

    const rows = items.map((lap, i) => {
      const dateStr = String(lap.tanggal_mulai).split("T")[0];
      const userId = String(lap.user?.id ?? "");
      const fuKey = `${dateStr}_${userId}`;
      const lapFus: any[] = fuLookup[fuKey] ?? [];

      const fuSection = lapFus.length > 0 ? `
        <tr>
          <td colspan="5" style="padding:0 10px 10px 10px">
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 12px;margin-top:4px">
              <div style="font-size:9px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">
                Follow Up Leads (${lapFus.length}×)
              </div>
              ${lapFus.map((fu, fi) => `
                <div style="padding:4px 0;border-top:${fi > 0 ? "1px solid #fde68a" : "none"};display:flex;gap:8px;align-items:flex-start">
                  <span style="font-size:9px;color:#d97706;font-weight:700;width:16px;shrink:0">${fi + 1}.</span>
                  <div>
                    <span style="font-size:11px;font-weight:600;color:#78350f">${fu.lead_nama}</span>
                    ${fu.catatan ? `<div style="font-size:10px;color:#92400e;margin-top:1px;line-height:1.5">${fu.catatan.replace(/\n/g, " · ")}</div>` : ""}
                    ${fu.next_follow_up ? `<div style="font-size:9px;color:#d97706;margin-top:1px">Next FU: ${safeFmtDate(fu.next_follow_up)}</div>` : ""}
                  </div>
                </div>`).join("")}
            </div>
          </td>
        </tr>` : "";

      return `
      <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"}">
        <td class="num">${i + 1}</td>
        <td style="white-space:nowrap">${fmtDateRange(
          String(lap.tanggal_mulai).split("T")[0],
          String(lap.tanggal_selesai).split("T")[0]
        )}</td>
        <td>${lap.user?.name ?? "—"}</td>
        <td>${renderMarkdown(lap.kegiatan)}</td>
        <td style="color:#dc2626">${lap.kendala ? lap.kendala.replace(/</g, "&lt;") : '<span style="color:#94a3b8">—</span>'}</td>
      </tr>${fuSection}`;
    }).join("");

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
  <div class="subtitle">Karyawan: ${userLabel}</div>
  <div class="meta">Dicetak: ${now.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} ${now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
  <div class="summary">
    <div class="scard"><div class="scard-label">Total Laporan</div><div class="scard-value">${items.length}</div></div>
    <div class="scard"><div class="scard-label">Ada Kendala</div><div class="scard-value">${items.filter((l: any) => l.kendala).length}</div></div>
    <div class="scard"><div class="scard-label">Tanpa Kendala</div><div class="scard-value">${items.filter((l: any) => !l.kendala).length}</div></div>
    ${leadModul ? `<div class="scard"><div class="scard-label">Total Follow Up</div><div class="scard-value">${Object.values(fuLookup).reduce((s, arr) => s + arr.length, 0)}</div></div>` : ""}
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
          {leadModul && (
            <div className="flex gap-1 mt-2">
              <button
                onClick={() => setActiveSection("laporan")}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${activeSection === "laporan" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                <ClipboardList className="h-3.5 w-3.5 inline mr-1.5" />Laporan Harian
              </button>
              <button
                onClick={() => setActiveSection("follow-up")}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${activeSection === "follow-up" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                <PhoneCall className="h-3.5 w-3.5 inline mr-1.5" />Ringkasan Follow Up
              </button>
            </div>
          )}
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
          <Select
            value={filterUserId || "__all__"}
            onValueChange={(v) => setFilterUserId(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-44 text-sm h-9">
              <SelectValue placeholder="Semua Karyawan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Semua Karyawan</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filterUserId && (
            <Button variant="ghost" size="sm" className="text-xs px-2 h-8"
              onClick={() => setFilterUserId("")}>
              Reset User
            </Button>
          )}
          {activeSection === "laporan" && (
            <>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={isLoading || items.length === 0}>
                <Printer className="h-4 w-4 mr-1.5" /> Cetak PDF
              </Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Isi Laporan
              </Button>
            </>
          )}
          {activeSection === "follow-up" && leadModul && (
            <Button variant="outline" size="sm" onClick={() => generateFollowUpPDF(fuSummary)} disabled={fuSummaryLoading || fuSummary.length === 0}>
              <Download className="h-4 w-4 mr-1.5" /> Download PDF
            </Button>
          )}
        </div>
      </div>

      {/* Table Laporan Harian */}
      {activeSection === "laporan" && (
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
      )}

      {/* Tab Ringkasan Follow Up */}
      {activeSection === "follow-up" && leadModul && (
        <div className="space-y-3">
          {/* Dedicated filter panel */}
          <Card>
            <CardContent className="py-3 px-4">
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={fuFilterUserId || "__all__"} onValueChange={(v) => setFuFilterUserId(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="w-[150px] h-8 text-sm"><SelectValue placeholder="Semua User" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Semua User</SelectItem>
                    {users.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={fuFilterBulan} onValueChange={(v) => { setFuFilterBulan(v); setFuFilterMulai(""); setFuFilterSelesai(""); }}>
                  <SelectTrigger className="w-[120px] h-8 text-sm"><SelectValue placeholder="Bulan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Bulan</SelectItem>
                    {BULAN_OPTIONS.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={fuFilterTahun} onValueChange={(v) => { setFuFilterTahun(v); setFuFilterMulai(""); setFuFilterSelesai(""); }}>
                  <SelectTrigger className="w-[100px] h-8 text-sm"><SelectValue placeholder="Tahun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tahun</SelectItem>
                    {TAHUN_OPTIONS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground px-1">atau rentang:</span>
                <Input type="date" className="w-36 h-8 text-sm" value={fuFilterMulai}
                  onChange={(e) => { setFuFilterMulai(e.target.value); setFuFilterBulan("all"); setFuFilterTahun("all"); }} />
                <span className="text-xs text-muted-foreground">s/d</span>
                <Input type="date" className="w-36 h-8 text-sm" value={fuFilterSelesai}
                  onChange={(e) => { setFuFilterSelesai(e.target.value); setFuFilterBulan("all"); setFuFilterTahun("all"); }} />
                {(fuFilterUserId || fuFilterBulan !== "all" || fuFilterTahun !== "all" || fuFilterMulai || fuFilterSelesai) && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={() => {
                    setFuFilterUserId(""); setFuFilterBulan("all"); setFuFilterTahun("all");
                    setFuFilterMulai(""); setFuFilterSelesai("");
                  }}>Reset</Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary stats */}
          {!fuSummaryLoading && fuSummary.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                <div className="text-xl font-bold text-amber-700">{fuSummary.length}</div>
                <div className="text-[10px] text-amber-600">Hari Aktif</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-center">
                <div className="text-xl font-bold text-blue-700">{fuSummary.reduce((s: number, g: any) => s + g.follow_ups.length, 0)}</div>
                <div className="text-[10px] text-blue-600">Total Follow Up</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
                <div className="text-xl font-bold text-green-700">{fuSummary.filter((g: any) => g.laporan_harian).length}</div>
                <div className="text-[10px] text-green-600">Ada Laporan Harian</div>
              </div>
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              {fuSummaryLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : fuSummary.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <PhoneCall className="mx-auto h-10 w-10 opacity-20 mb-3" />
                  <p>Belum ada aktivitas follow up pada periode ini</p>
                  <p className="text-xs mt-1">Coba ubah filter atau tambah follow up leads terlebih dahulu</p>
                </div>
              ) : (
                <div className="divide-y">
                  {fuSummary.map((group: any) => {
                    const key = `${group.tanggal}_${group.user?.id ?? "unknown"}`;
                    const isExpanded = expandedFuKey === key;
                    const lap = group.laporan_harian;
                    return (
                      <div key={key}>
                        {/* Group header */}
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                          onClick={() => setExpandedFuKey(isExpanded ? null : key)}
                        >
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          }
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{safeFmtDateLong(group.tanggal)}</span>
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className="text-sm text-amber-700 font-medium">{group.user?.name ?? "—"}</span>
                              {lap && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-medium">Ada Laporan Harian</span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{group.follow_ups.length} lead di-follow-up</span>
                          </div>
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                            {group.follow_ups.length}×
                          </span>
                        </button>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pl-11 space-y-3">
                            {/* Laporan Harian entry */}
                            {lap && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-3">
                                <p className="text-[11px] font-semibold text-blue-700 mb-1 flex items-center gap-1">
                                  <ClipboardList className="h-3 w-3" /> Laporan Harian ({group.user?.name ?? "—"})
                                </p>
                                <div className="text-xs text-blue-900 leading-relaxed whitespace-pre-line line-clamp-4">
                                  {lap.kegiatan}
                                </div>
                                {lap.kendala && (
                                  <div className="mt-2 text-xs text-red-600 border-t border-blue-200 pt-2">
                                    <span className="font-medium">Kendala:</span> {lap.kendala}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Follow-up list */}
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                                <PhoneCall className="h-3 w-3" /> Follow Up Leads
                              </p>
                              <div className="space-y-1.5">
                                {group.follow_ups.map((fu: any, idx: number) => (
                                  <div key={fu.id} className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                    <div className="flex items-start gap-2">
                                      <span className="text-[10px] text-amber-600 font-bold mt-0.5 w-4 shrink-0">{idx + 1}.</span>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm text-amber-900">{fu.lead_nama}</div>
                                        {fu.catatan
                                          ? <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">{fu.catatan}</p>
                                          : <p className="text-xs text-muted-foreground/60 mt-0.5 italic">Tidak ada catatan</p>
                                        }
                                        {fu.next_follow_up && (
                                          <p className="text-[10px] text-orange-600 mt-1 font-medium">
                                            Next FU: {safeFmtDate(fu.next_follow_up)}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
                      const filename = doc.url?.split("/").pop() ?? doc.title;
                      return (
                        <div key={doc.id} className="flex items-center gap-3 border rounded-lg px-4 py-3 bg-background">
                          {isFile ? <FileText className="h-4 w-4 text-primary flex-shrink-0" /> : <Link2 className="h-4 w-4 text-primary flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            {isFile ? (
                              <button
                                className="font-medium text-sm hover:underline flex items-center gap-1 text-left"
                                onClick={() => handleDownloadFile(fileUrl, filename)}
                              >
                                {doc.title} <Download className="h-3 w-3" />
                              </button>
                            ) : (
                              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:underline flex items-center gap-1">
                                {doc.title} <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {doc.catatan && <p className="text-xs text-muted-foreground mt-0.5">{doc.catatan}</p>}
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" disabled={deleteDocMut.isPending} onClick={() => setConfirmDeleteDocId(doc.id)}>
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

      {/* ── Confirm delete doc ── */}
      <AlertDialog open={!!confirmDeleteDocId} onOpenChange={(v) => { if (!v) setConfirmDeleteDocId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Dokumen?</AlertDialogTitle>
            <AlertDialogDescription>Dokumen ini akan dihapus permanen dan tidak bisa dikembalikan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { if (confirmDeleteDocId) deleteDocMut.mutate(confirmDeleteDocId); setConfirmDeleteDocId(null); }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
