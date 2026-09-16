import Image from "next/image";
import { Play } from "lucide-react";
import { publicApi } from "@/lib/api";

const steps = [
  { icon: "/icons/PemesananOnline.png", title: "Pemesanan Online/Offline" },
  { icon: "/icons/SurveyLokasi.png", title: "Survei Langsung Ke Lokasi" },
  { icon: "/icons/DesainRAB.png", title: "Design dan RAB" },
  { icon: "/icons/Pembangunan.png", title: "Pembangunan" },
];

function youtubeId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&\n?#]+)/);
  return match?.[1] ?? null;
}

export async function AlurKerja() {
  const videoRes = await publicApi.rb.alurPesanan().catch(() => ({ data: [] }));
  const url = (videoRes.data?.[0] as { youtube_url?: string } | undefined)?.youtube_url ?? process.env.NEXT_PUBLIC_ALUR_KERJA_YOUTUBE_URL ?? "";
  const id = youtubeId(url);
  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-[#FF9122]">Kenali proses kami</span>
          <h2 className="section-title mt-2 mb-2">Bagaimana Rubah Rumah Bekerja?</h2>
          <p className="section-subtitle">Proses yang mudah dan transparan dari awal hingga selesai.</p>
        </div>

        {/* Alur bergambar — dipertahankan sebelum video */}
        <div className="hidden md:grid md:grid-cols-4 md:gap-4">
          {steps.map((step, index) => (
            <div key={step.title} className="relative flex flex-col items-center text-center">
              {index < steps.length - 1 && (
                <Image
                  src={index === 0 ? "/icons/Arrow1.png" : index === 1 ? "/icons/Arrow2.png" : "/icons/Arrow3.png"}
                  alt=""
                  width={96}
                  height={60}
                  className={`pointer-events-none absolute z-10 w-24 object-contain ${index === 1 ? "-top-10 left-[calc(50%+20px)]" : "-bottom-10 left-[calc(50%+20px)]"}`}
                />
              )}
              <div className="flex w-full flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <Image src={step.icon} alt={step.title} width={64} height={64} className="mb-4 object-contain" />
                <h3 className="text-sm font-bold leading-snug text-[#0A5168]">{step.title}</h3>
              </div>
            </div>
          ))}
        </div>

        <div className="md:hidden">
          <div className="grid grid-cols-2 gap-3">
            {steps.map((step) => (
              <div key={step.title} className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <Image src={step.icon} alt={step.title} width={48} height={48} className="mb-2 object-contain" />
                <h3 className="text-xs font-bold leading-snug text-[#0A5168]">{step.title}</h3>
              </div>
            ))}
          </div>
        </div>

        {/* Video selalu berada setelah alur bergambar */}
        <div className="relative mx-auto mt-10 aspect-video max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A5168] to-[#0B7B7B] shadow-xl">
          {id ? <iframe title="Bagaimana Rubah Rumah Bekerja" src={`https://www.youtube.com/embed/${id}`} className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media" allowFullScreen /> : <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white"><div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FF9122] shadow-lg"><Play size={27} fill="currentColor" /></div><h3 className="text-lg font-bold md:text-xl">Video proses Rubah Rumah</h3><p className="mt-2 max-w-md text-sm text-white/75">Video akan segera hadir. Nantikan cerita di balik proses kami.</p></div>}
        </div>
      </div>
    </section>
  );
}
