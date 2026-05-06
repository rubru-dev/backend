"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { PageLoading } from "@/components/ui/loading";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [passRate, setPassRate] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/analytics/overview"),
      api.get("/analytics/pass-rate"),
    ]).then(([overview, rates]) => {
      setData(overview.data);
      setPassRate(rates.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Ringkasan kualitas produksi dan non-conformance" />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Inspeksi 30 Hari" value={data.totalInspections} />
        <StatCard label="Pass Rate" value={`${data.passRate}%`} />
        <StatCard label="NCR Open" value={data.ncrOpen} />
        <StatCard label="Batch Aktif" value={data.batchActive} />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Pass Rate per Produk</h2>
          <div className="space-y-3">
            {passRate.length === 0 && <p className="text-sm text-ts">Belum ada data inspeksi.</p>}
            {passRate.map((row) => (
              <div key={row.product}>
                <div className="mb-1 flex justify-between text-sm"><span>{row.product}</span><span>{row.passRate}%</span></div>
                <div className="h-2 rounded bg-surface"><div className="h-2 rounded bg-accent" style={{ width: `${row.passRate}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">NCR Terbaru</h2>
          <div className="space-y-3">
            {data.recentNCRs.map((ncr: any) => (
              <Link key={ncr.id} href={`/ncr/${ncr.id}`} className="block rounded border border-bdr p-3 hover:bg-surface">
                <div className="flex justify-between"><b>{ncr.ncrNumber}</b><Badge value={ncr.status} /></div>
                <p className="mt-1 text-sm text-ts">{ncr.productName} - {formatDate(ncr.createdAt)}</p>
              </Link>
            ))}
            {data.recentNCRs.length === 0 && <p className="text-sm text-ts">Tidak ada NCR terbaru.</p>}
          </div>
        </section>
      </div>
      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-bdr p-4 font-semibold">Inspeksi Terbaru</div>
        <table><tbody>{data.recentInspections.map((i: any) => (
          <tr key={i.id}><td>{i.productName}</td><td>{i.officer?.name}</td><td><Badge value={i.status} /></td><td>{formatDate(i.createdAt)}</td></tr>
        ))}</tbody></table>
      </section>
    </div>
  );
}
