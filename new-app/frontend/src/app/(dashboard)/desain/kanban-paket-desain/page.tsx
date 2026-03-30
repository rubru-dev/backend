"use client";

import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { desainApi } from "@/lib/api/content";
import { Loader2, Kanban, GripVertical } from "lucide-react";

const STAGE_COLORS = [
  "#6366f1", "#f59e0b", "#ec4899", "#10b981", "#14b8a6", "#3b82f6",
];

interface KanbanCard {
  id: string;
  lead: { id: string; nama: string } | null;
  dibuat_oleh: { id: string; nama: string } | null;
  jenis_desain: string | null;
  bulan: number | null;
  tahun: number | null;
  progress: number;
  paket_stage: number;
}

interface KanbanColumn {
  id: number;
  title: string;
  cards: KanbanCard[];
}

export default function KanbanPaketDesainPage() {
  const qc = useQueryClient();
  const dragCard = useRef<{ cardId: string; fromStage: number } | null>(null);

  const { data: columns = [], isLoading } = useQuery<KanbanColumn[]>({
    queryKey: ["desain-kanban-paket"],
    queryFn: () => desainApi.getKanbanPaket(),
  });

  const moveCardMut = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: number }) =>
      desainApi.moveKanbanPaket(id, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["desain-kanban-paket"] }),
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal memindahkan"),
  });

  function onDragStart(cardId: string, fromStage: number) {
    dragCard.current = { cardId, fromStage };
  }

  function onDrop(toStage: number) {
    if (!dragCard.current) return;
    if (dragCard.current.fromStage !== toStage) {
      moveCardMut.mutate({ id: dragCard.current.cardId, stage: toStage });
    }
    dragCard.current = null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Kanban className="text-purple-500" size={24} />
            Kanban Paket Desain
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Progres paket desain per klien — drag &amp; drop untuk update tahap
          </p>
        </div>
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
            <div className="flex items-center gap-2 mb-2 px-1">
              <div
                className="w-3 h-3 rounded-full flex-none"
                style={{ background: STAGE_COLORS[col.id] ?? "#94a3b8" }}
              />
              <span className="font-semibold text-sm">{col.title}</span>
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5">
                {col.cards.length}
              </span>
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
                  <div className="flex items-start gap-1">
                    <GripVertical
                      size={14}
                      className="text-muted-foreground mt-0.5 flex-none opacity-40 group-hover:opacity-100"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-800 leading-tight">
                        {card.lead?.nama ?? "—"}
                      </p>
                      {card.jenis_desain && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium mt-1 inline-block">
                          {card.jenis_desain}
                        </span>
                      )}
                      {(card.bulan || card.tahun) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {card.bulan && card.tahun
                            ? `${card.bulan}/${card.tahun}`
                            : card.tahun ?? card.bulan}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {col.cards.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground py-4">
                  Tidak ada klien di tahap ini
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
