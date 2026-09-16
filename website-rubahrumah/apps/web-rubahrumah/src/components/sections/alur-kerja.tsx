import { Play } from "lucide-react";

function youtubeId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&\n?#]+)/);
  return match?.[1] ?? null;
}

export function AlurKerja() {
  const url = process.env.NEXT_PUBLIC_ALUR_KERJA_YOUTUBE_URL ?? "";
  const id = youtubeId(url);
  return (
    <section className="py-14 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-8"><span className="text-xs font-bold uppercase tracking-widest text-[#FF9122]">Kenali proses kami</span><h2 className="section-title mt-2 mb-2">Bagaimana Rubah Rumah Bekerja?</h2><p className="section-subtitle">Lihat bagaimana kami membantu mewujudkan rumah impian Anda.</p></div>
        <div className="relative aspect-video overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A5168] to-[#0B7B7B] shadow-xl">
          {id ? <iframe title="Bagaimana Rubah Rumah Bekerja" src={`https://www.youtube.com/embed/${id}`} className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media" allowFullScreen /> : <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white"><div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FF9122] shadow-lg"><Play size={27} fill="currentColor" /></div><h3 className="text-lg md:text-xl font-bold">Video proses Rubah Rumah</h3><p className="mt-2 max-w-md text-sm text-white/75">Video akan segera hadir. Nantikan cerita di balik proses kami.</p></div>}
        </div>
      </div>
    </section>
  );
}
