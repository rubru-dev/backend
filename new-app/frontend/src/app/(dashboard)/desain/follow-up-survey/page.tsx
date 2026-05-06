"use client";

import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { desainApi } from "@/lib/api/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Loader2, Plus, Pencil, Trash2, GripVertical, User, CalendarDays, Kanban, Printer, Filter, Copy } from "lucide-react";

interface Lead { id: string; nama: string; telepon?: string; jenis?: string; status?: string; }
interface Employee { id: string; nama: string; }
interface Card { id: string; column_id: string; catatan?: string | null; deadline?: string | null; created_at?: string | null; lead?: Lead | null; assignee?: { id: string; nama: string } | null; ro?: { id: string; nama: string } | null; urutan: number; }
interface Column { id: string; title: string; color?: string | null; urutan: number; is_permanent: boolean; cards: Card[]; }

const JENIS_COLOR: Record<string, string> = { Sipil: "bg-blue-100 text-blue-700", Desain: "bg-purple-100 text-purple-700", Interior: "bg-amber-100 text-amber-700" };
const STATUS_COLOR: Record<string, string> = { Low: "bg-slate-100 text-slate-600", Medium: "bg-yellow-100 text-yellow-700", Hot: "bg-red-100 text-red-600", Client: "bg-green-100 text-green-700" };

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

