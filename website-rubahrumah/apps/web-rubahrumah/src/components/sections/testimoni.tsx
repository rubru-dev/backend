"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, X } from "lucide-react";
import { CardSlider } from "@/components/ui/card-slider";

interface Testimoni {
  id: number | string;
  youtube_url: string;
  nama_klien: string;
  jenis_jasa: string;
}

function getYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&\n?#]+)/);
  return match ? match[1] : null;
}

function TestimoniCard({ t }: { t: Testimoni }) {
  const [playing, setPlaying] = useState(false);
  const ytId = getYoutubeId(t.youtube_url);
  const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex flex-col h-full">
      {/* Thumbnail / Player */}
      <div className="relative aspect-video bg-slate-100">
        {playing && ytId ? (
          <>
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
            <button
              onClick={() => setPlaying(false)}
              className="absolute top-2 right-2 z-10 bg-black/60 text-white rounded-full p-1"
            >
              <X size={14} />
            </button>
          </>
        ) : thumb ? (
          <>
            <Image src={thumb} alt={t.nama_klien} fill className="object-cover" />
            <button
              onClick={() => setPlaying(true)}
              className="absolute inset-0 flex items-center justify-center group"
            >
              <div className="w-14 h-14 bg-[#FF9122] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play size={24} className="text-white ml-1" />
              </div>
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm">
            Video tidak tersedia
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-1">
        <p className="font-bold text-[#0A5168] text-sm">{t.nama_klien}</p>
        <span className="inline-block bg-orange-100 text-[#FF9122] text-xs font-semibold px-2.5 py-0.5 rounded-full w-fit">
          {t.jenis_jasa}
        </span>
      </div>
    </div>
  );
}

export function TestimoniSection({ testimonis }: { testimonis: Testimoni[] }) {
  if (!testimonis.length) return null;

  const cards = testimonis.map((t) => <TestimoniCard key={t.id} t={t} />);

  return (
    <section className="py-14 bg-[#FFF8F2]">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="section-title text-center mb-2">Apa Kata Klien Kami</h2>
        <p className="section-subtitle text-center mb-10">
          Kepuasan klien adalah prioritas utama kami
        </p>

        <CardSlider>{cards}</CardSlider>
      </div>
    </section>
  );
}
