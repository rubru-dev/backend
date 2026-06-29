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
      const totalAll = stats.byColumn.reduce((s, c) => s + c.total, 0);
      const totalAllCards = stats.byColumn.reduce((s, c) => s + c.count, 0);
      const conversionRate = totalAllCards > 0 ? ((stats.closingCount / totalAllCards) * 100).toFixed(1) : "0.0";
      const now2 = new Date();
      const generatedAt = now2.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) + " " + now2.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

      const colRows = stats.byColumn.map((c) =>
        `<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${c.color};margin-right:6px;vertical-align:middle;"></span>${c.title}</td><td class="n">${c.count}</td><td class="n ${c.title === "Closing" ? "gt" : c.title === "Lost" ? "rt" : ""}">${formatRupiah(c.total)}</td><td class="n">${totalAll > 0 ? ((c.total / totalAll) * 100).toFixed(1) : "0.0"}%</td></tr>`
      ).join("");

      const cardDetails = stats.byColumn.filter((c) => c.count > 0).map((col) =>
        `<div style="margin-bottom:16px;"><div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:6px;background:${col.color}33;border-left:4px solid ${col.color};margin-bottom:8px;"><span style="font-weight:700;font-size:12px;">${col.title}</span><div><span style="font-size:10px;background:${col.color}55;padding:2px 8px;border-radius:10px;font-weight:600;">${col.count} kartu</span><span style="font-weight:700;font-size:12px;margin-left:8px;">${formatRupiah(col.total)}</span></div></div>${col.cards.map((card) => `<div style="border:1px solid #e2e8f0;border-radius:5px;padding:7px 10px;margin-bottom:5px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px;background:#fafafa;"><div style="flex:1;min-width:0;"><div style="font-size:11px;font-weight:600;color:#1e293b;">${card.lead?.nama ?? card.title}</div>${card.created_at ? `<div style="font-size:9px;color:#94a3b8;margin-top:1px;">${new Date(card.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</div>` : ""}</div><div style="font-size:11px;font-weight:700;color:#059669;white-space:nowrap;">${formatRupiah(card.projeksi_sales ?? 0)}</div></div>`).join("")}</div>`
      ).join("");

      const trendRows = chartData.length > 0
        ? chartData.map((m) => `<tr><td>${m.label}</td><td class="n">${m.w1}</td><td class="n">${m.w2}</td><td class="n">${m.w3}</td><td class="n">${m.w4}</td><td class="n gt">${formatRupiah(m.closing)}</td><td class="n rt">${m.lostCount}</td></tr>`).join("")
        : `<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:12px;">Tidak ada data tren.</td></tr>`;

      const css = `@page{margin:15mm;size:A4}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;font-size:13px}.hdr{background:linear-gradient(135deg,#f97316,#c2410c);color:#fff;padding:22px 26px;border-radius:10px;margin-bottom:18px}.hdr h1{font-size:19px;font-weight:700}.hdr .meta{font-size:10px;opacity:.8;margin-top:4px}.badge{display:inline-block;background:#fff3ed;color:#ea580c;border:1px solid #fed7aa;border-radius:20px;padding:4px 14px;font-size:11px;font-weight:600;margin-bottom:16px}.sg{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px}.sc{border:1px solid #e2e8f0;border-radius:8px;padding:13px 15px;background:#f8fafc}.sc.g{border-left:4px solid #10b981}.sc.b{border-left:4px solid #3b82f6}.sc.p{border-left:4px solid #8b5cf6}.sl{font-size:10px;color:#64748b;margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px}.sv{font-size:17px;font-weight:700;color:#059669}.sv.b{color:#2563eb}.sv.p{color:#7c3aed}.ss{font-size:10px;color:#94a3b8;margin-top:2px}.st{font-size:12px;font-weight:700;color:#0f172a;margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid #f1f5f9;margin-top:18px}table{width:100%;border-collapse:collapse;font-size:11px}thead tr{background:#f8fafc}th{padding:8px 10px;text-align:left;font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0}td{padding:7px 10px;border-bottom:1px solid #f1f5f9;color:#334155}.n{text-align:right;font-variant-numeric:tabular-nums}.gt{color:#059669;font-weight:600}.rt{color:#dc2626;font-weight:600}.pb{page-break-before:always}.ft{text-align:center;font-size:9px;color:#94a3b8;margin-top:18px;padding-top:8px;border-top:1px solid #f1f5f9}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;

      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body><div class="hdr"><h1>${summaryTitle}</h1><div class="meta">Digenerate: ${generatedAt} &nbsp;|&nbsp; Sumber: ${source.toUpperCase()}</div></div><span class="badge">&#128197; Filter: ${filteredMonthLabel}</span><div class="sg"><div class="sc g"><div class="sl">Total Closing</div><div class="sv">${formatRupiah(stats.closingTotal)}</div><div class="ss">${stats.closingCount} kartu closing</div></div><div class="sc b"><div class="sl">Conversion Rate</div><div class="sv b">${conversionRate}%</div><div class="ss">${stats.closingCount} dari ${totalAllCards} kartu</div></div><div class="sc p"><div class="sl">Total Pipeline</div><div class="sv p">${formatRupiah(totalAll)}</div><div class="ss">${totalAllCards} kartu</div></div></div><div class="st">&#128202; Ringkasan per Kolom</div><table><thead><tr><th>Kolom</th><th class="n">Kartu</th><th class="n">Proyeksi Sales</th><th class="n">% dari Total</th></tr></thead><tbody>${colRows}</tbody></table>${chartData.length > 0 ? `<div class="st">&#128200; Tren Bulanan (${filterYear})</div><table><thead><tr><th>Bulan</th><th class="n">W1</th><th class="n">W2</th><th class="n">W3</th><th class="n">W4</th><th class="n">Closing</th><th class="n">Lost</th></tr></thead><tbody>${trendRows}</tbody></table>` : ""}<div class="pb"></div><div class="st">&#128196; Detail Kartu per Kolom</div>${cardDetails}<div class="ft">RubahRumah &mdash; ${summaryTitle} &mdash; ${filteredMonthLabel} &mdash; ${generatedAt}</div><script>window.onload=function(){window.print();}</script></body></html>`;

      const w = window.open("", "_blank", "width=1000,height=800");
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

          <Card className="max-w-xs">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Closing {filterMonth ? filteredMonthLabel : "Semua Bulan"}</p>
              <p className="text-lg font-bold text-emerald-600">{formatRupiah(stats.closingTotal)}</p>
              <p className="text-[10px] text-muted-foreground">{stats.closingCount} kartu</p>
            </CardContent>
          </Card>

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
