"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/ui/loading";
import { formatDate } from "@/lib/utils";

export default function OcrPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { api.get("/ocr").then((r) => setItems(r.data.data)).finally(() => setLoading(false)); }, []);
  return <div><PageHeader title="OCR Dokumen" action={<Link className="btn btn-primary" href="/ocr/new">Proses OCR</Link>} />{loading ? <PageLoading /> : <div className="grid gap-4 md:grid-cols-3">{items.map((d) => <div key={d.id} className="card p-4"><div className="flex justify-between"><Badge value={d.category} /><Badge value={d.status} /></div><h2 className="mt-3 font-semibold">{d.title}</h2><p className="text-sm text-ts">{d.uploadedBy?.name} - {formatDate(d.createdAt)}</p><div className="mt-3 h-2 rounded bg-surface"><div className="h-2 rounded bg-accent" style={{ width: `${Math.min(100, Math.max(0, d.confidence || 0))}%` }} /></div><button className="btn mt-3" onClick={() => setOpen(open === d.id ? null : d.id)}>Lihat</button>{open === d.id && <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-surface p-3 text-xs">{d.ocrText}</pre>}</div>)}</div>}</div>;
}
