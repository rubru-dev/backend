import { CtaBand, SectionHeading, portfolioItems } from "@/components/ruangkeruang";
import { getRuangkeruangHome, toPortfolioCard } from "@/lib/ruangkeruang";
import { mockupImages } from "@/lib/mockup-content";
import PortfolioGallery from "./portfolio-gallery";

export default async function PortfolioPage() {
  const result = await getRuangkeruangHome().catch(() => null);
  const apiItems = result?.data.portfolio.map((item, index) => toPortfolioCard(item, mockupImages[index % mockupImages.length])) ?? [];
  const items = apiItems.length ? apiItems : portfolioItems;
  return <>
    <section className="px-5 py-14 lg:px-16 lg:py-20"><div className="mx-auto max-w-[1360px]"><SectionHeading eyebrow="Portfolio" title="Pekerjaan Kami." description="Interior dan eksterior custom presisi struktural yang telah kami wujudkan dengan disiplin material dan pengerjaan."/><PortfolioGallery items={items}/></div></section>
    <CtaBand/>
  </>;
}
