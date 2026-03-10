"use client";

import { useState, useRef, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Search, PhoneCall, Printer, FileUp, FileDown, History } from "lucide-react";
import * as XLSX from "xlsx";

interface FollowUpLeadsProps {
  /** "sales-admin" | "telemarketing" — menentukan endpoint yang dipakai */
  modul: "sales-admin" | "telemarketing";
}

interface FollowUpHistoryItem {
  id: number;
  tanggal: string;
  catatan: string | null;
  next_follow_up: string | null;
  user: { id: number; name: string } | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  "Low":    "bg-gray-100 text-gray-700",
  "Medium": "bg-yellow-100 text-yellow-700",
  "Hot":    "bg-red-100 text-red-700",
  "Client": "bg-green-100 text-green-700",
  "Batal":  "bg-slate-100 text-slate-500",
};

const JENIS_OPTIONS = ["Sipil", "Interior", "Desain"];
const STATUS_OPTIONS = ["Low", "Medium", "Hot", "Client", "Batal"];
const SUMBER_OPTIONS = ["Instagram", "TikTok", "Facebook", "Referral", "Walk-in", "Lainnya"];

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

const EMPTY = {
  nama: "", nomor_telepon: "", alamat: "", sumber_leads: "Instagram",
  jenis: "Interior", status: "Low", keterangan: "",
  rencana_survey: "Tidak", tanggal_survey: "", jam_survey: "", pic_survey: "",
};

