"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { desainApi } from "@/lib/api/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Loader2, Plus, Pencil, Trash2, GripVertical, User, CalendarDays, Kanban } from "lucide-react";

interface Lead { id: string; nama: string; telepon?: string; jenis?: string; status?: string; }
interface Card { id: string; column_id: string; catatan?: string | null; deadline?: string | null; lead?: Lead | null; assignee?: { id: string; nama: string } | null; urutan: number; }
interface Column { id: string; title: string; color?: string | null; urutan: number; is_permanent: boolean; cards: Card[]; }

const JENIS_COLOR: Record<string, string> = { Sipil: "bg-blue-100 text-blue-700", Desain: "bg-purple-100 text-purple-700", Interior: "bg-amber-100 text-amber-700" };
const STATUS_COLOR: Record<string, string> = { Low: "bg-slate-100 text-slate-600", Medium: "bg-yellow-100 text-yellow-700", Hot: "bg-red-100 text-red-600", Client: "bg-green-100 text-green-700" };

function fmtDate(d?: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  return dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
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

  // Drag state
  const dragCard = useRef<{ cardId: string; fromColumnId: string } | null>(null);

  // Column dialog
  const [colDialog, setColDialog] = useState<{ open: boolean; id?: string; title: string; color: string }>({ open: false, title: "", color: "#6366f1" });

  // Card dialog
  const [cardDialog, setCardDialog] = useState<{
    open: boolean; columnId?: string; cardId?: string;
    lead_id: string; catatan: string; deadline: string; assigned_to: string;
  }>({ open: false, lead_id: "", catatan: "", deadline: "", assigned_to: "" });

  // Delete confirms
  const [deleteCol, setDeleteCol] = useState<string | null>(null);
  const [deleteCard, setDeleteCard] = useState<string | null>(null);

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

  const createCardMut = useMutation({
    mutationFn: () => desainApi.createCard(cardDialog.columnId!, {
      lead_id: cardDialog.lead_id || undefined,
      catatan: cardDialog.catatan || undefined,
      deadline: cardDialog.deadline || undefined,
      assigned_to: cardDialog.assigned_to || undefined,
    }),
    onSuccess: () => { toast.success("Card ditambahkan"); qc.invalidateQueries({ queryKey: ["desain-kanban"] }); setCardDialog({ open: false, lead_id: "", catatan: "", deadline: "", assigned_to: "" }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });
  const updateCardMut = useMutation({
    mutationFn: () => desainApi.updateCard(cardDialog.cardId!, {
      lead_id: cardDialog.lead_id || null,
      catatan: cardDialog.catatan || null,
      deadline: cardDialog.deadline || null,
      assigned_to: cardDialog.assigned_to || null,
    }),
    onSuccess: () => { toast.success("Card diperbarui"); qc.invalidateQueries({ queryKey: ["desain-kanban"] }); setCardDialog({ open: false, lead_id: "", catatan: "", deadline: "", assigned_to: "" }); },
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

  function openAddCard(columnId: string) {
    setCardDialog({ open: true, columnId, lead_id: "", catatan: "", deadline: "", assigned_to: "" });
  }
  function openEditCard(card: Card) {
    setCardDialog({
      open: true, cardId: card.id, columnId: card.column_id,
      lead_id: card.lead?.id ?? "",
      catatan: card.catatan ?? "",
      deadline: card.deadline ?? "",
      assigned_to: card.assignee?.id ?? "",
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

  if (isLoading) {
    return <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Kanban className="text-purple-500" size={24} />
            Follow Up After Survey
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Kanban follow up desain setelah survey</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setColDialog({ open: true, title: "", color: "#6366f1" })}>
          <Plus size={14} className="mr-1" /> Tambah Kolom
        </Button>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {columns.map((col) => (
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
                  <div className="flex items-center gap-2 mt-2">
                    {card.deadline && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays size={11} />
                        {fmtDate(card.deadline)}
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
      <Dialog open={cardDialog.open} onOpenChange={(o) => !o && setCardDialog({ open: false, lead_id: "", catatan: "", deadline: "", assigned_to: "" })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{cardDialog.cardId ? "Edit Card" : "Tambah Card"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Lead (opsional)</Label>
              <Select value={cardDialog.lead_id} onValueChange={(v) => setCardDialog((d) => ({ ...d, lead_id: v === "_none" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih lead..." />
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
              <Label>Catatan</Label>
              <Textarea rows={3} value={cardDialog.catatan} onChange={(e) => setCardDialog((d) => ({ ...d, catatan: e.target.value }))} placeholder="Catatan tambahan..." />
            </div>
            <div className="space-y-1">
              <Label>Deadline</Label>
              <Input type="date" value={cardDialog.deadline} onChange={(e) => setCardDialog((d) => ({ ...d, deadline: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCardDialog({ open: false, lead_id: "", catatan: "", deadline: "", assigned_to: "" })}>Batal</Button>
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
