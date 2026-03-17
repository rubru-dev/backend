"use client";
import { useState, useEffect } from "react";
import { portalApi } from "@/lib/apiClient";

interface Kontak {
  id: number;
  role: string;
  nama: string;
  telepon: string | null;
  whatsapp: string | null;
  email: string | null;
}

export default function KontakPage() {
  const [contacts, setContacts] = useState<Kontak[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalApi.kontak()
      .then(setContacts)
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

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[#0F4C75] mb-1">Kontak Bantuan</h1>
      <p className="text-sm text-slate-400 mb-6">Hubungi tim kami jika Anda membutuhkan bantuan.</p>

      {contacts.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Belum ada kontak tersedia</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((c) => {
            const wa = c.whatsapp ?? c.telepon;
            const tel = c.telepon ?? c.whatsapp;
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-xs text-slate-400 mb-2">{c.role}</p>
                <p className="text-base font-bold text-[#0F4C75] mb-1">{c.nama}</p>
                {tel && <p className="text-sm text-slate-600 mb-1">{tel}</p>}
                {c.email && <p className="text-xs text-slate-400 mb-4">{c.email}</p>}
                {!c.email && <div className="mb-4" />}
                <div className="flex gap-2">
                  {wa && (
                    <a
                      href={`https://wa.me/${wa.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 flex-1 bg-green-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-600 transition"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 2.5C4 2 4.5 1.5 5 1.5h1.5l1 3-1.5 1a9 9 0 004.5 4.5l1-1.5 3 1V11c0 .5-.5 1-1 1C6.5 12 1 6.5 1 3c0-.5.5-1 1-1H4v1z" fill="white"/>
                      </svg>
                      WhatsApp
                    </a>
                  )}
                  {tel && (
                    <a
                      href={`tel:${tel}`}
                      className="flex items-center justify-center gap-2 flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 2.5C4 2 4.5 1.5 5 1.5h1.5l1 3-1.5 1a9 9 0 004.5 4.5l1-1.5 3 1V11c0 .5-.5 1-1 1C6.5 12 1 6.5 1 3c0-.5.5-1 1-1H4v1z" fill="currentColor"/>
                      </svg>
                      Telepon
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
