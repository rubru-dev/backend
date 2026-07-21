// Logika domain: identifikasi hama dari foto + draf temuan & rekomendasi.
// Hasil AI = DRAF; wajib diverifikasi manusia sebelum dianggap final.

import { chatJSON } from "./aiProvider";

export interface Turn { role: "user" | "assistant"; content: string; }

export interface PestDraft {
  pestType: string;          // jenis hama (bahasa Indonesia), mis. "Kecoa Amerika"
  confidence: number;        // 0..1
  findingsDraft: string;     // draf temuan
  recommendationDraft: string; // draf rekomendasi tindakan
  notVisible?: boolean;      // true kalau AI tidak yakin ada hama di gambar
}

const SYSTEM_PROMPT = `Anda adalah ahli entomologi & teknisi pengendalian hama (pest control) untuk perusahaan jasa fumigasi di Indonesia.
Tugas Anda: menganalisis SATU foto temuan lapangan dan mengeluarkan draf profesional dalam Bahasa Indonesia.

Aturan:
- Identifikasi jenis hama yang paling mungkin terlihat (kecoa, tikus, rayap, nyamuk, lalat, semut, kutu, dsb). Sebutkan nama umum Indonesia.
- Jika foto tidak menampilkan hama atau tidak jelas, set "notVisible": true dan beri confidence rendah.
- "findingsDraft": 1-3 kalimat temuan objektif (apa yang terlihat, indikasi tingkat infestasi, lokasi/kondisi bila terlihat).
- "recommendationDraft": 1-3 kalimat rekomendasi tindakan pengendalian yang wajar & aman.
- Jangan mengarang detail yang tidak terlihat di foto. Ini DRAF untuk diverifikasi teknisi.
- Jawab HANYA dalam JSON valid dengan field: pestType (string), confidence (number 0-1), findingsDraft (string), recommendationDraft (string), notVisible (boolean).`;

const BASE_USER_TEXT = "Analisis foto temuan ini dan keluarkan draf JSON sesuai aturan.";

// Percakapan multi-turn: gambar dilampirkan ke pesan user PERTAMA, sisanya teks lanjutan
// (perbaikan/tindak lanjut). Model menjaga konteks & mengeluarkan JSON draf yang diperbarui.
export async function identifyPestConversation(
  imageBase64: string,
  mimeType: string,
  turns: Turn[],
): Promise<PestDraft> {
  const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];
  let imageAttached = false;
  for (const t of turns) {
    if (t.role === "user" && !imageAttached) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: (t.content || "").trim() || BASE_USER_TEXT },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      });
      imageAttached = true;
    } else {
      messages.push({ role: t.role, content: t.content });
    }
  }
  if (!imageAttached) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: BASE_USER_TEXT },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
      ],
    });
  }
  const raw = await chatJSON<Partial<PestDraft>>(messages);
  return normalize(raw);
}

// Single-turn (jalur upload file / prompt tunggal).
export async function identifyPestFromImage(
  imageBase64: string,
  mimeType: string,
  instruction?: string,
): Promise<PestDraft> {
  const extra = (instruction || "").trim();
  const content = extra
    ? `${BASE_USER_TEXT}\n\nInstruksi tambahan dari teknisi (utamakan ini): ${extra}`
    : BASE_USER_TEXT;
  return identifyPestConversation(imageBase64, mimeType, [{ role: "user", content }]);
}

function normalize(raw: Partial<PestDraft>): PestDraft {
  return {
    pestType: String(raw.pestType || "Tidak teridentifikasi").trim(),
    confidence: clamp01(Number(raw.confidence)),
    findingsDraft: String(raw.findingsDraft || "").trim(),
    recommendationDraft: String(raw.recommendationDraft || "").trim(),
    notVisible: Boolean(raw.notVisible),
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
