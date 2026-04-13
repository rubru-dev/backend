"use client";
import { useState, useEffect } from "react";
import { portalApi } from "@/lib/apiClient";

interface Invoice {
  id: string;
  invoice_number: string;
  tanggal: string | null;
  overdue_date: string | null;
  grand_total: number;
  subtotal: number;
  ppn_amount: number;
  status: string;
  catatan: string | null;
  kwitansi: { tanggal_bayar: string | null; metode_bayar: string | null; nomor_kwitansi: string | null } | null;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  tanggal: string | null;
  overdue_date: string | null;
  subtotal: number;
  ppn_percentage: number;
  ppn_amount: number;
  grand_total: number;
  status: string;
  catatan: string | null;
  klien: string | null;
  jenis: string | null;
  alamat: string | null;
  telepon: string | null;
  bank_account: { bank_name: string; account_number: string; account_name: string } | null;
  items: { description: string | null; quantity: number; unit_price: number; subtotal: number }[];
  kwitansi: { nomor_kwitansi: string | null; tanggal: string | null; jumlah_diterima: number; metode_bayar: string | null; detail_bayar: string | null } | null;
}

function fmtDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtDateLong(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
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

// ── Print-friendly Invoice Modal ─────────────────────────────────────────────
function InvoicePrintModal({ detail, onClose }: { detail: InvoiceDetail; onClose: () => void }) {
  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-white w-full max-w-[800px] rounded-2xl shadow-2xl relative">
        {/* Action bar — hidden when printing */}
        <div className="print:hidden flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Detail Invoice</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-xl hover:bg-orange-600 transition">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6V1h8v5M4 12H2.5A1.5 1.5 0 011 10.5v-3A1.5 1.5 0 012.5 6h11A1.5 1.5 0 0115 7.5v3a1.5 1.5 0 01-1.5 1.5H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><rect x="4" y="10" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
              Cetak / Download PDF
            </button>
            <button onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        {/* Invoice content — print-friendly */}
        <div className="p-8 print:p-0" id="invoice-print-area">
          {/* Header */}
          <div className="flex justify-between items-start border-b-[3px] border-orange-500 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <img src="/images/logo.png" alt="Logo" className="h-12 w-12 object-contain" />
              <div>
                <h1 className="text-lg font-bold text-orange-500">RubahRumah</h1>
                <p className="text-[10px] text-slate-500">Platform Desain and Build</p>
                <p className="text-[10px] text-slate-500">Jl. Pandu II No.420. Sepanjang Jaya. Kec. Rawalumbu. Kota Bekasi</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-orange-500 tracking-wider">INVOICE</h2>
              <p className="text-sm text-slate-500 mt-1">{detail.invoice_number}</p>
            </div>
          </div>

          {/* Meta */}
          <div className="flex justify-between mb-6">
            <div>
              <p className="text-[10px] font-bold text-white bg-orange-500 px-2 py-0.5 rounded inline-block mb-1">TAGIHAN KEPADA</p>
              <p className="text-sm font-bold text-slate-700">{detail.klien || "-"}</p>
              {detail.jenis && <p className="text-xs text-slate-500">{detail.jenis}</p>}
              {detail.alamat && <p className="text-xs text-slate-500">{detail.alamat}</p>}
              {detail.telepon && <p className="text-xs text-slate-500">{detail.telepon}</p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-white bg-orange-500 px-2 py-0.5 rounded inline-block mb-1">TANGGAL</p>
              <p className="text-sm font-bold text-slate-700">{fmtDateLong(detail.tanggal)}</p>
              {detail.overdue_date && (
                <div className="mt-2">
                  <p className="text-[10px] font-bold text-white bg-orange-500 px-2 py-0.5 rounded inline-block mb-1">JATUH TEMPO</p>
                  <p className="text-sm font-bold text-slate-700">{fmtDateLong(detail.overdue_date)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items table */}
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="bg-slate-600 text-white">
                <th className="text-left px-3 py-2 rounded-l">Keterangan</th>
                <th className="text-center px-3 py-2 w-16">Qty</th>
                <th className="text-right px-3 py-2 w-32">Harga Satuan</th>
                <th className="text-right px-3 py-2 w-32 rounded-r">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {detail.items.map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-3 py-2">{item.description || "-"}</td>
                  <td className="px-3 py-2 text-center">{item.quantity}</td>
                  <td className="px-3 py-2 text-right">{fmtRupiah(item.unit_price)}</td>
                  <td className="px-3 py-2 text-right">{fmtRupiah(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-64">
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">{fmtRupiah(detail.subtotal)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm border-b border-slate-200">
                <span className="text-slate-500">PPN ({detail.ppn_percentage}%)</span>
                <span className="font-medium">{fmtRupiah(detail.ppn_amount)}</span>
              </div>
              <div className="flex justify-between py-2 bg-orange-50 px-3 rounded-lg mt-1">
                <span className="font-bold text-orange-600">TOTAL</span>
                <span className="font-bold text-orange-600 text-base">{fmtRupiah(detail.grand_total)}</span>
              </div>
            </div>
          </div>

          {/* Bank account */}
          {detail.bank_account && (
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-bold text-slate-600 mb-2">PEMBAYARAN KE:</p>
              <p className="text-sm font-medium">{detail.bank_account.bank_name}</p>
              <p className="text-sm text-slate-600">No. Rek: {detail.bank_account.account_number}</p>
              <p className="text-sm text-slate-600">a.n. {detail.bank_account.account_name}</p>
            </div>
          )}

          {/* Catatan */}
          {detail.catatan && (
            <div className="bg-orange-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-bold text-orange-600 mb-1">CATATAN:</p>
              <p className="text-sm text-slate-600">{detail.catatan}</p>
            </div>
          )}

          {/* Kwitansi info */}
          {detail.kwitansi && (
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <p className="text-xs font-bold text-green-700 mb-2">KWITANSI PEMBAYARAN</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-500">No. Kwitansi:</span> <span className="font-medium">{detail.kwitansi.nomor_kwitansi || "-"}</span></div>
                <div><span className="text-slate-500">Tanggal:</span> <span className="font-medium">{fmtDateLong(detail.kwitansi.tanggal)}</span></div>
                <div><span className="text-slate-500">Jumlah:</span> <span className="font-medium text-green-700">{fmtRupiah(detail.kwitansi.jumlah_diterima)}</span></div>
                <div><span className="text-slate-500">Metode:</span> <span className="font-medium">{detail.kwitansi.metode_bayar || "-"}</span></div>
                {detail.kwitansi.detail_bayar && (
                  <div className="col-span-2"><span className="text-slate-500">Detail:</span> <span className="font-medium">{detail.kwitansi.detail_bayar}</span></div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PembayaranPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewDetail, setViewDetail] = useState<InvoiceDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([portalApi.me(), portalApi.invoices()])
      .then(([p, inv]) => {
        setProject(p);
        setInvoices(inv);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleDownload(inv: Invoice) {
    setLoadingDetail(inv.id);
    try {
      const detail = await portalApi.invoiceDetail(inv.id);
      setViewDetail(detail);
    } catch (e) {
      console.error(e);
      alert("Gagal memuat detail invoice");
    } finally {
      setLoadingDetail(null);
    }
  }

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
                <th className="px-5 py-4"></th>
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
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleDownload(inv)}
                      disabled={loadingDetail === inv.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition disabled:opacity-50"
                    >
                      {loadingDetail === inv.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M7 2v7m0 0L4.5 6.5M7 9l2.5-2.5M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      Download
                    </button>
                  </td>
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
              <button
                onClick={() => handleDownload(inv)}
                disabled={loadingDetail === inv.id}
                className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-xl hover:bg-orange-100 transition disabled:opacity-50"
              >
                {loadingDetail === inv.id ? (
                  <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v8m0 0L5 7.5M8 10l3-2.5M2.5 12.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                Download Invoice
              </button>
            </div>
          ))}
        </div>
      </>)}

      {/* Print Modal */}
      {viewDetail && (
        <InvoicePrintModal detail={viewDetail} onClose={() => setViewDetail(null)} />
      )}
    </div>
  );
}
