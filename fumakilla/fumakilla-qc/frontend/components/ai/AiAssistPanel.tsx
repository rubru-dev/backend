"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";

export interface PestDraft {
  pestType: string;
  confidence: number;
  findingsDraft: string;
  recommendationDraft: string;
  notVisible?: boolean;
}

interface Props {
  /** Dipanggil saat user klik "Terapkan draf". Parent yang menentukan mau diapakan draf-nya. */
  onApply: (draft: PestDraft) => void;
  /** Instruksi default (opsional), mis. nama jenis hama seksi ini. */
  defaultInstruction?: string;
}

export default function AiAssistPanel({ onApply, defaultInstruction = "" }: Props) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState(defaultInstruction);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<PestDraft | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    api.get("/ai/status").then(r => { if (alive) setConfigured(!!r.data?.configured); }).catch(() => { if (alive) setConfigured(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Kalau AI belum dikonfigurasi, sembunyikan panel (tidak bikin UI berantakan).
  if (configured === false) return null;

  const analyze = async () => {
    if (!file) { setError("Pilih foto dulu."); return; }
    setLoading(true); setError(""); setDraft(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (instruction.trim()) fd.append("prompt", instruction.trim());
      const res = await api.post("/ai/identify-pest", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setDraft(res.data?.data ?? null);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Gagal menganalisa. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const confPct = draft ? Math.round((draft.confidence || 0) * 100) : 0;
  const confColor = confPct >= 80 ? "#16a34a" : confPct >= 50 ? "#d97706" : "#dc2626";

  return (
    <div className="no-print rounded-lg border border-[#c7d7ef] bg-[#f5f9ff] overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-[#1a4d8c] hover:bg-[#eaf2ff] transition-colors">
        <span>🤖 Asisten AI — identifikasi hama dari foto</span>
        <span className="text-[#6b7280]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 flex flex-col gap-2">
          {/* 1. Prompt dulu */}
          <div>
            <label className="block text-[9px] text-[#6b7280] mb-0.5">Instruksi untuk AI (opsional)</label>
            <textarea value={instruction} onChange={e => setInstruction(e.target.value)} rows={2}
              placeholder="mis. 'fokus jenis rayap di area kayu' — kosongkan untuk analisa umum"
              className="w-full rounded border border-[#d1d5db] px-2 py-1 text-[11px] focus:border-[#1a4d8c] focus:outline-none resize-none" />
          </div>

          {/* 2. Pilih foto */}
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
              onChange={e => { setFile(e.target.files?.[0] || null); setDraft(null); setError(""); }} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="rounded border border-[#1a4d8c] px-2.5 py-1 text-[10px] font-semibold text-[#1a4d8c] hover:bg-[#eaf2ff]">
              📷 {file ? "Ganti foto" : "Pilih foto"}
            </button>
            {preview && <img src={preview} alt="preview" className="h-9 w-9 rounded object-cover border border-[#d1d5db]" />}
            <span className="text-[10px] text-[#6b7280] truncate flex-1">{file ? file.name : "belum ada foto"}</span>
          </div>

          {/* 3. Analisa */}
          <button type="button" onClick={analyze} disabled={loading || !file}
            className="rounded-lg bg-[#1a4d8c] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#153e70] disabled:opacity-40 transition-colors">
            {loading ? "Menganalisa…" : "Analisa dengan AI"}
          </button>

          {error && <p className="text-[10px] text-red-600">{error}</p>}

          {/* 4. Hasil draf */}
          {draft && (
            <div className="rounded-lg border border-[#e5e7eb] bg-white p-2.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded bg-[#fef3c7] px-1.5 py-0.5 text-[9px] font-semibold text-[#92400e]">Draf AI — perlu verifikasi</span>
                {!draft.notVisible && (
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold text-white" style={{ backgroundColor: confColor }}>
                    Yakin {confPct}%
                  </span>
                )}
              </div>

              {draft.notVisible ? (
                <p className="text-[11px] text-[#b45309]">⚠️ AI tidak yakin ada hama di foto ini. {draft.findingsDraft}</p>
              ) : (
                <>
                  <p className="text-[11px]"><span className="font-semibold text-[#111]">Jenis:</span> {draft.pestType}</p>
                  <div>
                    <p className="text-[9px] font-semibold text-[#6b7280]">Draf temuan</p>
                    <p className="text-[11px] text-[#374151]">{draft.findingsDraft}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-[#6b7280]">Draf rekomendasi</p>
                    <p className="text-[11px] text-[#374151]">{draft.recommendationDraft}</p>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 pt-0.5">
                <button type="button" onClick={() => { onApply(draft); setDraft(null); }}
                  className="rounded-lg bg-[#16a34a] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#15803d]">
                  ✓ Terapkan ke temuan
                </button>
                <button type="button" onClick={() => setDraft(null)}
                  className="text-[10px] text-[#6b7280] hover:underline">Buang</button>
              </div>
              <p className="text-[9px] text-[#9ca3af]">Draf bisa kamu edit bebas setelah diterapkan.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
