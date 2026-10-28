"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FilePlus2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BeritaAcara } from "@/components/berita-acara-penawaran";
import { penawaranApi, type PenawaranType } from "@/lib/api/penawaran";

const UNITS: Array<{ type: PenawaranType; name: string }> = [
  { type: "rubru", name: "Rubah Rumah" },
  { type: "rkr", name: "Ruangkeruang" },
  { type: "desain", name: "Desain" },
];

type ListedBeritaAcara = BeritaAcara & { sourceType: PenawaranType };

function unitName(type: PenawaranType) {
  return UNITS.find((unit) => unit.type === type)?.name ?? type;
}

function statusClass(status: BeritaAcara["status"]) {
  if (status === "Ditandatangani") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Final") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function BeritaAcaraPage() {
  const query = useQuery({
    queryKey: ["penawaran-berita-acara-all"],
    queryFn: async () => {
      const groups = await Promise.all(
        UNITS.map(async ({ type }) =>
          (await penawaranApi.list<BeritaAcara>(type, "berita_acara")).map((item) => ({ ...item, sourceType: type })),
        ),
      );
      return groups.flat().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    },
  });

  const items: ListedBeritaAcara[] = query.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Berita Acara</h1>
          <p className="mt-1 text-sm text-muted-foreground">Daftar BA mandiri dan BA yang terhubung dengan Penawaran.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {UNITS.map((unit) => (
            <Button key={unit.type} asChild variant="outline" className="min-h-11">
              <Link href={`/penawaran/berita-acara/${unit.type}/baru`}>
                <FilePlus2 aria-hidden="true" className="mr-2 h-4 w-4" />BA {unit.name}
              </Link>
            </Button>
          ))}
        </div>
      </header>

      {query.isLoading && <div role="status" className="rounded-lg border bg-background p-6 text-sm text-muted-foreground">Memuat daftar Berita Acara...</div>}
      {query.isError && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Daftar Berita Acara gagal dimuat. <button type="button" className="min-h-11 font-semibold underline" onClick={() => query.refetch()}>Coba lagi</button></div>}
      {!query.isLoading && !query.isError && items.length === 0 && <div className="rounded-lg border bg-background p-8 text-center text-sm text-muted-foreground">Belum ada Berita Acara. Pilih unit di atas untuk membuat dokumen baru.</div>}

      {items.length > 0 && (
        <section className="overflow-hidden rounded-lg border bg-background" aria-label="Daftar Berita Acara">
          {items.map((item, index) => (
            <div key={item.id} className={`grid gap-3 p-4 lg:grid-cols-[minmax(0,1.6fr)_0.8fr_0.8fr_auto] lg:items-center ${index ? "border-t" : ""}`}>
              <div className="min-w-0">
                <div className="truncate font-semibold">{item.nomor}: {item.judul}</div>
                <div className="mt-1 text-sm text-muted-foreground">{item.sourceOfferId ? item.sourceLabel : "BA mandiri"}</div>
              </div>
              <div className="text-sm"><span className="text-muted-foreground lg:hidden">Unit: </span>{unitName(item.sourceType)}</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm">{new Date(`${item.tanggal}T00:00:00`).toLocaleDateString("id-ID")}</span>
                <Badge variant="outline" className={statusClass(item.status)}>{item.status}</Badge>
              </div>
              <Button asChild variant="outline" className="min-h-11 w-full lg:w-auto">
                <Link href={`/penawaran/berita-acara/${item.sourceType}/${item.id}`}>Buka Detail</Link>
              </Button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
