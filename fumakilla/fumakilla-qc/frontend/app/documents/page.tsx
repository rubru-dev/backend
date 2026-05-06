"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/ui/loading";
import { formatDate } from "@/lib/utils";

export default function DocumentsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { api.get("/document").then((r) => setItems(r.data.data)).finally(() => setLoading(false)); }, []);
  return <div><PageHeader title="Dokumen & SOP" action={<Link className="btn btn-primary" href="/documents/new">Upload Dokumen</Link>} />{loading ? <PageLoading /> : <div className="card overflow-hidden"><table><thead><tr><th>Judul</th><th>Kategori</th><th>Versi</th><th>Author</th><th>Update</th></tr></thead><tbody>{items.map((d) => <tr key={d.id} className="clickable" onClick={() => setOpen(open === d.id ? null : d.id)}><td><b>{d.title}</b>{open === d.id && <div className="mt-3 space-y-1 text-sm text-ts">{d.versions.map((v: any) => <a key={v.id} className="block text-accent" href={`${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "")}${v.filePath}`} target="_blank">Download v{v.version} - {v.changelog || "Initial"}</a>)}</div>}</td><td><Badge value={d.category} /></td><td>v{d.currentVersion}</td><td>{d.author?.name}</td><td>{formatDate(d.updatedAt)}</td></tr>)}</tbody></table></div>}</div>;
}
