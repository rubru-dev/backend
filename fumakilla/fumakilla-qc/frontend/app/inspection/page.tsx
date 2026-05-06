"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { formatDate, typeLabel } from "@/lib/utils";

export default function InspectionPage() {
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({ type: "", status: "", search: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/inspection", { params: { ...filters, page: meta.page } })
      .then((r) => { setItems(r.data.data); setMeta({ page: r.data.page, totalPages: r.data.totalPages }); })
      .finally(() => setLoading(false));
  }, [filters, meta.page]);

  return (
    <div>
      <PageHeader title="Inspeksi" subtitle="Raw material, in-process, dan finished goods" action={<Link className="btn btn-primary" href="/inspection/new">Inspeksi Baru</Link>} />
      <div className="card mb-4 grid gap-3 p-4 md:grid-cols-3">
        <select value={filters.type} onChange={(e) => { setMeta({ ...meta, page: 1 }); setFilters({ ...filters, type: e.target.value }); }}><option value="">Semua Tipe</option><option value="RAW_MATERIAL">Bahan Baku</option><option value="IN_PROCESS">In-Process</option><option value="FINISHED_GOODS">Finished Goods</option></select>
        <select value={filters.status} onChange={(e) => { setMeta({ ...meta, page: 1 }); setFilters({ ...filters, status: e.target.value }); }}><option value="">Semua Status</option><option>PASS</option><option>FAIL</option><option>ON_HOLD</option><option>PENDING</option></select>
        <input placeholder="Cari produk/supplier..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
      </div>
      <div className="card overflow-hidden">
        {loading ? <PageLoading /> : items.length === 0 ? <EmptyState message="Belum ada inspeksi" /> : (
          <table><thead><tr><th>Produk</th><th>Tipe</th><th>Officer</th><th>Status</th><th>Tanggal</th></tr></thead><tbody>{items.map((item) => (
            <tr key={item.id} className="clickable" onClick={() => location.href = `/inspection/${item.id}`}>
              <td className="font-semibold">{item.productName}</td><td>{typeLabel[item.type] || item.type}</td><td>{item.officer?.name}</td><td><Badge value={item.status} /></td><td>{formatDate(item.createdAt)}</td>
            </tr>
          ))}</tbody></table>
        )}
        <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(p) => setMeta({ ...meta, page: p })} />
      </div>
    </div>
  );
}
