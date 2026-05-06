"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/ui/loading";

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [b, setBatch] = useState<any>(null);
  const load = () => api.get(`/batch/${id}`).then((r) => setBatch(r.data));
  useEffect(() => { load(); }, [id]);
  if (!b) return <PageLoading />;
  return <div><PageHeader title={b.batchNumber} subtitle={b.productName} /><div className="grid gap-4 md:grid-cols-3"><div className="card p-5"><b>Bahan Baku</b>{b.rawMaterials.map((m: any) => <p key={m.id} className="mt-2 text-sm">{m.materialName} - {m.quantity} {m.unit}</p>)}</div><div className="card p-5"><b>Proses</b><p className="mt-2">{b.batchNumber}</p><Badge value={b.status} /></div><div className="card p-5"><b>Output</b><p className="mt-2">{b.quantity} {b.unit}</p><p>{b.productName}</p></div></div></div>;
}
