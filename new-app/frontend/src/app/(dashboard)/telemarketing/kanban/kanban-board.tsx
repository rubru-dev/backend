"use client";
import { getLogoBase64 } from "@/lib/get-logo";
import { DualScrollContainer } from "@/components/ui/dual-scroll-container";

import { useState, useCallback, useEffect } from "react";
import {
  DragDropContext, Droppable, Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  Plus, Trash2, Clock, Pencil, Check, X,
  GripVertical, Palette, CalendarCheck, Snowflake, Download,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  telemarketingKanbanApi,
  type TelemarketingKanbanColumn,
  type TelemarketingKanbanCard,
} from "@/lib/api/kanban";

// ── Constants ─────────────────────────────────────────────────────────────────
const PERMANENT_COLUMNS = [
  "From Sales Admin", "W1", "W2", "W3", "W4", "Closing Survey", "Move To Cold Database",
];
const PAGE_SIZE = 10;

const MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const COLUMN_COLORS = [
  { hex: "#e2e8f0", label: "Abu" },
  { hex: "#dbeafe", label: "Biru" },
  { hex: "#dcfce7", label: "Hijau" },
  { hex: "#fef9c3", label: "Kuning" },
  { hex: "#fee2e2", label: "Merah" },
  { hex: "#f3e8ff", label: "Ungu" },
  { hex: "#ffedd5", label: "Oranye" },
  { hex: "#cffafe", label: "Cyan" },
];

