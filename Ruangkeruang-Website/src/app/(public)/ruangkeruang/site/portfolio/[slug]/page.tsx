import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaBand, PortfolioCard, SectionHeading, portfolioItems } from "@/components/ruangkeruang";
import { getRuangkeruangHome, getRuangkeruangPortfolio, toPortfolioCard } from "@/lib/ruangkeruang";
import { mockupImages } from "@/lib/mockup-content";

export default async function PortfolioDetailPage({ params }: { params: { slug: string } }) {
  const apiItem = await getRuangkeruangPortfolio(params.slug).catch(() => null);
  const item = apiItem?.data ? toPortfolioCard(apiItem.data, mockupImages[0]) : portfolioItems.find((entry) => entry.title.toLowerCase().replaceAll(" ", "-") === params.slug);
  if (!item) notFound();
  const relatedResult = await getRuangkeruangHome().catch(() => null);
  const related = relatedResult?.data.portfolio.filter((entry) => entry.slug !== params.slug).slice(0, 3).map((entry, index) => toPortfolioCard(entry, mockupImages[index + 1])) ?? portfolioItems.filter((entry) => entry.title !== item.title).slice(0, 3);
  return <>
    <section className="px-5 py-14 lg:px-16 lg:py-20"><div className="mx-auto max-w-[1100px]"><Link href="/ruangkeruang/site/portfolio" className="font-label text-sm font-semibold text-[#a23f00]">← Kembali ke portfolio</Link><div className="mt-8 grid gap-10 lg:grid-cols-[1.3fr_.7fr] lg:items-end"><div><p className="font-label text-xs font-bold uppercase tracking-[0.12em] text-[#f36b21]">{item.category}</p><h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.03em] md:text-6xl">{item.title}</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-[#594238]">{item.description}. Kami menggabungkan kebutuhan pengguna, ketepatan dimensi, dan karakter material untuk menghasilkan ruang yang terasa utuh.</p></div><div className="rounded-2xl bg-[#f6f3ee] p-5 text-sm text-[#594238]"><p className="font-label text-xs font-bold uppercase tracking-[0.1em] text-[#a23f00]">Project Note</p><p className="mt-3">Setiap detail dikembangkan melalui konsultasi, validasi ukuran, dan approval material sebelum masuk workshop.</p></div></div><div className="mt-10 overflow-hidden rounded-[24px] bg-[#f0ede8]"><img src={item.image} alt={item.title} className="max-h-[680px] w-full object-cover"/></div></div></section>
    <section className="bg-[#f6f3ee] px-5 py-16 lg:px-16"><div className="mx-auto max-w-[1100px]"><SectionHeading eyebrow="Karya Lainnya" title="Eksplorasi proyek berikutnya"/><div className="grid gap-5 md:grid-cols-3">{related.map((entry) => <PortfolioCard item={entry} key={entry.title}/>)}</div></div></section>
    <CtaBand/>
  </>;
}
