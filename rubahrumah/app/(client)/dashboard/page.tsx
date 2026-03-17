"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { portalApi, STORAGE_BASE } from "@/lib/apiClient";

function fmtDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function fmtRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function statusColor(s: string) {
  if (s === "Selesai") return "bg-green-100 text-green-600";
  if (s === "Ditunda") return "bg-red-100 text-red-600";
  return "bg-blue-100 text-blue-600";
}

export default function DashboardPage() {
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [payments, setPayments] = useState<Record<string, unknown>[]>([]);
  const [galeri, setGaleri] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      portalApi.me(),
      portalApi.payments(),
      portalApi.galeri(),
    ]).then(([p, pay, gal]) => {
      setProject(p);
      setPayments(pay);
      setGaleri(gal.slice(0, 4));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) return null;

  const nama_proyek = project.nama_proyek as string;
  const alamat = project.alamat as string;
  const tanggal_mulai = project.tanggal_mulai as string;
  const tanggal_selesai = project.tanggal_selesai as string;
  const progress_persen = project.progress_persen as number;
  const status_proyek = project.status_proyek as string;
  const catatan = project.catatan as string | null;
  const summary = project.summary as Record<string, number>;

  // Pair up payments for the table (2 per row)
  const rows: { left: Record<string, unknown>; right: Record<string, unknown> | null }[] = [];
  for (let i = 0; i < payments.length; i += 2) {
    rows.push({ left: payments[i], right: payments[i + 1] ?? null });
  }

  return (
    <div>
      {/* Project Header */}
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F4C75]">{nama_proyek}</h1>
        <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="6" r="3.5" stroke="#94a3b8" strokeWidth="1.2"/>
            <path d="M7 10.5C7 10.5 2.5 13.5 7 13.5C11.5 13.5 7 10.5 7 10.5Z" fill="#94a3b8"/>
          </svg>
          {alamat ?? "-"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-400 mb-1">Tanggal Mulai</p>
          <p className="text-xs sm:text-sm font-bold text-slate-700">{fmtDate(tanggal_mulai)}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-400 mb-1">Tanggal Selesai</p>
          <p className="text-xs sm:text-sm font-bold text-slate-700">{fmtDate(tanggal_selesai)}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-400 mb-1">Perkembangan Proyek</p>
          <p className="text-xl sm:text-2xl font-bold text-orange-500">{progress_persen ?? 0}%</p>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-400 mb-1">Status Proyek</p>
          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mt-1 ${statusColor(status_proyek)}`}>
            {status_proyek}
          </span>
        </div>
      </div>

      {/* Catatan card (only shown when there is a note) */}
      {catatan && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-5 flex gap-3">
          <div className="shrink-0 mt-0.5">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2a7 7 0 100 14A7 7 0 009 2zm0 5v4M9 13h.01" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-700 mb-1">Catatan dari Tim</p>
            <p className="text-sm text-amber-800">{catatan}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Left: Pembayaran Summary */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-1">Ringkasan Pembayaran</h2>
          <p className="text-xs text-slate-400 mb-4">
            {summary?.termin_lunas ?? 0} dari {summary?.total_termin ?? 0} termin telah dibayar
          </p>
          {payments.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Belum ada data pembayaran</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[280px]">
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 text-slate-500 w-1/4 text-xs sm:text-sm">
                        {(row.left.nama_termin as string) || `Termin ${row.left.termin_ke}`}
                      </td>
                      <td className="py-2 font-medium text-slate-700 w-1/4 text-xs sm:text-sm">
                        {fmtRupiah(row.left.tagihan as number)}
                      </td>
                      {row.right ? (<>
                        <td className="py-2 text-slate-500 w-1/4 text-xs sm:text-sm">
                          {(row.right.nama_termin as string) || `Termin ${row.right.termin_ke}`}
                        </td>
                        <td className="py-2 font-medium text-slate-700 w-1/4 text-xs sm:text-sm">
                          {fmtRupiah(row.right.tagihan as number)}
                        </td>
                      </>) : (<><td/><td/></>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link href="/pembayaran">
            <button className="mt-4 flex items-center gap-2 text-sm text-slate-500 border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition w-full justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Lihat semua rincian pembayaran
            </button>
          </Link>
        </div>

        {/* Right: Summary + Galeri */}
        <div className="space-y-4">
          {/* Summary Counts */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-5">
            <h2 className="text-sm sm:text-base font-semibold text-slate-700 mb-3">Ringkasan Proyek</h2>
            <div className="space-y-2 text-sm">
              {[
                { label: "Total Foto Dokumentasi", value: summary?.total_foto ?? 0 },
                { label: "Total Dokumen", value: summary?.total_dokumen ?? 0 },
                { label: "Total Aktivitas", value: summary?.total_aktivitas ?? 0 },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-slate-500 text-xs">{item.label}</span>
                  <span className="font-semibold text-slate-700">{item.value}</span>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Progress</span>
                <span>{progress_persen ?? 0}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-400 rounded-full transition-all"
                  style={{ width: `${progress_persen ?? 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Galeri Preview */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-5">
            <h2 className="text-sm sm:text-base font-semibold text-slate-700 mb-3">
              Dokumentasi Pekerjaan
            </h2>
            {galeri.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Belum ada foto</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {galeri.map((g, i) => {
                  const fileUrl = g.file_url as string | null;
                  const judul = g.judul as string;
                  const tanggal = g.tanggal_foto as string;
                  return (
                    <Link href="/galeri" key={i}>
                      <div className="rounded-xl overflow-hidden bg-slate-100 aspect-square relative cursor-pointer hover:opacity-80 transition">
                        {fileUrl ? (
                          <img
                            src={`${STORAGE_BASE}${fileUrl}`}
                            alt={judul}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-amber-200 to-amber-400 flex items-end p-2">
                            <div>
                              <p className="text-xs text-white font-medium">{judul}</p>
                              <p className="text-xs text-white/80">{fmtDate(tanggal)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
