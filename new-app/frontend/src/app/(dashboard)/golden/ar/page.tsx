"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = {
  invoice_id: number;
  invoice_number: string | null;
  nama_client: string;
  tanggal: string | null;
  status: string | null;
  total_tagihan: number;
  total_terbayar: number;
  outstanding: number;
};

const IDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

function inMonth(dateStr: string | null | undefined, filterBulan: string) {
  if (!filterBulan) return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const [y, m] = filterBulan.split("-").map(Number);
  return d.getFullYear() === y && d.getMonth() + 1 === m;
}

export default function GoldenArPage() {
  const [search, setSearch] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const { data: rows = [], isLoading } = useQuery<Row[]>({
    queryKey: ["golden-ar-tagihan"],
    queryFn: () => apiClient.get("/golden/ar-tagihan").then((r) => r.data),
  });

  const filtered = useMemo(() => rows.filter((r) => {
    const q = search.toLowerCase();
    return (!q || r.nama_client.toLowerCase().includes(q) || (r.invoice_number ?? "").toLowerCase().includes(q)) && inMonth(r.tanggal, filterBulan);
  }), [rows, search, filterBulan]);

  const totals = useMemo(() => filtered.reduce((acc, r) => ({
    tagihan: acc.tagihan + r.total_tagihan,
    terbayar: acc.terbayar + r.total_terbayar,
    outstanding: acc.outstanding + r.outstanding,
  }), { tagihan: 0, terbayar: 0, outstanding: 0 }), [filtered]);

  function printPdf() {
    window.print();
  }

  return (
    <div className="space-y-5 p-6">
      <style jsx global>{`
        @media print {
          aside, header, .print-hidden { display: none !important; }
          body { background: #fff !important; }
          .print-page { padding: 0 !important; }
        }
      `}</style>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print-page">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6 text-amber-500" /> AR Golden</h1>
          <p className="text-sm text-muted-foreground">Data sama dengan Finance &gt; AR &gt; Tagihan Golden dari invoice kategori Payment Golden.</p>
        </div>
        <Button variant="outline" onClick={printPdf} className="print-hidden" disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-1.5" /> Download PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4"><p className="text-xs text-muted-foreground">Total Tagihan</p><p className="text-xl font-bold">{IDR(totals.tagihan)}</p></div>
        <div className="rounded-lg border bg-white p-4"><p className="text-xs text-muted-foreground">Total Terbayar</p><p className="text-xl font-bold text-green-600">{IDR(totals.terbayar)}</p></div>
        <div className="rounded-lg border bg-white p-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className={cn("text-xl font-bold", totals.outstanding > 0 ? "text-red-600" : "text-green-600")}>{IDR(totals.outstanding)}</p></div>
      </div>

      <div className="flex flex-wrap gap-2 items-center print-hidden">
        <Input placeholder="Cari client atau invoice..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        <input type="month" value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} className="border rounded-md px-3 py-2 text-sm h-10" />
        {filterBulan && <button onClick={() => setFilterBulan("")} className="text-xs text-muted-foreground underline">Reset bulan</button>}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-10">No</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">No. Invoice</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Nama Client</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Tanggal</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Tagihan</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Terbayar</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Tidak ada invoice Payment Golden</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.invoice_id}>
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-mono">{r.invoice_number ?? "-"}</td>
                  <td className="px-4 py-3 font-medium">{r.nama_client}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(r.tanggal)}</td>
                  <td className="px-4 py-3">{r.status}</td>
                  <td className="px-4 py-3 text-right">{IDR(r.total_tagihan)}</td>
                  <td className="px-4 py-3 text-right text-green-700">{IDR(r.total_terbayar)}</td>
                  <td className="px-4 py-3 text-right"><span className={cn("font-semibold", r.outstanding <= 0 ? "text-green-600" : "text-red-600")}>{IDR(r.outstanding)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
