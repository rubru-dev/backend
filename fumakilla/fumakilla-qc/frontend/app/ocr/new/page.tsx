"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";

export default function NewOcrPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState("ind+eng");
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({ title: "", category: "COA" });
  const [loading, setLoading] = useState(false);
  async function process() {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("image", file);
    fd.append("lang", lang);
    try { const res = await api.post("/ocr/process", fd); setResult(res.data); }
    finally { setLoading(false); }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    await api.post("/ocr", { ...form, originalFile: result.filePath, ocrText: result.text, confidence: result.confidence });
    router.push("/ocr");
  }
  return <div><PageHeader title="OCR Baru" /><div className="card mb-5 grid gap-4 p-5 md:grid-cols-[1fr_180px_140px]"><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /><select value={lang} onChange={(e) => setLang(e.target.value)}><option value="ind">Indonesia</option><option value="eng">English</option><option value="ind+eng">Campuran</option></select><button className="btn btn-primary" onClick={process} disabled={!file || loading}>{loading ? "Proses..." : "Proses OCR"}</button></div>{result && <form onSubmit={save} className="card p-5"><div className="grid gap-4 md:grid-cols-2"><div><label>Judul</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div><div><label>Kategori</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>COA</option><option>LABEL</option><option>LAB_RESULT</option><option>INSPECTION_FORM</option><option>OTHER</option></select></div></div><label className="mt-4">Hasil OCR</label><textarea rows={12} value={result.text} onChange={(e) => setResult({ ...result, text: e.target.value })} /><p className="my-3 text-sm text-ts">Confidence: {Math.round(result.confidence || 0)}%</p><button className="btn btn-primary">Simpan Dokumen</button></form>}</div>;
}
