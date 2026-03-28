import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@rubahrumah/utils";
import type { RbArtikelListItem } from "@rubahrumah/types";
import { ArrowRight } from "lucide-react";
import { CardSlider } from "@/components/ui/card-slider";

interface Props { artikels: RbArtikelListItem[] }

const STORAGE = process.env.NEXT_PUBLIC_STORAGE_URL ?? "http://localhost:8000";

export function ArtikelPreview({ artikels }: Props) {
  if (!artikels.length) return null;

  const cards = artikels.map((a) => {
    const coverUrl = (a as unknown as { cover_url?: string }).cover_url;
    const excerpt  = (a as unknown as { excerpt?: string }).excerpt;
    return (
      <Link key={a.id} href={`/articles/${a.slug}`} className="card flex flex-col group h-full">
        {/* Gambar */}
        <div className="relative h-44 bg-slate-100 overflow-hidden flex-shrink-0">
          {coverUrl && (
            <Image
              src={`${STORAGE}${coverUrl}`}
              alt={a.judul}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
        </div>

        {/* Konten */}
        <div className="p-3 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-2">
            {a.published_at && (
              <span className="text-xs text-slate-400">{formatDate(a.published_at)}</span>
            )}
            {a.kategori && (
              <span className="bg-[#FF9122] text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                {a.kategori}
              </span>
            )}
          </div>

          <h3 className="font-bold text-[#0A5168] text-sm leading-snug line-clamp-2 mb-1.5 flex-1">
            {a.judul}
          </h3>

          {excerpt && (
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
              {excerpt}
            </p>
          )}
        </div>
      </Link>
    );
  });

  return (
    <section className="py-14 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="section-title text-center mb-8">
          Sajian Artikel Tentang Dunia Pembangunan Rumah!
        </h2>

        <CardSlider>{cards}</CardSlider>

        {/* Lihat Semua */}
        <div className="flex justify-center mt-8">
          <Link
            href="/articles"
            className="flex items-center gap-1 text-[#FF9122] text-sm font-semibold hover:underline"
          >
            Lihat Semua Artikel <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
