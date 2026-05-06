"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";

export default function NewNcrPage() {
  const router = useRouter();
  const q = useSearchParams();
  const [form, setForm] = useState({ productName: q.get("product") || "", inspectionId: q.get("inspectionId") || "", batchId: "", severity: "MINOR", description: "" });
  async function submit(e: FormEvent) {
    e.preventDefault();
    const res = await api.post("/ncr", form);
    router.push(`/ncr/${res.data.id}`);
  }
  return <form onSubmit={submit}><PageHeader title="NCR Baru" /><div className="card grid gap-4 p-5 md:grid-cols-2">
    <div><label>Produk</label><input required value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} /></div>
    <div><label>Severity</label><select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}><option>MINOR</option><option>MAJOR</option><option>CRITICAL</option></select></div>
    <div><label>Inspection ID</label><input value={form.inspectionId} onChange={(e) => setForm({ ...form, inspectionId: e.target.value })} /></div>
    <div><label>Batch ID</label><input value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })} /></div>
    <div className="md:col-span-2"><label>Deskripsi</label><textarea required rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
  </div><div className="mt-5 flex justify-end"><button className="btn btn-primary">Simpan NCR</button></div></form>;
}