export function FollowUpLeads({ modul }: FollowUpLeadsProps) {
  const qc = useQueryClient();
  const endpoint = `/bd/${modul === "telemarketing" ? "telemarketing" : "sales-admin"}/leads`;
  const bulkEndpoint = `/bd/${modul === "telemarketing" ? "telemarketing" : "sales-admin"}/leads/bulk`;
  const excelInputRef = useRef<HTMLInputElement>(null);

  const followUpApi = {
    list: (params?: any) => apiClient.get(endpoint, { params }).then((r) => r.data),
    create: (data: any) => apiClient.post(endpoint, data).then((r) => r.data),
    update: (id: number, data: any) => apiClient.patch(`${endpoint}/${id}`, data).then((r) => r.data),
    delete: (id: number) => apiClient.delete(`${endpoint}/${id}`).then((r) => r.data),
    addFollowUp: (id: number, data: any) =>
      apiClient.post(`${endpoint}/${id}/follow-up`, data).then((r) => r.data),
    bulkCreate: (leads: any[]) => apiClient.post(bulkEndpoint, leads).then((r) => r.data),
    followUpReport: (params?: any) =>
      apiClient.get(`/bd/${modul}/leads/follow-up-report`, { params }).then((r) => r.data),
  };

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterJenis, setFilterJenis] = useState("all");
  const [filterSurvey, setFilterSurvey] = useState("all");
  const [filterBulan, setFilterBulan] = useState("all");
  const [filterTahun, setFilterTahun] = useState("all");
  const [filterTanggalMulai, setFilterTanggalMulai] = useState("");
  const [filterTanggalSelesai, setFilterTanggalSelesai] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [inlineFollowUpForm, setInlineFollowUpForm] = useState<Record<number, { catatan: string; next_follow_up: string }>>({});
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["follow-up-leads", modul, search, filterStatus, filterJenis, filterSurvey, filterBulan, filterTahun, filterTanggalMulai, filterTanggalSelesai],
    queryFn: () =>
      followUpApi.list({
        search: search || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        jenis: filterJenis !== "all" ? filterJenis : undefined,
        rencana_survey: filterSurvey !== "all" ? filterSurvey : undefined,
        bulan: filterBulan !== "all" ? filterBulan : undefined,
        tahun: filterTahun !== "all" ? filterTahun : undefined,
        tanggal_mulai: filterTanggalMulai || undefined,
        tanggal_selesai: filterTanggalSelesai || undefined,
      }),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => followUpApi.create(d),
    onSuccess: () => {
      toast.success("Lead ditambahkan");
      qc.invalidateQueries({ queryKey: ["follow-up-leads", modul] });
      setOpen(false);
      setForm(EMPTY);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => followUpApi.update(id, data),
    onSuccess: () => {
      toast.success("Lead diupdate");
      qc.invalidateQueries({ queryKey: ["follow-up-leads", modul] });
      setOpen(false);
      setEditItem(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => followUpApi.delete(id),
    onSuccess: () => {
      toast.success("Lead dihapus");
      qc.invalidateQueries({ queryKey: ["follow-up-leads", modul] });
      setConfirmDelete(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const addFollowUpMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => followUpApi.addFollowUp(id, data),
    onSuccess: (_data, vars) => {
      toast.success("Follow up dicatat");
      qc.invalidateQueries({ queryKey: ["follow-up-leads", modul] });
      qc.invalidateQueries({ queryKey: ["follow-up-history", modul, vars.id] });
      setInlineFollowUpForm((prev) => ({ ...prev, [vars.id]: { catatan: "", next_follow_up: "" } }));
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const { data: followUpHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["follow-up-history", modul, expandedId],
    queryFn: () =>
      expandedId
        ? apiClient.get(`/bd/${modul}/leads/${detailId}/follow-up`).then((r) => r.data as FollowUpHistoryItem[])
        : Promise.resolve([]),
    enabled: !!expandedId,
  });

  const { data: picUsersData } = useQuery({
    queryKey: ["survey-pic-users"],
    queryFn: () => apiClient.get("/bd/survey-pic-users").then((r) => r.data),
  });
  const picUserList: any[] = Array.isArray(picUsersData) ? picUsersData : [];

  const bulkImportMut = useMutation({
    mutationFn: (leads: any[]) => followUpApi.bulkCreate(leads),
    onSuccess: (res: any) => {
      toast.success(`${res.inserted ?? "?"} leads berhasil diimport`);
      qc.invalidateQueries({ queryKey: ["follow-up-leads", modul] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal import"),
  });

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const leads = rows.map((r) => ({
        nama: String(r["Nama"] || r["nama"] || "").trim(),
        nomor_telepon: String(r["Nomor Telepon"] || r["nomor_telepon"] || "").trim(),
        alamat: String(r["Alamat"] || r["alamat"] || "").trim(),
        sumber_leads: String(r["Sumber"] || r["sumber_leads"] || "Lainnya").trim(),
        jenis: String(r["Jenis"] || r["jenis"] || "").trim(),
        status: String(r["Status"] || r["status"] || "Low").trim(),
        keterangan: String(r["Keterangan"] || r["keterangan"] || "").trim(),
      })).filter((l) => l.nama.length > 0);
      if (leads.length === 0) { toast.error("Tidak ada data valid ditemukan di file Excel"); return; }
      bulkImportMut.mutate(leads);
    } catch {
      toast.error("Gagal membaca file Excel");
    } finally {
      e.target.value = "";
    }
  }

  function openCreate() { setEditItem(null); setForm(EMPTY); setOpen(true); }
  function openEdit(item: any) {
    setEditItem(item);
    setForm({
      nama: item.nama, nomor_telepon: item.nomor_telepon ?? "", alamat: item.alamat ?? "",
      sumber_leads: item.sumber_leads ?? "Instagram", jenis: item.jenis ?? "Interior",
      status: item.status ?? "Low", keterangan: item.keterangan ?? "",
      rencana_survey: item.rencana_survey ?? "Tidak",
      tanggal_survey: item.tanggal_survey ?? "", jam_survey: item.jam_survey ?? "", pic_survey: item.pic_survey ?? "",
    });
    setOpen(true);
  }

  function handleSubmit() {
    const payload = { ...form, tanggal_survey: form.tanggal_survey || null, jam_survey: form.jam_survey || null, pic_survey: form.pic_survey || null };
    if (editItem) updateMut.mutate({ id: editItem.id, data: payload });
    else createMut.mutate(payload);
  }

  function handlePrintRiwayat(item: any, history: FollowUpHistoryItem[]) {
    const modulLabel = modul === "sales-admin" ? "Sales Admin" : "Telemarketing";
    const now = new Date();
    const rows = history.map((h, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${new Date(h.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
        <td>${h.catatan ? h.catatan.replace(/</g, "&lt;") : "—"}</td>
        <td>${h.next_follow_up ? new Date(h.next_follow_up).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
        <td>${h.user?.name ?? "—"}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"/><title>Riwayat Follow Up — ${item.nama}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; padding: 28px 36px; }
  .letterhead { display: flex; align-items: center; gap: 16px; margin-bottom: 10px; }
  .letterhead-logo { height: 64px; width: auto; object-fit: contain; flex-shrink: 0; }
  .company-name { font-size: 15px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.02em; }
  .company-detail { font-size: 11px; color: #475569; margin-top: 2px; line-height: 1.6; }
  .letterhead-divider { border: none; border-top: 2px solid #1e293b; margin: 10px 0 16px; }
  h1 { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 16px; font-size: 12px; }
  .info-label { color: #64748b; font-size: 11px; }
  .info-value { font-weight: 500; }
  .meta { font-size: 11px; color: #94a3b8; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; padding: 7px 8px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; }
  td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .num { text-align: center; color: #94a3b8; width: 24px; }
  .empty { text-align: center; color: #94a3b8; padding: 24px; font-style: italic; }
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
  <h1>Riwayat Follow Up Lead</h1>
  <div class="info-grid">
    <div><div class="info-label">Nama</div><div class="info-value">${item.nama}</div></div>
    <div><div class="info-label">Telepon</div><div class="info-value">${item.nomor_telepon || "—"}</div></div>
    <div><div class="info-label">Jenis</div><div class="info-value">${item.jenis || "—"}</div></div>
    <div><div class="info-label">Status</div><div class="info-value">${item.status || "—"}</div></div>
    <div><div class="info-label">Sumber</div><div class="info-value">${item.sumber_leads || "—"}</div></div>
    <div><div class="info-label">Modul</div><div class="info-value">${modulLabel}</div></div>
    ${item.keterangan ? `<div style="grid-column:1/-1"><div class="info-label">Keterangan</div><div class="info-value">${item.keterangan.replace(/</g, "&lt;")}</div></div>` : ""}
  </div>
  <div class="meta">Dicetak: ${now.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} ${now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} &nbsp;|&nbsp; Total follow up: ${history.length}</div>
  <table>
    <thead><tr>
      <th class="num">#</th>
      <th style="width:90px">Tanggal</th>
      <th>Catatan</th>
      <th style="width:90px">Next Follow Up</th>
      <th style="width:110px">Oleh</th>
    </tr></thead>
    <tbody>${rows || `<tr><td colspan="5" class="empty">Belum ada riwayat follow up</td></tr>`}</tbody>
  </table>
  <div class="footer">
    <span>PT. Rubah Rumah Inovasi Pemuda — Riwayat Follow Up</span>
    <span>Dibuat otomatis oleh sistem</span>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body></html>`;

    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { alert("Popup diblokir. Izinkan popup untuk mencetak."); return; }
    w.document.write(html);
    w.document.close();
  }

  async function handlePrintBulkPdf() {
    const modulLabel = modul === "sales-admin" ? "Sales Admin" : "Telemarketing";
    const now = new Date();
    let allLeads: any[] = [];
    try {
      allLeads = await followUpApi.followUpReport({
        search: search || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        jenis: filterJenis !== "all" ? filterJenis : undefined,
      });
    } catch {
      toast.error("Gagal memuat data laporan");
      return;
    }

    const filterParts: string[] = [];
    if (filterStatus !== "all") filterParts.push(`Status: ${filterStatus}`);
    if (filterJenis !== "all") filterParts.push(`Jenis: ${filterJenis}`);
    if (search) filterParts.push(`Pencarian: "${search}"`);
    const filterLabel = filterParts.length > 0 ? filterParts.join(" | ") : "Semua Data";

    const rows = allLeads.map((lead: any) => {
      const fus: any[] = lead.follow_ups ?? [];
      const followUpRows = fus.length === 0
        ? `<tr><td colspan="4" class="no-fu">Belum ada catatan follow up</td></tr>`
        : fus.map((f: any, fi: number) => `
          <tr class="${fi % 2 === 0 ? "fu-even" : "fu-odd"}">
            <td class="fu-num">${fi + 1}</td>
            <td class="fu-date">${new Date(f.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
            <td class="fu-note">${f.catatan ? f.catatan.replace(/</g, "&lt;") : "—"}</td>
            <td class="fu-next">${f.next_follow_up ? new Date(f.next_follow_up).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"} ${f.user?.name ? `<span class="fu-by">${f.user.name}</span>` : ""}</td>
          </tr>`).join("");

      const statusClass = { Low: "s-low", Medium: "s-med", Hot: "s-hot", Client: "s-cli", Batal: "s-bat" }[lead.status as string] ?? "s-low";
      return `
        <div class="lead-block">
          <div class="lead-header">
            <span class="lead-name">${lead.nama.replace(/</g, "&lt;")}</span>
            <span class="badge ${statusClass}">${lead.status}</span>
            <span class="lead-meta">${lead.jenis ?? ""}${lead.nomor_telepon ? " · " + lead.nomor_telepon : ""}${lead.sumber_leads ? " · " + lead.sumber_leads : ""}</span>
            <span class="fu-count">${fus.length} follow up</span>
          </div>
          ${lead.keterangan ? `<div class="lead-note">${lead.keterangan.replace(/</g, "&lt;")}</div>` : ""}
          <table class="fu-table"><thead><tr><th class="fu-num">#</th><th style="width:80px">Tanggal</th><th>Catatan</th><th style="width:120px">Next / Oleh</th></tr></thead>
          <tbody>${followUpRows}</tbody></table>
        </div>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"/><title>Laporan Follow Up — ${modulLabel}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',Arial,sans-serif; font-size:11px; color:#1a1a1a; background:#fff; padding:24px 32px; }
  .letterhead { display:flex; align-items:center; gap:16px; margin-bottom:8px; }
  .letterhead-logo { height:56px; width:auto; object-fit:contain; flex-shrink:0; }
  .company-name { font-size:14px; font-weight:700; color:#1e293b; text-transform:uppercase; letter-spacing:.02em; }
  .company-detail { font-size:10px; color:#475569; margin-top:2px; line-height:1.6; }
  hr.divider { border:none; border-top:2px solid #1e293b; margin:8px 0 14px; }
  h1 { font-size:15px; font-weight:700; color:#1e293b; margin-bottom:2px; }
  .meta { font-size:10px; color:#94a3b8; margin-bottom:14px; }
  .lead-block { margin-bottom:14px; page-break-inside:avoid; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; }
  .lead-header { background:#f8fafc; padding:6px 10px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .lead-name { font-weight:700; font-size:12px; color:#1e293b; }
  .lead-meta { font-size:10px; color:#64748b; flex:1; }
  .fu-count { font-size:10px; color:#64748b; margin-left:auto; }
  .lead-note { font-size:10px; color:#64748b; padding:4px 10px; background:#fafafa; border-bottom:1px solid #e2e8f0; font-style:italic; }
  .badge { font-size:9px; padding:1px 6px; border-radius:4px; font-weight:600; }
  .s-low { background:#f1f5f9; color:#475569; }
  .s-med { background:#fef9c3; color:#a16207; }
  .s-hot { background:#fee2e2; color:#dc2626; }
  .s-cli { background:#dcfce7; color:#16a34a; }
  .s-bat { background:#f1f5f9; color:#94a3b8; }
  .fu-table { width:100%; border-collapse:collapse; font-size:10px; }
  .fu-table th { background:#f1f5f9; padding:4px 8px; text-align:left; font-weight:600; color:#475569; border-bottom:1px solid #e2e8f0; }
  .fu-table td { padding:4px 8px; vertical-align:top; border-bottom:1px solid #f8fafc; }
  .fu-even { background:#fff; }
  .fu-odd { background:#fafafa; }
  .fu-num { text-align:center; color:#94a3b8; width:20px; }
  .fu-date { white-space:nowrap; width:80px; }
  .fu-by { display:block; color:#64748b; font-size:9px; margin-top:2px; }
  .no-fu { text-align:center; color:#94a3b8; padding:6px; font-style:italic; }
  .footer { margin-top:20px; padding-top:8px; border-top:1px solid #e2e8f0; font-size:10px; color:#94a3b8; display:flex; justify-content:space-between; }
  @media print { body { padding:14px 18px; } .lead-block { page-break-inside:avoid; } }
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
  <h1>Laporan Follow Up Leads — ${modulLabel}</h1>
  <div class="meta">Filter: ${filterLabel} &nbsp;|&nbsp; Total: ${allLeads.length} leads &nbsp;|&nbsp; Dicetak: ${now.toLocaleDateString("id-ID", { weekday:"long", year:"numeric", month:"long", day:"numeric" })} ${now.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" })}</div>
  ${rows || '<div style="text-align:center;color:#94a3b8;padding:32px">Tidak ada data</div>'}
  <div class="footer">
    <span>PT. Rubah Rumah Inovasi Pemuda — Laporan Follow Up ${modulLabel}</span>
    <span>Dibuat otomatis oleh sistem</span>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body></html>`;

    const w = window.open("", "_blank", "width=1000,height=750");
    if (!w) { alert("Popup diblokir. Izinkan popup untuk mencetak."); return; }
    w.document.write(html);
    w.document.close();
  }

  const items: any[] = Array.isArray(data) ? data : data?.items ?? [];
  const pending = createMut.isPending || updateMut.isPending;

  const hasActiveFilters =
    filterStatus !== "all" || filterJenis !== "all" || filterSurvey !== "all" ||
    filterBulan !== "all" || filterTahun !== "all" || !!filterTanggalMulai || !!filterTanggalSelesai;

  function resetFilters() {
    setFilterStatus("all"); setFilterJenis("all"); setFilterSurvey("all");
    setFilterBulan("all"); setFilterTahun("all");
    setFilterTanggalMulai(""); setFilterTanggalSelesai("");
  }

  function handlePrint() {
    const now = new Date();
    const modulLabel = modul === "sales-admin" ? "Sales Admin" : "Telemarketing";

    const filterParts: string[] = [];
    if (filterStatus !== "all") filterParts.push(`Status: ${filterStatus}`);
    if (filterJenis !== "all") filterParts.push(`Jenis: ${filterJenis}`);
    if (filterSurvey !== "all") filterParts.push(`Survey: ${filterSurvey}`);
    if (filterBulan !== "all") filterParts.push(`Bulan: ${BULAN_OPTIONS.find((b) => b.value === filterBulan)?.label ?? filterBulan}`);
    if (filterTahun !== "all") filterParts.push(`Tahun: ${filterTahun}`);
    if (filterTanggalMulai) filterParts.push(`Dari: ${filterTanggalMulai}`);
    if (filterTanggalSelesai) filterParts.push(`Sampai: ${filterTanggalSelesai}`);
    if (search) filterParts.push(`Pencarian: "${search}"`);
    const filterLabel = filterParts.length > 0 ? filterParts.join(" &nbsp;|&nbsp; ") : "Semua Data";

    const statusCounts = STATUS_OPTIONS.reduce((acc, s) => {
      acc[s] = items.filter((i: any) => i.status === s).length;
      return acc;
    }, {} as Record<string, number>);

    const badgeClass: Record<string, string> = {
      Low: "badge-low", Medium: "badge-medium", Hot: "badge-hot",
      Client: "badge-client", Batal: "badge-batal",
    };

    const rows = items
      .map(
        (item: any, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td><strong>${item.nama.replace(/</g, "&lt;")}</strong></td>
        <td>${item.nomor_telepon || "—"}</td>
        <td>${item.jenis}</td>
        <td>${item.sumber_leads}</td>
        <td><span class="${badgeClass[item.status] ?? "badge-low"}">${item.status}</span></td>
        <td>${
          item.rencana_survey === "Ya"
            ? (item.tanggal_survey
                ? new Date(item.tanggal_survey).toLocaleDateString("id-ID")
                : "Terjadwal")
            : "—"
        }</td>
        <td>${item.keterangan ? item.keterangan.replace(/</g, "&lt;") : "—"}</td>
      </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"/><title>Follow Up Leads — ${modulLabel}</title>
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
  .meta { font-size: 11px; color: #94a3b8; margin-bottom: 14px; }
  .summary { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
  .scard { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 14px; background: #f8fafc; min-width: 78px; }
  .scard-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
  .scard-value { font-size: 20px; font-weight: 700; color: #1e293b; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; padding: 7px 8px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; }
  td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .num { text-align: center; color: #94a3b8; width: 24px; }
  .badge-low { background:#f1f5f9; color:#475569; padding:1px 6px; border-radius:4px; font-size:10px; }
  .badge-medium { background:#fef9c3; color:#a16207; padding:1px 6px; border-radius:4px; font-size:10px; }
  .badge-hot { background:#fee2e2; color:#dc2626; padding:1px 6px; border-radius:4px; font-size:10px; }
  .badge-client { background:#dcfce7; color:#16a34a; padding:1px 6px; border-radius:4px; font-size:10px; }
  .badge-batal { background:#f1f5f9; color:#94a3b8; padding:1px 6px; border-radius:4px; font-size:10px; }
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
  <h1>Follow Up Leads — ${modulLabel}</h1>
  <div class="subtitle">Filter: ${filterLabel}</div>
  <div class="meta">Dicetak: ${now.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} ${now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
  <div class="summary">
    <div class="scard"><div class="scard-label">Total Leads</div><div class="scard-value">${items.length}</div></div>
    ${STATUS_OPTIONS.map((s) => `<div class="scard"><div class="scard-label">${s}</div><div class="scard-value">${statusCounts[s] || 0}</div></div>`).join("")}
    <div class="scard"><div class="scard-label">Rencana Survey</div><div class="scard-value">${items.filter((i: any) => i.rencana_survey === "Ya").length}</div></div>
  </div>
  <table>
    <thead><tr>
      <th class="num">#</th>
      <th>Nama</th>
      <th style="width:100px">Telepon</th>
      <th style="width:70px">Jenis</th>
      <th style="width:80px">Sumber</th>
      <th style="width:62px">Status</th>
      <th style="width:80px">Survey</th>
      <th>Keterangan</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:24px">Tidak ada data leads</td></tr>'}</tbody>
  </table>
  <div class="footer">
    <span>PT. Rubah Rumah Inovasi Pemuda — Follow Up Leads ${modulLabel}</span>
    <span>Dibuat otomatis oleh sistem</span>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body></html>`;

    const w = window.open("", "_blank", "width=1000,height=700");
    if (!w) { alert("Popup diblokir. Izinkan popup untuk mencetak."); return; }
    w.document.write(html);
    w.document.close();
  }

  function handleExportExcel() {
    const modulLabel = modul === "sales-admin" ? "Sales Admin" : "Telemarketing";
    const rows = items.map((item: any, i: number) => ({
      "No":              i + 1,
      "Nama":            item.nama,
      "Nomor Telepon":   item.nomor_telepon ?? "",
      "Alamat":          item.alamat ?? "",
      "Sumber Leads":    item.sumber_leads ?? "",
      "Jenis":           item.jenis ?? "",
      "Status":          item.status ?? "",
      "Rencana Survey":  item.rencana_survey ?? "",
      "Tanggal Survey":  item.tanggal_survey ? new Date(item.tanggal_survey).toLocaleDateString("id-ID") : "",
      "Jam Survey":      item.jam_survey ?? "",
      "PIC Survey":      item.pic_survey ?? "",
      "Keterangan":      item.keterangan ?? "",
      "Bulan":           item.bulan ?? "",
      "Tahun":           item.tahun ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `follow-up-leads-${modulLabel.toLowerCase().replace(" ", "-")}-ringkasan.xlsx`);
  }

  async function handleExportBulkExcel() {
    const modulLabel = modul === "sales-admin" ? "Sales Admin" : "Telemarketing";
    let allLeads: any[] = [];
    try {
      allLeads = await followUpApi.followUpReport({
        search: search || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        jenis: filterJenis !== "all" ? filterJenis : undefined,
      });
    } catch {
      toast.error("Gagal memuat data laporan");
      return;
    }

    // Sheet 1: Ringkasan leads
    const summaryRows = allLeads.map((lead: any, i: number) => ({
      "No":             i + 1,
      "Nama":           lead.nama,
      "Nomor Telepon":  lead.nomor_telepon ?? "",
      "Alamat":         lead.alamat ?? "",
      "Sumber Leads":   lead.sumber_leads ?? "",
      "Jenis":          lead.jenis ?? "",
      "Status":         lead.status ?? "",
      "Rencana Survey": lead.rencana_survey ?? "",
      "Total Follow Up": (lead.follow_ups ?? []).length,
      "Keterangan":     lead.keterangan ?? "",
    }));

    // Sheet 2: Detail follow up (flattened)
    const detailRows: any[] = [];
    allLeads.forEach((lead: any) => {
      const fus: any[] = lead.follow_ups ?? [];
      if (fus.length === 0) {
        detailRows.push({
          "Nama Lead":     lead.nama,
          "Telepon":       lead.nomor_telepon ?? "",
          "Status Lead":   lead.status ?? "",
          "No FU":         "",
          "Tanggal FU":    "",
          "Catatan":       "(belum ada follow up)",
          "Next Follow Up":"",
          "Oleh":          "",
        });
      } else {
        fus.forEach((f: any, fi: number) => {
          detailRows.push({
            "Nama Lead":     fi === 0 ? lead.nama : "",
            "Telepon":       fi === 0 ? (lead.nomor_telepon ?? "") : "",
            "Status Lead":   fi === 0 ? (lead.status ?? "") : "",
            "No FU":         fi + 1,
            "Tanggal FU":    f.tanggal ? new Date(f.tanggal).toLocaleDateString("id-ID") : "",
            "Catatan":       f.catatan ?? "",
            "Next Follow Up":f.next_follow_up ? new Date(f.next_follow_up).toLocaleDateString("id-ID") : "",
            "Oleh":          f.user?.name ?? "",
          });
        });
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Ringkasan");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), "Detail Follow Up");
    XLSX.writeFile(wb, `follow-up-leads-${modulLabel.toLowerCase().replace(" ", "-")}-lengkap.xlsx`);
  }

  function handleExportRiwayatExcel(item: any, history: FollowUpHistoryItem[]) {
    const rows = history.map((h, i) => ({
      "No":            i + 1,
      "Tanggal":       h.tanggal ? new Date(h.tanggal).toLocaleDateString("id-ID") : "",
      "Catatan":       h.catatan ?? "",
      "Next Follow Up":h.next_follow_up ? new Date(h.next_follow_up).toLocaleDateString("id-ID") : "",
      "Oleh":          h.user?.name ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Riwayat Follow Up");
    XLSX.writeFile(wb, `riwayat-followup-${item.nama.replace(/\s+/g, "-").toLowerCase()}.xlsx`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PhoneCall className="h-6 w-6 text-amber-500" /> Follow Up Leads
          </h1>
          <p className="text-muted-foreground">
            {modul === "sales-admin" ? "Sales Admin" : "Telemarketing"} — Data leads dan follow up
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={isLoading || items.length === 0}>
            <Printer className="h-4 w-4 mr-1.5" /> PDF Ringkasan
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={isLoading || items.length === 0}>
            <FileDown className="h-4 w-4 mr-1.5" /> Excel Ringkasan
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrintBulkPdf} disabled={isLoading || items.length === 0}>
            <Printer className="h-4 w-4 mr-1.5" /> PDF + Catatan
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportBulkExcel} disabled={isLoading || items.length === 0}>
            <FileDown className="h-4 w-4 mr-1.5" /> Excel + Catatan
          </Button>
          <Button variant="outline" size="sm" disabled={bulkImportMut.isPending} onClick={() => excelInputRef.current?.click()}>
            <FileUp className="h-4 w-4 mr-1.5" /> {bulkImportMut.isPending ? "Mengimport..." : "Upload Excel"}
          </Button>
          <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Tambah Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cari nama / telepon..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterJenis} onValueChange={setFilterJenis}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Jenis" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis</SelectItem>
              {JENIS_OPTIONS.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSurvey} onValueChange={setFilterSurvey}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Survey" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="Ya">Survey: Ya</SelectItem>
              <SelectItem value="Tidak">Survey: Tidak</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-muted-foreground">Tanggal:</span>
          <Input
            type="date" value={filterTanggalMulai}
            onChange={(e) => setFilterTanggalMulai(e.target.value)}
            className="w-36 text-sm h-9"
          />
          <span className="text-xs text-muted-foreground">s/d</span>
          <Input
            type="date" value={filterTanggalSelesai}
            onChange={(e) => setFilterTanggalSelesai(e.target.value)}
            className="w-36 text-sm h-9"
          />
          <Select value={filterBulan} onValueChange={setFilterBulan}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Bulan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bulan</SelectItem>
              {BULAN_OPTIONS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterTahun} onValueChange={setFilterTahun}>
            <SelectTrigger className="w-[100px]"><SelectValue placeholder="Tahun" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahun</SelectItem>
              {TAHUN_OPTIONS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="text-xs px-2 h-9" onClick={resetFilters}>
              Reset Filter
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-4" />
                <TableHead>Nama</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Follow Up Terakhir</TableHead>
                <TableHead>Survey</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                : items.map((item: any) => {
                    const isExpanded = expandedId === item.id;
                    const fuCount: number = item.follow_up_count ?? 0;
                    const lastFu: any = item.last_follow_up;
                    const inlineForm = inlineFollowUpForm[item.id] ?? { catatan: "", next_follow_up: "" };
                    return (
                      <Fragment key={item.id}>
                        <TableRow
                          className={`cursor-pointer transition-colors ${isExpanded ? "bg-amber-50/60" : "hover:bg-muted/20"}`}
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        >
                          <TableCell className="pr-0 pl-3">
                            <span className="text-muted-foreground text-xs">{isExpanded ? "▼" : "▶"}</span>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{item.nama}</div>
                            <div className="text-xs text-muted-foreground">{item.jenis} · {item.sumber_leads}</div>
                          </TableCell>
                          <TableCell className="text-sm">{item.nomor_telepon || "—"}</TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[item.status] ?? "bg-gray-100 text-gray-700"}>{item.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {fuCount > 0 ? (
                              <div>
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 mb-0.5">
                                  <History className="h-3 w-3" /> {fuCount}×
                                </span>
                                {lastFu && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {new Date(lastFu.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                                    {lastFu.catatan ? ` — ${lastFu.catatan.substring(0, 40)}${lastFu.catatan.length > 40 ? "…" : ""}` : ""}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Belum pernah</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.rencana_survey === "Ya"
                              ? <span className="text-xs text-green-600 font-medium">
                                  {item.tanggal_survey ? new Date(item.tanggal_survey).toLocaleDateString("id-ID") : "Terjadwal"}
                                </span>
                              : <span className="text-xs text-muted-foreground">—</span>
                            }
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setConfirmDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded follow-up section */}
                        {isExpanded && (
                          <TableRow key={`exp-${item.id}`} className="bg-amber-50/40 hover:bg-amber-50/40">
                            <TableCell colSpan={7} className="py-3 px-6">
                              <div className="flex gap-6">
                                {/* History */}
                                <div className="flex-1">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Riwayat Follow Up</p>
                                  {historyLoading && expandedId === item.id ? (
                                    <div className="text-xs text-muted-foreground">Memuat...</div>
                                  ) : followUpHistory && followUpHistory.length > 0 && expandedId === item.id ? (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                      {followUpHistory.map((h) => (
                                        <div key={h.id} className="bg-white border border-amber-200/60 rounded-md px-3 py-2 text-sm">
                                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-0.5">
                                            <span className="font-medium">{new Date(h.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                            <span>{h.user?.name ?? "—"}</span>
                                          </div>
                                          {h.catatan && <p className="text-sm text-foreground">{h.catatan}</p>}
                                          {h.next_follow_up && (
                                            <p className="text-xs text-amber-600 mt-0.5">
                                              Next: {new Date(h.next_follow_up).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground italic">Belum ada catatan follow up</p>
                                  )}
                                </div>

                                {/* Add follow-up form */}
                                <div className="w-72 flex-shrink-0">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Catat Follow Up</p>
                                  <div className="space-y-2">
                                    <textarea
                                      className="w-full border rounded-md px-3 py-2 text-sm min-h-[56px] resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-white"
                                      placeholder="Catatan follow up..."
                                      value={inlineForm.catatan}
                                      onChange={(e) => setInlineFollowUpForm((prev) => ({ ...prev, [item.id]: { ...inlineForm, catatan: e.target.value } }))}
                                    />
                                    <div className="flex gap-2 items-center">
                                      <Input
                                        type="date"
                                        className="h-8 text-xs flex-1 bg-white"
                                        placeholder="Next follow up"
                                        value={inlineForm.next_follow_up}
                                        onChange={(e) => setInlineFollowUpForm((prev) => ({ ...prev, [item.id]: { ...inlineForm, next_follow_up: e.target.value } }))}
                                      />
                                      <Button
                                        size="sm"
                                        className="h-8 text-xs px-3"
                                        disabled={!inlineForm.catatan || addFollowUpMut.isPending}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          addFollowUpMut.mutate({ id: item.id, data: { catatan: inlineForm.catatan, next_follow_up: inlineForm.next_follow_up || null } });
                                        }}
                                      >
                                        Simpan
                                      </Button>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs flex-1"
                                        onClick={(e) => { e.stopPropagation(); handlePrintRiwayat(item, followUpHistory ?? []); }}
                                      >
                                        <Printer className="h-3 w-3 mr-1" /> PDF Riwayat
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs flex-1"
                                        onClick={(e) => { e.stopPropagation(); handleExportRiwayatExcel(item, followUpHistory ?? []); }}
                                      >
                                        <FileDown className="h-3 w-3 mr-1" /> Excel Riwayat
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
              {!isLoading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                    <PhoneCall className="mx-auto h-10 w-10 opacity-20 mb-3" />
                    <p>Belum ada data leads</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Edit Lead" : "Tambah Lead Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nama *</Label><Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></div>
              <div><Label>No. Telepon</Label><Input value={form.nomor_telepon} onChange={(e) => setForm({ ...form, nomor_telepon: e.target.value })} /></div>
            </div>
            <div><Label>Alamat</Label><Input value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Jenis</Label>
                <Select value={form.jenis} onValueChange={(v) => setForm({ ...form, jenis: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{JENIS_OPTIONS.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sumber</Label>
                <Select value={form.sumber_leads} onValueChange={(v) => setForm({ ...form, sumber_leads: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SUMBER_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Rencana Survey?</Label>
              <Select value={form.rencana_survey} onValueChange={(v) => setForm({ ...form, rencana_survey: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Ya">Ya</SelectItem><SelectItem value="Tidak">Tidak</SelectItem></SelectContent>
              </Select>
            </div>
            {form.rencana_survey === "Ya" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tanggal Survey</Label><Input type="date" value={form.tanggal_survey} onChange={(e) => setForm({ ...form, tanggal_survey: e.target.value })} /></div>
                <div><Label>Jam Survey</Label><Input type="time" value={form.jam_survey} onChange={(e) => setForm({ ...form, jam_survey: e.target.value })} placeholder="08:00" /></div>
                <div><Label>PIC Survey</Label>
                  {picUserList.length > 0 ? (
                    <Select value={form.pic_survey} onValueChange={(v) => setForm({ ...form, pic_survey: v })}>
                      <SelectTrigger><SelectValue placeholder="— Pilih PIC —" /></SelectTrigger>
                      <SelectContent>{picUserList.map((u: any) => <SelectItem key={u.id} value={u.name}>{u.name}{u.role ? ` (${u.role})` : ""}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input value={form.pic_survey} onChange={(e) => setForm({ ...form, pic_survey: e.target.value })} />
                  )}
                </div>
              </div>
            )}
            <div>
              <Label>Keterangan</Label>
              <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button onClick={handleSubmit} disabled={!form.nama || pending}>
                {pending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Lead?</DialogTitle></DialogHeader>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteMut.isPending}
              onClick={() => confirmDelete && deleteMut.mutate(confirmDelete)}>
              {deleteMut.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