function fmtDate(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function dateInRange(cardDate: string | null | undefined, mulai: string, selesai: string, bulan: string, tahun: string): boolean {
  if (!cardDate) return false;
  const d = new Date(cardDate);
  if (bulan !== "all" || tahun !== "all") {
    const m = bulan !== "all" ? parseInt(bulan) - 1 : null;
    const y = tahun !== "all" ? parseInt(tahun) : null;
    if (y !== null && d.getFullYear() !== y) return false;
    if (m !== null && d.getMonth() !== m) return false;
    return true;
  }
  if (mulai) { const from = new Date(mulai); from.setHours(0,0,0,0); if (d < from) return false; }
  if (selesai) { const to = new Date(selesai); to.setHours(23,59,59,999); if (d > to) return false; }
  return true;
}

export default function DesainFollowUpSurveyPage() {
  const qc = useQueryClient();

  // Board data
  const { data: columns = [], isLoading } = useQuery<Column[]>({
    queryKey: ["desain-kanban"],
    queryFn: () => desainApi.getKanban(),
  });
  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["desain-kanban-leads"],
    queryFn: () => desainApi.getKanbanLeads(),
  });
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["desain-employees"],
    queryFn: () => desainApi.listEmployees(),
  });

  // Drag state
  const dragCard = useRef<{ cardId: string; fromColumnId: string } | null>(null);

  // Column dialog
  const [colDialog, setColDialog] = useState<{ open: boolean; id?: string; title: string; color: string }>({ open: false, title: "", color: "#6366f1" });

  // Card dialog
  const [cardDialog, setCardDialog] = useState<{
    open: boolean; columnId?: string; cardId?: string;
    lead_id: string; catatan: string; deadline: string; assigned_to: string; ro_id: string;
  }>({ open: false, lead_id: "", catatan: "", deadline: "", assigned_to: "", ro_id: "" });

  // Delete confirms
  const [deleteCol, setDeleteCol] = useState<string | null>(null);
  const [deleteCard, setDeleteCard] = useState<string | null>(null);

  // Filters
  const [filterTanggalMulai, setFilterTanggalMulai] = useState("");
  const [filterTanggalSelesai, setFilterTanggalSelesai] = useState("");
  const [filterBulan, setFilterBulan] = useState("all");
  const [filterTahun, setFilterTahun] = useState("all");
  const [filterRoId, setFilterRoId] = useState("all");

  const hasFilter = filterTanggalMulai || filterTanggalSelesai || filterBulan !== "all" || filterTahun !== "all" || filterRoId !== "all";
  const useDateFilter = filterTanggalMulai || filterTanggalSelesai || filterBulan !== "all" || filterTahun !== "all";

  const filteredColumns = useMemo<Column[]>(() => {
    if (!hasFilter) return columns;
    return columns.map((col) => ({
      ...col,
      cards: col.cards.filter((card) => {
        if (filterRoId !== "all" && card.ro?.id !== filterRoId) return false;
        const filterDate = (filterBulan !== "all" || filterTahun !== "all") ? card.created_at : card.deadline;
        if (useDateFilter && !dateInRange(filterDate, filterTanggalMulai, filterTanggalSelesai, filterBulan, filterTahun)) return false;
        return true;
      }),
    }));
  }, [columns, filterRoId, filterTanggalMulai, filterTanggalSelesai, filterBulan, filterTahun, hasFilter, useDateFilter]);

  function resetFilters() {
    setFilterTanggalMulai(""); setFilterTanggalSelesai("");
    setFilterBulan("all"); setFilterTahun("all"); setFilterRoId("all");
  }

  // Mutations
  const createColMut = useMutation({
    mutationFn: () => desainApi.createColumn({ title: colDialog.title, color: colDialog.color }),
    onSuccess: () => { toast.success("Kolom ditambahkan"); qc.invalidateQueries({ queryKey: ["desain-kanban"] }); setColDialog({ open: false, title: "", color: "#6366f1" }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });
  const updateColMut = useMutation({
    mutationFn: () => desainApi.updateColumn(colDialog.id!, { title: colDialog.title, color: colDialog.color }),
    onSuccess: () => { toast.success("Kolom diperbarui"); qc.invalidateQueries({ queryKey: ["desain-kanban"] }); setColDialog({ open: false, title: "", color: "#6366f1" }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });
  const deleteColMut = useMutation({
    mutationFn: (id: string) => desainApi.deleteColumn(id),
    onSuccess: () => { toast.success("Kolom dihapus"); qc.invalidateQueries({ queryKey: ["desain-kanban"] }); setDeleteCol(null); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });

  const CARD_EMPTY = { open: false, lead_id: "", catatan: "", deadline: "", assigned_to: "", ro_id: "" };
  const createCardMut = useMutation({
    mutationFn: () => desainApi.createCard(cardDialog.columnId!, {
      lead_id: cardDialog.lead_id || undefined,
      catatan: cardDialog.catatan || undefined,
      deadline: cardDialog.deadline || undefined,
      assigned_to: cardDialog.assigned_to || undefined,
      ro_id: cardDialog.ro_id || undefined,
    }),
    onSuccess: () => { toast.success("Card ditambahkan"); qc.invalidateQueries({ queryKey: ["desain-kanban"] }); setCardDialog(CARD_EMPTY); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });
  const updateCardMut = useMutation({
    mutationFn: () => desainApi.updateCard(cardDialog.cardId!, {
      lead_id: cardDialog.lead_id || null,
      catatan: cardDialog.catatan || null,
      deadline: cardDialog.deadline || null,
      assigned_to: cardDialog.assigned_to || null,
      ro_id: cardDialog.ro_id || null,
    }),
    onSuccess: () => { toast.success("Card diperbarui"); qc.invalidateQueries({ queryKey: ["desain-kanban"] }); setCardDialog(CARD_EMPTY); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });
  const deleteCardMut = useMutation({
    mutationFn: (id: string) => desainApi.deleteCard(id),
    onSuccess: () => { toast.success("Card dihapus"); qc.invalidateQueries({ queryKey: ["desain-kanban"] }); setDeleteCard(null); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });
  const moveCardMut = useMutation({
    mutationFn: ({ id, column_id }: { id: string; column_id: string }) => desainApi.updateCard(id, { column_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["desain-kanban"] }),
  });
  const carryoverMut = useMutation({
    mutationFn: () => {
      const now = new Date();
      const month = filterBulan !== "all" ? Number(filterBulan) : now.getMonth() + 1;
      const year = filterTahun !== "all" ? Number(filterTahun) : now.getFullYear();
      return desainApi.carryoverKanban({ month, year });
    },
    onSuccess: (data: any) => {
      toast.success(data?.copied > 0 ? `${data.copied} card berhasil di-carryover` : "Tidak ada card baru untuk di-carryover");
      qc.invalidateQueries({ queryKey: ["desain-kanban"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal carryover"),
  });

  function openAddCard(columnId: string) {
    setCardDialog({ open: true, columnId, lead_id: "", catatan: "", deadline: "", assigned_to: "", ro_id: "" });
  }
  function openEditCard(card: Card) {
    setCardDialog({
      open: true, cardId: card.id, columnId: card.column_id,
      lead_id: card.lead?.id ?? "",
      catatan: card.catatan ?? "",
      deadline: card.deadline ?? "",
      assigned_to: card.assignee?.id ?? "",
      ro_id: card.ro?.id ?? "",
    });
  }

  // Drag handlers
  function onDragStart(cardId: string, fromColumnId: string) {
    dragCard.current = { cardId, fromColumnId };
  }
  function onDrop(toColumnId: string) {
    if (!dragCard.current) return;
    if (dragCard.current.fromColumnId !== toColumnId) {
      moveCardMut.mutate({ id: dragCard.current.cardId, column_id: toColumnId });
    }
    dragCard.current = null;
  }

  function handlePrintPDF() {
    const now = new Date();
    const filterParts: string[] = [];
    if (filterRoId !== "all") {
      const ro = employees.find((e) => e.id === filterRoId);
      if (ro) filterParts.push(`RO: ${ro.nama}`);
    }
    if (filterBulan !== "all") filterParts.push(`Bulan: ${BULAN_OPTIONS.find((b) => b.value === filterBulan)?.label ?? filterBulan}`);
    if (filterTahun !== "all") filterParts.push(`Tahun: ${filterTahun}`);
    if (filterTanggalMulai) filterParts.push(`Dari: ${filterTanggalMulai}`);
    if (filterTanggalSelesai) filterParts.push(`Sampai: ${filterTanggalSelesai}`);
    const filterLabel = filterParts.length > 0 ? filterParts.join(" | ") : "Semua Data";

    const totalCards = filteredColumns.reduce((s, col) => s + col.cards.length, 0);

    const colBlocks = filteredColumns.map((col) => {
      if (col.cards.length === 0) return "";
      const cardRows = col.cards.map((card) => `
        <div class="card">
          <div class="card-name">${card.lead ? card.lead.nama.replace(/</g, "&lt;") : "(Tanpa lead)"}</div>
          <div class="card-meta">
            ${card.lead?.jenis ? `<span class="badge-jenis">${card.lead.jenis}</span>` : ""}
            ${card.lead?.status ? `<span class="badge-status">${card.lead.status}</span>` : ""}
          </div>
          <div class="card-detail">
            ${card.deadline ? `<span>📅 Deadline: <b>${fmtDate(card.deadline)}</b></span>` : ""}
            ${card.ro ? `<span>👤 RO: <b>${card.ro.nama}</b></span>` : ""}
            ${card.assignee ? `<span>🔧 Assignee: <b>${card.assignee.nama}</b></span>` : ""}
          </div>
          ${card.catatan ? `<div class="card-note">${card.catatan.replace(/</g, "&lt;")}</div>` : ""}
        </div>`).join("");
      return `
        <div class="column">
          <div class="col-header" style="border-left:4px solid ${col.color ?? "#94a3b8"}">
            <span class="col-title">${col.title}</span>
            <span class="col-count">${col.cards.length} card</span>
          </div>
          ${cardRows}
        </div>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"/><title>Follow Up After Survey — Desain</title>
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
  .summary { display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
  .scard { border:1px solid #e2e8f0; border-radius:6px; padding:6px 12px; background:#f8fafc; }
  .scard-label { font-size:9px; color:#64748b; text-transform:uppercase; letter-spacing:.05em; }
  .scard-value { font-size:18px; font-weight:700; color:#1e293b; }
  .columns-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; }
  .column { break-inside:avoid; }
  .col-header { display:flex; align-items:center; justify-content:space-between; padding:5px 8px; background:#f8fafc; border-radius:5px 5px 0 0; margin-bottom:4px; }
  .col-title { font-weight:700; font-size:11px; color:#1e293b; }
  .col-count { font-size:9px; color:#64748b; background:#e2e8f0; padding:1px 6px; border-radius:10px; }
  .card { border:1px solid #e2e8f0; border-radius:5px; padding:7px 9px; margin-bottom:5px; background:#fff; }
  .card-name { font-weight:600; font-size:11px; color:#1e293b; margin-bottom:3px; }
  .card-meta { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:3px; }
  .badge-jenis { font-size:9px; padding:1px 5px; border-radius:3px; background:#ede9fe; color:#6d28d9; font-weight:600; }
  .badge-status { font-size:9px; padding:1px 5px; border-radius:3px; background:#fef3c7; color:#92400e; font-weight:600; }
  .card-detail { display:flex; flex-direction:column; gap:2px; font-size:9px; color:#475569; margin-bottom:2px; }
  .card-note { font-size:9px; color:#64748b; font-style:italic; margin-top:2px; padding-top:3px; border-top:1px solid #f1f5f9; }
  .footer { margin-top:20px; padding-top:8px; border-top:1px solid #e2e8f0; font-size:10px; color:#94a3b8; display:flex; justify-content:space-between; }
  @media print { body { padding:14px 18px; } .column { break-inside:avoid; } }
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
  <h1>Laporan Follow Up After Survey — Desain</h1>
  <div class="meta">Filter: ${filterLabel} &nbsp;|&nbsp; Total: ${totalCards} card &nbsp;|&nbsp; Dicetak: ${now.toLocaleDateString("id-ID", { weekday:"long", year:"numeric", month:"long", day:"numeric" })} ${now.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" })}</div>
  <div class="summary">
    <div class="scard"><div class="scard-label">Total Kolom</div><div class="scard-value">${filteredColumns.filter(c => c.cards.length > 0).length}</div></div>
    <div class="scard"><div class="scard-label">Total Card</div><div class="scard-value">${totalCards}</div></div>
    ${filteredColumns.filter(c => c.cards.length > 0).map(c => `<div class="scard"><div class="scard-label">${c.title}</div><div class="scard-value">${c.cards.length}</div></div>`).join("")}
  </div>
  <div class="columns-grid">
    ${colBlocks || '<p style="color:#94a3b8;text-align:center;padding:32px">Tidak ada data sesuai filter</p>'}
  </div>
  <div class="footer">
    <span>PT. Rubah Rumah Inovasi Pemuda — Follow Up After Survey Desain</span>
    <span>Dibuat otomatis oleh sistem</span>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body></html>`;

    const w = window.open("", "_blank", "width=1000,height=750");
    if (!w) { alert("Popup diblokir. Izinkan popup untuk mencetak."); return; }
    w.document.write(html);
    w.document.close();
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  const totalFiltered = filteredColumns.reduce((s, col) => s + col.cards.length, 0);

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Kanban className="text-purple-500" size={24} />
            Follow Up After Survey
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Kanban follow up desain setelah survey</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handlePrintPDF} disabled={totalFiltered === 0}>
            <Printer size={14} className="mr-1" /> Download PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => carryoverMut.mutate()} disabled={carryoverMut.isPending}>
            {carryoverMut.isPending ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Copy size={14} className="mr-1" />}
            Carry over dari bulan lalu
          </Button>
          <Button size="sm" variant="outline" onClick={() => setColDialog({ open: true, title: "", color: "#6366f1" })}>
            <Plus size={14} className="mr-1" /> Tambah Kolom
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 p-3 bg-muted/30 rounded-lg border space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-muted-foreground flex-none" />
          <span className="text-xs text-muted-foreground font-medium">Filter:</span>

          <Select value={filterRoId} onValueChange={setFilterRoId}>
            <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Semua RO" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua RO</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nama}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterBulan} onValueChange={(v) => { setFilterBulan(v); setFilterTanggalMulai(""); setFilterTanggalSelesai(""); }}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Semua Bulan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bulan</SelectItem>
              {BULAN_OPTIONS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterTahun} onValueChange={(v) => { setFilterTahun(v); setFilterTanggalMulai(""); setFilterTanggalSelesai(""); }}>
            <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue placeholder="Semua Tahun" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahun</SelectItem>
              {TAHUN_OPTIONS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground">Deadline:</span>
          <Input
            type="date" value={filterTanggalMulai} className="h-8 w-36 text-xs"
            onChange={(e) => { setFilterTanggalMulai(e.target.value); setFilterBulan("all"); setFilterTahun("all"); }}
          />
          <span className="text-xs text-muted-foreground">s/d</span>
          <Input
            type="date" value={filterTanggalSelesai} className="h-8 w-36 text-xs"
            onChange={(e) => { setFilterTanggalSelesai(e.target.value); setFilterBulan("all"); setFilterTahun("all"); }}
          />

          {hasFilter && (
            <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={resetFilters}>
              Reset
            </Button>
          )}

          {hasFilter && (
            <span className="text-xs text-purple-600 font-medium ml-auto">
              {totalFiltered} card ditampilkan
            </span>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {filteredColumns.map((col) => (
          <div
            key={col.id}
            className="flex-none w-72 flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(col.id)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-none" style={{ background: col.color ?? "#94a3b8" }} />
                <span className="font-semibold text-sm">{col.title}</span>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5">{col.cards.length}</span>
              </div>
              <div className="flex gap-0.5">
                <button onClick={() => setColDialog({ open: true, id: col.id, title: col.title, color: col.color ?? "#6366f1" })} className="p-1 text-muted-foreground hover:text-foreground rounded">
                  <Pencil size={12} />
                </button>
                {!col.is_permanent && (
                  <button onClick={() => setDeleteCol(col.id)} className="p-1 text-red-400 hover:text-red-600 rounded">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 flex-1 min-h-[120px] bg-muted/30 rounded-xl p-2">
              {col.cards.map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={() => onDragStart(card.id, col.id)}
                  className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-purple-300 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <GripVertical size={14} className="text-muted-foreground mt-0.5 flex-none opacity-40 group-hover:opacity-100" />
                    <div className="flex-1 min-w-0">
                      {card.lead ? (
                        <div>
                          <p className="font-medium text-sm text-slate-800 leading-tight">{card.lead.nama}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {card.lead.jenis && <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${JENIS_COLOR[card.lead.jenis] ?? "bg-slate-100 text-slate-600"}`}>{card.lead.jenis}</span>}
                            {card.lead.status && <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[card.lead.status] ?? "bg-slate-100 text-slate-600"}`}>{card.lead.status}</span>}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Tanpa lead</p>
                      )}
                    </div>
                    <div className="flex gap-0.5 flex-none">
                      <button onClick={() => openEditCard(card)} className="p-1 text-muted-foreground hover:text-foreground rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => setDeleteCard(card.id)} className="p-1 text-red-400 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  {card.catatan && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{card.catatan}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {card.deadline && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays size={11} />
                        {fmtDate(card.deadline)}
                      </span>
                    )}
                    {card.ro && (
                      <span className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                        <User size={11} />
                        RO: {card.ro.nama}
                      </span>
                    )}
                    {card.assignee && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                        <User size={11} />
                        {card.assignee.nama}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              <button
                onClick={() => openAddCard(col.id)}
                className="w-full text-left text-xs text-muted-foreground hover:text-foreground hover:bg-white rounded-lg p-2 border border-dashed border-slate-200 hover:border-slate-400 transition-colors flex items-center gap-1"
              >
                <Plus size={12} /> Tambah card
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Column Dialog */}
      <Dialog open={colDialog.open} onOpenChange={(o) => !o && setColDialog({ open: false, title: "", color: "#6366f1" })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{colDialog.id ? "Edit Kolom" : "Tambah Kolom"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nama Kolom</Label>
              <Input value={colDialog.title} onChange={(e) => setColDialog((d) => ({ ...d, title: e.target.value }))} placeholder="cth: Proses Desain" />
            </div>
            <div className="space-y-1">
              <Label>Warna</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={colDialog.color} onChange={(e) => setColDialog((d) => ({ ...d, color: e.target.value }))} className="w-9 h-9 rounded border cursor-pointer" />
                <Input value={colDialog.color} onChange={(e) => setColDialog((d) => ({ ...d, color: e.target.value }))} className="flex-1 font-mono" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColDialog({ open: false, title: "", color: "#6366f1" })}>Batal</Button>
            <Button
              onClick={() => colDialog.id ? updateColMut.mutate() : createColMut.mutate()}
              disabled={!colDialog.title || createColMut.isPending || updateColMut.isPending}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {(createColMut.isPending || updateColMut.isPending) ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Dialog */}
      <Dialog open={cardDialog.open} onOpenChange={(o) => !o && setCardDialog(CARD_EMPTY)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{cardDialog.cardId ? "Edit Card" : "Tambah Card"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Lead (opsional)</Label>
              <Select value={cardDialog.lead_id} onValueChange={(v) => setCardDialog((d) => ({ ...d, lead_id: v === "_none" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih lead dari kalender survey..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Tanpa lead —</SelectItem>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.nama} {l.jenis ? `(${l.jenis})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>RO (Research Officer)</Label>
              <Select value={cardDialog.ro_id} onValueChange={(v) => setCardDialog((d) => ({ ...d, ro_id: v === "_none" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih RO..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Tanpa RO —</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Catatan</Label>
              <Textarea rows={3} value={cardDialog.catatan} onChange={(e) => setCardDialog((d) => ({ ...d, catatan: e.target.value }))} placeholder="Catatan tambahan..." />
            </div>
            <div className="space-y-1">
              <Label>Deadline</Label>
              <Input type="date" value={cardDialog.deadline} onChange={(e) => setCardDialog((d) => ({ ...d, deadline: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCardDialog(CARD_EMPTY)}>Batal</Button>
            <Button
              onClick={() => cardDialog.cardId ? updateCardMut.mutate() : createCardMut.mutate()}
              disabled={createCardMut.isPending || updateCardMut.isPending}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {(createCardMut.isPending || updateCardMut.isPending) ? <Loader2 className="animate-spin mr-1" size={14} /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirms */}
      <ConfirmDialog
        open={!!deleteCol}
        onOpenChange={(o) => !o && setDeleteCol(null)}
        title="Hapus Kolom"
        description="Semua card dalam kolom ini juga akan dihapus. Lanjutkan?"
        onConfirm={() => deleteCol && deleteColMut.mutate(deleteCol)}
        loading={deleteColMut.isPending}
      />
      <ConfirmDialog
        open={!!deleteCard}
        onOpenChange={(o) => !o && setDeleteCard(null)}
        title="Hapus Card"
        description="Card ini akan dihapus permanen."
        onConfirm={() => deleteCard && deleteCardMut.mutate(deleteCard)}
        loading={deleteCardMut.isPending}
      />
    </div>
  );
}
