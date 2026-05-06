"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";

const emptyParam = { name: "", unit: "", standardMin: "", standardMax: "", result: "", resultText: "" };

export default function NewInspectionPage() {
  const router = useRouter();
  const [form, setForm] = useState<any>({ type: "RAW_MATERIAL", productName: "", supplierName: "", notes: "", parameters: [emptyParam] });
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post("/inspection", form);
      router.push(`/inspection/${res.data.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <PageHeader title="Inspeksi Baru" />
      <section className="card mb-5 grid gap-4 p-5 md:grid-cols-2">
        <div><label>Produk</label><input required value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} /></div>
        <div><label>Tipe</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="RAW_MATERIAL">Bahan Baku</option><option value="IN_PROCESS">In-Process</option><option value="FINISHED_GOODS">Finished Goods</option></select></div>
        <div><label>Supplier</label><input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} /></div>
        <div><label>Catatan</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </section>
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-bdr p-4"><b>Parameter Uji</b><button type="button" className="btn" onClick={() => setForm({ ...form, parameters: [...form.parameters, emptyParam] })}>Tambah Parameter</button></div>
        <div className="space-y-3 p-4">{form.parameters.map((p: any, idx: number) => (
          <div key={idx} className="grid gap-2 md:grid-cols-6">
            {["name", "unit", "standardMin", "standardMax", "result", "resultText"].map((field) => <input key={field} placeholder={field} value={p[field]} onChange={(e) => setForm({ ...form, parameters: form.parameters.map((x: any, i: number) => i === idx ? { ...x, [field]: e.target.value } : x) })} />)}
          </div>
        ))}</div>
      </section>
      <div className="mt-5 flex justify-end"><button className="btn btn-primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Inspeksi"}</button></div>
    </form>
  );
}
