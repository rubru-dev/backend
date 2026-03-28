"use client";

import { useRouter, useSearchParams } from "next/navigation";

// Values must match Prisma JenisJasa enum: BANGUN_RUMAH | RENOVASI | DESIGN | INTERIOR
const FILTERS = [
  { label: "Semua", value: "" },
  { label: "Bangun Rumah", value: "BANGUN_RUMAH" },
  { label: "Renovasi Rumah", value: "RENOVASI" },
  { label: "Design Rumah", value: "DESIGN" },
  { label: "Interior Rumah", value: "INTERIOR" },
];

export function JenisJasaFilter({ current }: { current?: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  const handleFilter = (value: string) => {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set("jenis", value);
    else params.delete("jenis");
    params.delete("page");
    router.push(`/portofolio?${params.toString()}`);
  };

  return (
    <>
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => handleFilter(f.value)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
            (current ?? "") === f.value
              ? "bg-[#FF9122] text-white border-[#FF9122]"
              : "border-slate-200 text-slate-600 hover:border-[#FF9122] hover:text-[#FF9122]"
          }`}
        >
          {f.label}
        </button>
      ))}
    </>
  );
}
