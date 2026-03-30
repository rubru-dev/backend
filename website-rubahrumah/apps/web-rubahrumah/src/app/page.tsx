export const dynamic = "force-dynamic";

import { publicApi } from "@/lib/api";
import { HeroCarousel } from "@/components/sections/hero-carousel";
import { ServiceCards } from "@/components/sections/service-cards";
import { AlurKerja } from "@/components/sections/alur-kerja";
import { ProjectCarousel } from "@/components/sections/project-carousel";
import { PortfolioPreview } from "@/components/sections/portfolio-preview";
import { Kalkulator } from "@/components/sections/kalkulator";
import { StatsBanner } from "@/components/sections/stats-banner";
import { ArtikelPreview } from "@/components/sections/artikel-preview";
import { TestimoniSection } from "@/components/sections/testimoni";
import type { RbSiteConfig, RbProjectListItem, RbPortfolioListItem, RbArtikelListItem } from "@rubahrumah/types";

const STORAGE = process.env.NEXT_PUBLIC_STORAGE_URL ?? "http://localhost:8000";

export default async function BerandaPage() {
  const [configRes, projectsRes, portfolioRes, artikelsRes, bannersRes, testimoniRes, kalkulatorRes] = await Promise.allSettled([
    publicApi.rb.config() as Promise<{ data: RbSiteConfig }>,
    publicApi.rb.projects({ per_page: 6 }) as Promise<{ items: RbProjectListItem[] }>,
    publicApi.rb.portfolios({ per_page: 6 }) as Promise<{ items: RbPortfolioListItem[] }>,
    publicApi.rb.artikels({ per_page: 3 }) as Promise<{ items: RbArtikelListItem[] }>,
    publicApi.rb.banners() as Promise<{ data: Array<{ id: number; title?: string | null; subtitle?: string | null; image_url?: string | null; mobile_image_url?: string | null }> }>,
    publicApi.rb.testimonis() as Promise<{ data: any[] }>,
    publicApi.rb.kalkulator() as Promise<{ data: { base_prices: any; surcharges: any; spesifikasi?: Record<string, string[]> } }>,
  ]);

  const config = configRes.status === "fulfilled" ? configRes.value.data : ({} as RbSiteConfig);
  const projects = projectsRes.status === "fulfilled" ? (projectsRes.value.items ?? []) : [];
  const portfolios = portfolioRes.status === "fulfilled" ? (portfolioRes.value.items ?? []) : [];
  const artikels = artikelsRes.status === "fulfilled" ? (artikelsRes.value.items ?? []) : [];
  const testimonis = testimoniRes.status === "fulfilled" ? (testimoniRes.value.data ?? []) : [];
  const kalkulatorData = kalkulatorRes.status === "fulfilled" ? kalkulatorRes.value.data : null;
  const rawBanners = bannersRes.status === "fulfilled" ? (bannersRes.value.data ?? []) : [];
  const banners = rawBanners.map((b) => ({
    ...b,
    image_url: b.image_url ? `${STORAGE}${b.image_url}` : null,
    mobile_image_url: b.mobile_image_url ? `${STORAGE}${b.mobile_image_url}` : null,
  }));

  return (
    <main>
      {/* Banner strip — constrained to navbar width */}
      <HeroCarousel banners={banners} />

      {/* Pilih Jasa */}
      <ServiceCards />

      {/* Alur Kerja */}
      <AlurKerja />

      {/* Projek Berjalan */}
      <ProjectCarousel projects={projects} />

      {/* Portofolio */}
      <PortfolioPreview portfolios={portfolios} />

      {/* Kalkulator Estimasi */}
      <Kalkulator basePrices={kalkulatorData?.base_prices} surcharges={kalkulatorData?.surcharges} spesifikasi={kalkulatorData?.spesifikasi} />

      {/* Stats */}
      <StatsBanner config={config} />

      {/* Testimoni */}
      <TestimoniSection testimonis={testimonis} />

      {/* Artikel */}
      <ArtikelPreview artikels={artikels} />
    </main>
  );
}
