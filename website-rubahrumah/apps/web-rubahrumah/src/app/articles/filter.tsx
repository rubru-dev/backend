"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  kategoris: string[];
  current?: string;
  currentQ?: string;
}

export function KategoriFilter({ kategoris, current }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const buildUrl = (kategori?: string) => {
    const params = new URLSearchParams(sp.toString());
    if (kategori) params.set("kategori", kategori);
    else params.delete("kategori");
    params.delete("page");
    return `/articles?${params.toString()}`;
  };

  if (kategoris.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => router.push(buildUrl(undefined))}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
            !current
              ? "bg-[#FF9122] text-white border-[#FF9122]"
              : "border-slate-200 text-slate-600 hover:border-[#FF9122] hover:text-[#FF9122]"
          }`}
        >
          Semua
        </button>
        {kategoris.map((k) => (
          <button
            key={k}
            onClick={() => router.push(buildUrl(k))}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              current === k
                ? "bg-[#FF9122] text-white border-[#FF9122]"
                : "border-slate-200 text-slate-600 hover:border-[#FF9122] hover:text-[#FF9122]"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
