"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SalesKanbanBoard } from "./kanban-board";
import { salesKanbanApi } from "@/lib/api/kanban";
import type { KanbanColumn } from "@/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const FULL_MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function dedupKey(card: NonNullable<KanbanColumn["cards"]>[number]) {
  return card.lead ? `lead-${card.lead.id}-${card.projeksi_sales ?? 0}` : `card-${card.id}-${card.projeksi_sales ?? 0}`;
}

function sumProyeksiDedup(cards: KanbanColumn["cards"] = []) {
  const seen = new Set<string>();
  let total = 0;
  for (const card of cards) {
    if (card.projeksi_sales == null) continue;
    const key = dedupKey(card);
    if (seen.has(key)) continue;
    seen.add(key);
    total += card.projeksi_sales;
  }
  return total;
}

function filterColumns(columns: KanbanColumn[], month: number | null, year: number) {
  if (month === null) return columns;
  return columns.map((col) => ({
    ...col,
    cards: (col.cards ?? []).filter((card) => {
      if (!card.created_at) return false;
      const d = new Date(card.created_at);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    }),
  }));
}

type SalesKanbanPageProps = {
  source?: "rubru" | "rkr" | "golden" | "filter-air";
  title?: string;
  summaryTitle?: string;
  description?: string;
};

