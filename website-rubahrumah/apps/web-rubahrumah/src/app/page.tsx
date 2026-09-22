export const dynamic = "force-dynamic";

import { publicApi } from "@/lib/api";
import { HeroCarousel } from "@/components/sections/hero-carousel";
import { ServiceCards } from "@/components/sections/service-cards";
import { GeneralConsultationForm } from "@/components/sections/general-consultation-form";
import { AlurKerja } from "@/components/sections/alur-kerja";
import { ProjectCarousel } from "@/components/sections/project-carousel";
import { PortfolioPreview } from "@/components/sections/portfolio-preview";
import { ArtikelPreview } from "@/components/sections/artikel-preview";
import { TestimoniSection } from "@/components/sections/testimoni";
import { mediaUrl } from "@/lib/media";
import type { RbProjectListItem, RbPortfolioListItem, RbArtikelListItem } from "@rubahrumah/types";

export default async function BerandaPage() {
  const [projectsRes, portfolioRes, artikelsRes, bannersRes, testimoniRes] = await Promise.allSettled([
    publicApi.rb.projects({ per_page: 6 }) as Promise<{ items: RbProjectListItem[] }>,
    publicApi.rb.portfolios({ per_page: 6 }) as Promise<{ items: RbPortfolioListItem[] }>,
    publicApi.rb.artikels({ per_page: 3 }) as Promise<{ items: RbArtikelListItem[] }>,
    publicApi.rb.banners() as Promise<{ data: Array<{ id: number; title?: string | null; subtitle?: string | null; image_url?: string | null; mobile_image_url?: string | null }> }>,
    publicApi.rb.testimonis() as Promise<{ data: any[] }>,
  ]);

  const projects = projectsRes.status === "fulfilled" ? (projectsRes.value.items ?? []) : [];
  const portfolios = portfolioRes.status === "fulfilled" ? (portfolioRes.value.items ?? []) : [];
  const artikels = artikelsRes.status === "fulfilled" ? (artikelsRes.value.items ?? []) : [];
  const testimonis = testimoniRes.status === "fulfilled" ? (testimoniRes.value.data ?? []) : [];
  const rawBanners = bannersRes.status === "fulfilled" ? (bannersRes.value.data ?? []) : [];
  const banners = rawBanners.map((b) => ({
    ...b,
    image_url: mediaUrl(b.image_url),
    mobile_image_url: mediaUrl(b.mobile_image_url),
  }));

  return (
    <main>
      {/* Banner strip — constrained to navbar width */}
      <HeroCarousel banners={banners} />

      {/* Konsultasi general */}
      <GeneralConsultationForm />

      {/* Pilih Jasa */}
      <ServiceCards />

      {/* Testimoni */}
      <TestimoniSection testimonis={testimonis} />

      {/* Portofolio */}
      <PortfolioPreview portfolios={portfolios} />

      {/* Project Berjalan */}
      <ProjectCarousel projects={projects} />

      {/* Bagaimana Rubah Rumah bekerja */}
      <AlurKerja />

      {/* Artikel */}
      <ArtikelPreview artikels={artikels} />
    </main>
  );
}
