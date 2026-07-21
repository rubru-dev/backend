"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { fileUrl } from "@/lib/utils";

export interface PestDraft {
  pestType: string;
  confidence: number;
  findingsDraft: string;
  recommendationDraft: string;
  notVisible?: boolean;
}

type Turn = { role: "user" | "assistant"; content: string };

interface Props {
  photoPath: string;
  onPhotoChange: (p: string) => void;
  /** Dipanggil saat user klik "Terapkan". Parent menentukan draf-nya diapakan (isi temuan/analisa). */
  onResult: (d: PestDraft) => void;
  defaultInstruction?: string;
  label?: string;
  /** false = mode lihat (hanya tampilkan foto, tanpa upload/analisa) untuk view/PDF. */
  editable?: boolean;
}

export default function PestPhotoAnalyze({
  photoPath, onPhotoChange, onResult, defaultInstruction = "", label = "Foto temuan hama", editable = true,
}: Props) {
  const [instruction, setInstruction] = useState(defaultInstruction);
  const [followUp, setFollowUp] = useState("");
  const [history, setHistory] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<PestDraft | null>(null);
  const [aiOn, setAiOn] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    api.get("/ai/status").then(r => { if (alive) setAiOn(!!r.data?.configured); }).catch(() => { if (alive) setAiOn(false); });
    return () => { alive = false; };
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setError("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await api.post("/ai/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onPhotoChange(res.data?.path || "");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Upload gagal.");
    } finally { setUploading(false); }
  };

  // Satu giliran percakapan (analisa awal / perbaikan). Gambar sama, konteks bertambah.
  const send = async (message: string, base: Turn[]) => {
    if (!photoPath) { setError("Upload foto dulu."); return; }
    const nextHistory: Turn[] = [...base, { role: "user", content: message.trim() }];
    setLoading(true); setError("");
    try {
      const res = await api.post("/ai/identify-pest", { path: photoPath, messages: nextHistory });
      const d = (res.data?.data ?? null) as PestDraft | null;
      setDraft(d);
      if (d) setHistory([...nextHistory, { role: "assistant", content: JSON.stringify(d) }]);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Gagal menganalisa. Coba lagi.");
    } finally { setLoading(false); }
  };

  const analyze = () => send(instruction, []);
  const refine = () => { const q = followUp; setFollowUp(""); send(q, history); };
  const reset = () => { setDraft(null); setHistory([]); setFollowUp(""); setError(""); };
  const applyDraft = () => { if (draft) onResult(draft); reset(); };

  const confPct = draft ? Math.round((draft.confidence || 0) * 100) : 0;
  const confColor = confPct >= 80 ? "#16a34a" : confPct >= 50 ? "#d97706" : "#dc2626";

  // Mode lihat (view / export PDF): cukup tampilkan foto.
  if (!editable) {
    return photoPath
      ? <img src={fileUrl(photoPath)} alt={label} className="w-full h-full object-contain" />
      : <div className="w-full h-full flex items-center justify-center text-[11px] text-[#9ca3af]">Tidak ada foto</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Upload foto */}
      <label className="cursor-pointer rounded-lg border-2 border-dashed border-[#d1d5db] p-3 text-center hover:border-[#1a4d8c] transition-colors block">
        {uploading ? <span className="text-xs text-[#6b7280]">Mengupload...</span> :
          photoPath
            ? <img src={fileUrl(photoPath)} alt={label} className="max-h-40 mx-auto object-contain rounded" />
            : <div className="py-2"><p className="text-xs text-[#6b7280]">📷 {label}</p><p className="text-[10px] text-[#9ca3af]">Klik untuk upload</p></div>}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
      </label>
      {photoPath && <button type="button" onClick={() => onPhotoChange("")} className="text-[10px] text-red-400 hover:underline self-start">Hapus gambar</button>}

      {/* Panel AI */}
      <div className="no-print rounded-lg border border-[#c7d7ef] bg-[#f5f9ff] p-2.5 flex flex-col gap-2">
        <p className="text-[11px] font-semibold text-[#1a4d8c]">🤖 Analisa AI</p>
        {aiOn === false && <p className="text-[10px] text-red-600">AI belum dikonfigurasi. Set AI_API_KEY di .env backend lalu restart.</p>}

        <div>
          <label className="block text-[9px] font-semibold text-[#6b7280] mb-0.5">Konteks / instruksi untuk AI</label>
          <textarea value={instruction} onChange={e => setInstruction(e.target.value)} rows={2}
            placeholder="Jelaskan konteks foto, mis. 'ini kotoran tikus di gudang', 'bekas gerekan rayap di kusen' — makin jelas, makin akurat"
            className="w-full rounded border border-[#d1d5db] px-2 py-1 text-[11px] focus:border-[#1a4d8c] focus:outline-none resize-none" />
        </div>

        <button type="button" onClick={analyze} disabled={loading || !photoPath}
          className="rounded-lg bg-[#1a4d8c] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#153e70] disabled:opacity-40 transition-colors">
          {loading ? "Menganalisa…" : "Analisa dengan AI"}
        </button>
        {!photoPath && <p className="text-[9px] text-[#9ca3af]">Upload foto dulu untuk mengaktifkan analisa.</p>}
        {error && <p className="text-[10px] text-red-600">{error}</p>}
      </div>

      {/* Popup hasil (fixed, tidak kepotong slide) */}
      {draft && (
        <div className="no-print fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" onClick={() => { if (!loading) reset(); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b border-[#eee]">
              <span className="rounded bg-[#fef3c7] px-1.5 py-0.5 text-[10px] font-semibold text-[#92400e]">Draf AI — perlu verifikasi</span>
              {!draft.notVisible && (
                <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: confColor }}>Yakin {confPct}%</span>
              )}
              <button type="button" onClick={reset} className="ml-auto text-[#9ca3af] hover:text-[#111] text-lg leading-none">×</button>
            </div>
            <div className="px-4 py-3 overflow-y-auto flex flex-col gap-2">
              {draft.notVisible ? (
                <p className="text-xs text-[#b45309]">⚠️ AI kurang yakin ada hama di foto ini. {draft.findingsDraft}</p>
              ) : (
                <>
                  <p className="text-xs"><span className="font-semibold text-[#111]">Jenis:</span> {draft.pestType}</p>
                  <div><p className="text-[10px] font-semibold text-[#6b7280] mb-0.5">Draf temuan</p><p className="text-xs text-[#374151] whitespace-pre-wrap break-words">{draft.findingsDraft}</p></div>
                  <div><p className="text-[10px] font-semibold text-[#6b7280] mb-0.5">Draf rekomendasi</p><p className="text-xs text-[#374151] whitespace-pre-wrap break-words">{draft.recommendationDraft}</p></div>
                </>
              )}
            </div>
            <div className="px-4 py-2.5 border-t border-[#eee] flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-[#6b7280]">Belum pas? Minta perbaikan ke AI:</label>
              <div className="flex items-end gap-2">
                <textarea value={followUp} onChange={e => setFollowUp(e.target.value)} rows={2} disabled={loading}
                  onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && followUp.trim() && !loading) refine(); }}
                  placeholder="mis. 'lebih detail soal tingkat infestasi', 'ini sebenarnya tikus, bukan kecoa'"
                  className="flex-1 rounded border border-[#d1d5db] px-2 py-1 text-[11px] focus:border-[#1a4d8c] focus:outline-none resize-none disabled:bg-[#f3f4f6]" />
                <button type="button" onClick={refine} disabled={loading || !followUp.trim()}
                  className="rounded-lg bg-[#1a4d8c] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#153e70] disabled:opacity-40 whitespace-nowrap">
                  {loading ? "…" : "Kirim"}
                </button>
              </div>
              {error && <p className="text-[10px] text-red-600">{error}</p>}
            </div>
            <div className="flex items-center gap-2 px-4 py-3 border-t border-[#eee] bg-[#fafafa]">
              <button type="button" onClick={applyDraft} disabled={loading}
                className="rounded-lg bg-[#16a34a] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#15803d] disabled:opacity-40">✓ Terapkan</button>
              <button type="button" onClick={reset} className="rounded-lg border border-[#d1d5db] px-3 py-1.5 text-xs text-[#6b7280] hover:bg-[#f3f4f6]">Buang</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
