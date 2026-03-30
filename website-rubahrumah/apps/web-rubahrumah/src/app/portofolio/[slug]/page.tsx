export const dynamic = 'force-dynamic';

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { publicApi } from "@/lib/api";
import { formatRupiah, formatDate } from "@rubahrumah/utils";
import { HeroBanner } from "@/components/sections/hero-banner";
import { ImageLightbox, CoverLightbox } from "@/components/ui/image-lightbox";
import { ChevronRight, User, Calendar, MapPin, Maximize2, Wallet, CheckCircle } from "lucide-react";

export async function generateStaticParams() {
  try {
    const data = await publicApi.rb.portfolios({ per_page: 100 });
    return (data?.items ?? []).map((p: { slug: string }) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const data = await publicApi.rb.portfolioBySlug(params.slug);
    const p = data?.data as { nama_klien?: string } | null;
    return { title: p?.nama_klien ? `Portofolio ${p.nama_klien}` : "Portofolio" };
  } catch {
    return { title: "Portofolio" };
  }
}

const JENIS_LABELS: Record<string, string> = {
  BANGUN_RUMAH: "Bangun Rumah",
  RENOVASI:     "Renovasi Total",
  DESIGN:       "Design Rumah",
  INTERIOR:     "Interior Rumah",
};

const STORAGE = process.env.NEXT_PUBLIC_STORAGE_URL ?? "http://localhost:8000";

export default async function PortofolioDetailPage({ params }: { params: { slug: string } }) {
  let portfolio: any = null;
  let related: any[] = [];

  try {
    const data = await publicApi.rb.portfolioBySlug(params.slug);
    portfolio = data?.data;
    related = (data as any)?.related ?? [];
  } catch {
    notFound();
  }

  if (!portfolio) notFound();

  const images: any[] = [...(portfolio.images ?? [])].sort(
    (a: any, b: any) => a.sort_order - b.sort_order
  );

  const coverImg = images.find((i: any) => i.is_cover) ?? images.find((i: any) => i.group === "cover") ?? images[0] ?? null;
  const imagesByGroup: Record<string, any[]> = (portfolio as any).images_by_group ?? {};

  const TERMIN_LABELS: Record<string, string> = {
    termin1: "Termin 1",
    termin2: "Termin 2",
    termin3: "Termin 3",
  };

  const jenisLabel = JENIS_LABELS[portfolio.jenis_jasa] ?? portfolio.jenis_jasa ?? "";
  const lokasi     = portfolio.lokasi as string | undefined;

  // Durasi
  let durasi: string | null = null;
  if (portfolio.tanggal_mulai && portfolio.tanggal_selesai) {
    const start  = new Date(portfolio.tanggal_mulai);
    const end    = new Date(portfolio.tanggal_selesai);
    const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (months > 0) durasi = `${months} Bulan`;
  }

  const specRows = [
    { label: "Tipe Proyek",    value: jenisLabel },
    { label: "Luas Bangunan",  value: portfolio.luas  ? `${portfolio.luas} m²`  : null },
    { label: "Lokasi",         value: lokasi ?? null },
    { label: "Durasi",         value: durasi },
    {
      label: "Status",
      value: "Selesai",
      badge: true,
    },
  ].filter((r) => r.value);

  const waText = encodeURIComponent(
    `Halo, saya ingin project ${jenisLabel} seperti milik ${portfolio.nama_klien}`
  );

  return (
    <main className="min-h-screen bg-white">
      <HeroBanner />

      {/* Breadcrumb */}
      <div className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400">
            <Link href="/" className="hover:text-[#FF9122]">Beranda</Link>
            <ChevronRight size={12} />
            <Link href="/portofolio" className="hover:text-[#FF9122]">Portofolio</Link>
            <ChevronRight size={12} />
            <span className="text-slate-600 font-medium truncate max-w-[240px]">
              {jenisLabel} {portfolio.nama_klien}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 pb-16">

        {/* Judul + Status badge */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
            {jenisLabel} {portfolio.nama_klien}{lokasi ? ` – ${lokasi}` : ""}
          </h1>
          <span className="inline-flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0">
            <CheckCircle size={13} />
            Selesai
          </span>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-8">
          <div className="flex items-center gap-1.5">
            <User size={14} className="text-[#FF9122]" />
            <span>{portfolio.nama_klien}</span>
          </div>
          {portfolio.tanggal_selesai && (
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-[#FF9122]" />
              <span>{formatDate(portfolio.tanggal_selesai)}</span>
            </div>
          )}
          {lokasi && (
            <div className="flex items-center gap-1.5">
              <MapPin size={14} className="text-[#FF9122]" />
              <span>{lokasi}</span>
            </div>
          )}
          {portfolio.luas && (
            <div className="flex items-center gap-1.5">
              <Maximize2 size={14} className="text-[#FF9122]" />
              <span>{portfolio.luas} m²</span>
            </div>
          )}
          {portfolio.budget && (
            <div className="flex items-center gap-1.5">
              <Wallet size={14} className="text-[#FF9122]" />
              <span>{formatRupiah(portfolio.budget)}</span>
            </div>
          )}
        </div>

        {/* ─── Dokumentasi Proyek ─── */}
        <h2 className="text-lg font-bold text-slate-800 mb-4">Dokumentasi Proyek</h2>

        {/* All images (cover + termin groups) in one lightbox */}
        {images.length > 0 ? (
          <>
            {/* Cover / header photo — clickable for lightbox */}
            {coverImg?.image_url && (
              <CoverLightbox src={`${STORAGE}${coverImg.image_url}`} alt={portfolio.nama_klien}>
                <div className="relative w-full rounded-xl overflow-hidden mb-6 bg-slate-100" style={{ height: "460px" }}>
                  <Image
                    src={`${STORAGE}${coverImg.image_url}`}
                    alt={portfolio.nama_klien}
                    fill
                    className="object-cover hover:opacity-95 transition-opacity"
                    priority
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="bg-black/40 text-white text-xs px-3 py-1.5 rounded-full">Klik untuk perbesar</span>
                  </div>
                </div>
              </CoverLightbox>
            )}

            {/* Termin groups — clickable lightbox, max 8 desktop / 4 mobile */}
            {(["termin1", "termin2", "termin3"] as const).map((grp) => {
              const grpImages: any[] = imagesByGroup[grp] ?? [];
              if (grpImages.length === 0) return null;
              const lbImages = grpImages.map((img: any) => ({
                src: `${STORAGE}${img.image_url}`,
                alt: img.caption ?? `${TERMIN_LABELS[grp]}`,
              }));
              return (
                <div key={grp} className="mb-6">
                  <p className="text-sm font-semibold text-slate-600 mb-3">{TERMIN_LABELS[grp]}</p>
                  {/* Desktop: max 8 visible; Mobile: max 4 visible */}
                  <div className="hidden sm:block">
                    <ImageLightbox images={lbImages} cols={4} maxVisible={8} />
                  </div>
                  <div className="sm:hidden">
                    <ImageLightbox images={lbImages} cols={2} maxVisible={4} />
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="w-full rounded-xl bg-slate-100 flex items-center justify-center mb-6" style={{ height: "320px" }}>
            <span className="text-slate-300 text-sm">Belum ada foto dokumentasi</span>
          </div>
        )}

        {/* ─── Deskripsi + Spesifikasi ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10 mb-14">
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-3">Deskripsi Proyek</h2>
            {portfolio.deskripsi ? (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {portfolio.deskripsi}
              </p>
            ) : (
              <p className="text-sm text-slate-400">Tidak ada deskripsi.</p>
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-3">Spesifikasi Proyek</h2>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {specRows.map((row: any, i: number) => (
                <div
                  key={row.label}
                  className={`flex items-center px-4 py-3 text-sm ${i % 2 === 0 ? "bg-slate-50" : "bg-white"}`}
                >
                  <span className="text-slate-400 w-40 flex-shrink-0">{row.label}</span>
                  {row.badge ? (
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      <CheckCircle size={11} />
                      {row.value}
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-700">{row.value}</span>
                  )}
                </div>
              ))}
            </div>

            {/* CTA Konsultasi */}
            <a
              href={`https://wa.me/6281376405550?text=${waText}`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary w-full justify-center gap-2 mt-4 py-3 text-sm"
            >
              Ingin Hasil Seperti Ini? Hubungi Kami
            </a>
          </div>
        </div>

        {/* ─── Proyek Terkait ─── */}
        {related.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800">Proyek Terkait</h2>
              <Link href="/portofolio" className="text-sm text-[#FF9122] font-medium hover:underline">
                Lihat Semua →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {related.map((r: any) => {
                const rCoverPath = r.images?.find((i: any) => i.is_cover)?.image_url
                            ?? r.images?.[0]?.image_url
                            ?? (r as any).cover?.image_url ?? null;
                const rCover = rCoverPath ? `${STORAGE}${rCoverPath}` : null;
                return (
                  <Link key={r.id} href={`/portofolio/${r.slug}`} className="card group">
                    <div className="relative h-44 bg-slate-100 overflow-hidden">
                      {rCover ? (
                        <Image
                          src={rCover}
                          alt={r.nama_klien}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
                          Tidak ada foto
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="font-bold text-[#0A5168] text-sm mb-0.5">{r.nama_klien}</p>
                      <p className="text-xs text-[#FF9122] font-semibold mb-0.5">{formatRupiah(r.budget)}</p>
                      {(r as any).lokasi && (
                        <p className="text-xs text-slate-400">{(r as any).lokasi}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
