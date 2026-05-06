"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";

export default function NewDocumentPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: "", category: "SOP", description: "", changelog: "" });
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append("file", file);
    await api.post("/document", fd);
    router.push("/documents");
  }
  return <form onSubmit={submit}><PageHeader title="Upload Dokumen" /><div className="card grid gap-4 p-5 md:grid-cols-2"><div><label>Judul</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div><div><label>Kategori</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>SOP</option><option>QUALITY_STANDARD</option><option>PRODUCT_SPEC</option><option>WORK_INSTRUCTION</option><option>FORM_TEMPLATE</option></select></div><div><label>Changelog</label><input value={form.changelog} onChange={(e) => setForm({ ...form, changelog: e.target.value })} /></div><div><label>File</label><input required type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div><div className="md:col-span-2"><label>Deskripsi</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div></div><div className="mt-5 flex justify-end"><button className="btn btn-primary">Upload</button></div></form>;
}
