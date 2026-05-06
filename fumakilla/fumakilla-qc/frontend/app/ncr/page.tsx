"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";

export default function NcrPage() {
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api.get("/ncr", { params: { page: meta.page } }).then((r) => {
      setItems(r.data.data);
      setMeta({ page: r.data.page, totalPages: r.data.totalPages });
    }).finally(() => setLoading(false));
  }, [meta.page]);
  return (
    <div>
      <PageHeader title="Non-Conformance" subtitle="NCR dan CAPA" action={<Link href="/ncr/new" className="btn btn-primary">NCR Baru</Link>} />
      <div className="card overflow-hidden">{loading ? <PageLoading /> : <table><thead><tr><th>No NCR</th><th>Produk</th><th>Severity</th><th>Status</th><th>Reporter</th></tr></thead><tbody>{items.map((n) => (
        <tr key={n.id} className="clickable" onClick={() => location.href = `/ncr/${n.id}`}><td className="font-semibold">{n.ncrNumber}</td><td>{n.productName}</td><td><Badge value={n.severity} /></td><td><Badge value={n.status} /></td><td>{n.reportedBy?.name}</td></tr>
      ))}</tbody></table>}<Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(p) => setMeta({ ...meta, page: p })} /></div>
    </div>
  );
}
