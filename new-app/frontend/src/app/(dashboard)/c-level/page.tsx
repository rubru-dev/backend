"use client";

import { FormEvent, KeyboardEvent, useState } from "react";
import { FileSpreadsheet, Loader2, MessageSquareText, Send, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Message = { role: "user" | "assistant"; content: string };

const STARTER_QUESTIONS = [
  "Bagaimana kondisi leads, invoice, dan proyek saat ini?",
  "Bandingkan indikator BD dan finance yang tersedia di aplikasi.",
  "Apa risiko operasional yang terlihat dari data aplikasi?",
];

export default function CLevelPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(event?: FormEvent) {
    event?.preventDefault();
    const value = question.trim();
    if (!value || loading) return;
    const nextMessages = [...messages, { role: "user" as const, content: value }];
    setMessages(nextMessages);
    setQuestion("");
    setError("");
    setLoading(true);
    try {
      const response = await apiClient.post("/c-level/ai/chat", { question: value, history: messages });
      setMessages([...nextMessages, { role: "assistant", content: response.data.answer }]);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Analisa belum dapat dibuat. Periksa konfigurasi SumoPod atau coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void ask();
    }
  }

  return <div className="mx-auto w-full max-w-6xl space-y-5">
    <header className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-teal-700">Ruang keputusan manajemen</p>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard C-Level</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Diskusikan kondisi bisnis menggunakan data yang tersimpan di aplikasi Rubah Rumah.</p>
      </div>
      <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" /><span>AI dibatasi pada data aplikasi. Tidak ada browsing atau sumber eksternal.</span></div>
    </header>

    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="flex min-h-[560px] flex-col rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-3"><MessageSquareText className="h-4 w-4 text-teal-700" /><div><h2 className="text-sm font-semibold">Diskusi & Analisa</h2><p className="text-xs text-muted-foreground">Pertanyaan hanya dijawab dari konteks data aplikasi.</p></div></div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {!messages.length && <div className="flex min-h-[360px] flex-col items-center justify-center text-center"><div className="mb-4 rounded-full border bg-teal-50 p-3 text-teal-700"><MessageSquareText className="h-6 w-6" /></div><h3 className="text-base font-semibold">Mulai dari pertanyaan bisnis</h3><p className="mt-1 max-w-md text-sm text-muted-foreground">Gunakan periode, modul, atau metrik yang tersedia. AI akan menolak topik yang tidak berhubungan dengan aplikasi.</p></div>}
          {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2.5 text-sm leading-6 sm:max-w-[78%] ${message.role === "user" ? "bg-primary text-primary-foreground" : "border bg-background"}`}><p className="mb-1 text-[11px] font-medium opacity-70">{message.role === "user" ? "Anda" : "Analisa aplikasi"}</p>{message.content}</div></div>)}
          {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Menyusun analisa dari data aplikasi...</div>}
          {error && <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
        </div>
        <form onSubmit={ask} className="border-t p-3 sm:p-4"><div className="flex items-end gap-2"><Textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={handleKeyDown} placeholder="Contoh: kenapa closing bulan ini menurun?" className="min-h-[78px] resize-none" disabled={loading} /><Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={!question.trim() || loading} aria-label="Kirim pertanyaan"><Send className="h-4 w-4" /></Button></div><p className="mt-2 text-[11px] text-muted-foreground">Enter untuk kirim · Shift + Enter untuk baris baru</p></form>
      </section>

      <aside className="space-y-4">
        <section className="rounded-lg border bg-card p-4"><div className="mb-3 flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-teal-700" /><h2 className="text-sm font-semibold">Contoh pertanyaan</h2></div><div className="space-y-2">{STARTER_QUESTIONS.map((item) => <button type="button" key={item} onClick={() => setQuestion(item)} className="min-h-11 w-full rounded-md border px-3 py-2 text-left text-xs leading-5 transition-colors hover:bg-muted">{item}</button>)}</div></section>
        <section className="rounded-lg border bg-card p-4"><div className="mb-2 flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-teal-700" /><h2 className="text-sm font-semibold">Sumber data manual</h2></div><p className="text-xs leading-5 text-muted-foreground">Kelola import Excel dan template data BD dari menu Import Data Manual.</p><a href="/bd/import-data" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-teal-700 hover:underline">Buka import data</a></section>
      </aside>
    </div>
  </div>;
}
