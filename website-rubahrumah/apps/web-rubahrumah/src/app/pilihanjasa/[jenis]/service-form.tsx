"use client";

import { useState } from "react";
import { publicApi } from "@/lib/api";
import { Send } from "lucide-react";

interface Props {
  jenis: string;
  jenisLabel: string;
  waNumber: string;
}

const JENIS_OPTIONS = [
  { value: "BANGUN_RUMAH", label: "Bangun Rumah" },
  { value: "RENOVASI", label: "Renovasi Rumah" },
  { value: "DESIGN", label: "Desain & Perencanaan" },
  { value: "INTERIOR", label: "Interior Custom" },
];

export function ServiceForm({ jenis, jenisLabel, waNumber }: Props) {
  const [form, setForm] = useState({
    nama: "",
    telepon: "",
    email: "",
    alamat: "",
    jenisJasa: jenis,
    budget: "",
    luas: "",
    lantai: 1,
    catatan: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await publicApi.rb.submitLead({
        nama_klien: form.nama,
        telepon: form.telepon,
        jenis_jasa: form.jenisJasa,
        budget: parseInt(form.budget.replace(/\D/g, "")) || 0,
        catatan: `Email: ${form.email}\nAlamat: ${form.alamat}\nLuas: ${form.luas} m²\nLantai: ${form.lantai}\nCatatan: ${form.catatan}`,
      });
    } catch {
      // redirect to WA even if API fails
    }

    const selectedLabel = JENIS_OPTIONS.find((o) => o.value === form.jenisJasa)?.label ?? jenisLabel;
    const msg = encodeURIComponent(
      `Halo Rubah Rumah,\n\nSaya ingin *${selectedLabel}*:\n\n👤 Nama: ${form.nama}\n📞 Telepon: ${form.telepon}\n📧 Email: ${form.email}\n📍 Alamat: ${form.alamat}\n📐 Luas: ${form.luas} m²\n🏠 Jumlah Lantai: ${form.lantai}\n💰 Budget: ${form.budget}\n📝 Catatan: ${form.catatan || "-"}`
    );
    window.open(`https://wa.me/${waNumber}?text=${msg}`, "_blank");
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-green-600 text-2xl">✓</span>
        </div>
        <h3 className="font-bold text-[#0A5168] text-lg mb-2">Terima Kasih!</h3>
        <p className="text-slate-500 text-sm">Tim kami akan segera menghubungi Anda via WhatsApp.</p>
      </div>
    );
  }

  const inputClass =
    "w-full h-11 px-4 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#FF9122] transition-colors bg-white";

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Nama Lengkap */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Nama Lengkap <span className="text-red-400">*</span>
          </label>
          <input
            required
            type="text"
            value={form.nama}
            onChange={set("nama")}
            placeholder="Masukkan nama lengkap"
            className={inputClass}
          />
        </div>

        {/* Jenis Layanan */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Jenis Layanan <span className="text-red-400">*</span>
          </label>
          <select
            value={form.jenisJasa}
            onChange={set("jenisJasa")}
            className={inputClass}
          >
            {JENIS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* No. Telepon */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Nomor Telepon <span className="text-red-400">*</span>
          </label>
          <input
            required
            type="tel"
            value={form.telepon}
            onChange={set("telepon")}
            placeholder="08xxxxxxxxxx"
            className={inputClass}
          />
        </div>

        {/* Estimasi Budget */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Estimasi Budget
          </label>
          <input
            type="text"
            value={form.budget}
            onChange={set("budget")}
            placeholder="Rp 500.000.000"
            className={inputClass}
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="email@contoh.com"
            className={inputClass}
          />
        </div>

        {/* Luas Bangunan */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Luas Bangunan (m²)
          </label>
          <input
            type="number"
            value={form.luas}
            onChange={set("luas")}
            placeholder="contoh: 120"
            className={inputClass}
          />
        </div>

        {/* Alamat */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Alamat Lengkap
          </label>
          <input
            type="text"
            value={form.alamat}
            onChange={set("alamat")}
            placeholder="Kota / Kecamatan / Kelurahan"
            className={inputClass}
          />
        </div>

        {/* Jumlah Lantai */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Jumlah Lantai
          </label>
          <div className="flex gap-2">
            {[1, 2, 3].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setForm((p) => ({ ...p, lantai: l }))}
                className={`flex-1 h-11 rounded-lg text-sm font-semibold border-2 transition-all ${
                  form.lantai === l
                    ? "bg-[#FF9122] text-white border-[#FF9122]"
                    : "border-slate-200 text-slate-600 hover:border-[#FF9122] hover:text-[#FF9122]"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Catatan */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
          Catatan Tambahan
        </label>
        <textarea
          value={form.catatan}
          onChange={set("catatan")}
          rows={3}
          placeholder="Ceritakan detail kebutuhan Anda..."
          className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#FF9122] transition-colors resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full btn-primary justify-center text-sm py-3 disabled:opacity-60 gap-2"
      >
        <Send size={16} />
        {loading ? "Mengirim..." : "Kirim Pesanan"}
      </button>
    </form>
  );
}
