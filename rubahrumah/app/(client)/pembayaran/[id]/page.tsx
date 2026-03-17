"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function fmtRupiah(n: number) {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

export default function PembayaranDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalApi.payments()
      .then((list: Payment[]) => {
        const found = list.find((p) => p.id === id || p.termin_ke === id);
        setPayment(found ?? null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400 mb-4">Data pembayaran tidak ditemukan</p>
        <button onClick={() => router.back()} className="text-sm text-orange-500 hover:underline">
          Kembali
        </button>
      </div>
    );
  }

  const isPaid = payment.status === "Sudah Dibayar";

  return (
    <div className="max-w-xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-5"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 4L7 9l4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Kembali
      </button>

      <h1 className="text-xl font-bold text-[#0F4C75] mb-6">
        Detail Pembayaran — {payment.nama_termin || `Termin ${payment.termin_ke}`}
      </h1>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
        {([
          { label: "Nama Termin", value: payment.nama_termin || `Termin ${payment.termin_ke}` },
          { label: "Status", value: (
            <span className={`font-semibold ${isPaid ? "text-green-500" : "text-red-500"}`}>
              {payment.status}
            </span>
          )},
          { label: "Tagihan", value: fmtRupiah(payment.tagihan) },
          { label: "Retensi", value: fmtRupiah(payment.retensi) },
          { label: "Jatuh Tempo", value: fmtDate(payment.jatuh_tempo) },
          { label: "Tanggal Bayar", value: fmtDate(payment.tanggal_bayar) },
          ...(payment.catatan ? [{ label: "Catatan", value: payment.catatan }] : []),
        ] as { label: string; value: React.ReactNode }[]).map((row, i) => (
          <div key={i} className="flex items-start justify-between px-5 py-4">
            <span className="text-sm text-slate-400">{row.label}</span>
            <span className="text-sm font-medium text-slate-700 text-right ml-4">{row.value}</span>
          </div>
        ))}
      </div>

      {!isPaid && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
          <p className="font-semibold mb-1">Pembayaran Belum Diterima</p>
          <p>Silakan hubungi tim RubahRumah melalui menu Kontak Bantuan untuk informasi pembayaran.</p>
        </div>
      )}
    </div>
  );
}
