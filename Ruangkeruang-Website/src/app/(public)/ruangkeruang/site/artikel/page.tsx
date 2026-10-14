import Link from "next/link";
import { CtaBand, SectionHeading } from "@/components/ruangkeruang";
import { getRuangkeruangArticles } from "@/lib/ruangkeruang";

export default async function ArticlesPage() {
  const result = await getRuangkeruangArticles().catch(() => ({ data: [] }));
  return <><section className="px-5 py-14 lg:px-16 lg:py-20"><div className="mx-auto max-w-[1100px]"><SectionHeading eyebrow="Artikel" title="Catatan untuk merencanakan ruang dengan lebih jelas." description="Insight praktis dari proses desain, pemilihan material, dan pengerjaan custom."/><div className="mt-10 grid gap-5 md:grid-cols-2">{result.data.map((item) => <Link href={`/ruangkeruang/site/artikel/${item.slug}`} key={item.slug} className="group overflow-hidden rounded-[18px] border border-[#e9e9e6] bg-white"><div className="aspect-[16/9] bg-[#f0ede8]">{item.cover_url && <img src={item.cover_url} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}</div><div className="p-5"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#a23f00]">{item.category} · {item.read_time} menit baca</p><h2 className="mt-3 font-display text-2xl font-semibold text-[#1c1c19]">{item.title}</h2><p className="mt-3 text-sm leading-6 text-[#594238]">{item.excerpt || "Baca catatan lengkap Ruangkeruang."}</p></div></Link>)}</div>{result.data.length === 0 && <div className="mt-10 rounded-xl border border-dashed border-[#c8c2bc] p-10 text-center text-sm text-[#594238]">Belum ada artikel yang dipublikasikan.</div>}</div></section><CtaBand/></>;
}
