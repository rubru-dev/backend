import { config } from "../config";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export async function summarizeWithSumoPod(messages: ChatMessage[]): Promise<string> {
  if (!config.sumopodApiKey) throw Object.assign(new Error("SUMOPOD_API_KEY belum dikonfigurasi di backend."), { status: 503 });
  if (!config.sumopodModel) throw Object.assign(new Error("SUMOPOD_MODEL belum dikonfigurasi di backend."), { status: 503 });

  const response = await fetch(`${config.sumopodBaseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.sumopodApiKey}` },
    body: JSON.stringify({ model: config.sumopodModel, temperature: 0.2, messages }),
    signal: AbortSignal.timeout(60_000),
  });
  const payload = await response.json() as ChatCompletionResponse;
  if (!response.ok) throw Object.assign(new Error(payload.error?.message || `SumoPod gagal (${response.status})`), { status: 502 });
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) throw Object.assign(new Error("SumoPod tidak mengembalikan ringkasan."), { status: 502 });
  return content;
}
