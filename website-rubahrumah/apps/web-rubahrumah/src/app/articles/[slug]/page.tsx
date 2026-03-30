export const revalidate = 30;

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { publicApi } from "@/lib/api";
import { formatDate } from "@rubahrumah/utils";
import { HeroCarousel } from "@/components/sections/hero-carousel";
import { ChevronRight, Calendar, User } from "lucide-react";

export async function generateStaticParams() {
  try {
    const data = await publicApi.rb.artikels({ per_page: 100 });
    return (data?.items ?? []).map((a: { slug: string }) => ({ slug: a.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const data = await publicApi.rb.artikelBySlug(params.slug);
    const a = data?.data as { judul?: string; excerpt?: string; cover_url?: string } | null;
    const coverUrl = a?.cover_url ? `${STORAGE}${a.cover_url}` : undefined;
    return {
      title: a?.judul ?? "Artikel",
      description: a?.excerpt ?? "",
      openGraph: {
        title: a?.judul,
        images: coverUrl ? [coverUrl] : [],
      },
    };
  } catch {
    return { title: "Artikel" };
  }
}

const STORAGE = process.env.NEXT_PUBLIC_STORAGE_URL ?? "http://localhost:8000";

export default async function ArtikelDetailPage({ params }: { params: { slug: string } }) {
  let artikel: any = null;
  let related: any[] = [];

  try {
    const data = await publicApi.rb.artikelBySlug(params.slug);
    artikel = data?.data;
    // Try to get related from same response, fallback to separate fetch
    related = (data as any)?.related ?? [];
    if (!related.length) {
      const relData = await publicApi.rb.artikels({ kategori: artikel?.kategori, per_page: 4 });
      related = (relData?.items ?? []).filter((r: any) => r.slug !== artikel?.slug).slice(0, 3);
    }
  } catch {
    notFound();
  }

  if (!artikel) notFound();

  const cover = artikel.cover_url ? `${STORAGE}${artikel.cover_url}` : null;

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Carousel (same as homepage) */}
      <HeroCarousel />

      {/* Breadcrumb */}
      <div className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400">
            <Link href="/" className="hover:text-[#FF9122]">Beranda</Link>
            <ChevronRight size={12} />
            <Link href="/articles" className="hover:text-[#FF9122]">Artikel</Link>
            <ChevronRight size={12} />
            <span className="text-slate-600 font-medium truncate max-w-[300px]">{artikel.judul}</span>
          </nav>
        </div>
      </div>

      {/* Artikel konten */}
      <div className="max-w-4xl mx-auto px-6 py-8 pb-16">

        {/* Judul */}
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3 leading-snug">
          {artikel.judul}
        </h1>

        {/* Meta row: date | author | kategori badge */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-6">
          {artikel.published_at && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(artikel.published_at)}
            </span>
          )}
          {artikel.author && (
            <span className="flex items-center gap-1">
              <User size={12} />
              {artikel.author}
            </span>
          )}
          {artikel.kategori && (
            <span className="bg-[#FF9122] text-white px-2.5 py-0.5 rounded-full font-semibold">
              {artikel.kategori}
            </span>
          )}
        </div>

        {/* Cover image — constrained to banner/content max width */}
        {cover && (
          <div className="w-full rounded-xl overflow-hidden mb-8">
            <Image
              src={cover}
              alt={artikel.judul}
              width={1280}
              height={720}
              className="w-full h-auto block"
              priority
            />
          </div>
        )}

        {/* Konten */}
        <div
          className="prose prose-slate max-w-none
            prose-headings:text-slate-800 prose-headings:font-bold
            prose-h2:text-lg prose-h3:text-base
            prose-p:text-slate-600 prose-p:leading-relaxed
            prose-a:text-[#FF9122] prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: artikel.konten ?? "" }}
        />

      </div>

      {/* Artikel Terkait */}
      {related.length > 0 && (
        <div className="border-t border-slate-100 py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Artikel Terkait</h2>
              <Link href="/articles" className="text-sm text-[#FF9122] font-semibold hover:underline">
                Lihat Semua →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {related.map((r: any) => {
                const rCover = r.cover_url ? `${STORAGE}${r.cover_url}` : null;
                return (
                  <Link key={r.id} href={`/articles/${r.slug}`} className="card group flex flex-col">
                    <div className="relative h-44 bg-slate-100 overflow-hidden flex-shrink-0">
                      {rCover ? (
                        <Image
                          src={rCover}
                          alt={r.judul}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
                          Tidak ada foto
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-bold text-[#0A5168] text-sm line-clamp-2 mb-1">
                        {r.judul}
                      </h3>
                      {r.excerpt && (
                        <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                          {r.excerpt}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
