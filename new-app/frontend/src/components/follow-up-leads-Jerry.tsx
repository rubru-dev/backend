"use client";

import { useState, useRef } from "react";
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
import { Plus, Pencil, Trash2, Search, PhoneCall, Printer, FileUp, History, Download } from "lucide-react";
import * as XLSX from "xlsx";

interface FollowUpLeadsProps {
  /** "sales-admin" | "telemarketing" — menentukan endpoint yang dipakai */
  modul: "sales-admin" | "telemarketing";
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
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [followUpForm, setFollowUpForm] = useState({ catatan: "", next_follow_up: "" });

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
    onSuccess: () => {
      toast.success("Follow up dicatat");
      qc.invalidateQueries({ queryKey: ["follow-up-leads", modul] });
      qc.invalidateQueries({ queryKey: ["follow-up-history", modul, detailId] });
      setFollowUpForm({ catatan: "", next_follow_up: "" });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const { data: picUsersData } = useQuery({
    queryKey: ["survey-pic-users"],
    queryFn: () => apiClient.get("/bd/survey-pic-users").then((r) => r.data),
  });
  const picUserList: any[] = Array.isArray(picUsersData) ? picUsersData : [];

  // Follow-up history for selected lead
  const { data: followUpHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["follow-up-history", modul, detailId],
    queryFn: () => detailId
      ? apiClient.get(`${endpoint}/${detailId}/follow-up`).then((r) => r.data)
      : Promise.resolve([]),
    enabled: !!detailId,
  });

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

  const items: any[] = Array.isArray(data) ? data : data?.items ?? [];
  const pending = createMut.isPending || updateMut.isPending;
  const selectedItem = items.find((i) => i.id === detailId);

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