// ── Card Detail Modal ─────────────────────────────────────────────────────────
function CardDetailModal({
  card,
  open,
  onClose,
  onSave,
  onDelete,
  isClosingSurvey,
}: {
  card: TelemarketingKanbanCard;
  open: boolean;
  onClose: () => void;
  onSave: (id: number, data: Partial<TelemarketingKanbanCard & { tanggal_survey?: string | null }>, leadTanggalMasuk?: string | null) => Promise<void>;
  onDelete: (id: number) => void;
  isClosingSurvey: boolean;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [deadline, setDeadline] = useState(card.deadline ? card.deadline.slice(0, 10) : "");
  const [tanggalSurvey, setTanggalSurvey] = useState(
    card.tanggal_survey ? card.tanggal_survey.slice(0, 10) : ""
  );
  const effectiveTanggalMasuk = card.lead?.tanggal_masuk ?? card.lead?.created_at ?? null;
  const [tanggalMasuk, setTanggalMasuk] = useState(
    effectiveTanggalMasuk ? effectiveTanggalMasuk.slice(0, 10) : ""
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(card.id, {
        title,
        description: description || null,
        deadline: deadline || null,
        ...(isClosingSurvey ? { tanggal_survey: tanggalSurvey || null } : {}),
      }, card.lead ? (tanggalMasuk || null) : undefined);
      toast.success("Card diperbarui");
      onClose();
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detail Card</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {card.lead && (
            <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md space-y-1">
              <div>Lead: <span className="font-medium text-foreground">{card.lead.nama}</span></div>
              <div className="space-y-1">
                <Label className="text-xs text-blue-600">Tanggal Masuk</Label>
                <Input
                  type="date"
                  value={tanggalMasuk}
                  onChange={(e) => setTanggalMasuk(e.target.value)}
                  className="h-7 text-xs border-blue-200 focus:border-blue-400"
                />
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label>Judul</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Deskripsi</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Deadline</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            {isClosingSurvey && (
              <div className="space-y-1">
                <Label className="flex items-center gap-1">
                  <CalendarCheck className="h-3 w-3 text-green-600" />
                  Tanggal Survey
                </Label>
                <Input
                  type="date"
                  value={tanggalSurvey}
                  onChange={(e) => setTanggalSurvey(e.target.value)}
                  className="border-green-300 focus:border-green-500"
                />
              </div>
            )}
          </div>
          {isClosingSurvey && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
              <CalendarCheck className="h-3 w-3 inline mr-1" />
              Tanggal survey akan otomatis muncul di Kalender Survey. Lengkapi PIC & jam dari menu Kalender Survey.
            </p>
          )}
          <div className="flex gap-2 justify-between pt-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { onDelete(card.id); onClose(); }}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Hapus
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Batal</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !title.trim()}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Card Component ─────────────────────────────────────────────────────────────
function KanbanCardComp({
  card,
  index,
  onEdit,
}: {
  card: TelemarketingKanbanCard;
  index: number;
  onEdit: (card: TelemarketingKanbanCard) => void;
}) {
  const hasDeadline = !!card.deadline;
  const hasSurvey = !!card.tanggal_survey;
  const isOverdue = hasDeadline && new Date(card.deadline!) < new Date();
  const bg = card.color || "";

  return (
    <Draggable draggableId={String(card.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`bg-white rounded-lg border shadow-sm p-3 cursor-pointer transition-shadow ${
            snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30" : "hover:shadow-md"
          }`}
          style={{
            ...provided.draggableProps.style,
            borderLeft: bg ? `4px solid ${bg}` : undefined,
          }}
          onClick={() => onEdit(card)}
        >
          <div className="flex items-start gap-2">
            <div {...provided.dragHandleProps} className="mt-0.5 text-muted-foreground">
              <GripVertical className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-2">{card.title}</p>
              {card.lead && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{card.lead.nama}</p>
              )}
              {(card.lead?.tanggal_masuk || card.lead?.created_at) && (
                <p className="text-[10px] text-blue-500 mt-0.5">
                  Masuk: {format(new Date((card.lead.tanggal_masuk || card.lead.created_at)!), "d MMM yyyy", { locale: id })}
                </p>
              )}
              {card.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.description}</p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {hasDeadline && (
                  <Badge
                    variant={isOverdue ? "destructive" : "outline"}
                    className="text-xs px-1.5 py-0"
                  >
                    <Clock className="h-2.5 w-2.5 mr-1" />
                    {format(new Date(card.deadline!), "d MMM", { locale: id })}
                  </Badge>
                )}
                {hasSurvey && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0 border-green-400 text-green-700">
                    <CalendarCheck className="h-2.5 w-2.5 mr-1" />
                    {format(new Date(card.tanggal_survey!), "d MMM", { locale: id })}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ── Column Component ──────────────────────────────────────────────────────────
function KanbanColumnComp({
  column,
  leads,
  bulan,
  tahun,
  onCardEdit,
  onCardCreate,
  onColumnUpdate,
  onColumnDelete,
}: {
  column: TelemarketingKanbanColumn;
  leads: { id: number; nama: string }[];
  bulan: number;
  tahun: number;
  onCardEdit: (card: TelemarketingKanbanCard) => void;
  onCardCreate: (columnId: number, data: { title: string; lead_id?: number | null }) => Promise<void>;
  onColumnUpdate: (id: number, data: { title?: string; color?: string }) => Promise<void>;
  onColumnDelete: (id: number) => Promise<void>;
}) {
  const isPermanent = PERMANENT_COLUMNS.includes(column.title);
  const [addingCard, setAddingCard] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectedLead, setSelectedLead] = useState<string>("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [colTitle, setColTitle] = useState(column.title);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(column.cards.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visibleCards = column.cards.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const hasPagination = column.cards.length > PAGE_SIZE;

  const isFromSalesAdmin = column.title === "From Sales Admin";
  const isClosingSurvey = column.title === "Closing Survey";
  const isColdDatabase = column.title === "Move To Cold Database";

  async function handleAddCard() {
    if (!newTitle.trim()) return;
    await onCardCreate(column.id, {
      title: newTitle.trim(),
      lead_id: selectedLead ? parseInt(selectedLead) : null,
    });
    setNewTitle("");
    setSelectedLead("");
    setAddingCard(false);
  }

  return (
    <div className="flex-shrink-0 w-72">
      {/* Column Header */}
      <div
        className="rounded-t-lg px-3 py-2 flex items-center justify-between"
        style={{ backgroundColor: column.color ?? "#e2e8f0" }}
      >
        {editingTitle && !isPermanent ? (
          <div className="flex gap-1 flex-1">
            <Input value={colTitle} onChange={(e) => setColTitle(e.target.value)} className="h-6 text-sm py-0" autoFocus />
            <button onClick={async () => { await onColumnUpdate(column.id, { title: colTitle }); setEditingTitle(false); }} className="text-green-600">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={() => { setColTitle(column.title); setEditingTitle(false); }}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-semibold text-sm truncate">{column.title}</span>
            {isFromSalesAdmin && <Badge className="text-xs px-1 py-0 bg-indigo-500">SA</Badge>}
            {isClosingSurvey && <CalendarCheck className="h-4 w-4 text-green-700 flex-shrink-0" />}
            {isColdDatabase && <Snowflake className="h-4 w-4 text-blue-700 flex-shrink-0" />}
            <Badge variant="secondary" className="text-xs px-1 py-0 ml-auto flex-shrink-0">
              {column.cards.length}
            </Badge>
          </div>
        )}
        {!isPermanent && !editingTitle && (
          <div className="flex items-center gap-1 ml-1">
            <button onClick={() => setShowColorPicker(!showColorPicker)}>
              <Palette className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
            <button onClick={() => setEditingTitle(true)}>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
            <button onClick={() => onColumnDelete(column.id)}>
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        )}
      </div>

      {showColorPicker && (
        <div className="bg-white border rounded p-2 grid grid-cols-4 gap-1 shadow">
          {COLUMN_COLORS.map((c) => (
            <button
              key={c.hex}
              title={c.label}
              className="w-8 h-8 rounded border-2 hover:border-primary"
              style={{ backgroundColor: c.hex }}
              onClick={async () => { await onColumnUpdate(column.id, { color: c.hex }); setShowColorPicker(false); }}
            />
          ))}
        </div>
      )}

      <div className="rounded-b-lg border border-t-0 bg-slate-50">
        <Droppable droppableId={String(column.id)}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-[80px] p-2 space-y-2 transition-colors ${
                snapshot.isDraggingOver ? "bg-primary/5" : ""
              }`}
            >
              {visibleCards.map((card, index) => (
                <KanbanCardComp key={card.id} card={card} index={index} onEdit={onCardEdit} />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {/* Pagination */}
        {hasPagination && (
          <div className="flex items-center justify-between px-2 py-1 border-t bg-white/60">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] text-muted-foreground">
              {safePage + 1} / {totalPages}
              <span className="text-muted-foreground/60 ml-1">({column.cards.length} card)</span>
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Add Card - outside Droppable to prevent dnd event interference */}
        <div className="p-2 pt-0">
          {addingCard ? (
            <div className="space-y-2 bg-white p-2 rounded border">
              <Input
                placeholder="Judul card..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                className="text-sm h-8"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddCard(); if (e.key === "Escape") setAddingCard(false); }}
              />
              <Select value={selectedLead || "__none__"} onValueChange={(v) => setSelectedLead(v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Pilih lead (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Tanpa lead</SelectItem>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1">
                <Button size="sm" className="h-7 text-xs" onClick={handleAddCard}>Tambah</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingCard(false)}>Batal</Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingCard(true)}
              className="w-full text-left text-sm text-muted-foreground px-2 py-1 rounded hover:bg-muted/50 flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah card
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Board ────────────────────────────────────────────────────────────────
export function TelemarketingKanbanBoard() {
  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [columns, setColumns] = useState<TelemarketingKanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<{ id: number; nama: string }[]>([]);
  const [selectedCard, setSelectedCard] = useState<TelemarketingKanbanCard | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const [cols, ls] = await Promise.all([
        telemarketingKanbanApi.getBoard(bulan, tahun),
        telemarketingKanbanApi.getLeads(),
      ]);
      setColumns(cols);
      setLeads(ls);
    } catch {
      toast.error("Gagal memuat board");
    } finally {
      setLoading(false);
    }
  }, [bulan, tahun]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const cardId = parseInt(draggableId);
    const targetColumnId = parseInt(destination.droppableId);

    // Optimistic update (drag = copy)
    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, cards: [...col.cards] }));
      const srcCol = next.find((c) => String(c.id) === source.droppableId);
      const dstCol = next.find((c) => c.id === targetColumnId);
      if (!srcCol || !dstCol) return prev;
      const [moved] = srcCol.cards.splice(source.index, 1);
      srcCol.cards.splice(source.index, 0, moved);
      dstCol.cards.splice(destination.index, 0, { ...moved, column_id: targetColumnId, id: Date.now() });
      return next;
    });

    try {
      await telemarketingKanbanApi.moveCard(cardId, targetColumnId, bulan, tahun);
      // Check if moved to Cold Database — notify user
      const targetCol = columns.find((c) => c.id === targetColumnId);
      if (targetCol?.title === "Move To Cold Database") {
        toast.success("Lead dipindah ke Cold Database (status → Low)");
      }
      await loadBoard();
    } catch {
      toast.error("Gagal memindahkan card");
      loadBoard();
    }
  }, [bulan, tahun, loadBoard, columns]);

  const handleCardCreate = useCallback(async (columnId: number, data: { title: string; lead_id?: number | null }) => {
    try {
      await telemarketingKanbanApi.createCard(columnId, data);
      await loadBoard();
      toast.success("Card ditambahkan");
    } catch {
      toast.error("Gagal menambah card");
    }
  }, [loadBoard]);

  const handleCardSave = useCallback(async (id: number, data: Partial<TelemarketingKanbanCard & { tanggal_survey?: string | null }>, leadTanggalMasuk?: string | null) => {
    await telemarketingKanbanApi.updateCard(id, data as Parameters<typeof telemarketingKanbanApi.updateCard>[1]);
    if (leadTanggalMasuk !== undefined) {
      const card = columns.flatMap((c) => c.cards).find((c) => c.id === id);
      if (card?.lead?.id) {
        await telemarketingKanbanApi.updateLead(card.lead.id, { tanggal_masuk: leadTanggalMasuk });
      }
    }
    await loadBoard();
  }, [loadBoard, columns]);

  const handleCardDelete = useCallback(async (id: number) => {
    try {
      await telemarketingKanbanApi.deleteCard(id);
      await loadBoard();
      toast.success("Card dihapus");
    } catch {
      toast.error("Gagal menghapus card");
    }
  }, [loadBoard]);

  const handleColumnUpdate = useCallback(async (id: number, data: { title?: string; color?: string }) => {
    try {
      await telemarketingKanbanApi.updateColumn(id, data);
      await loadBoard();
    } catch {
      toast.error("Gagal memperbarui kolom");
    }
  }, [loadBoard]);

  const handleColumnDelete = useCallback(async (id: number) => {
    if (!confirm("Hapus kolom ini dan semua card-nya?")) return;
    try {
      await telemarketingKanbanApi.deleteColumn(id);
      await loadBoard();
      toast.success("Kolom dihapus");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Gagal menghapus kolom");
    }
  }, [loadBoard]);

  const handleAddColumn = useCallback(async () => {
    if (!newColumnTitle.trim()) return;
    try {
      await telemarketingKanbanApi.createColumn({ title: newColumnTitle.trim(), bulan, tahun });
      setNewColumnTitle("");
      setAddingColumn(false);
      await loadBoard();
      toast.success("Kolom ditambahkan");
    } catch {
      toast.error("Gagal menambah kolom");
    }
  }, [newColumnTitle, bulan, tahun, loadBoard]);

  async function handleDownloadPdf() {
    const monthName = MONTHS[bulan - 1];
    const periodeLabel = `${monthName} ${tahun}`;
    const totalCards = columns.reduce((s, c) => s + c.cards.length, 0);
    const logoUrl = await getLogoBase64();

    const colTables = columns.map((col) => {
      const rows = col.cards.length === 0
        ? `<tr><td colspan="4" style="text-align:center;color:#9ca3af;font-style:italic;padding:6px;">Tidak ada card</td></tr>`
        : col.cards.map((card, i) => `
          <tr>
            <td style="width:24px;color:#6b7280;">${i + 1}</td>
            <td><strong>${card.title}</strong>${card.lead ? `<br><span style="color:#6b7280;font-size:9px;">${card.lead.nama}</span>` : ""}</td>
            <td style="color:#16a34a;font-size:9px;">${card.tanggal_survey ? new Date(card.tanggal_survey).toLocaleDateString("id-ID") : "-"}</td>
            <td style="color:#dc2626;font-size:9px;">${card.deadline ? new Date(card.deadline).toLocaleDateString("id-ID") : "-"}</td>
          </tr>`).join("");
      return `
        <div style="margin-bottom:16px;page-break-inside:avoid;">
          <div style="background:${col.color ?? "#e2e8f0"};padding:5px 8px;border-radius:4px 4px 0 0;font-weight:bold;font-size:11px;display:flex;justify-content:space-between;">
            <span>${col.title}</span>
            <span style="font-weight:normal;color:#374151;">${col.cards.length} card</span>
          </div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;font-size:10px;">
            <thead><tr style="background:#f8fafc;">
              <th style="padding:4px 6px;text-align:left;border-bottom:1px solid #e2e8f0;">#</th>
              <th style="padding:4px 6px;text-align:left;border-bottom:1px solid #e2e8f0;">Judul / Lead</th>
              <th style="padding:4px 6px;text-align:left;border-bottom:1px solid #e2e8f0;">Tgl Survey</th>
              <th style="padding:4px 6px;text-align:left;border-bottom:1px solid #e2e8f0;">Deadline</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }).join("");

    const summaryRows = columns.map((col) => `
      <tr>
        <td>${col.title}</td>
        <td style="text-align:center;font-weight:bold;">${col.cards.length}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Kanban Telemarketing — ${periodeLabel}</title><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:Arial,sans-serif; font-size:11px; color:#111; padding:24px; }
      .header { display:flex; align-items:center; gap:16px; border-bottom:2px solid #f97316; padding-bottom:12px; margin-bottom:16px; }
      .header img { height:60px; width:auto; max-width:120px; object-fit:contain; }
      .header-text h2 { font-size:16px; font-weight:bold; color:#f97316; }
      .header-text p { font-size:10px; color:#6b7280; margin-top:2px; }
      .meta { background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px 14px; margin-bottom:16px; display:flex; gap:32px; }
      .meta-item .label { font-size:9px; color:#6b7280; text-transform:uppercase; }
      .meta-item .value { font-size:13px; font-weight:bold; margin-top:2px; }
      .section-title { font-size:12px; font-weight:bold; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:10px; }
      table.summary { border-collapse:collapse; font-size:10px; width:auto; margin-bottom:20px; }
      table.summary th { background:#f1f5f9; padding:5px 8px; text-align:left; border:1px solid #e2e8f0; }
      table.summary td { border:1px solid #e2e8f0; padding:4px 8px; }
      tr:nth-child(even) td { background:#fafafa; }
      @media print { body { padding:12px; } }
    </style></head><body>
      <div class="header">
        <img src="${logoUrl}" alt="Logo" />
        <div class="header-text">
          <h2>RubahRumah</h2>
          <p>Jl. Pandu II No.420. Sepanjang Jaya. Kec. Rawalumbu. Kota Bekasi. Jawa Barat 17116</p>
          <p>Telp: 0813-7640-5550 | info.rubahrumah@gmail.com</p>
        </div>
      </div>
      <div class="meta">
        <div class="meta-item">
          <div class="label">Dokumen</div>
          <div class="value">Rekap Kanban Telemarketing</div>
        </div>
        <div class="meta-item">
          <div class="label">Periode</div>
          <div class="value">${periodeLabel}</div>
        </div>
        <div class="meta-item">
          <div class="label">Total Kolom</div>
          <div class="value">${columns.length}</div>
        </div>
        <div class="meta-item">
          <div class="label">Total Card</div>
          <div class="value">${totalCards}</div>
        </div>
      </div>
      <div class="section-title">Ringkasan per Kolom</div>
      <table class="summary">
        <thead><tr><th>Kolom</th><th style="text-align:center;min-width:80px;">Jumlah Card</th></tr></thead>
        <tbody>${summaryRows}</tbody>
      </table>
      <div class="section-title">Detail Card per Kolom</div>
      ${colTables}
      <div style="margin-top:24px;font-size:9px;color:#9ca3af;border-top:1px solid #e2e8f0;padding-top:8px;">
        Dicetak: ${new Date().toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" })}
      </div>
    </body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.print();
  }

  const handleCarryover = useCallback(async () => {
    let prevBulan = bulan - 1;
    let prevTahun = tahun;
    if (prevBulan === 0) { prevBulan = 12; prevTahun -= 1; }
    try {
      await telemarketingKanbanApi.carryover({
        from_bulan: prevBulan,
        from_tahun: prevTahun,
        to_bulan: bulan,
        to_tahun: tahun,
      });
      await loadBoard();
      toast.success("Carryover selesai");
    } catch {
      toast.error("Gagal carryover");
    }
  }, [bulan, tahun, loadBoard]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={String(bulan)} onValueChange={(v) => setBulan(parseInt(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(tahun)} onValueChange={(v) => setTahun(parseInt(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={handleCarryover}>
          Carryover dari bulan lalu
        </Button>
        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarCheck className="h-3.5 w-3.5 text-green-600" />
            Badge hijau = survey
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Snowflake className="h-3.5 w-3.5 text-blue-600" />
            Cold Database = status Low
          </span>
          <Button size="sm" variant="outline" onClick={handleDownloadPdf}>
            <Download className="h-3.5 w-3.5 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-64 w-72 rounded-lg" />
          ))}
        </div>
      ) : (
        <DualScrollContainer className="flex-1">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 pb-4" style={{ minWidth: "max-content" }}>
              {columns.map((col) => (
                <KanbanColumnComp
                  key={col.id}
                  column={col}
                  leads={leads}
                  bulan={bulan}
                  tahun={tahun}
                  onCardEdit={setSelectedCard}
                  onCardCreate={handleCardCreate}
                  onColumnUpdate={handleColumnUpdate}
                  onColumnDelete={handleColumnDelete}
                />
              ))}

              {/* Add Column */}
              <div className="flex-shrink-0 w-72">
                {addingColumn ? (
                  <div className="bg-white border rounded-lg p-3 space-y-2 shadow">
                    <Input
                      placeholder="Nama kolom..."
                      value={newColumnTitle}
                      onChange={(e) => setNewColumnTitle(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddColumn();
                        if (e.key === "Escape") setAddingColumn(false);
                      }}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddColumn}>Tambah</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAddingColumn(false)}>Batal</Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingColumn(true)}
                    className="w-full h-12 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Kolom
                  </button>
                )}
              </div>
            </div>
          </DragDropContext>
        </DualScrollContainer>
      )}

      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          open={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          onSave={handleCardSave}
          onDelete={handleCardDelete}
          isClosingSurvey={columns.find((c) => c.id === selectedCard.column_id)?.title === "Closing Survey"}
        />
      )}
    </div>
  );
}
