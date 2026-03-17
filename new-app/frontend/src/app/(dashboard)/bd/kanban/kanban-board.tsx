"use client";

import { DualScrollContainer } from "@/components/ui/dual-scroll-container";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  DragDropContext, Droppable, Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  Plus, Trash2, Clock, MessageSquare, Pencil, Check, X,
  GripVertical, Palette,
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
import { bdKanbanApi } from "@/lib/api/kanban";
import type { KanbanColumn, KanbanCard } from "@/types";

// ── Color palettes ─────────────────────────────────────────────────────────────
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
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(card.id, {
        title: title.trim() || card.title,
        description: description || null,
        deadline: deadline || null,
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
                <p className="text-sm font-medium leading-snug">{card.title}</p>
                {card.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.description}</p>
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
  column, onAddCard, onDeleteCard, onUpdateCard, onColorChangeCard, onUpdateColumn, onDeleteColumn,
}: {
  column: KanbanColumn;
  onAddCard: (columnId: number, title: string) => Promise<void>;
  onDeleteCard: (cardId: number) => void;
  onUpdateCard: (id: number, data: Partial<KanbanCard>) => Promise<void>;
  onColorChangeCard: (id: number, color: string | null) => void;
  onUpdateColumn: (id: number, data: { title?: string; color?: string }) => Promise<void>;
  onDeleteColumn: (id: number) => void;
}) {
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(column.title);
  const [colorOpen, setColorOpen] = useState(false);

  const colColor = column.color ?? "#e2e8f0";

  async function handleAddCard() {
    if (!newCardTitle.trim()) return;
    setIsSaving(true);
    try {
      await onAddCard(column.id, newCardTitle.trim());
      setNewCardTitle(""); setAddingCard(false);
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
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-black/10"
              onClick={() => { setTitleDraft(column.title); setEditingTitle(true); }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-black/10" onClick={() => setAddingCard(true)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"
              onClick={() => { if (confirm(`Hapus kolom "${column.title}" beserta semua kartunya?`)) onDeleteColumn(column.id); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
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
          <Textarea
            placeholder="Judul kartu..." rows={2} value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddCard(); }
              if (e.key === "Escape") { setAddingCard(false); setNewCardTitle(""); }
            }}
            autoFocus className="text-sm resize-none bg-white"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddCard} disabled={isSaving || !newCardTitle.trim()}>Tambah</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAddingCard(false); setNewCardTitle(""); }}>Batal</Button>
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
export interface KanbanBoardProps {
  initialColumns: KanbanColumn[];
  isLoading?: boolean;
  onRefresh: () => void;
}

export function KanbanBoard({ initialColumns, isLoading = false, onRefresh }: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);
  const isDraggingRef = useRef(false);

  // Sync server data → local state, but NOT while dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setColumns(initialColumns);
    }
  }, [initialColumns]);

  // ── Drag handlers ────────────────────────────────────────────────────────
  const onDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const onDragEnd = useCallback(async (result: DropResult) => {
    isDraggingRef.current = false;
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const destColumnId = Number(destination.droppableId);

    // Optimistic update — move card in local state immediately
    // NOTE: IDs are strings at runtime (BigInt serialized via .toString()), compare as strings
    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, cards: [...(col.cards ?? [])] }));
      const srcCol = next.find((c) => String(c.id) === source.droppableId);
      const dstCol = next.find((c) => String(c.id) === destination.droppableId);
      if (!srcCol || !dstCol) return prev;
      const [moved] = srcCol.cards!.splice(source.index, 1);
      dstCol.cards!.splice(destination.index, 0, { ...moved, column_id: destColumnId });
      return next;
    });

    try {
      await bdKanbanApi.moveCard(Number(draggableId), { column_id: destColumnId, position: destination.index });
    } catch {
      toast.error("Gagal memindahkan kartu");
      onRefresh();
    }
  }, [onRefresh]);

  // ── Column handlers ──────────────────────────────────────────────────────
  async function handleAddColumn(title: string) {
    const last = columns[columns.length - 1];
    const urutan = last ? (last.urutan ?? 0) + 1 : 1;
    try {
      const res = await bdKanbanApi.createColumn({ title, urutan, color: "#e2e8f0" });
      setColumns((prev) => [...prev, { id: res.id, title, urutan, color: "#e2e8f0", cards: [] }]);
      toast.success("Kolom ditambahkan");
    } catch { toast.error("Gagal menambahkan kolom"); }
  }

  async function handleUpdateColumn(id: number, data: { title?: string; color?: string }) {
    // Optimistic update for column
    setColumns((prev) => prev.map((col) => col.id === id ? { ...col, ...data } : col));
    try {
      await bdKanbanApi.updateColumn(id, data);
    } catch {
      toast.error("Gagal mengubah kolom");
      onRefresh();
    }
  }

  async function handleDeleteColumn(id: number) {
    try {
      await bdKanbanApi.deleteColumn(id);
      setColumns((prev) => prev.filter((col) => col.id !== id));
      toast.success("Kolom dihapus");
    } catch { toast.error("Gagal menghapus kolom"); }
  }

  // ── Card handlers ────────────────────────────────────────────────────────
  async function handleAddCard(columnId: number, title: string) {
    try {
      const res = await bdKanbanApi.createCard({ title, column_id: columnId });
      const newCard: KanbanCard = {
        id: res.id, column_id: columnId, title,
        description: null, assigned_user_id: null, deadline: null, color: null,
        urutan: 0, comments_count: 0, labels: [],
      };
      setColumns((prev) =>
        prev.map((col) => col.id === columnId ? { ...col, cards: [...(col.cards ?? []), newCard] } : col)
      );
      toast.success("Kartu ditambahkan");
    } catch { toast.error("Gagal menambahkan kartu"); }
  }

  async function handleUpdateCard(id: number, data: Partial<KanbanCard>) {
    await bdKanbanApi.updateCard(id, {
      title: data.title,
      description: data.description ?? undefined,
      deadline: data.deadline ?? undefined,
      color: data.color ?? undefined,
    });
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: (col.cards ?? []).map((c) => c.id === id ? { ...c, ...data } : c),
      }))
    );
  }

  // Optimistic color change — instant UI update, then save to API
  function handleColorChange(id: number, color: string | null) {
    // Update state immediately (no await)
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: (col.cards ?? []).map((c) => c.id === id ? { ...c, color } : c),
      }))
    );
    // Fire-and-forget API call
    bdKanbanApi.updateCard(id, { color: color ?? undefined }).catch(() => {
      toast.error("Gagal menyimpan warna");
      onRefresh();
    });
  }

  async function handleDeleteCard(cardId: number) {
    try {
      await bdKanbanApi.deleteCard(cardId);
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

      <DualScrollContainer className="flex-1">
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="kanban-board flex gap-4 pb-4" style={{ minWidth: "max-content" }}>
            {columns.map((column) => (
              <KanbanColumnComp
                key={column.id}
                column={column}
                onAddCard={handleAddCard}
                onDeleteCard={handleDeleteCard}
                onUpdateCard={handleUpdateCard}
                onColorChangeCard={handleColorChange}
                onUpdateColumn={handleUpdateColumn}
                onDeleteColumn={handleDeleteColumn}
              />
            ))}
            <AddColumnButton onAdd={handleAddColumn} />
          </div>
        </DragDropContext>
      </DualScrollContainer>
    </>
  );
}
