"use client";

import { useMemo, useState } from "react";
import { PortfolioCard } from "@/components/ruangkeruang";

export default function PortfolioGallery({ items }: { items: { title: string; category: string; description: string; image: string }[] }) {
  const [active, setActive] = useState("Semua");
  const categories = ["Semua", ...Array.from(new Set(items.map((item) => item.category)))];
  const visible = useMemo(() => active === "Semua" ? items : items.filter((item) => item.category === active), [active, items]);
  return <><div className="mb-8 flex flex-wrap gap-2">{categories.map((category) => <button type="button" key={category} onClick={() => setActive(category)} className={`min-h-11 rounded-lg px-4 text-xs font-semibold transition ${active === category ? "bg-[#1c1c19] text-white" : "bg-[#f0ede8] text-[#594238] hover:bg-[#e5e2dd]"}`}>{category}</button>)}</div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{visible.map((item, index) => <PortfolioCard item={item} featured={index === 0 && active === "Semua"} key={`${item.title}-${index}`} />)}</div>{visible.length === 0 && <p className="rounded-xl border border-dashed border-[#c8c2bc] p-8 text-sm text-[#594238]">Belum ada proyek pada kategori ini.</p>}</>;
}
