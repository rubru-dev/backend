"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/ui/loading";

export default function NcrDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<any>(null);
  const [capa, setCapa] = useState({ type: "CORRECTIVE", description: "", dueDate: "" });
  const load = () => api.get(`/ncr/${id}`).then((r) => setItem(r.data));
  useEffect(() => { load(); }, [id]);
  async function addCapa(e: FormEvent) { e.preventDefault(); await api.post(`/ncr/${id}/capa`, capa); setCapa({ type: "CORRECTIVE", description: "", dueDate: "" }); load(); }
  if (!item) return <PageLoading />;
  return <div><PageHeader title={item.ncrNumber} subtitle={item.productName} /><div className="card mb-5 p-5"><Badge value={item.severity} /> <Badge value={item.status} /> <p className="mt-3">{item.description}</p></div>
    <section className="card mb-5 p-5"><h2 className="mb-3 font-semibold">Root Cause & Status</h2><textarea rows={4} defaultValue={item.rootCause || ""} onBlur={(e) => api.put(`/ncr/${id}`, { rootCause: e.target.value })} /><div className="mt-3 flex gap-2">{["OPEN", "IN_PROGRESS", "CLOSED"].map((s) => <button key={s} className="btn" onClick={async () => { await api.put(`/ncr/${id}`, { status: s }); load(); }}>{s}</button>)}</div></section>
    <section className="card overflow-hidden"><div className="border-b border-bdr p-4 font-semibold">CAPA</div><table><tbody>{item.capas.map((c: any) => <tr key={c.id}><td>{c.type}</td><td>{c.description}</td><td><Badge value={c.status} /></td><td><button className="btn" onClick={async () => { await api.put(`/ncr/capa/${c.id}`, { status: c.status === "DONE" ? "OPEN" : "DONE" }); load(); }}>Toggle</button></td></tr>)}</tbody></table><form className="grid gap-3 border-t border-bdr p-4 md:grid-cols-[160px_1fr_160px_100px]" onSubmit={addCapa}><select value={capa.type} onChange={(e) => setCapa({ ...capa, type: e.target.value })}><option>CORRECTIVE</option><option>PREVENTIVE</option></select><input required placeholder="Deskripsi CAPA" value={capa.description} onChange={(e) => setCapa({ ...capa, description: e.target.value })} /><input type="date" value={capa.dueDate} onChange={(e) => setCapa({ ...capa, dueDate: e.target.value })} /><button className="btn btn-primary">Tambah</button></form></section>
  </div>;
}
