"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/ui/loading";

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  useEffect(() => { api.get(`/inspection/${id}`).then((r) => setItem(r.data)); }, [id]);
  if (!item) return <PageLoading />;
  return (
    <div>
      <PageHeader title={item.productName} subtitle={`Inspeksi oleh ${item.officer?.name}`} action={item.status === "FAIL" && <Link className="btn btn-primary" href={`/ncr/new?inspectionId=${item.id}&product=${encodeURIComponent(item.productName)}`}>Buat NCR</Link>} />
      <div className="card mb-5 p-5"><Badge value={item.status} /> <span className="ml-3 text-sm text-ts">{item.notes || "Tidak ada catatan"}</span></div>
      <div className="card overflow-hidden">
        <table><thead><tr><th>Parameter</th><th>Standard</th><th>Result</th><th>Status</th></tr></thead><tbody>{item.parameters.map((p: any) => (
          <tr key={p.id} className={p.status === "FAIL" ? "bg-fail-bg" : ""}><td>{p.name}</td><td>{p.standardMin ?? "-"} - {p.standardMax ?? "-"} {p.unit}</td><td>{p.result ?? p.resultText ?? "-"}</td><td><Badge value={p.status} /></td></tr>
        ))}</tbody></table>
      </div>
      <button className="btn btn-danger mt-5" onClick={async () => { if (confirm("Hapus inspeksi?")) { await api.delete(`/inspection/${id}`); router.push("/inspection"); } }}>Hapus</button>
    </div>
  );
}
