"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FilePlus2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BeritaAcara } from "@/components/berita-acara-penawaran";
import { penawaranApi, type PenawaranType } from "@/lib/api/penawaran";
import { useAuthStore } from "@/store/authStore";

const UNITS: Array<{ type: PenawaranType; name: string }> = [
  { type: "rubru", name: "Rubah Rumah" },
  { type: "rkr", name: "Ruangkeruang" },
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

function DocumentList({ items, emptyText, actionLabel }: { items: ListedBeritaAcara[]; emptyText: string; actionLabel: string }) {
  if (!items.length) {
    return <div className="rounded-lg border bg-background p-8 text-center text-sm text-muted-foreground">{emptyText}</div>;
  }

  return (
    <section className="overflow-hidden rounded-lg border bg-background" aria-label={actionLabel}>
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
            <Link href={`/penawaran/berita-acara/${item.sourceType}/${item.id}`}>{actionLabel}</Link>
          </Button>
        </div>
      ))}
    </section>
  );
}

export default function BeritaAcaraPage() {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const canAccess = useAuthStore((state) => state.isSuperAdmin() || state.hasPermission("penawaran", "berita_acara"));
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
    enabled: hasHydrated && canAccess,
  });

  const items: ListedBeritaAcara[] = query.data ?? [];
  const reviewItems = items.filter((item) => item.status === "Draft");

  if (!hasHydrated) return <div role="status" className="rounded-lg border bg-background p-6 text-sm text-muted-foreground">Memeriksa akses Berita Acara...</div>;
  if (!canAccess) return <div role="alert" className="rounded-lg border bg-background p-6 text-sm text-muted-foreground">Anda tidak memiliki akses Berita Acara. Hubungi Super Admin untuk mengaktifkan permission.</div>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Berita Acara</h1>
        <p className="mt-1 text-sm text-muted-foreground">Buat, review, dan buka kembali Berita Acara yang sudah disimpan.</p>
      </header>

      <Tabs defaultValue="pembuatan">
        <TabsList className="grid min-h-11 w-full grid-cols-3 sm:max-w-xl">
          <TabsTrigger value="pembuatan" className="min-h-11">Pembuatan</TabsTrigger>
          <TabsTrigger value="review" className="min-h-11">Review{reviewItems.length ? ` (${reviewItems.length})` : ""}</TabsTrigger>
          <TabsTrigger value="tersimpan" className="min-h-11">Tersimpan{items.length ? ` (${items.length})` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value="pembuatan" className="mt-4">
          <section className="overflow-hidden rounded-lg border bg-background" aria-label="Pembuatan Berita Acara">
            {UNITS.map((unit, index) => (
              <div key={unit.type} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${index ? "border-t" : ""}`}>
                <div><h2 className="font-semibold">BA {unit.name}</h2><p className="mt-1 text-sm text-muted-foreground">Buat Berita Acara baru untuk {unit.name}.</p></div>
                <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
                  <Link href={`/penawaran/berita-acara/${unit.type}/baru`}><FilePlus2 aria-hidden="true" className="mr-2 h-4 w-4" />Buat BA</Link>
                </Button>
              </div>
            ))}
          </section>
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          {query.isLoading ? <div role="status" className="rounded-lg border bg-background p-6 text-sm text-muted-foreground">Memuat BA untuk direview...</div> : query.isError ? <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Daftar Review gagal dimuat. <button type="button" className="min-h-11 font-semibold underline" onClick={() => query.refetch()}>Coba lagi</button></div> : <DocumentList items={reviewItems} emptyText="Tidak ada BA Draft yang perlu direview." actionLabel="Review" />}
        </TabsContent>

        <TabsContent value="tersimpan" className="mt-4">
          {query.isLoading ? <div role="status" className="rounded-lg border bg-background p-6 text-sm text-muted-foreground">Memuat BA tersimpan...</div> : query.isError ? <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Daftar BA tersimpan gagal dimuat. <button type="button" className="min-h-11 font-semibold underline" onClick={() => query.refetch()}>Coba lagi</button></div> : <DocumentList items={items} emptyText="Belum ada Berita Acara yang disimpan." actionLabel="Buka Detail" />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
