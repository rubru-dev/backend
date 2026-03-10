"use client";

import { DualScrollContainer } from "@/components/ui/dual-scroll-container";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DragDropContext, Droppable, Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  Plus, Trash2, Clock, MessageSquare, Pencil, Check, X,
  GripVertical, Palette, TrendingUp, Calendar,
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
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { salesKanbanApi } from "@/lib/api/kanban";
import type { KanbanColumn, KanbanCard } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────
const PERMANENT_COLUMNS = ["Follow Up Admin", "Follow Up Telemarketing", "Closing", "Lost"];

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
  { hex: "#fce7f3", label: "Pink" },
  { hex: "#f0fdf4", label: "Mint" },
  { hex: "#fdf4ff", label: "Lavender" },
  { hex: "#fff7ed", label: "Peach" },
];

const CARD_COLORS = [
  { hex: "", label: "Default" },
  { hex: "#ef4444", label: "Merah" },
  { hex: "#f97316", label: "Oranye" },
  { hex: "#eab308", label: "Kuning" },
  { hex: "#22c55e", label: "Hijau" },
  { hex: "#3b82f6", label: "Biru" },
  { hex: "#8b5cf6", label: "Ungu" },
  { hex: "#ec4899", label: "Pink" },
  { hex: "#06b6d4", label: "Cyan" },
];

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

