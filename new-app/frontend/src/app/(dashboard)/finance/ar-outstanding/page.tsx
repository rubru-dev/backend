"use client";

import { useEffect, useState, useMemo } from "react";
import { financeApi } from "@/lib/api/finance";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ArRow {
  id: number;
  tipe: "Sipil" | "Interior" | "Desain";
  nama_proyek: string;
  nama_client: string;
  lead_id: number | null;
  total_tagihan: number;
  total_terbayar: number;
  outstanding: number;
}

const IDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const TIPE_COLOR: Record<string, string> = {
  Sipil: "bg-blue-100 text-blue-800",
  Interior: "bg-purple-100 text-purple-800",
  Desain: "bg-orange-100 text-orange-800",
};

export default function ArOutstandingPage() {
  const [rows, setRows] = useState<ArRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipeFilter, setTipeFilter] = useState("Semua");

  useEffect(() => {
    financeApi
      .getArOutstanding()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchTipe = tipeFilter === "Semua" || r.tipe === tipeFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.nama_client.toLowerCase().includes(q) ||
        r.nama_proyek.toLowerCase().includes(q);
      return matchTipe && matchSearch;
    });
  }, [rows, search, tipeFilter]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => ({
          tagihan: acc.tagihan + r.total_tagihan,
          terbayar: acc.terbayar + r.total_terbayar,
          outstanding: acc.outstanding + r.outstanding,
        }),
        { tagihan: 0, terbayar: 0, outstanding: 0 }
      ),
    [filtered]
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AR (Tagihan Outstanding)</h1>
        <p className="text-sm text-gray-500 mt-1">Rekap tagihan dari semua proyek dikurangi pembayaran yang sudah diterima</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4 space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Tagihan</p>
          <p className="text-xl font-bold text-gray-800">{IDR(totals.tagihan)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4 space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Terbayar</p>
          <p className="text-xl font-bold text-green-600">{IDR(totals.terbayar)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4 space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Outstanding</p>
          <p className={`text-xl font-bold ${totals.outstanding > 0 ? "text-red-600" : "text-green-600"}`}>
            {IDR(totals.outstanding)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Cari nama client atau proyek..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={tipeFilter} onValueChange={setTipeFilter}>
          <SelectTrigger className="sm:max-w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua">Semua Tipe</SelectItem>
            <SelectItem value="Sipil">Sipil</SelectItem>
            <SelectItem value="Interior">Interior</SelectItem>
            <SelectItem value="Desain">Desain</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-10">No</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Nama Client</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Tipe</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Nama Proyek</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Total Tagihan</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Terbayar</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Memuat data...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={`${r.tipe}-${r.id}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.nama_client}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIPE_COLOR[r.tipe] ?? ""}`}>
                        {r.tipe}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.nama_proyek}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{IDR(r.total_tagihan)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{IDR(r.total_terbayar)}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-semibold ${
                          r.outstanding <= 0
                            ? "text-green-600"
                            : r.outstanding >= r.total_tagihan
                            ? "text-red-600"
                            : "text-amber-600"
                        }`}
                      >
                        {IDR(r.outstanding)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-gray-50 border-t font-semibold">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-gray-700">
                    Total ({filtered.length} proyek)
                  </td>
                  <td className="px-4 py-3 text-right text-gray-800">{IDR(totals.tagihan)}</td>
                  <td className="px-4 py-3 text-right text-green-700">{IDR(totals.terbayar)}</td>
                  <td className={`px-4 py-3 text-right ${totals.outstanding > 0 ? "text-red-600" : "text-green-600"}`}>
                    {IDR(totals.outstanding)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
