import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { publicApi } from "@/lib/api";
import { formatRupiah } from "@rubahrumah/utils";
import type { RbPortfolioListItem } from "@rubahrumah/types";
import { HeroBanner } from "@/components/sections/hero-banner";
import { JenisJasaFilter } from "./filter";
import { ArrowRight, MapPin, ChevronLeft, ChevronRight } from "lucide-react";

export const metadata = {
  title: "Portofolio",
  description: "Hasil karya dan portofolio Rubah Rumah — jasa bangun & renovasi rumah profesional",
};

const JENIS_LABELS: Record<string, string> = {
  BANGUN_RUMAH: "Bangun Rumah",
  RENOVASI: "Renovasi Rumah",
  DESIGN: "Design Rumah",
  INTERIOR: "Interior Rumah",
};

interface PageProps {
  searchParams: { jenis?: string; page?: string };
}

const STORAGE = process.env.NEXT_PUBLIC_STORAGE_URL ?? "http://localhost:8000";

export default async function PortofolioPage({ searchParams }: PageProps) {
  const jenis = searchParams.jenis;
  const page = parseInt(searchParams.page ?? "1");
  const per_page = 6;

  let data: { items: unknown[]; total: number; total_pages: number } | null = null;
  try {
    data = await publicApi.rb.portfolios({ jenis_jasa: jenis, page, per_page });
  } catch {
    data = null;
  }
  const portfolios: RbPortfolioListItem[] = (data?.items ?? []) as RbPortfolioListItem[];
  const total: number = data?.total ?? 0;
  const totalPages = data?.total_pages ?? Math.ceil(total / per_page);

  const buildUrl = (pg: number) => {
    const params = new URLSearchParams();
    if (jenis) params.set("jenis", jenis);
    if (pg > 1) params.set("page", String(pg));
    const qs = params.toString();
    return `/portofolio${qs ? `?${qs}` : ""}`;
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <HeroBanner />

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Heading */}
        <h1 className="section-title mb-8">Portofolio Rubah Rumah</h1>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Suspense fallback={null}>
            <JenisJasaFilter current={jenis} />
          </Suspense>
        </div>

        {/* Grid */}
        {portfolios.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            Belum ada portofolio tersedia.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolios.map((p, idx) => {
              const coverUrl = (p as unknown as { cover?: { image_url?: string } }).cover?.image_url;
              const lokasi = (p as unknown as { lokasi?: string }).lokasi;
              const deskripsi = (p as unknown as { deskripsi?: string }).deskripsi;
              return (
                <div key={p.id} className={`card flex flex-col${idx >= 4 ? " hidden sm:flex" : ""}`}>
                  {/* Gambar */}
                  <div className="relative h-52 bg-slate-100 overflow-hidden flex-shrink-0">
                    {coverUrl ? (
                      <Image
                        src={`${STORAGE}${coverUrl}`}
                        alt={p.nama_klien}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">
                        Tidak ada foto
                      </div>
                    )}
                    {p.jenis_jasa && (
                      <span className="absolute top-3 right-3 bg-[#0B7B7B] text-white text-xs px-2.5 py-1 rounded-full font-semibold">
                        {JENIS_LABELS[p.jenis_jasa] ?? p.jenis_jasa}
                      </span>
                    )}
                  </div>

                  {/* Konten */}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-[#0A5168] mb-1">{p.nama_klien}</h3>
                    <p className="text-sm font-semibold text-[#FF9122] mb-1">
                      {formatRupiah(p.budget)}
                    </p>
                    {lokasi && (
                      <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                        <MapPin size={11} />
                        <span>{lokasi}</span>
                      </div>
                    )}
                    {deskripsi && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3 flex-1">
                        {deskripsi}
                      </p>
                    )}
                    <Link
                      href={`/portofolio/${p.slug}`}
                      className="flex items-center gap-1 text-[#FF9122] text-xs font-semibold hover:underline mt-auto"
                    >
                      Lihat Projek <ArrowRight size={12} />
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
