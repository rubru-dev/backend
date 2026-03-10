"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Printer, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { SalesKanbanBoard } from "./kanban-board";
import { salesKanbanApi } from "@/lib/api/kanban";
import type { KanbanColumn } from "@/types";

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function SalesKanbanPage() {
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["/sales/kanban"],
    queryFn: () => salesKanbanApi.getBoard(),
    staleTime: 30_000,
  });

  const columns: KanbanColumn[] = data?.columns ?? [];

  // ── Compute metrics from board data ───────────────────────────────────────
  // Deduplicate by (lead.id, projeksi_sales) — same lead+same value counts once
  function sumProyeksiDedup(cards: KanbanColumn["cards"]): number {
    const seen = new Set<string>();
    let total = 0;
    for (const card of cards ?? []) {
      if (card.projeksi_sales == null) continue;
      const key = card.lead ? `lead-${card.lead.id}-${card.projeksi_sales}` : `card-${card.id}-${card.projeksi_sales}`;
      if (!seen.has(key)) { seen.add(key); total += card.projeksi_sales; }
    }
    return total;
  }

  const closingCol = columns.find((c) => c.title === "Closing");
  const lostCol = columns.find((c) => c.title === "Lost");
  const totalProyeksiClosing = sumProyeksiDedup(closingCol?.cards);
  const totalProyeksiLost = sumProyeksiDedup(lostCol?.cards);

  const colStats = columns.map((col) => ({
    id: col.id,
    title: col.title,
    color: col.color ?? "#e2e8f0",
    count: col.cards?.length ?? 0,
    proyeksi: (col.cards ?? []).reduce((s, c) => s + (c.projeksi_sales ?? 0), 0),
    cards: col.cards ?? [],
  }));

  // ── PDF ────────────────────────────────────────────────────────────────────
  async function handlePrint() {
    setPdfLoading(true);
    try {
      const fmt = formatRupiah;
      const now = new Date();

      const columnSections = colStats.map((col) => {
        const cardRows = col.cards.map((card, i) => `
          <tr>
            <td class="num" style="width:28px">${i + 1}</td>
            <td>
              <strong>${card.title}</strong>
              ${card.description ? `<br/><span style="color:#64748b;font-size:10px">${card.description.slice(0, 120)}${card.description.length > 120 ? "..." : ""}</span>` : ""}
            </td>
            <td>${card.deadline ?? "—"}</td>
            <td class="num">${card.projeksi_sales != null ? fmt(card.projeksi_sales) : "—"}</td>
          </tr>`).join("");

        return `
        <div class="section">
          <div class="section-title" style="border-left:4px solid ${col.color};padding-left:8px">
            ${col.title}
            <span style="font-weight:400;color:#64748b"> — ${col.count} kartu</span>
            ${col.proyeksi > 0 ? `&nbsp;|&nbsp;<span style="color:#16a34a">${fmt(col.proyeksi)}</span>` : ""}
          </div>
          ${col.cards.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th class="num">#</th>
                <th>Judul / Deskripsi</th>
                <th>Deadline</th>
                <th class="num">Proyeksi Sales</th>
              </tr>
            </thead>
            <tbody>${cardRows}</tbody>
          </table>` : `<p style="color:#94a3b8;font-size:11px;padding:6px 0">Tidak ada kartu</p>`}
        </div>`;
      }).join("");

      const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <title>Laporan Kanban Sales</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; padding: 24px 32px; }
    h1 { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 2px; }
    .subtitle { font-size: 12px; color: #64748b; margin-bottom: 4px; }
    .meta { font-size: 11px; color: #94a3b8; margin-bottom: 24px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 13px; font-weight: 700; color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; }
    .cards-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #f8fafc; }
    .card-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
    .card-value { font-size: 20px; font-weight: 700; color: #1e293b; }
    .card-value-green { font-size: 14px; font-weight: 700; color: #16a34a; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px; }
    th { background: #f1f5f9; text-align: left; padding: 7px 10px; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; }
    td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
    /* Letterhead */
    .letterhead { display: flex; align-items: center; gap: 16px; margin-bottom: 10px; }
    .letterhead-logo { height: 64px; width: auto; object-fit: contain; flex-shrink: 0; }
    .letterhead-info { flex: 1; }
    .company-name { font-size: 15px; font-weight: 700; color: #1e293b; letter-spacing: 0.02em; text-transform: uppercase; }
    .company-detail { font-size: 11px; color: #475569; margin-top: 2px; line-height: 1.5; }
    .letterhead-divider { border: none; border-top: 2px solid #1e293b; margin: 10px 0 16px; }
    @media print {
      body { padding: 16px 20px; }
      .cards-row { grid-template-columns: repeat(4, 1fr); }
    }
  </style>
</head>
<body>
  <!-- Letterhead -->
  <div class="letterhead">
    <img src="${window.location.origin}/images/logo.png" alt="Logo" class="letterhead-logo" onerror="this.style.display='none'"/>
    <div class="letterhead-info">
      <div class="company-name">PT. Rubah Rumah Inovasi Pemuda</div>
      <div class="company-detail">Telp: 081376405550</div>
      <div class="company-detail">Jl. Pandu II No.420. Sepanjang Jaya. Kec. Rawalumbu. Kota Bekasi. Jawa Barat 17116</div>
    </div>
  </div>
  <hr class="letterhead-divider"/>

  <!-- Header -->
  <div class="section">
    <h1>Laporan Kanban Sales</h1>
    <div class="subtitle">Pipeline sales — proyeksi per kolom</div>
    <div class="meta">Dibuat: ${now.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
  </div>

  <!-- Ringkasan -->
  <div class="section">
    <div class="section-title">Ringkasan</div>
    <div class="cards-row" style="grid-template-columns: repeat(2, 1fr)">
      <div class="card">
        <div class="card-label">Total Proyek Sales (Closing)</div>
        <div class="card-value-green">${fmt(totalProyeksiClosing)}</div>
      </div>
      <div class="card">
        <div class="card-label">Total Lost Proyeksi Sales</div>
        <div class="card-value" style="color:#ef4444">${fmt(totalProyeksiLost)}</div>
      </div>
    </div>
  </div>

  <!-- Per Kolom -->
  ${columnSections}

  <div class="footer">
    <span>PT. Rubah Rumah Inovasi Pemuda — Laporan Kanban Sales</span>
    <span>Dibuat otomatis oleh sistem</span>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

      const w = window.open("", "_blank", "width=900,height=700");
      if (!w) { alert("Popup diblokir. Izinkan popup untuk halaman ini."); return; }
      w.document.write(html);
      w.document.close();
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kanban Sales"
        description="Pipeline sales — drag, custom warna, tambah kolom & kartu, proyeksi sales"
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

      {/* ── Metrics Summary ── */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Proyek Sales (Closing)</p>
            <p className="text-lg font-bold mt-1 text-emerald-600">{formatRupiah(totalProyeksiClosing)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Lost Proyeksi Sales</p>
            <p className="text-lg font-bold mt-1 text-red-500">{formatRupiah(totalProyeksiLost)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Per-column proyeksi breakdown ── */}
      {colStats.some((c) => c.proyeksi > 0) && (
        <div className="flex flex-wrap gap-2">
          {colStats.filter((c) => c.count > 0).map((col) => (
            <div
              key={col.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm bg-card"
              style={{ borderLeftColor: col.color, borderLeftWidth: 3 }}
            >
              <span className="font-medium text-xs">{col.title}</span>
              <span className="text-muted-foreground text-xs">{col.count} kartu</span>
              {col.proyeksi > 0 && (
                <span className="text-emerald-600 font-semibold text-xs flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {formatRupiah(col.proyeksi)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Board ── */}
      <SalesKanbanBoard
        initialColumns={data?.columns ?? []}
        isLoading={isLoading}
        onRefresh={refetch}
      />
    </div>
  );
}
