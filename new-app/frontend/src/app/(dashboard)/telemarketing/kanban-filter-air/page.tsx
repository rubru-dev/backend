"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

const COLUMNS = ["Low", "Medium", "Hot", "Client", "Batal"];

export default function KanbanFilterAirPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["filter-air-kanban-leads"],
    queryFn: () => apiClient.get("/bd/filter-air/leads", { params: { limit: 10000 } }).then((r) => r.data),
  });

  const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

  return (
    <div className="flex flex-col gap-4 h-full p-1">
      <div>
        <h1 className="text-2xl font-bold">Kanban Admin Filter Air</h1>
        <p className="text-muted-foreground text-sm">Board ringkas yang tersinkron dari Follow Up Leads Filter Air.</p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {COLUMNS.map((status) => {
          const cards = items.filter((item) => item.status === status);
          return (
            <div key={status} className="w-72 flex-shrink-0 rounded-lg border bg-slate-50">
              <div className="px-3 py-2 border-b bg-white rounded-t-lg flex justify-between">
                <span className="font-semibold text-sm">{status}</span>
                <span className="text-xs text-muted-foreground">{cards.length}</span>
              </div>
              <div className="p-3 space-y-2 min-h-72">
                {isLoading ? (
                  <p className="text-xs text-muted-foreground">Memuat...</p>
                ) : cards.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Tidak ada lead</p>
                ) : cards.map((card) => (
                  <div key={card.id} className="rounded-md border bg-white p-3 shadow-sm">
                    <p className="text-sm font-medium">{card.display_name ?? card.nama}</p>
                    <p className="text-xs text-muted-foreground">{card.jenis ?? "-"} · {card.nomor_telepon ?? "-"}</p>
                    {card.tanggal_survey && <p className="text-xs text-blue-600 mt-1">Survey: {new Date(card.tanggal_survey).toLocaleDateString("id-ID")}</p>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