  function handlePrintLead(lead: any, history: any[]) {
    const now = new Date();
    const modulLabel = modul === "sales-admin" ? "Sales Admin" : "Telemarketing";

    const rows = history.map((fu: any, i: number) => {
      const tgl = fu.tanggal ? new Date(fu.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "—";
      const nextTgl = fu.next_follow_up ? new Date(fu.next_follow_up).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "—";
      return `
        <tr>
          <td class="num">${i + 1}</td>
          <td>${tgl}</td>
          <td>${(fu.catatan || "—").replace(/</g, "&lt;")}</td>
          <td>${nextTgl}</td>
          <td>${fu.user?.name || "—"}</td>
        </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"/><title>Riwayat Follow Up — ${lead.nama}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; padding: 28px 36px; }
  .letterhead { display: flex; align-items: center; gap: 16px; margin-bottom: 10px; }
  .letterhead-logo { height: 64px; width: auto; object-fit: contain; flex-shrink: 0; }
  .company-name { font-size: 15px; font-weight: 700; color: #1e293b; text-transform: uppercase; }
  .company-detail { font-size: 11px; color: #475569; margin-top: 2px; line-height: 1.6; }
  .letterhead-divider { border: none; border-top: 2px solid #1e293b; margin: 10px 0 16px; }
  h1 { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
  .meta { font-size: 11px; color: #94a3b8; margin-bottom: 16px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin-bottom: 16px; background: #f8fafc; border-radius: 8px; padding: 12px 16px; border: 1px solid #e2e8f0; font-size: 12px; }
  .info-label { color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  .info-value { font-weight: 600; color: #1e293b; margin-top: 1px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; padding: 7px 8px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; }
  td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .num { text-align: center; color: #94a3b8; width: 24px; }
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
  <h1>Riwayat Follow Up — ${lead.nama.replace(/</g, "&lt;")}</h1>
  <div class="meta">Modul: ${modulLabel} &nbsp;|&nbsp; Dicetak: ${now.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} ${now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
  <div class="info-grid">
    <div><div class="info-label">Telepon</div><div class="info-value">${lead.nomor_telepon || "—"}</div></div>
    <div><div class="info-label">Jenis</div><div class="info-value">${lead.jenis || "—"}</div></div>
    <div><div class="info-label">Status</div><div class="info-value">${lead.status}</div></div>
    <div><div class="info-label">Sumber</div><div class="info-value">${lead.sumber_leads || "—"}</div></div>
    ${lead.keterangan ? `<div style="grid-column:span 2"><div class="info-label">Keterangan</div><div class="info-value">${lead.keterangan.replace(/</g, "&lt;")}</div></div>` : ""}
  </div>
  <table>
    <thead><tr>
      <th class="num">#</th>
      <th style="width:110px">Tanggal</th>
      <th>Catatan</th>
      <th style="width:110px">Next Follow Up</th>
      <th style="width:100px">Oleh</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px">Belum ada riwayat follow up</td></tr>'}</tbody>
  </table>
  <div class="footer">
    <span>PT. Rubah Rumah Inovasi Pemuda — Follow Up ${modulLabel}</span>
    <span>Total: ${history.length} catatan follow up</span>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body></html>`;

    const w = window.open("", "_blank", "width=1000,height=700");
    if (!w) { alert("Popup diblokir. Izinkan popup untuk mencetak."); return; }
    w.document.write(html);
    w.document.close();
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
            <Printer className="h-4 w-4 mr-1.5" /> Cetak PDF
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
                <TableHead>Nama</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Sumber</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Survey</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                : items.map((item: any) => (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetailId(item.id)}>
                      <TableCell className="font-medium">{item.nama}</TableCell>
                      <TableCell>{item.nomor_telepon || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{item.jenis}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.sumber_leads}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[item.status] ?? "bg-gray-100 text-gray-700"}>{item.status}</Badge>
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
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirmDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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

      {/* Detail / Follow Up Dialog */}
      <Dialog open={!!detailId} onOpenChange={() => { setDetailId(null); setFollowUpForm({ catatan: "", next_follow_up: "" }); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-2">
              <DialogTitle>{selectedItem?.nama}</DialogTitle>
              {selectedItem && Array.isArray(followUpHistory) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 text-xs"
                  onClick={() => handlePrintLead(selectedItem, followUpHistory)}
                >
                  <Download className="h-3 w-3 mr-1" />
                  PDF Riwayat
                </Button>
              )}
            </div>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Telepon:</span><br />{selectedItem.nomor_telepon || "—"}</div>
                <div><span className="text-muted-foreground">Jenis:</span><br /><Badge variant="outline">{selectedItem.jenis}</Badge></div>
                <div><span className="text-muted-foreground">Status:</span><br /><Badge className={STATUS_COLORS[selectedItem.status] ?? ""}>{selectedItem.status}</Badge></div>
                <div><span className="text-muted-foreground">Sumber:</span><br />{selectedItem.sumber_leads}</div>
              </div>
              {selectedItem.keterangan && (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">{selectedItem.keterangan}</p>
              )}

              {/* Follow-up History */}
              <div className="border-t pt-3">
                <p className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Riwayat Follow Up
                  {Array.isArray(followUpHistory) && followUpHistory.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{followUpHistory.length}</Badge>
                  )}
                </p>
                {historyLoading ? (
                  <div className="space-y-2">
                    {[1,2].map((i) => <Skeleton key={i} className="h-14 w-full rounded" />)}
                  </div>
                ) : Array.isArray(followUpHistory) && followUpHistory.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {followUpHistory.map((fu: any) => (
                      <div key={fu.id} className="bg-muted/40 rounded-md px-3 py-2 text-sm border-l-2 border-amber-400">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            {fu.tanggal ? new Date(fu.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </span>
                          {fu.user && (
                            <span className="text-xs text-muted-foreground">oleh {fu.user.name}</span>
                          )}
                        </div>
                        <p className="text-sm">{fu.catatan || "—"}</p>
                        {fu.next_follow_up && (
                          <p className="text-xs text-amber-600 mt-1">
                            Next: {new Date(fu.next_follow_up).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Belum ada riwayat follow up</p>
                )}
              </div>

              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Catat Follow Up Baru</p>
                <div className="space-y-2">
                  <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Catatan follow up..." value={followUpForm.catatan}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, catatan: e.target.value })} />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Next Follow Up</Label>
                      <Input type="date" value={followUpForm.next_follow_up}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, next_follow_up: e.target.value })} />
                    </div>
                    <div className="flex items-end">
                      <Button size="sm" disabled={!followUpForm.catatan || addFollowUpMut.isPending}
                        onClick={() => detailId && addFollowUpMut.mutate({ id: detailId, data: { ...followUpForm, next_follow_up: followUpForm.next_follow_up || null } })}>
                        {addFollowUpMut.isPending ? "Menyimpan..." : "Simpan"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
