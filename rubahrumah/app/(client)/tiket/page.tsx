"use client";
import { useState, useEffect } from "react";
import { portalApi } from "@/lib/apiClient";

interface Kontak {
  id: number;
  role: string;
  nama: string;
  telepon: string | null;
  whatsapp: string | null;
}

export default function TiketPage() {
  const [contacts, setContacts] = useState<Kontak[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pesan, setPesan] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    portalApi.kontak().then(setContacts).catch(console.error);
  }, []);

  const selected = contacts.find((c) => c.id === selectedId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected?.whatsapp && !selected?.telepon) {
      setError("PIC yang dipilih tidak memiliki nomor WhatsApp");
      return;
    }
    if (!pesan.trim()) {
      setError("Pesan tidak boleh kosong");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await portalApi.tiket({
        whatsapp_target: (selected.whatsapp ?? selected.telepon)!,
        nama_pic: selected.nama,
        pesan: pesan.trim(),
      });
      setSuccess(true);
      setPesan("");
      setSelectedId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengirim pesan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[#0F4C75] mb-1">Tiket</h1>
      <p className="text-sm text-slate-400 mb-6">
        Kirim pertanyaan atau keluhan langsung ke tim kami via WhatsApp.
      </p>

      {success && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5 8l2.5 2.5L11 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Pesan Anda berhasil dikirim! Tim kami akan segera menghubungi Anda.</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              Pilih PIC / Tim
            </label>
            {contacts.length === 0 ? (
              <div className="text-sm text-slate-400 py-2">Memuat kontak...</div>
            ) : (
              <div className="space-y-2">
                {contacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition ${
                      selectedId === c.id
                        ? "border-orange-400 bg-orange-50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      selectedId === c.id ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                      {c.nama.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{c.nama}</p>
                      <p className="text-xs text-slate-400">{c.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              Pesan
            </label>
            <textarea
              value={pesan}
              onChange={(e) => setPesan(e.target.value)}
              placeholder="Tulis pertanyaan atau keluhan Anda di sini..."
              rows={5}
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 placeholder:text-slate-300 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !selectedId || !pesan.trim()}
            className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 transition disabled:opacity-50"
          >
            {loading ? "Mengirim..." : "Kirim Pesan"}
          </button>
        </form>
      </div>
    </div>
  );
}
