"use client";
import { useState, useEffect } from "react";
import { portalApi } from "@/lib/apiClient";

interface Invoice {
  id: number;
  invoice_number: string;
  tanggal: string | null;
  overdue_date: string | null;
  grand_total: number;
  subtotal: number;
  ppn_amount: number;
  status: string;
  catatan: string | null;
  kwitansi: { tanggal_bayar: string | null; metode_bayar: string | null } | null;
}

function fmtDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtRupiah(n: number) {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

function StatusBadge({ status }: { status: string }) {
  const isLunas = status === "Lunas";
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
      isLunas ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
    }`}>
      {isLunas ? "Lunas" : "Belum Dibayar"}
    </span>
  );
}

export default function PembayaranPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([portalApi.me(), portalApi.invoices()])
      .then(([p, inv]) => {
        setProject(p);
        setInvoices(inv);
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

  const totalTagihan = invoices.reduce((s, inv) => s + (inv.grand_total ?? 0), 0);
  const totalLunas = invoices.filter((inv) => inv.status === "Lunas").reduce((s, inv) => s + (inv.grand_total ?? 0), 0);

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
          { label: "Total Invoice", value: fmtRupiah(totalTagihan), color: "text-slate-700" },
          { label: "Sudah Dibayar", value: fmtRupiah(totalLunas), color: "text-green-600" },
          { label: "Belum Dibayar", value: fmtRupiah(totalTagihan - totalLunas), color: "text-orange-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className={`text-xs sm:text-sm font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-base font-semibold text-slate-700 mb-3">Daftar Invoice</h2>

      {invoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400">
          Belum ada invoice
        </div>
      ) : (<>
        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-4 text-slate-400 font-medium">No. Invoice</th>
                <th className="text-left px-5 py-4 text-slate-400 font-medium">Tanggal</th>
                <th className="text-left px-5 py-4 text-slate-400 font-medium">Jatuh Tempo</th>
                <th className="text-left px-5 py-4 text-slate-400 font-medium">Total</th>
                <th className="text-left px-5 py-4 text-slate-400 font-medium">Status</th>
                <th className="text-left px-5 py-4 text-slate-400 font-medium">Tgl Bayar</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-4 text-slate-700 font-medium">{inv.invoice_number}</td>
                  <td className="px-5 py-4 text-slate-600">{fmtDate(inv.tanggal)}</td>
                  <td className="px-5 py-4 text-slate-600">{fmtDate(inv.overdue_date)}</td>
                  <td className="px-5 py-4 text-slate-700 font-medium">{fmtRupiah(inv.grand_total)}</td>
                  <td className="px-5 py-4"><StatusBadge status={inv.status} /></td>
                  <td className="px-5 py-4 text-slate-600">{fmtDate(inv.kwitansi?.tanggal_bayar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {invoices.map((inv) => (
            <div key={inv.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-[#0F4C75]">{inv.invoice_number}</span>
                <StatusBadge status={inv.status} />
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total</span>
                  <span className="text-slate-700 font-medium">{fmtRupiah(inv.grand_total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tanggal</span>
                  <span className="text-slate-600">{fmtDate(inv.tanggal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Jatuh Tempo</span>
                  <span className="text-slate-600">{fmtDate(inv.overdue_date)}</span>
                </div>
                {inv.kwitansi?.tanggal_bayar && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tgl Bayar</span>
                    <span className="text-slate-600">{fmtDate(inv.kwitansi.tanggal_bayar)}</span>
                  </div>
                )}
                {inv.kwitansi?.metode_bayar && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Metode Bayar</span>
                    <span className="text-slate-600">{inv.kwitansi.metode_bayar}</span>
                  </div>
                )}
                {inv.catatan && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Catatan</span>
                    <span className="text-slate-600">{inv.catatan}</span>
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
