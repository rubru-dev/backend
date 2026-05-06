"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils";

export default function BatchPage() {
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); api.get("/batch", { params: { page: meta.page } }).then((r) => { setItems(r.data.data); setMeta({ page: r.data.page, totalPages: r.data.totalPages }); }).finally(() => setLoading(false)); }, [meta.page]);
  return <div><PageHeader title="Batch Tracking" action={<Link className="btn btn-primary" href="/batch/new">Batch Baru</Link>} /><div className="card overflow-hidden">{loading ? <PageLoading /> : <table><thead><tr><th>Batch</th><th>Produk</th><th>Qty</th><th>MFG</th><th>Status</th><th>Inspeksi/NCR</th></tr></thead><tbody>{items.map((b) => <tr key={b.id} className="clickable" onClick={() => location.href = `/batch/${b.id}`}><td className="font-semibold">{b.batchNumber}</td><td>{b.productName}</td><td>{b.quantity} {b.unit}</td><td>{formatDate(b.mfgDate)}</td><td><Badge value={b.status} /></td><td>{b._count?.inspections || 0} / {b._count?.ncrs || 0}</td></tr>)}</tbody></table>}<Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(p) => setMeta({ ...meta, page: p })} /></div></div>;
}
