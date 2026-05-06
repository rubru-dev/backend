"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";

export default function NewBatchPage() {
  const router = useRouter();
  const [form, setForm] = useState<any>({ batchNumber: "", productName: "", productCode: "", quantity: 0, unit: "pcs", mfgDate: "", expDate: "", rawMaterials: [] });
  async function submit(e: FormEvent) { e.preventDefault(); const res = await api.post("/batch", form); router.push(`/batch/${res.data.id}`); }
  return <form onSubmit={submit}><PageHeader title="Batch Baru" /><div className="card grid gap-4 p-5 md:grid-cols-3">{["batchNumber", "productName", "productCode", "quantity", "unit", "mfgDate", "expDate"].map((f) => <div key={f}><label>{f}</label><input required={["batchNumber", "productName", "quantity", "unit", "mfgDate"].includes(f)} type={f.includes("Date") ? "date" : f === "quantity" ? "number" : "text"} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} /></div>)}</div><div className="mt-5 flex justify-end"><button className="btn btn-primary">Simpan Batch</button></div></form>;
}
