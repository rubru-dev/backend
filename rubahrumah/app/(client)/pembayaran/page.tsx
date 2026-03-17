"use client";
import { useState, useEffect } from "react";
import { portalApi } from "@/lib/apiClient";

interface Payment {
  id: number;
  termin_ke: number;
  nama_termin: string | null;
  tagihan: number;
  retensi: number;
  status: string;
  jatuh_tempo: string | null;
  tanggal_bayar: string | null;
  catatan: string | null;
}

function fmtDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtRupiah(n: number) {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

export default function PembayaranPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([portalApi.me(), portalApi.payments()])
      .then(([p, pay]) => {
        setProject(p);
        setPayments(pay);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalTagihan = payments.reduce((s, p) => s + (p.tagihan ?? 0), 0);
  const totalLunas = payments.filter((p) => p.status === "Sudah Dibayar").reduce((s, p) => s + (p.tagihan ?? 0), 0);

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[#0F4C75] mb-1">
        {(project?.nama_proyek as string) ?? "Proyek"}
      </h1>
      <p className="text-sm text-slate-400 flex items-center gap-1 mb-5">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="6" r="3" stroke="#94a3b8" strokeWidth="1.2"/>
          <path d="M7 9.5C4.5 11.5 2 12 7 13.5C12 12 9.5 11.5 7 9.5Z" fill="#94a3b8"/>
        </svg>
        {(project?.alamat as string) ?? "-"}
      </p>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total Tagihan", value: fmtRupiah(totalTagihan), color: "text-slate-700" },
          { label: "Sudah Dibayar", value: fmtRupiah(totalLunas), color: "text-green-600" },
          { label: "Belum Dibayar", value: fmtRupiah(totalTagihan - totalLunas), color: "text-red-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className={`text-xs sm:text-sm font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-base font-semibold text-slate-700 mb-3">Daftar Pembayaran</h2>

      {/* Info banner */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 text-blue-600 text-sm px-4 py-3 rounded-xl mb-5">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 6v4M8 5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span>Retensi akan dibayarkan saat proyek selesai sebagai jaminan hasil kerja.</span>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400">
          Belum ada data pembayaran
        </div>
      ) : (<>
        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-4 text-slate-400 font-medium">Termin</th>
                <th className="text-left px-5 py-4 text-slate-400 font-medium">Tagihan</th>
                <th className="text-left px-5 py-4 text-slate-400 font-medium">Retensi</th>
                <th className="text-left px-5 py-4 text-slate-400 font-medium">Status</th>
                <th className="text-left px-5 py-4 text-slate-400 font-medium">Jatuh Tempo</th>
                <th className="text-left px-5 py-4 text-slate-400 font-medium">Tgl Bayar</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-4 text-slate-600 font-medium">
                    {p.nama_termin || `Termin ${p.termin_ke}`}
                  </td>
                  <td className="px-5 py-4 text-slate-700">{fmtRupiah(p.tagihan)}</td>
                  <td className="px-5 py-4 text-slate-700">{fmtRupiah(p.retensi)}</td>
                  <td className="px-5 py-4">
                    <span className={p.status === "Sudah Dibayar" ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{fmtDate(p.jatuh_tempo)}</td>
                  <td className="px-5 py-4 text-slate-600">{fmtDate(p.tanggal_bayar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {payments.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-[#0F4C75]">
                  {p.nama_termin || `Termin ${p.termin_ke}`}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  p.status === "Sudah Dibayar" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                }`}>
                  {p.status}
                </span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tagihan</span>
                  <span className="text-slate-700 font-medium">{fmtRupiah(p.tagihan)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Retensi</span>
                  <span className="text-slate-700 font-medium">{fmtRupiah(p.retensi)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Jatuh Tempo</span>
                  <span className="text-slate-600">{fmtDate(p.jatuh_tempo)}</span>
                </div>
                {p.tanggal_bayar && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tgl Bayar</span>
                    <span className="text-slate-600">{fmtDate(p.tanggal_bayar)}</span>
                  </div>
                )}
                {p.catatan && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Catatan</span>
                    <span className="text-slate-600">{p.catatan}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </>)}
    </div>
  );
}
