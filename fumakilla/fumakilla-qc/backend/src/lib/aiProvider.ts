// Lapisan provider AI — OpenAI-compatible.
// Demo: Google AI Studio (Gemini). Nanti tinggal ganti 3 env var untuk pindah ke OpenRouter/Claude.
//   AI_BASE_URL  -> default endpoint OpenAI-compatible Gemini
//   AI_MODEL     -> default gemini-2.5-flash-lite
//   AI_API_KEY   -> API key (WAJIB diisi di .env, jangan di-commit)
//
// Karena semua provider ini bicara format /chat/completions yang sama, pindah provider = ganti env,
// bukan tulis ulang kode.

const AI_BASE_URL = process.env.AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai";
const AI_MODEL = process.env.AI_MODEL || "gemini-flash-lite-latest";
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 30_000);

export function isAiConfigured(): boolean {
  return AI_API_KEY.length > 0;
}

export interface VisionMessage {
  systemPrompt: string;
  userText: string;
  imageBase64: string;
  mimeType: string;
}

/**
 * Kirim 1 gambar + prompt ke model vision, minta output JSON.
 * Mengembalikan objek JSON hasil parse dari balasan model.
 */
/** Kirim messages OpenAI-compatible (boleh multi-turn + gambar), minta output JSON. */
export async function chatJSON<T = Record<string, unknown>>(messages: any[]): Promise<T> {
  if (!AI_API_KEY) {
    throw new Error("AI belum dikonfigurasi: set AI_API_KEY di .env backend.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const resp = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${AI_API_KEY}` },
      signal: controller.signal,
      body: JSON.stringify({ model: AI_MODEL, temperature: 0.2, response_format: { type: "json_object" }, messages }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      throw new Error(`AI provider error ${resp.status}: ${detail.slice(0, 500)}`);
    }

    const data: any = await resp.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("AI tidak mengembalikan konten.");

    return parseJsonLoose<T>(content);
  } finally {
    clearTimeout(timer);
  }
}

/** Wrapper 1 gambar + 1 prompt (single-turn). */
export async function chatVisionJSON<T = Record<string, unknown>>(msg: VisionMessage): Promise<T> {
  return chatJSON<T>([
    { role: "system", content: msg.systemPrompt },
    { role: "user", content: [
      { type: "text", text: msg.userText },
      { type: "image_url", image_url: { url: `data:${msg.mimeType};base64,${msg.imageBase64}` } },
    ] },
  ]);
}

// Sebagian model membungkus JSON dengan ```json ... ``` — bersihkan sebelum parse.
function parseJsonLoose<T>(raw: string): T {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    // fallback: ambil blok { ... } pertama
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1)) as T;
    }
    throw new Error("Gagal mem-parse JSON dari AI.");
  }
}

export const aiInfo = { baseUrl: AI_BASE_URL, model: AI_MODEL };