// ── Card Detail Modal ─────────────────────────────────────────────────────────
function CardDetailModal({
  card, open, onClose, onSave, onDelete,
}: {
  card: KanbanCard;
  open: boolean;
  onClose: () => void;
  onSave: (id: number, data: Partial<KanbanCard>) => Promise<void>;
  onDelete: (id: number) => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [deadline, setDeadline] = useState(card.deadline ?? "");
  const [projeksiSales, setProjeksiSales] = useState(
    card.projeksi_sales != null ? String(card.projeksi_sales) : ""
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const projeksiVal = projeksiSales.trim() !== ""
        ? parseFloat(projeksiSales.replace(/[^\d.-]/g, ""))
        : null;
      await onSave(card.id, {
        title: title.trim() || card.title,
        description: description || null,
        deadline: deadline || null,
        projeksi_sales: isNaN(projeksiVal as number) ? null : projeksiVal,
      });
      toast.success("Kartu diperbarui");
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
          <DialogTitle className="flex items-center gap-2">
            {card.color && <span className="inline-block w-3 h-3 rounded-full" style={{ background: card.color }} />}
            Detail Kartu
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div>
            <Label>Judul *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Deskripsi</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Tambahkan deskripsi..."
              className="resize-none"
            />
          </div>
          <div>
            <Label>Deadline</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div>
            <Label>Projeksi Sales (Rp)</Label>
            <Input
              type="number"
              min={0}
              step={1000}
              value={projeksiSales}
              onChange={(e) => setProjeksiSales(e.target.value)}
              placeholder="Contoh: 5000000"
            />
          </div>
          <div className="flex justify-between pt-2">
            <Button
              variant="destructive" size="sm"
              onClick={() => { onDelete(card.id); onClose(); }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Hapus
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

// ── Card item ─────────────────────────────────────────────────────────────────
function KanbanCardItem({
  card, index, onDelete, onUpdate, onColorChange,
}: {
  card: KanbanCard;
  index: number;
  onDelete: (id: number) => void;
  onUpdate: (id: number, data: Partial<KanbanCard>) => Promise<void>;
  onColorChange: (id: number, color: string | null) => void;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const deadline = card.deadline ?? card.due_date;
  const isOverdue = deadline && new Date(deadline) < new Date();

  return (
    <>
      <Draggable draggableId={String(card.id)} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`group bg-white rounded-lg border shadow-sm transition-shadow ${
              snapshot.isDragging ? "shadow-lg rotate-1 scale-[1.02]" : "hover:shadow-md"
            }`}
            style={{
              borderLeft: card.color ? `4px solid ${card.color}` : undefined,
              ...provided.draggableProps.style,
            }}
          >
            <div className="flex items-start p-3 gap-1">
              {/* Drag handle */}
              <div {...provided.dragHandleProps} className="mt-0.5 opacity-0 group-hover:opacity-30 cursor-grab shrink-0">
                <GripVertical className="h-4 w-4" />
              </div>

              {/* Card content */}
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailOpen(true)}>
                <p className="text-sm font-medium leading-snug">{card.lead?.nama ?? card.title}</p>
                {card.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.description}</p>
                )}
                {card.projeksi_sales != null && (
                  <p className="flex items-center gap-1 text-xs font-medium text-emerald-600 mt-1.5">
                    <TrendingUp className="h-3 w-3" />
                    {formatRupiah(card.projeksi_sales)}
                  </p>
                )}
                {card.labels && card.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {card.labels.map((lb) => (
                      <span
                        key={lb.id}
                        className="inline-block h-1.5 w-8 rounded-full"
                        style={{ backgroundColor: lb.color ?? "#6366f1" }}
                        title={lb.label_name ?? ""}
                      />
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {deadline && (
                    <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : ""}`}>
                      <Clock className="h-3 w-3" />
                      {format(new Date(deadline), "d MMM", { locale: id })}
                    </span>
                  )}
                  {(card.comments_count ?? 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {card.comments_count}
                    </span>
                  )}
                  {card.created_at && (
                    <span className="text-xs text-muted-foreground/60">
                      {format(new Date(card.created_at), "d MMM yyyy", { locale: id })}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick color picker — visible on hover */}
              <Popover open={colorOpen} onOpenChange={setColorOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="mt-0.5 opacity-0 group-hover:opacity-40 hover:!opacity-100 shrink-0 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setColorOpen(true); }}
                    title="Ubah warna"
                  >
                    <Palette className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-2" onClick={(e) => e.stopPropagation()}>
                  <p className="text-xs font-medium mb-2 text-muted-foreground">Warna Kartu</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CARD_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        title={c.label}
                        onClick={() => { onColorChange(card.id, c.hex || null); setColorOpen(false); }}
                        className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${
                          card.color === c.hex ? "border-slate-700 scale-110" : "border-transparent"
                        }`}
                        style={{ background: c.hex || "#e2e8f0" }}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
      </Draggable>

      {detailOpen && (
        <CardDetailModal
          card={card} open={detailOpen}
          onClose={() => setDetailOpen(false)}
          onSave={onUpdate} onDelete={onDelete}
        />
      )}
    </>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────
function KanbanColumnComp({
  column, leads, onAddCard, onDeleteCard, onUpdateCard, onColorChangeCard, onUpdateColumn, onDeleteColumn, isPermanent = false,
}: {
  column: KanbanColumn;
  leads: { id: number; nama: string }[];
  onAddCard: (columnId: number, leadId: number, leadNama: string) => Promise<void>;
  onDeleteCard: (cardId: number) => void;
  onUpdateCard: (id: number, data: Partial<KanbanCard>) => Promise<void>;
  onColorChangeCard: (id: number, color: string | null) => void;
  onUpdateColumn: (id: number, data: { title?: string; color?: string }) => Promise<void>;
  onDeleteColumn: (id: number) => void;
  isPermanent?: boolean;
}) {
  const [addingCard, setAddingCard] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(column.title);
  const [colorOpen, setColorOpen] = useState(false);

  const colColor = column.color ?? "#e2e8f0";

  async function handleAddCard() {
    const lead = leads.find((l) => String(l.id) === selectedLeadId);
    if (!lead) return;
    setIsSaving(true);
    try {
      await onAddCard(column.id, lead.id, lead.nama);
      setSelectedLeadId(""); setAddingCard(false);
    } finally { setIsSaving(false); }
  }

  async function saveTitle() {
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === column.title) { setEditingTitle(false); return; }
    try {
      await onUpdateColumn(column.id, { title: trimmed });
      toast.success("Nama kolom diperbarui");
    } catch {
      toast.error("Gagal memperbarui nama");
      setTitleDraft(column.title);
    }
    setEditingTitle(false);
  }

  async function handleColorChange(hex: string) {
    setColorOpen(false);
    try { await onUpdateColumn(column.id, { color: hex }); }
    catch { toast.error("Gagal mengubah warna"); }
  }

  return (
    <div
      className="flex flex-col w-72 shrink-0 rounded-xl border kanban-col"
      style={{ backgroundColor: colColor }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-black/10">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="h-7 text-sm font-semibold bg-white/70"
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") { setTitleDraft(column.title); setEditingTitle(false); }
                }}
                autoFocus
              />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveTitle}><Check className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setTitleDraft(column.title); setEditingTitle(false); }}><X className="h-3 w-3" /></Button>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-semibold truncate">{column.title}</h3>
              <Badge variant="secondary" className="shrink-0 text-xs px-1.5 py-0 bg-black/10 text-black/60">
                {column.cards?.length ?? 0}
              </Badge>
            </>
          )}
        </div>
        {!editingTitle && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Popover open={colorOpen} onOpenChange={setColorOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-black/10">
                  <Palette className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-2">
                <p className="text-xs font-medium mb-2 text-muted-foreground">Warna Kolom</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {COLUMN_COLORS.map((c) => (
                    <button key={c.hex} title={c.label} onClick={() => handleColorChange(c.hex)}
                      className={`w-7 h-7 rounded border-2 hover:scale-110 transition-transform ${colColor === c.hex ? "border-slate-700" : "border-transparent"}`}
                      style={{ background: c.hex }}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {!isPermanent && (
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-black/10"
                onClick={() => { setTitleDraft(column.title); setEditingTitle(true); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-black/10" onClick={() => setAddingCard(true)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
            {!isPermanent && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"
                onClick={() => { if (confirm(`Hapus kolom "${column.title}" beserta semua kartunya?`)) onDeleteColumn(column.id); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Cards */}
      <Droppable droppableId={String(column.id)}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef} {...provided.droppableProps}
            className={`flex-1 p-2 space-y-2 min-h-[80px] transition-colors rounded-b-xl ${snapshot.isDraggingOver ? "bg-black/5" : ""}`}
          >
            {(column.cards ?? []).map((card, index) => (
              <KanbanCardItem
                key={card.id} card={card} index={index}
                onDelete={onDeleteCard}
                onUpdate={onUpdateCard}
                onColorChange={onColorChangeCard}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Add card form */}
      {addingCard && (
        <div className="p-2 border-t border-black/10 space-y-2">
          <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
            <SelectTrigger className="text-sm bg-white h-8">
              <SelectValue placeholder="Pilih klien..." />
            </SelectTrigger>
            <SelectContent>
              {leads.length === 0 && (
                <SelectItem value="__empty" disabled>Tidak ada leads</SelectItem>
              )}
              {leads.map((l) => (
                <SelectItem key={l.id} value={String(l.id)}>{l.nama}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddCard} disabled={isSaving || !selectedLeadId}>Tambah</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAddingCard(false); setSelectedLeadId(""); }}>Batal</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Column ────────────────────────────────────────────────────────────────
function AddColumnButton({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!title.trim()) return;
    setSaving(true);
    try { await onAdd(title.trim()); setTitle(""); setOpen(false); }
    finally { setSaving(false); }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-72 shrink-0 rounded-xl border-2 border-dashed border-slate-300 px-4 py-3 text-sm text-muted-foreground hover:border-slate-400 hover:text-foreground transition-colors no-print"
      >
        <Plus className="h-4 w-4" /> Tambah Kolom
      </button>
    );
  }

  return (
    <div className="w-72 shrink-0 rounded-xl border bg-slate-50 p-3 space-y-2 no-print">
      <Input autoFocus placeholder="Nama kolom..." value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setOpen(false); setTitle(""); } }}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleAdd} disabled={saving || !title.trim()}>Tambah</Button>
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setTitle(""); }}>Batal</Button>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function BoardSkeleton() {
  return (
    <div className="flex gap-4 pb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="w-72 shrink-0 space-y-2">
          <Skeleton className="h-10 w-full rounded-xl" />
          {Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-20 w-full rounded-lg" />)}
        </div>
      ))}
    </div>
  );
}

// ── Main Board ─────────────────────────────────────────────────────────────────
export interface SalesKanbanBoardProps {
  initialColumns: KanbanColumn[];
  isLoading?: boolean;
  onRefresh: () => void;
}

export function SalesKanbanBoard({ initialColumns, isLoading = false, onRefresh }: SalesKanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);
  const isDraggingRef = useRef(false);

  const { data: leadsData } = useQuery({
    queryKey: ["/sales/kanban/leads"],
    queryFn: () => salesKanbanApi.getLeads(),
    staleTime: 60_000,
  });
  const leads = leadsData ?? [];

  // ── Month filter ─────────────────────────────────────────────────────────
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<number | null>(null); // null = semua
  const [filterYear, setFilterYear] = useState(now.getFullYear());

  // Computed filtered columns — only affects display, full state unchanged
  const displayColumns = useMemo(() => {
    if (filterMonth === null) return columns;
    return columns.map((col) => ({
      ...col,
      cards: (col.cards ?? []).filter((card) => {
        if (!card.created_at) return false;
        const d = new Date(card.created_at);
        return d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear;
      }),
    }));
  }, [columns, filterMonth, filterYear]);

  const filteredTotal = displayColumns.reduce((sum, col) => sum + (col.cards?.length ?? 0), 0);

  // Sync server data → local state, but NOT while dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setColumns(initialColumns);
    }
  }, [initialColumns]);

  // ── Carry-over: when switching to a past month, copy expired Follow Up Admin cards ──
  useEffect(() => {
    if (filterMonth === null) return;
    const now = new Date();
    // Don't carry over for future months
    if (
      filterYear > now.getFullYear() ||
      (filterYear === now.getFullYear() && filterMonth > now.getMonth() + 1)
    ) return;

    salesKanbanApi
      .carryover({ month: filterMonth, year: filterYear })
      .then(({ copied }) => {
        if (copied > 0) {
          onRefresh();
          toast.info(`${copied} kartu disalin ke Follow Up Admin bulan ini`);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMonth, filterYear]);

  // ── Drag handlers — COPY behavior ────────────────────────────────────────
  const onDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const onDragEnd = useCallback(async (result: DropResult) => {
    isDraggingRef.current = false;
    const { source, destination, draggableId } = result;
    if (!destination) return;
    // Same column → no copy (ignore reordering within same column)
    if (source.droppableId === destination.droppableId) return;

    const destColumnId = Number(destination.droppableId);

    // NOTE: IDs are strings at runtime (BigInt serialized via .toString()), compare as strings
    const srcCard = columns.flatMap((c) => c.cards ?? []).find((c) => String(c.id) === draggableId);
    if (!srcCard) return;

    // Optimistic: add a temporary copy to destination column
    const tempId = -(Date.now()); // negative to distinguish from real IDs
    const copyCard: KanbanCard = {
      ...srcCard,
      id: tempId,
      column_id: destColumnId,
      created_at: new Date().toISOString(),
      comments_count: 0,
    };

    setColumns((prev) =>
      prev.map((col) =>
        String(col.id) === destination.droppableId
          ? { ...col, cards: [...(col.cards ?? []), copyCard] }
          : col
      )
    );

    try {
      const res = await salesKanbanApi.createCard({
        title: srcCard.title,
        description: srcCard.description ?? undefined,
        deadline: srcCard.deadline ?? undefined,
        color: srcCard.color ?? undefined,
        projeksi_sales: srcCard.projeksi_sales ?? undefined,
        lead_id: srcCard.lead?.id ?? undefined,
        column_id: destColumnId,
      });
      // Replace temp ID with the real ID from server
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          cards: (col.cards ?? []).map((c) => (c.id === tempId ? { ...c, id: res.id } : c)),
        }))
      );
      toast.success("Kartu disalin ke kolom baru");
    } catch {
      toast.error("Gagal menyalin kartu");
      // Revert optimistic copy
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          cards: (col.cards ?? []).filter((c) => c.id !== tempId),
        }))
      );
    }
  }, [columns]);

  // ── Column handlers ──────────────────────────────────────────────────────
  async function handleAddColumn(title: string) {
    const last = columns[columns.length - 1];
    const urutan = last ? (last.urutan ?? 0) + 1 : 1;
    try {
      const res = await salesKanbanApi.createColumn({ title, urutan, color: "#e2e8f0" });
      setColumns((prev) => [...prev, { id: res.id, title, urutan, color: "#e2e8f0", cards: [] }]);
      toast.success("Kolom ditambahkan");
    } catch { toast.error("Gagal menambahkan kolom"); }
  }

  async function handleUpdateColumn(id: number, data: { title?: string; color?: string }) {
    setColumns((prev) => prev.map((col) => col.id === id ? { ...col, ...data } : col));
    try {
      await salesKanbanApi.updateColumn(id, data);
    } catch {
      toast.error("Gagal mengubah kolom");
      onRefresh();
    }
  }

  async function handleDeleteColumn(id: number) {
    try {
      await salesKanbanApi.deleteColumn(id);
      setColumns((prev) => prev.filter((col) => col.id !== id));
      toast.success("Kolom dihapus");
    } catch { toast.error("Gagal menghapus kolom"); }
  }

  // ── Card handlers ────────────────────────────────────────────────────────
  async function handleAddCard(columnId: number, leadId: number, leadNama: string) {
    try {
      const res = await salesKanbanApi.createCard({ title: leadNama, lead_id: leadId, column_id: columnId });
      const newCard: KanbanCard = {
        id: res.id, column_id: columnId, title: leadNama,
        lead: { id: leadId, nama: leadNama },
        description: null, deadline: null, color: null,
        projeksi_sales: null, urutan: 0, comments_count: 0, labels: [],
        created_at: new Date().toISOString(),
      };
      setColumns((prev) =>
        prev.map((col) => col.id === columnId ? { ...col, cards: [...(col.cards ?? []), newCard] } : col)
      );
      toast.success("Kartu ditambahkan");
    } catch { toast.error("Gagal menambahkan kartu"); }
  }

  async function handleUpdateCard(id: number, data: Partial<KanbanCard>) {
    await salesKanbanApi.updateCard(id, {
      title: data.title,
      description: data.description ?? undefined,
      deadline: data.deadline ?? undefined,
      color: data.color ?? undefined,
      projeksi_sales: data.projeksi_sales ?? undefined,
    });
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: (col.cards ?? []).map((c) => c.id === id ? { ...c, ...data } : c),
      }))
    );
  }

  function handleColorChange(id: number, color: string | null) {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: (col.cards ?? []).map((c) => c.id === id ? { ...c, color } : c),
      }))
    );
    salesKanbanApi.updateCard(id, { color: color ?? undefined }).catch(() => {
      toast.error("Gagal menyimpan warna");
      onRefresh();
    });
  }

  async function handleDeleteCard(cardId: number) {
    try {
      await salesKanbanApi.deleteCard(cardId);
      setColumns((prev) =>
        prev.map((col) => ({ ...col, cards: (col.cards ?? []).filter((c) => c.id !== cardId) }))
      );
      toast.success("Kartu dihapus");
    } catch { toast.error("Gagal menghapus kartu"); }
  }

  if (isLoading) return <BoardSkeleton />;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .kanban-board { display: flex !important; flex-wrap: wrap !important; gap: 12px !important; overflow: visible !important; }
          .kanban-col { width: calc(33% - 8px) !important; min-width: 0 !important; }
          body { background: white !important; }
          nav, aside, header, [data-sidebar], .sidebar { display: none !important; }
          @page { size: A4 landscape; margin: 1cm; }
        }
      `}</style>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap no-print">
        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-muted-foreground">Filter:</span>

        <Select
          value={filterMonth === null ? "all" : String(filterMonth)}
          onValueChange={(v) => setFilterMonth(v === "all" ? null : Number(v))}
        >
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Bulan</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(filterYear)}
          onValueChange={(v) => setFilterYear(Number(v))}
        >
          <SelectTrigger className="h-8 w-24 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filterMonth !== null && (
          <Badge variant="secondary" className="text-xs h-6">
            {filteredTotal} kartu
          </Badge>
        )}
      </div>

      {/* ── Board ───────────────────────────────────────────────────────────── */}
      <DualScrollContainer className="flex-1">
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="kanban-board flex gap-4 pb-4" style={{ minWidth: "max-content" }}>
            {displayColumns.map((column) => (
              <KanbanColumnComp
                key={column.id}
                column={column}
                leads={leads}
                onAddCard={handleAddCard}
                onDeleteCard={handleDeleteCard}
                onUpdateCard={handleUpdateCard}
                onColorChangeCard={handleColorChange}
                onUpdateColumn={handleUpdateColumn}
                onDeleteColumn={handleDeleteColumn}
                isPermanent={PERMANENT_COLUMNS.includes(column.title)}
              />
            ))}
            <AddColumnButton onAdd={handleAddColumn} />
          </div>
        </DragDropContext>
      </DualScrollContainer>
    </>
  );
}
