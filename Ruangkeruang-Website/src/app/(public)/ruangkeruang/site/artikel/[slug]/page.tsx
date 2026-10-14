import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaBand } from "@/components/ruangkeruang";
import { getRuangkeruangArticle } from "@/lib/ruangkeruang";

export default async function ArticleDetailPage({ params }: { params: { slug: string } }) {
  const result = await getRuangkeruangArticle(params.slug).catch(() => null);
  if (!result?.data) notFound();
  const article = result.data;
  return <><article className="px-5 py-14 lg:px-16 lg:py-20"><div className="mx-auto max-w-[850px]"><Link href="/ruangkeruang/site/artikel" className="text-sm font-semibold text-[#a23f00]">Kembali ke artikel</Link><p className="mt-10 text-xs font-semibold uppercase tracking-[0.1em] text-[#a23f00]">{article.category} · {article.read_time} menit baca</p><h1 className="mt-3 font-display text-4xl font-bold leading-tight tracking-[-0.03em] md:text-6xl">{article.title}</h1><p className="mt-5 text-lg leading-8 text-[#594238]">{article.excerpt}</p>{article.cover_url && <img src={article.cover_url} alt={article.title} className="mt-10 max-h-[520px] w-full rounded-[24px] object-cover" />}<div className="prose prose-stone mt-10 max-w-none whitespace-pre-line text-[16px] leading-8">{article.content}</div><p className="mt-10 text-sm text-[#8c7166]">Ditulis oleh {article.author}</p></div></article><CtaBand/></>;
}
