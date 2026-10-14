import Link from "next/link";
import { CtaBand, SectionHeading, ServiceCard, exteriorServices, interiorServices, portfolioItems } from "@/components/ruangkeruang";
import { mockupImages } from "@/lib/mockup-content";
import { getRuangkeruangHome, toPortfolioCard, toServiceCard } from "@/lib/ruangkeruang";

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const interior = params.category === "interior";
  const result = await getRuangkeruangHome().catch(() => null);
  const apiServices = result?.data.services.filter((item) => item.category.toUpperCase() === (interior ? "INTERIOR" : "EKSTERIOR")).map((item, index) => toServiceCard(item, mockupImages[index + (interior ? 2 : 7)])) ?? [];
  const services = apiServices.length ? apiServices : (interior ? interiorServices : exteriorServices);
  const apiPortfolio = result?.data.portfolio.filter((item) => item.category.toUpperCase().includes(interior ? "INTERIOR" : "EKSTERIOR")).map((item, index) => toPortfolioCard(item, mockupImages[index])) ?? [];
  const visiblePortfolio = apiPortfolio.length ? apiPortfolio : portfolioItems;
  const title = interior ? "Interior yang Dibuat untuk Ruang Anda." : "Eksterior Berkarakter, Dibangun untuk Bertahan.";
  const description = interior ? "Dari kitchen set hingga built-in furniture, setiap detail dirancang mengikuti ritme dan kebutuhan hunian Anda." : "Kanopi, pagar, railing, dan fasade metalwork yang dirancang presisi untuk keamanan dan karakter hunian.";
  return <>
    <section className="px-5 py-8 lg:px-16 lg:py-12"><div className="mx-auto max-w-[1360px]"><div className="relative overflow-hidden rounded-[24px] bg-[#31302d]"><img src={mockupImages[interior ? 1 : 7]} alt={title} className="aspect-[16/8] w-full object-cover opacity-75"/><div className="absolute inset-0 bg-gradient-to-t from-[#1c1c19]/90 via-[#1c1c19]/20 to-transparent"/><div className="absolute inset-x-6 bottom-8 max-w-2xl text-white md:inset-x-12 md:bottom-12"><p className="font-label text-xs font-bold uppercase tracking-[0.12em] text-[#ffb595]">{interior ? "Interior Custom" : "Metalwork & Fasade"}</p><h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-[-0.03em] md:text-6xl">{title}</h1><p className="mt-4 max-w-xl text-sm leading-6 text-[#e6e2df] md:text-base">{description}</p><a href="https://wa.me/6281289001234" target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#f36b21] px-5 text-sm font-semibold text-white">Konsultasi Sekarang ↗</a></div></div></div></section>
    <section className="bg-[#f6f3ee] px-5 py-16 lg:px-16"><div className="mx-auto max-w-[1360px]"><SectionHeading eyebrow={interior ? "Kategori Interior Utama" : "Kategori Eksterior Utama"} title={interior ? "Ruang yang Berfungsi, Detail yang Bertahan" : "Struktur yang Tegas, Detail yang Halus"} description={description}/><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">{services.map((item) => <ServiceCard item={item} key={item.title}/>)}</div></div></section>
    <section className="bg-white px-5 py-16 lg:px-16"><div className="mx-auto max-w-[1360px]"><SectionHeading eyebrow={interior ? "Interior Projects" : "Exterior Projects"} title={interior ? "Koleksi Ruang yang Kami Kerjakan" : "Karya Eksterior untuk Hunian Modern"} action={<Link href="/ruangkeruang/site/portfolio" className="font-label text-sm font-semibold text-[#a23f00]">Lihat Semua Portfolio →</Link>}/><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{visiblePortfolio.slice(0, 6).map((item) => <ServiceCard item={item} key={item.title}/>)}</div></div></section>
    <CtaBand/>
  </>;
}
