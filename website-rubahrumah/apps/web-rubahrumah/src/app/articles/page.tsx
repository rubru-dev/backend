export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { publicApi } from "@/lib/api";
import { formatDate } from "@rubahrumah/utils";
import type { RbArtikelListItem } from "@rubahrumah/types";
import { HeroBanner } from "@/components/sections/hero-banner";
import { KategoriFilter } from "./filter";
import { ArrowRight, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

export const metadata = {
  title: "Artikel",
  description: "Tips dan panduan seputar renovasi & pembangunan rumah dari Rubah Rumah",
};

interface PageProps {
  searchParams: { kategori?: string; q?: string; page?: string };
}

const STORAGE = process.env.NEXT_PUBLIC_STORAGE_URL ?? "http://localhost:8000";

export default async function ArticlesPage({ searchParams }: PageProps) {
  const { kategori, q, page: pageStr } = searchParams;
  const page = parseInt(pageStr ?? "1");
  const per_page = 8;

  const [articlesRes, kategorisRes] = await Promise.allSettled([
    publicApi.rb.artikels({ kategori, search: q, page, per_page }),
    publicApi.rb.artikelCategories(),
  ]);

  const articlesData = articlesRes.status === "fulfilled" ? articlesRes.value : null;
  const artikels: RbArtikelListItem[] = (articlesData?.items ?? []) as RbArtikelListItem[];
  const kategoris: string[] = kategorisRes.status === "fulfilled" ? (kategorisRes.value?.data ?? []) : [];
  const totalPages = articlesData?.total_pages ?? Math.ceil((articlesData?.total ?? 0) / per_page);

  const buildUrl = (pg: number) => {
    const params = new URLSearchParams();
    if (kategori) params.set("kategori", kategori);
    if (q) params.set("q", q);
    if (pg > 1) params.set("page", String(pg));
    const qs = params.toString();
    return `/articles${qs ? `?${qs}` : ""}`;
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <HeroBanner />

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Heading */}
        <h1 className="section-title mb-8">
          Sajian Artikel Tentang Dunia Pembangunan Rumah!
        </h1>

        {/* Filter */}
        <div className="mb-8">
          <Suspense fallback={null}>
            <KategoriFilter kategoris={kategoris} current={kategori} currentQ={q} />
          </Suspense>
        </div>

        {/* Grid */}
        {artikels.length === 0 ? (
          <div className="text-center py-24 text-slate-400">Belum ada artikel tersedia.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {artikels.map((a, idx) => {
              const coverUrl = (a as unknown as { cover_url?: string }).cover_url;
              const excerpt = (a as unknown as { excerpt?: string }).excerpt;
              return (
                <div key={a.id} className={`card flex flex-col md:flex-row overflow-hidden${idx >= 4 ? " hidden md:flex" : ""}`}>
                  {/* Gambar */}
                  <div className="relative h-48 md:h-auto md:w-56 bg-slate-100 flex-shrink-0">
                    {coverUrl ? (
                      <Image
                        src={`${STORAGE}${coverUrl}`}
                        alt={a.judul}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">
                        Tidak ada foto
                      </div>
                    )}
                    {a.kategori && (
                      <span className="absolute top-3 left-3 bg-[#FF9122] text-white text-xs px-2.5 py-1 rounded-full font-semibold">
                        {a.kategori}
                      </span>
                    )}
                  </div>

                  {/* Konten */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                      <Calendar size={11} />
                      <span>{a.published_at ? formatDate(a.published_at) : ""}</span>
                    </div>
                    <h3 className="font-bold text-[#0A5168] leading-snug line-clamp-2 mb-2">
                      {a.judul}
                    </h3>
                    {excerpt && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-3 flex-1">
                        {excerpt}
                      </p>
                    )}
                    <Link
                      href={`/articles/${a.slug}`}
                      className="flex items-center gap-1 text-[#FF9122] text-xs font-semibold hover:underline mt-auto"
                    >
                      Baca Selengkapnya <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-12">
            <Link
              href={buildUrl(page - 1)}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                page <= 1
                  ? "border-slate-100 text-slate-300 pointer-events-none"
                  : "border-slate-200 text-slate-600 hover:border-[#FF9122] hover:text-[#FF9122]"
              }`}
              aria-disabled={page <= 1}
            >
              <ChevronLeft size={14} /> Sebelumnya
            </Link>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <Link
                key={pg}
                href={buildUrl(pg)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                  pg === page
                    ? "bg-[#FF9122] text-white border-[#FF9122]"
                    : "border-slate-200 text-slate-600 hover:border-[#FF9122] hover:text-[#FF9122]"
                }`}
              >
                {pg}
              </Link>
            ))}
            <Link
              href={buildUrl(page + 1)}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                page >= totalPages
                  ? "border-slate-100 text-slate-300 pointer-events-none"
                  : "border-slate-200 text-slate-600 hover:border-[#FF9122] hover:text-[#FF9122]"
              }`}
              aria-disabled={page >= totalPages}
            >
              Berikutnya <ChevronRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
