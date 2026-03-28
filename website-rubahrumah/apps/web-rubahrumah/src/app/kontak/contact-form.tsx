"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function ContactForm() {
  const [form, setForm] = useState({
    nama: "",
    email: "",
    telepon: "",
    subject: "",
    pesan: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Redirect ke WhatsApp dengan isi form
    const msg = encodeURIComponent(
      `Halo Rubah Rumah,\n\nSaya ingin menghubungi Anda:\n\n👤 Nama: ${form.nama}\n📧 Email: ${form.email}\n📞 Telepon: ${form.telepon}\n📌 Subject: ${form.subject}\n\n${form.pesan}`
    );
    window.open(`https://wa.me/6281376405550?text=${msg}`, "_blank");
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-green-600 text-2xl">✓</span>
        </div>
        <h3 className="font-bold text-[#0A5168] text-lg mb-2">Pesan Terkirim!</h3>
        <p className="text-slate-500 text-sm">Tim kami akan membalas pesan Anda segera.</p>
      </div>
    );
  }

  const inputClass =
    "w-full h-11 px-4 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#FF9122] transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
          Nama Lengkap <span className="text-red-400">*</span>
        </label>
        <input
          required
          type="text"
          value={form.nama}
          onChange={set("nama")}
          placeholder="Nama Anda"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
          Email <span className="text-red-400">*</span>
        </label>
        <input
          required
          type="email"
          value={form.email}
          onChange={set("email")}
          placeholder="email@contoh.com"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nomor Telepon</label>
        <input
          type="tel"
          value={form.telepon}
          onChange={set("telepon")}
          placeholder="08xxxxxxxxxx"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
          Subject <span className="text-red-400">*</span>
        </label>
        <input
          required
          type="text"
          value={form.subject}
          onChange={set("subject")}
          placeholder="Topik pesan Anda"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
          Pesan <span className="text-red-400">*</span>
        </label>
        <textarea
          required
          value={form.pesan}
          onChange={set("pesan")}
          rows={4}
          placeholder="Tuliskan pesan Anda di sini..."
          className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#FF9122] transition-colors resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full btn-primary justify-center text-sm py-3 disabled:opacity-60 gap-2"
      >
        <Send size={16} />
        {loading ? "Mengirim..." : "Kirim Pesan"}
      </button>
    </form>
  );
}