export function SalesKanbanPage({
  source = "rubru",
  title = "Kanban Sales Rubru",
  summaryTitle = "Summary Sales Rubru",
  description = "Pipeline sales Rubru - drag, custom warna, tambah kolom & kartu, proyeksi sales",
}: SalesKanbanPageProps) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterYear, setFilterYear] = useState(now.getFullYear());

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["/sales/kanban", source],
    queryFn: () => salesKanbanApi.getBoard(source),
    staleTime: 30_000,
  });

  const allColumns = data?.columns ?? [];
  const columns = useMemo(() => filterColumns(allColumns, filterMonth, filterYear), [allColumns, filterMonth, filterYear]);

  const stats = useMemo(() => {
    const byColumn = columns.map((col) => ({
      id: col.id,
      title: col.title,
      color: col.color ?? "#94a3b8",
      count: col.cards?.length ?? 0,
      total: sumProyeksiDedup(col.cards ?? []),
      cards: col.cards ?? [],
    }));
    const closing = byColumn.find((c) => c.title === "Closing");
    const lost = byColumn.find((c) => c.title === "Lost");
    return {
      byColumn,
      totalCards: byColumn.reduce((sum, col) => sum + col.count, 0),
      closingTotal: closing?.total ?? 0,
      closingCount: closing?.count ?? 0,
      lostTotal: lost?.total ?? 0,
      lostCount: lost?.count ?? 0,
    };
  }, [columns]);

  const monthlyData = useMemo(() => {
    const buckets = new Map<string, { key: string; label: string; closing: number; lost: number; lostCount: number; w1: number; w2: number; w3: number; w4: number }>();
    for (const col of allColumns) {
      for (const card of col.cards ?? []) {
        if (!card.created_at) continue;
        const d = new Date(card.created_at);
        if (Number.isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const bucket = buckets.get(key) ?? { key, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, closing: 0, lost: 0, lostCount: 0, w1: 0, w2: 0, w3: 0, w4: 0 };
        const value = card.projeksi_sales ?? 0;
        if (col.title === "Closing") bucket.closing += value;
        if (col.title === "Lost") { bucket.lost += value; bucket.lostCount += 1; }
        if (col.title === "W1") bucket.w1 += 1;
        if (col.title === "W2") bucket.w2 += 1;
        if (col.title === "W3") bucket.w3 += 1;
        if (col.title === "W4") bucket.w4 += 1;
        buckets.set(key, bucket);
      }
    }
    return Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [allColumns]);

  const chartData = useMemo(() => {
    return monthlyData.filter((item) => {
      const [year, month] = item.key.split("-").map(Number);
      if (year !== filterYear) return false;
      return filterMonth === null || month === filterMonth;
    });
  }, [monthlyData, filterMonth, filterYear]);

  const filteredMonthLabel = filterMonth === null ? "Semua bulan" : `${MONTHS[filterMonth - 1]} ${filterYear}`;

  async function handlePrint() {
    setPdfLoading(true);
    try {
      const html = `<!doctype html><html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:24px}h1{font-size:20px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.card{border:1px solid #ddd;padding:12px;border-radius:8px}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border-bottom:1px solid #eee;padding:8px;text-align:left}.num{text-align:right}</style></head><body><h1>${summaryTitle}</h1><p>Filter: ${filteredMonthLabel}</p><div class="grid"><div class="card">Total Sales<br><b>${formatRupiah(stats.byColumn.reduce((s, c) => s + c.total, 0))}</b></div><div class="card">Closing<br><b>${formatRupiah(stats.closingTotal)}</b></div><div class="card">Lost<br><b>${formatRupiah(stats.lostTotal)}</b></div></div><table><thead><tr><th>Kolom</th><th class="num">Kartu</th><th class="num">Proyeksi</th></tr></thead><tbody>${stats.byColumn.map((c) => `<tr><td>${c.title}</td><td class="num">${c.count}</td><td class="num">${formatRupiah(c.total)}</td></tr>`).join("")}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`;
      const w = window.open("", "_blank", "width=900,height=700");
      if (!w) return alert("Popup diblokir. Izinkan popup untuk halaman ini.");
      w.document.write(html);
      w.document.close();
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={pdfLoading || isLoading}>
              <Printer className="h-4 w-4 mr-1" />
              {pdfLoading ? "Menyiapkan..." : "Save to PDF"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="summary">{summaryTitle}</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="space-y-4">
          <SalesKanbanBoard
            initialColumns={allColumns}
            isLoading={isLoading}
            onRefresh={refetch}
            source={source}
            filterMonth={filterMonth}
            filterYear={filterYear}
            onFilterMonthChange={setFilterMonth}
            onFilterYearChange={setFilterYear}
          />
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-white p-3">
            <span className="text-sm font-medium text-muted-foreground">Filter Summary:</span>
            <Select value={filterMonth === null ? "all" : String(filterMonth)} onValueChange={(v) => setFilterMonth(v === "all" ? null : Number(v))}>
              <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bulan</SelectItem>
                {FULL_MONTHS.map((month, index) => <SelectItem key={month} value={String(index + 1)}>{month}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}>
              <SelectTrigger className="h-8 w-28 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {YEARS.map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">Aktif: {filteredMonthLabel}</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Proyek Sales</p><p className="text-lg font-bold text-emerald-600">{formatRupiah(stats.byColumn.reduce((s, c) => s + c.total, 0))}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Closing {filterMonth ? filteredMonthLabel : "Semua Bulan"}</p><p className="text-lg font-bold text-emerald-600">{formatRupiah(stats.closingTotal)}</p><p className="text-[10px] text-muted-foreground">{stats.closingCount} kartu</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Lost</p><p className="text-lg font-bold text-red-500">{formatRupiah(stats.lostTotal)}</p><p className="text-[10px] text-muted-foreground">{stats.lostCount} kartu</p></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Total Sales dari Bulan ke Bulan</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Number(v) / 1000000}jt`} />
                    <Tooltip formatter={(v) => formatRupiah(Number(v))} />
                    <Bar dataKey="closing" name="Total Sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Perbandingan W1, W2, W3, W4 dan Lost per Bulan</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="w1" name="W1" fill="#3b82f6" />
                    <Bar dataKey="w2" name="W2" fill="#22c55e" />
                    <Bar dataKey="w3" name="W3" fill="#eab308" />
                    <Bar dataKey="w4" name="W4" fill="#f97316" />
                    <Bar dataKey="lostCount" name="Lost" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Summary per Kartu dari Filter</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {stats.byColumn.map((col) => (
                <div key={col.id} className="rounded-md border p-3" style={{ borderLeft: `4px solid ${col.color}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{col.title}</p>
                    <span className="text-xs text-muted-foreground">{col.count} kartu</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-emerald-600">{formatRupiah(col.total)}</p>
                  <div className="mt-3 space-y-2">
                    {col.cards.length ? col.cards.map((card) => (
                      <div key={card.id} className="rounded border bg-slate-50 px-2 py-1.5 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium leading-snug">{card.lead?.nama ?? card.title}</span>
                          <span className="shrink-0 font-semibold text-emerald-600">{formatRupiah(card.projeksi_sales ?? 0)}</span>
                        </div>
                        {card.created_at && <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(card.created_at).toLocaleDateString("id-ID")}</p>}
                      </div>
                    )) : <p className="text-xs text-muted-foreground">Tidak ada kartu pada filter ini.</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
