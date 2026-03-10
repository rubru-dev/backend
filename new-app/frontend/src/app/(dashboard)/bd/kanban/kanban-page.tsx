"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Printer, BarChart3, Kanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { KanbanBoard } from "./kanban-board";
import { KanbanMetrics } from "./kanban-metrics";
import { bdKanbanApi } from "@/lib/api/kanban";

export function KanbanPage() {
  const [tab, setTab] = useState("board");
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["/bd/kanban"],
    queryFn: () => bdKanbanApi.getBoard(),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kanban BD"
        description="Pipeline business development — drag, custom warna, tambah kolom & kartu"
        actions={
          <div className="flex gap-2">
            {tab === "board" && (
              <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
                <Printer className="h-4 w-4 mr-1" /> Save to PDF
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="no-print">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="no-print">
          <TabsTrigger value="board" className="flex items-center gap-1.5">
            <Kanban className="h-4 w-4" /> Board
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" /> Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-4">
          <KanbanBoard
            initialColumns={data?.columns ?? []}
            isLoading={isLoading}
            onRefresh={refetch}
          />
        </TabsContent>

        <TabsContent value="metrics" className="mt-4">
          <KanbanMetrics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
