"use client";

import { useEffect, useState, useMemo } from "react";
import { financeApi } from "@/lib/api/finance";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, Download } from "lucide-react";
import { Document, Page, Text, View, StyleSheet, pdf as toPdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";

const IDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

function monthLabel(m: string) {
  if (!m) return "Semua Bulan";
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function inMonth(dateStr: string | null | undefined, filterBulan: string): boolean {
  if (!filterBulan) return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const [fy, fm] = filterBulan.split("-").map(Number);
  return d.getFullYear() === fy && d.getMonth() + 1 === fm;
}

// ── PDF Styles ─────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page:         { padding: 32, fontFamily: "Helvetica", fontSize: 9, color: "#111" },
  title:        { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitle:     { fontSize: 8, color: "#6b7280", marginBottom: 10 },
  filterLine:   { fontSize: 8, color: "#6b7280", marginBottom: 12 },
  summaryRow:   { flexDirection: "row", gap: 8, marginBottom: 14 },
  summaryBox:   { flex: 1, padding: 8, border: "1 solid #e5e7eb", borderRadius: 4 },
  summaryLabel: { fontSize: 7, color: "#6b7280", textTransform: "uppercase", marginBottom: 2 },
  summaryValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  table:        { border: "1 solid #e5e7eb", borderRadius: 4 },
  thead:        { flexDirection: "row", backgroundColor: "#f9fafb", borderBottom: "1 solid #e5e7eb" },
  th:           { padding: "5 6", fontSize: 8, fontFamily: "Helvetica-Bold", color: "#6b7280" },
  tr:           { flexDirection: "row", borderBottom: "1 solid #f3f4f6" },
  trAlt:        { flexDirection: "row", borderBottom: "1 solid #f3f4f6", backgroundColor: "#fafafa" },
  td:           { padding: "5 6", fontSize: 8 },
  tdR:          { padding: "5 6", fontSize: 8, textAlign: "right" },
  tfoot:        { flexDirection: "row", backgroundColor: "#f9fafb", borderTop: "1 solid #d1d5db" },
  tfTd:         { padding: "5 6", fontSize: 8, fontFamily: "Helvetica-Bold" },
  tfTdR:        { padding: "5 6", fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "right" },
  green:        { color: "#16a34a" },
  red:          { color: "#dc2626" },
  printed:      { position: "absolute", bottom: 20, right: 32, fontSize: 7, color: "#9ca3af" },
  subRow:       { flexDirection: "row", borderBottom: "1 solid #f3f4f6", backgroundColor: "#f8fafc" },
  subTd:        { padding: "4 6", fontSize: 7, color: "#6b7280" },
  subTdR:       { padding: "4 6", fontSize: 7, color: "#6b7280", textAlign: "right" },
  clientRow:    { flexDirection: "row", borderBottom: "1 solid #e5e7eb", backgroundColor: "#f0fdfa" },
  clientTd:     { padding: "5 6", fontSize: 8, fontFamily: "Helvetica-Bold", color: "#0f766e" },
  clientTdR:    { padding: "5 6", fontSize: 8, fontFamily: "Helvetica-Bold", color: "#0f766e", textAlign: "right" },
});

const printedAt = () =>
  `Dicetak: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;

// ── PDF: Survey ────────────────────────────────────────────────────────────────
function ArSurveyPDF({ rows, filterBulan, search, totals }: {
  rows: SurveyRow[];
  filterBulan: string;
  search: string;
  totals: { tagihan: number; terbayar: number; outstanding: number };
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={S.page}>
        <Text style={S.title}>AR Tagihan Survey</Text>
        <Text style={S.subtitle}>Rekap tagihan survey Rp 300.000 per client yang sudah disetujui</Text>
        <Text style={S.filterLine}>
          Bulan: {monthLabel(filterBulan)}{search ? `  |  Pencarian: "${search}"` : ""}
          {"  |  "}Total data: {rows.length} survey
        </Text>
        <View style={S.summaryRow}>
          <View style={S.summaryBox}><Text style={S.summaryLabel}>Total Tagihan</Text><Text style={S.summaryValue}>{IDR(totals.tagihan)}</Text></View>
          <View style={S.summaryBox}><Text style={S.summaryLabel}>Total Terbayar</Text><Text style={[S.summaryValue, S.green]}>{IDR(totals.terbayar)}</Text></View>
          <View style={S.summaryBox}><Text style={S.summaryLabel}>Outstanding</Text><Text style={[S.summaryValue, totals.outstanding > 0 ? S.red : S.green]}>{IDR(totals.outstanding)}</Text></View>
        </View>
        <View style={S.table}>
          <View style={S.thead}>
            <Text style={[S.th, { width: 24 }]}>No</Text>
            <Text style={[S.th, { flex: 2 }]}>Nama Client</Text>
            <Text style={[S.th, { flex: 2 }]}>PIC Survey</Text>
            <Text style={[S.th, { flex: 1.5 }]}>Tgl Survey</Text>
            <Text style={[S.th, { flex: 1.5 }]}>Disetujui</Text>
            <Text style={[S.th, { flex: 1.2, textAlign: "right" }]}>Tagihan</Text>
            <Text style={[S.th, { flex: 1.2, textAlign: "right" }]}>Terbayar</Text>
            <Text style={[S.th, { flex: 1.2, textAlign: "right" }]}>Outstanding</Text>
          </View>
          {rows.map((r, i) => (
            <View key={r.lead_id} style={i % 2 === 0 ? S.tr : S.trAlt}>
              <Text style={[S.td, { width: 24, color: "#9ca3af" }]}>{i + 1}</Text>
              <Text style={[S.td, { flex: 2, fontFamily: "Helvetica-Bold" }]}>{r.nama_client}</Text>
              <Text style={[S.td, { flex: 2 }]}>{r.pic_survey}</Text>
              <Text style={[S.td, { flex: 1.5, color: "#6b7280" }]}>{fmtDate(r.tanggal_survey)}</Text>
              <Text style={[S.td, { flex: 1.5, color: "#6b7280" }]}>{fmtDate(r.survey_approved_at)}</Text>
              <Text style={[S.tdR, { flex: 1.2 }]}>{IDR(r.tagihan)}</Text>
              <Text style={[S.tdR, { flex: 1.2, color: "#16a34a" }]}>{IDR(r.total_terbayar)}</Text>
              <Text style={[S.tdR, { flex: 1.2, fontFamily: "Helvetica-Bold", color: r.outstanding > 0 ? "#dc2626" : "#16a34a" }]}>{IDR(r.outstanding)}</Text>
            </View>
          ))}
          <View style={S.tfoot}>
            <Text style={[S.tfTd, { width: 24 }]} />
            <Text style={[S.tfTd, { flex: 7 }]}>Total ({rows.length} survey)</Text>
            <Text style={[S.tfTdR, { flex: 1.2 }]}>{IDR(totals.tagihan)}</Text>
            <Text style={[S.tfTdR, { flex: 1.2, color: "#16a34a" }]}>{IDR(totals.terbayar)}</Text>
            <Text style={[S.tfTdR, { flex: 1.2, color: totals.outstanding > 0 ? "#dc2626" : "#16a34a" }]}>{IDR(totals.outstanding)}</Text>
          </View>
        </View>
        <Text style={S.printed}>{printedAt()}</Text>
      </Page>
    </Document>
  );
}

// ── PDF: Desain ────────────────────────────────────────────────────────────────
function ArDesainPDF({ rows, filterBulan, search, filterPaket, totals }: {
  rows: DesainRow[];
  filterBulan: string;
  search: string;
  filterPaket: string;
  totals: { total: number; terbayar: number; outstanding: number };
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={S.page}>
        <Text style={S.title}>AR Tagihan Desain</Text>
        <Text style={S.subtitle}>Rekap tagihan desain berdasarkan invoice Payment Desain</Text>
        <Text style={S.filterLine}>
          Bulan: {monthLabel(filterBulan)}{filterPaket ? `  |  Paket: ${filterPaket}` : ""}
          {search ? `  |  Pencarian: "${search}"` : ""}{"  |  "}Total: {rows.length} client
        </Text>
        <View style={S.summaryRow}>
          <View style={S.summaryBox}><Text style={S.summaryLabel}>Total Harga</Text><Text style={S.summaryValue}>{IDR(totals.total)}</Text></View>
          <View style={S.summaryBox}><Text style={S.summaryLabel}>Total Terbayar</Text><Text style={[S.summaryValue, S.green]}>{IDR(totals.terbayar)}</Text></View>
          <View style={S.summaryBox}><Text style={S.summaryLabel}>Outstanding</Text><Text style={[S.summaryValue, totals.outstanding > 0 ? S.red : S.green]}>{IDR(totals.outstanding)}</Text></View>
        </View>
        <View style={S.table}>
          <View style={S.thead}>
            <Text style={[S.th, { width: 24 }]}>No</Text>
            <Text style={[S.th, { flex: 3 }]}>Nama Client</Text>
            <Text style={[S.th, { flex: 1.2 }]}>Paket</Text>
            <Text style={[S.th, { flex: 1.5, textAlign: "right" }]}>Total Harga</Text>
            <Text style={[S.th, { flex: 1.5, textAlign: "right" }]}>Terbayar</Text>
            <Text style={[S.th, { flex: 1.5, textAlign: "right" }]}>Outstanding</Text>
            <Text style={[S.th, { flex: 0.8, textAlign: "center" }]}>Invoice</Text>
          </View>
          {rows.map((r, i) => (
            <View key={r.lead_id} style={i % 2 === 0 ? S.tr : S.trAlt}>
              <Text style={[S.td, { width: 24, color: "#9ca3af" }]}>{i + 1}</Text>
              <Text style={[S.td, { flex: 3, fontFamily: "Helvetica-Bold" }]}>{r.nama_client}</Text>
              <Text style={[S.td, { flex: 1.2 }]}>{r.paket}</Text>
              <Text style={[S.tdR, { flex: 1.5 }]}>{IDR(r.harga_total)}</Text>
              <Text style={[S.tdR, { flex: 1.5, color: "#16a34a" }]}>{IDR(r.total_terbayar)}</Text>
              <Text style={[S.tdR, { flex: 1.5, fontFamily: "Helvetica-Bold", color: r.outstanding > 0 ? "#dc2626" : "#16a34a" }]}>{IDR(r.outstanding)}</Text>
              <Text style={[S.td, { flex: 0.8, textAlign: "center", color: "#6b7280" }]}>{r.invoice_count}</Text>
            </View>
          ))}
          <View style={S.tfoot}>
            <Text style={[S.tfTd, { width: 24 }]} />
            <Text style={[S.tfTd, { flex: 5 }]}>Total ({rows.length} client)</Text>
            <Text style={[S.tfTdR, { flex: 1.5 }]}>{IDR(totals.total)}</Text>
            <Text style={[S.tfTdR, { flex: 1.5, color: "#16a34a" }]}>{IDR(totals.terbayar)}</Text>
            <Text style={[S.tfTdR, { flex: 1.5, color: totals.outstanding > 0 ? "#dc2626" : "#16a34a" }]}>{IDR(totals.outstanding)}</Text>
            <Text style={[S.tfTd, { flex: 0.8 }]} />
          </View>
        </View>
        <Text style={S.printed}>{printedAt()}</Text>
      </Page>
    </Document>
  );
}

// ── PDF: Projek ────────────────────────────────────────────────────────────────
function ArProjekPDF({ rows, filterBulan, search, totals }: {
  rows: ProjekRow[];
  filterBulan: string;
  search: string;
  totals: { rab: number; terbayar: number; outstanding: number };
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={S.page}>
        <Text style={S.title}>AR Tagihan Projek Sipil</Text>
        <Text style={S.subtitle}>Rekap tagihan projek sipil per termin berdasarkan invoice Payment Projek</Text>
        <Text style={S.filterLine}>
          Bulan: {monthLabel(filterBulan)}{search ? `  |  Pencarian: "${search}"` : ""}
          {"  |  "}Total: {rows.length} client
        </Text>
        <View style={S.summaryRow}>
          <View style={S.summaryBox}><Text style={S.summaryLabel}>Total RAB</Text><Text style={S.summaryValue}>{IDR(totals.rab)}</Text></View>
          <View style={S.summaryBox}><Text style={S.summaryLabel}>Total Terbayar</Text><Text style={[S.summaryValue, S.green]}>{IDR(totals.terbayar)}</Text></View>
          <View style={S.summaryBox}><Text style={S.summaryLabel}>Outstanding</Text><Text style={[S.summaryValue, totals.outstanding > 0 ? S.red : S.green]}>{IDR(totals.outstanding)}</Text></View>
        </View>
        <View style={S.table}>
          <View style={S.thead}>
            <Text style={[S.th, { flex: 2 }]}>Client / Item</Text>
            <Text style={[S.th, { flex: 2 }]}>Proyek</Text>
            <Text style={[S.th, { flex: 0.8 }]}>Tipe</Text>
            <Text style={[S.th, { flex: 1.5, textAlign: "right" }]}>Nilai</Text>
            <Text style={[S.th, { flex: 1.2, textAlign: "center" }]}>Status Invoice</Text>
            <Text style={[S.th, { flex: 1.5, textAlign: "right" }]}>Terbayar</Text>
            <Text style={[S.th, { flex: 1.5, textAlign: "right" }]}>Outstanding</Text>
          </View>
          {rows.map((r) => [
            <View key={`h-${r.lead_id}`} style={S.clientRow}>
              <Text style={[S.clientTd, { flex: 2 }]}>{r.nama_client}</Text>
              <Text style={[S.clientTd, { flex: 2 }]}>{r.nama_proyek ?? "—"}</Text>
              <Text style={[S.clientTd, { flex: 0.8 }]} />
              <Text style={[S.clientTdR, { flex: 1.5 }]}>{IDR(r.total_rab + r.total_penambahan)}</Text>
              <Text style={[S.clientTd, { flex: 1.2 }]} />
              <Text style={[S.clientTdR, { flex: 1.5 }]}>{IDR(r.total_terbayar)}</Text>
              <Text style={[S.clientTdR, { flex: 1.5, color: r.outstanding > 0 ? "#dc2626" : "#16a34a" }]}>{IDR(r.outstanding)}</Text>
            </View>,
            ...r.items.map((item) => (
              <View key={`i-${item.rab_item_id}`} style={S.subRow}>
                <Text style={[S.subTd, { flex: 2, paddingLeft: 14 }]}>{item.label}</Text>
                <Text style={[S.subTd, { flex: 2 }]} />
                <Text style={[S.subTd, { flex: 0.8 }]}>{item.tipe === "penambahan" ? "Tambahan" : "RAB"}</Text>
                <Text style={[S.subTdR, { flex: 1.5 }]}>{IDR(item.nilai)}</Text>
                <Text style={[S.subTd, { flex: 1.2, textAlign: "center" }]}>{item.invoice_status ?? "—"}</Text>
                <Text style={[S.subTdR, { flex: 1.5, color: item.terbayar > 0 ? "#16a34a" : "#d1d5db" }]}>
                  {item.terbayar > 0 ? IDR(item.terbayar) : "—"}
                </Text>
                <Text style={[S.subTd, { flex: 1.5 }]} />
              </View>
            )),
          ])}
        </View>
        <Text style={S.printed}>{printedAt()}</Text>
      </Page>
    </Document>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border p-4 space-y-1">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={cn("text-xl font-bold", color)}>{value}</p>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface SurveyRow {
  lead_id: number;
  nama_client: string;
  pic_survey: string;
  tanggal_survey: string | null;
  survey_approved_at: string | null;
  tagihan: number;
  total_terbayar: number;
  outstanding: number;
}

interface DesainRow {
  lead_id: number;
  nama_client: string;
  paket: string;
  harga_total: number;
  total_terbayar: number;
  outstanding: number;
  invoice_count: number;
  tanggal_pertama: string | null;
}

interface ProjekItem {
  rab_item_id: number;
  label: string;
  nilai: number;
  tipe: string;
  invoice_id: number | null;
  invoice_status: string | null;
  terbayar: number;
}
interface ProjekRow {
  lead_id: number;
  nama_client: string;
  nama_proyek: string | null;
  items: ProjekItem[];
  total_rab: number;
  total_penambahan: number;
  total_terbayar: number;
  outstanding: number;
  tanggal_pertama: string | null;
}

// ── Tagihan Survey ─────────────────────────────────────────────────────────────
const PAKET_COLOR: Record<string, string> = {
  Basic: "bg-gray-100 text-gray-700",
  Standart: "bg-blue-100 text-blue-700",
  Premium: "bg-purple-100 text-purple-700",
  Deluxe: "bg-amber-100 text-amber-700",
};

function SurveyTab() {
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    financeApi.getArTagihanSurvey().then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch = !q || r.nama_client.toLowerCase().includes(q) || r.pic_survey.toLowerCase().includes(q);
      const matchBulan = inMonth(r.survey_approved_at, filterBulan);
      return matchSearch && matchBulan;
    }),
    [rows, search, filterBulan]
  );

  const totals = useMemo(
    () => filtered.reduce(
      (acc, r) => ({ tagihan: acc.tagihan + r.tagihan, terbayar: acc.terbayar + r.total_terbayar, outstanding: acc.outstanding + r.outstanding }),
      { tagihan: 0, terbayar: 0, outstanding: 0 }
    ),
    [filtered]
  );

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await toPdf(<ArSurveyPDF rows={filtered} filterBulan={filterBulan} search={search} totals={totals} />).toBlob();
      const bulan = filterBulan ? `-${filterBulan}` : "";
      saveAs(blob, `AR-Survey${bulan}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Total Tagihan" value={IDR(totals.tagihan)} color="text-gray-800" />
        <SummaryCard label="Total Terbayar" value={IDR(totals.terbayar)} color="text-green-600" />
        <SummaryCard label="Outstanding" value={IDR(totals.outstanding)} color={totals.outstanding > 0 ? "text-red-600" : "text-green-600"} />
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Cari nama client atau PIC..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        <input
          type="month"
          value={filterBulan}
          onChange={(e) => setFilterBulan(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {filterBulan && (
          <button onClick={() => setFilterBulan("")} className="text-xs text-gray-400 hover:text-gray-600 underline">Reset bulan</button>
        )}
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading || filtered.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> {downloading ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-10">No</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Nama Client</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">PIC Survey</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Tgl Survey</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Disetujui</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Tagihan</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Terbayar</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Tidak ada data</td></tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={r.lead_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.nama_client}</td>
                    <td className="px-4 py-3 text-gray-600">{r.pic_survey}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(r.tanggal_survey)}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(r.survey_approved_at)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{IDR(r.tagihan)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{IDR(r.total_terbayar)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("font-semibold", r.outstanding <= 0 ? "text-green-600" : "text-red-600")}>{IDR(r.outstanding)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-gray-50 border-t font-semibold">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-gray-700">Total ({filtered.length} survey)</td>
                  <td className="px-4 py-3 text-right text-gray-800">{IDR(totals.tagihan)}</td>
                  <td className="px-4 py-3 text-right text-green-700">{IDR(totals.terbayar)}</td>
                  <td className={cn("px-4 py-3 text-right", totals.outstanding > 0 ? "text-red-600" : "text-green-600")}>{IDR(totals.outstanding)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tagihan Desain ─────────────────────────────────────────────────────────────
function DesainTab() {
  const [rows, setRows] = useState<DesainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [filterPaket, setFilterPaket] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    financeApi.getArTagihanDesain().then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch = !q || r.nama_client.toLowerCase().includes(q);
      const matchBulan = inMonth(r.tanggal_pertama, filterBulan);
      const matchPaket = !filterPaket || r.paket === filterPaket;
      return matchSearch && matchBulan && matchPaket;
    }),
    [rows, search, filterBulan, filterPaket]
  );

  const totals = useMemo(
    () => filtered.reduce(
      (acc, r) => ({ total: acc.total + r.harga_total, terbayar: acc.terbayar + r.total_terbayar, outstanding: acc.outstanding + r.outstanding }),
      { total: 0, terbayar: 0, outstanding: 0 }
    ),
    [filtered]
  );

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await toPdf(<ArDesainPDF rows={filtered} filterBulan={filterBulan} search={search} filterPaket={filterPaket} totals={totals} />).toBlob();
      const bulan = filterBulan ? `-${filterBulan}` : "";
      saveAs(blob, `AR-Desain${bulan}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Total Harga" value={IDR(totals.total)} color="text-gray-800" />
        <SummaryCard label="Total Terbayar" value={IDR(totals.terbayar)} color="text-green-600" />
        <SummaryCard label="Outstanding" value={IDR(totals.outstanding)} color={totals.outstanding > 0 ? "text-red-600" : "text-green-600"} />
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Cari nama client..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
        <input
          type="month"
          value={filterBulan}
          onChange={(e) => setFilterBulan(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={filterPaket}
          onChange={(e) => setFilterPaket(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Semua Paket</option>
          <option value="Basic">Basic</option>
          <option value="Standart">Standart</option>
          <option value="Premium">Premium</option>
          <option value="Deluxe">Deluxe</option>
        </select>
        {(filterBulan || filterPaket) && (
          <button onClick={() => { setFilterBulan(""); setFilterPaket(""); }} className="text-xs text-gray-400 hover:text-gray-600 underline">Reset filter</button>
        )}
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading || filtered.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> {downloading ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-10">No</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Nama Client</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Paket</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Total Harga</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Terbayar</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Outstanding</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Tidak ada data</td></tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={r.lead_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.nama_client}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", PAKET_COLOR[r.paket] ?? "bg-gray-100 text-gray-700")}>
                        {r.paket}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{IDR(r.harga_total)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{IDR(r.total_terbayar)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("font-semibold", r.outstanding <= 0 ? "text-green-600" : "text-red-600")}>{IDR(r.outstanding)}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 text-xs">{r.invoice_count} invoice</td>
                  </tr>
                ))
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-gray-50 border-t font-semibold">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-gray-700">Total ({filtered.length} client)</td>
                  <td className="px-4 py-3 text-right text-gray-800">{IDR(totals.total)}</td>
                  <td className="px-4 py-3 text-right text-green-700">{IDR(totals.terbayar)}</td>
                  <td className={cn("px-4 py-3 text-right", totals.outstanding > 0 ? "text-red-600" : "text-green-600")}>{IDR(totals.outstanding)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tagihan Projek ─────────────────────────────────────────────────────────────
function InvoiceStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-gray-400">Belum ada invoice</span>;
  const color =
    status === "Lunas" ? "bg-green-100 text-green-700" :
    status === "Terbit" ? "bg-blue-100 text-blue-700" :
    "bg-gray-100 text-gray-600";
  return <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", color)}>{status}</span>;
}

function ProyekTab() {
  const [rows, setRows] = useState<ProjekRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    financeApi.getArTagihanProjek().then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch = !q || r.nama_client.toLowerCase().includes(q) || (r.nama_proyek ?? "").toLowerCase().includes(q);
      const matchBulan = inMonth(r.tanggal_pertama, filterBulan);
      return matchSearch && matchBulan;
    }),
    [rows, search, filterBulan]
  );

  const totals = useMemo(
    () => filtered.reduce(
      (acc, r) => ({
        rab: acc.rab + r.total_rab + r.total_penambahan,
        terbayar: acc.terbayar + r.total_terbayar,
        outstanding: acc.outstanding + r.outstanding,
      }),
      { rab: 0, terbayar: 0, outstanding: 0 }
    ),
    [filtered]
  );

  function toggleExpand(leadId: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId); else next.add(leadId);
      return next;
    });
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await toPdf(<ArProjekPDF rows={filtered} filterBulan={filterBulan} search={search} totals={totals} />).toBlob();
      const bulan = filterBulan ? `-${filterBulan}` : "";
      saveAs(blob, `AR-Projek${bulan}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Total RAB" value={IDR(totals.rab)} color="text-gray-800" />
        <SummaryCard label="Total Terbayar" value={IDR(totals.terbayar)} color="text-green-600" />
        <SummaryCard label="Outstanding" value={IDR(totals.outstanding)} color={totals.outstanding > 0 ? "text-red-600" : "text-green-600"} />
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Cari nama client atau proyek..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        <input
          type="month"
          value={filterBulan}
          onChange={(e) => setFilterBulan(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {filterBulan && (
          <button onClick={() => setFilterBulan("")} className="text-xs text-gray-400 hover:text-gray-600 underline">Reset bulan</button>
        )}
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading || filtered.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> {downloading ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">
            Tidak ada data — buat invoice Payment Projek untuk menampilkan tagihan
          </div>
        ) : (
          filtered.map((r) => {
            const isExpanded = expanded.has(r.lead_id);
            const totalRAB = r.total_rab + r.total_penambahan;
            return (
              <div key={r.lead_id} className="bg-white rounded-xl border overflow-hidden">
                <button
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => toggleExpand(r.lead_id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{r.nama_client}</p>
                    {r.nama_proyek && <p className="text-xs text-gray-500 truncate">{r.nama_proyek}</p>}
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-400">Total RAB</p>
                    <p className="text-sm font-semibold text-gray-800">{IDR(totalRAB)}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-400">Terbayar</p>
                    <p className="text-sm font-semibold text-green-700">{IDR(r.total_terbayar)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Outstanding</p>
                    <p className={cn("text-sm font-bold", r.outstanding > 0 ? "text-red-600" : "text-green-600")}>{IDR(r.outstanding)}</p>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-gray-400 flex-shrink-0 transition-transform", isExpanded && "rotate-180")} />
                </button>
                {isExpanded && (
                  <div className="border-t">
                    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 text-xs font-medium text-gray-400 px-4 py-2 bg-gray-50 border-b">
                      <span className="w-16">Tipe</span>
                      <span>Item</span>
                      <span className="text-right w-32 pr-2">Nilai</span>
                      <span className="text-center w-28">Status Invoice</span>
                      <span className="text-right w-32">Terbayar</span>
                    </div>
                    {r.items.map((item) => (
                      <div key={item.rab_item_id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 items-center px-4 py-2.5 border-b last:border-0 hover:bg-gray-50/50">
                        <span className={cn(
                          "inline-flex px-2 py-0.5 rounded-full text-xs font-medium w-16 justify-center",
                          item.tipe === "penambahan" ? "bg-orange-100 text-orange-700" : "bg-teal-100 text-teal-700"
                        )}>
                          {item.tipe === "penambahan" ? "Tambah" : "RAB"}
                        </span>
                        <span className="text-sm text-gray-700 px-3">{item.label}</span>
                        <span className="text-sm text-gray-700 tabular-nums text-right w-32 pr-2">{IDR(item.nilai)}</span>
                        <div className="w-28 flex justify-center"><InvoiceStatusBadge status={item.invoice_status} /></div>
                        <span className={cn("text-sm tabular-nums text-right w-32 font-medium", item.terbayar > 0 ? "text-green-700" : "text-gray-300")}>
                          {item.terbayar > 0 ? IDR(item.terbayar) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: "survey", label: "Tagihan Survey" },
  { key: "desain", label: "Tagihan Desain" },
  { key: "projek", label: "Tagihan Projek" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function ArOutstandingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("survey");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AR (Tagihan Outstanding)</h1>
        <p className="text-sm text-gray-500 mt-1">Rekap tagihan per kategori dikurangi pembayaran yang sudah diterima</p>
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === t.key
                ? "border-red-500 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "survey" && <SurveyTab />}
      {activeTab === "desain" && <DesainTab />}
      {activeTab === "projek" && <ProyekTab />}
    </div>
  );
}
