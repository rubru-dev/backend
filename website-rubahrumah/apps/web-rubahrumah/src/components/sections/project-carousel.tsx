import Link from "next/link";
import Image from "next/image";
import { formatRupiah, formatDate } from "@rubahrumah/utils";
import type { RbProjectListItem } from "@rubahrumah/types";
import { ArrowRight } from "lucide-react";
import { CardSlider } from "@/components/ui/card-slider";

interface Props { projects: RbProjectListItem[] }

const STATUS_LABEL: Record<string, string> = {
  BERJALAN: "Projek Berjalan",
  "Dalam Proses": "Projek Berjalan",
  SELESAI:  "Projek Selesai",
  DITUNDA:  "Ditunda",
  Ditunda:  "Ditunda",
};

const STATUS_COLOR: Record<string, string> = {
  BERJALAN: "bg-green-600 text-white",
  "Dalam Proses": "bg-green-600 text-white",
  SELESAI:  "bg-[#0B7B7B] text-white",
  DITUNDA:  "bg-yellow-500 text-white",
  Ditunda:  "bg-yellow-500 text-white",
};

const STORAGE = process.env.NEXT_PUBLIC_STORAGE_URL ?? "http://localhost:8000";

export function ProjectCarousel({ projects }: Props) {
  if (!projects.length) return null;

  const cards = projects.map((p) => {
    const coverUrl = (p as unknown as { cover?: { image_url?: string } }).cover?.image_url;
    const luas     = (p as unknown as { luas?: number }).luas;
    const tanggal  = (p as unknown as { tanggal_mulai?: string; created_at?: string }).tanggal_mulai
                  ?? (p as unknown as { created_at?: string }).created_at;
    const deskripsi = (p as unknown as { deskripsi?: string }).deskripsi;
    return (
      <div key={p.id} className="card flex flex-col h-full">
        {/* Gambar */}
        <div className="relative h-44 bg-slate-100 overflow-hidden flex-shrink-0">
          {coverUrl && (
            <Image
              src={`${STORAGE}${coverUrl}`}
              alt={p.nama_klien}
              fill
              className="object-cover hover:scale-105 transition-transform duration-300"
            />
          )}
        </div>

        {/* Konten */}
        <div className="p-3 flex flex-col flex-1">
          {tanggal && (
            <p className="text-xs text-slate-400 mb-1">{formatDate(tanggal)}</p>
          )}

          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-bold text-slate-800 truncate">
              {formatRupiah(p.budget)}
            </span>
            {luas && (
              <span className="text-xs text-slate-400 flex-shrink-0">{luas} m²</span>
            )}
          </div>

          <span className={`inline-block self-start text-xs px-2.5 py-0.5 rounded-full font-semibold mb-1.5 ${STATUS_COLOR[p.status] ?? "bg-slate-500 text-white"}`}>
            {STATUS_LABEL[p.status] ?? p.status}
          </span>

          {deskripsi && (
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-1.5 flex-1">
              {deskripsi}
            </p>
          )}

          <p className="font-bold text-[#0A5168] text-sm mb-1.5">{p.nama_klien}</p>

          <Link
            href={`/projek-berjalan/${p.slug}`}
            className="flex items-center gap-1 text-[#FF9122] text-xs font-semibold hover:underline mt-auto"
          >
            Lihat Projek <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    );
  });

  return (
    <section className="py-14 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="section-title text-center mb-8">Intip Projek Di Rubah Rumah</h2>

        <CardSlider>{cards}</CardSlider>

        {/* Lihat Semua */}
        <div className="flex justify-center mt-8">
          <Link href="/projek-berjalan" className="btn-primary px-8 py-2.5 text-sm">
            Lihat Semua
          </Link>
        </div>
      </div>
    </section>
  );
}
