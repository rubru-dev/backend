"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Printer, BarChart3, Kanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { KanbanBoard } from "./kanban-board";
import { KanbanMetrics } from "./kanban-metrics";
import { bdKanbanApi } from "@/lib/api/kanban";
import type { KanbanColumn } from "@/types";

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

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function isOverdue(d: string | null | undefined) {
  if (!d) return false;
  return new Date(d) < new Date();
}

function generateKanbanPDF(columns: KanbanColumn[]) {
  const now = new Date().toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" });
  const totalCards = columns.reduce((s, c) => s + (c.cards?.length ?? 0), 0);

  const colSections = columns.map((col) => {
    const cards = col.cards ?? [];
    const bg = col.color ? `${col.color}` : "#f1f5f9";
    const borderColor = col.color ?? "#94a3b8";

    const cardRows = cards.map((card, i) => {
      const dl = card.deadline ?? card.due_date;
      const overdue = isOverdue(dl);
      const dlStyle = overdue
        ? "color:#dc2626;font-weight:600"
        : "color:#374151";
      const rowBg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      const labelDots = (card.labels ?? []).map(lb =>
        `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${lb.color ?? "#6366f1"};margin-right:3px;vertical-align:middle" title="${lb.label_name ?? ""}"></span>`
      ).join("");

      return `
        <tr style="background:${rowBg};border-bottom:1px solid #e2e8f0">
          <td style="padding:8px 10px;font-size:11px;color:#6b7280;width:28px;text-align:center;vertical-align:top">${i + 1}</td>
          <td style="padding:8px 10px;font-size:12px;font-weight:600;color:#0f172a;vertical-align:top;min-width:140px">
            ${card.color ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${card.color};margin-right:5px;vertical-align:middle"></span>` : ""}
            ${card.title}
            ${labelDots ? `<div style="margin-top:4px">${labelDots}</div>` : ""}
          </td>
          <td style="padding:8px 10px;font-size:11px;color:#475569;vertical-align:top;line-height:1.5">
            ${card.description ? card.description.replace(/\n/g, "<br>") : '<span style="color:#94a3b8;font-style:italic">—</span>'}
          </td>
          <td style="padding:8px 10px;font-size:11px;vertical-align:top;white-space:nowrap;${dlStyle}">
            ${dl ? `${overdue ? "⚠ " : ""}${fmtDate(dl)}` : '<span style="color:#94a3b8">—</span>'}
          </td>
          <td style="padding:8px 10px;font-size:11px;color:#475569;vertical-align:top;white-space:nowrap">
            ${card.assigned_user?.name ?? '<span style="color:#94a3b8">—</span>'}
          </td>
        </tr>`;
    }).join("");

    const emptyRow = cards.length === 0
      ? `<tr><td colspan="5" style="padding:14px;text-align:center;color:#94a3b8;font-style:italic;font-size:11px">Tidak ada kartu</td></tr>`
      : "";

    return `
      <div style="margin-bottom:24px">
        <div style="background:${bg};border-left:4px solid ${borderColor};border-radius:6px 6px 0 0;padding:10px 14px;display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:13px;font-weight:700;color:#0f172a">${col.title}</span>
          <span style="font-size:11px;font-weight:600;color:#475569;background:rgba(255,255,255,0.7);padding:2px 8px;border-radius:999px">${cards.length} kartu</span>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px;overflow:hidden">
          <thead>
            <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
              <th style="padding:6px 10px;font-size:10px;color:#64748b;text-align:center;width:28px">#</th>
              <th style="padding:6px 10px;font-size:10px;color:#64748b;text-align:left;min-width:140px">Judul</th>
              <th style="padding:6px 10px;font-size:10px;color:#64748b;text-align:left">Deskripsi</th>
              <th style="padding:6px 10px;font-size:10px;color:#64748b;text-align:left;white-space:nowrap">Deadline</th>
              <th style="padding:6px 10px;font-size:10px;color:#64748b;text-align:left;white-space:nowrap">PIC</th>
            </tr>
          </thead>
          <tbody>${cardRows}${emptyRow}</tbody>
        </table>
      </div>`;
  }).join("");

  const overdueTotal = columns.flatMap(c => c.cards ?? []).filter(c => isOverdue(c.deadline ?? c.due_date)).length;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Kanban BD Summary — RubahRumah</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; background: #fff; }
    @media print {
      @page { size: A4 portrait; margin: 14mm 12mm; }
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:3px solid #4f46e5;margin-bottom:16px">
    <div>
      <h1 style="margin:0;font-size:20px;color:#4f46e5;font-weight:700;letter-spacing:0.5px">KANBAN BD — SUMMARY</h1>
      <p style="margin:3px 0 0;font-size:11px;color:#64748b">Pipeline Business Development · RubahRumah</p>
    </div>
    <div style="text-align:right">
      <p style="margin:0;font-size:10px;color:#94a3b8">Dicetak: ${now}</p>
    </div>
  </div>

  <!-- Stats bar -->
  <div style="display:flex;gap:12px;margin-bottom:20px">
    <div style="flex:1;background:#ede9fe;border-radius:8px;padding:10px 14px">
      <div style="font-size:22px;font-weight:700;color:#4f46e5">${columns.length}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:1px">Total Kolom</div>
    </div>
    <div style="flex:1;background:#e0f2fe;border-radius:8px;padding:10px 14px">
      <div style="font-size:22px;font-weight:700;color:#0284c7">${totalCards}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:1px">Total Kartu</div>
    </div>
    ${overdueTotal > 0 ? `
    <div style="flex:1;background:#fee2e2;border-radius:8px;padding:10px 14px">
      <div style="font-size:22px;font-weight:700;color:#dc2626">${overdueTotal}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:1px">Lewat Deadline</div>
    </div>` : ""}
  </div>

  <!-- Columns -->
  ${colSections}

  <!-- Footer -->
  <div style="margin-top:16px;padding-top:8px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between">
    <span style="font-size:10px;color:#94a3b8">RubahRumah — Report Rubru</span>
    <span style="font-size:10px;color:#94a3b8">${now}</span>
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

export function KanbanPage() {
  const [tab, setTab] = useState("board");
  const [filterBulan, setFilterBulan] = useState("all");
  const [filterTahun, setFilterTahun] = useState("all");

  const bulanNum = filterBulan !== "all" ? parseInt(filterBulan) : undefined;
  const tahunNum = filterTahun !== "all" ? parseInt(filterTahun) : undefined;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["/bd/kanban", filterBulan, filterTahun],
    queryFn: () => bdKanbanApi.getBoard(bulanNum, tahunNum),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kanban BD"
        description="Pipeline business development — drag, custom warna, tambah kolom & kartu"
        actions={
          <div className="flex gap-2 flex-wrap items-center">
            <Select value={filterBulan} onValueChange={setFilterBulan}>
              <SelectTrigger className="w-[120px] h-9 text-sm"><SelectValue placeholder="Bulan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bulan</SelectItem>
                {BULAN_OPTIONS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTahun} onValueChange={setFilterTahun}>
              <SelectTrigger className="w-[100px] h-9 text-sm"><SelectValue placeholder="Tahun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tahun</SelectItem>
                {TAHUN_OPTIONS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            {(filterBulan !== "all" || filterTahun !== "all") && (
              <Button variant="ghost" size="sm" className="h-9 text-xs px-2" onClick={() => { setFilterBulan("all"); setFilterTahun("all"); }}>
                Reset
              </Button>
            )}
            {tab === "board" && (
              <Button variant="outline" size="sm" onClick={() => generateKanbanPDF(data?.columns ?? [])} className="no-print">
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
