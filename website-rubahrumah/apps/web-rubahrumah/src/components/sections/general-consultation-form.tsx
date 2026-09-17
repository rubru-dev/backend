"use client";

import { useState } from "react";
import { CheckCircle2, MessageCircle, Send } from "lucide-react";
import { publicApi } from "@/lib/api";

const inputClass = "w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9122] focus:ring-2 focus:ring-orange-100 transition";

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
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#0A5168]"><MessageCircle size={15} /> Konsultasi Gratis</span>
              <h2 className="text-2xl md:text-3xl font-bold mt-3 mb-3">Rencanakan Renovasi Rumah Anda</h2>
              <p className="text-sm md:text-base text-[#0A5168]/80 leading-relaxed">Lengkapi Formnya, tim kami akan menghubungi anda via Whatsapp</p>
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
