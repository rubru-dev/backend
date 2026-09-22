"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { publicApi } from "@/lib/api";

const inputClass = "w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9122] focus:ring-2 focus:ring-orange-100 transition";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.08 0C5.53 0 .2 5.32.2 11.87c0 2.09.55 4.13 1.59 5.93L.1 24l6.34-1.66a11.87 11.87 0 0 0 5.64 1.43h.01c6.55 0 11.87-5.32 11.87-11.87 0-3.18-1.24-6.16-3.44-8.42ZM12.09 21.7h-.01a9.84 9.84 0 0 1-5.02-1.37l-.36-.21-3.76.98 1-3.67-.23-.38a9.84 9.84 0 0 1-1.51-5.18C2.2 6.96 6.63 2.53 12.08 2.53c2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 7c0 5.45-4.43 9.88-9.88 9.88Zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.46-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.21 5.1 4.5.71.3 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  );
}

export function GeneralConsultationForm() {
  const [form, setForm] = useState({ nama: "", whatsapp: "", alamat: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const detail = `Konsultasi umum dari homepage\nNama: ${form.nama}\nNomor Telepon: ${form.whatsapp}\nAlamat: ${form.alamat}`;
    try {
      await publicApi.rb.submitLead({ jenis_jasa: "KONSULTASI_UMUM", nama: form.nama, whatsapp: form.whatsapp, alamat: form.alamat, detail });
    } catch { /* tetap buka WhatsApp sebagai fallback */ }
    const message = encodeURIComponent(`Halo Rubah Rumah, saya ingin konsultasi.\n\nNama: ${form.nama}\nNomor Telepon: ${form.whatsapp}\nAlamat: ${form.alamat}`);
    window.open(`https://wa.me/6281376405550?text=${message}`, "_blank", "noopener,noreferrer");
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <section className="py-14 bg-[#FFF8F2]">
      <div className="max-w-5xl mx-auto px-6">
        <div className="rounded-3xl bg-gradient-to-br from-[#FF9122] via-[#FFC477] to-white p-6 md:p-10 shadow-xl shadow-orange-900/10">
          <div className="grid md:grid-cols-[1fr_1.1fr] gap-8 md:gap-12 items-center">
            <div className="text-[#0A5168]">
              <h2 className="text-2xl md:text-3xl font-bold mt-3 mb-3">Mau Renovasi Rumah ?</h2>
              <p className="text-sm md:text-base text-[#0A5168]/80 leading-relaxed">“Yuk ceritakan kebutuhan anda kepada kami, kami siap bantu mewujudkannya”</p>
              <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#0A5168]"><WhatsAppIcon /> Konsultasi Gratis</span>
            </div>
            {submitted ? (
              <div className="rounded-2xl bg-white p-8 text-center text-[#0A5168]"><CheckCircle2 className="mx-auto mb-3 text-green-500" size={42} /><h3 className="font-bold text-lg">Terima kasih!</h3><p className="text-sm text-slate-500 mt-1">Pesan WhatsApp Anda sudah disiapkan.</p></div>
            ) : (
              <form onSubmit={submit} className="rounded-2xl bg-white p-5 md:p-6 space-y-4">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama <span className="text-red-400">*</span></label><input required className={inputClass} value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama lengkap" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Nomor Telepon <span className="text-red-400">*</span></label><input required type="tel" className={inputClass} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="08xxxxxxxxxx" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Alamat <span className="text-red-400">*</span></label><textarea required rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9122] focus:ring-2 focus:ring-orange-100 transition resize-none" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} placeholder="Kota / Kecamatan / Kelurahan" /></div>
                <button disabled={loading} className="w-full btn-primary justify-center py-3 disabled:opacity-60"><Send size={16} />{loading ? "Menyiapkan..." : "Konsultasi Sekarang"}</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
