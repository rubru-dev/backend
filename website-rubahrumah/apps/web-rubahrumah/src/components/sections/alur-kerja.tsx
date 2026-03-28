import Image from "next/image";

const steps = [
  {
    icon: "/icons/PemesananOnline.png",
    title: "Pemesanan Online/Offline",
    desc: "Hubungi kami melalui WhatsApp atau kunjungi kantor kami langsung",
  },
  {
    icon: "/icons/SurveyLokasi.png",
    title: "Survei Langsung Ke Lokasi",
    desc: "Tim kami akan datang survei dan diskusi kebutuhan Anda",
  },
  {
    icon: "/icons/DesainRAB.png",
    title: "Design dan RAB",
    desc: "Kami buat desain dan rincian anggaran biaya yang transparan",
  },
  {
    icon: "/icons/Pembangunan.png",
    title: "Pembangunan",
    desc: "Proses pengerjaan dengan pengawasan ketat dan tepat waktu",
  },
];

export function AlurKerja() {
  return (
    <section className="py-14 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="section-title text-center mb-2">
          Bagaimana Rubah Rumah Bekerja?
        </h2>
        <p className="section-subtitle text-center mb-16">
          Proses yang mudah dan transparan dari awal hingga selesai
        </p>

        {/* Desktop layout */}
        <div className="hidden md:grid grid-cols-4 gap-4 relative">
          {steps.map((s, i) => (
            <div key={s.title} className="relative flex flex-col items-center text-center">
              {i < steps.length - 1 && (
                <div
                  className={`absolute z-10 w-24 pointer-events-none ${
                    i === 1
                      ? "-top-10 left-[calc(50%+20px)]"
                      : "-bottom-10 left-[calc(50%+20px)]"
                  }`}
                >
                  <Image
                    src={i === 0 ? "/icons/Arrow1.png" : i === 1 ? "/icons/Arrow2.png" : "/icons/Arrow3.png"}
                    alt="arrow"
                    width={96}
                    height={60}
                    className="object-contain"
                  />
                </div>
              )}
              <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center shadow-sm">
                <div className="w-16 h-16 flex items-center justify-center mb-4">
                  <Image src={s.icon} alt={s.title} width={64} height={64} className="object-contain" />
                </div>
                <h3 className="font-bold text-[#0A5168] text-sm leading-snug">{s.title}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile layout — 2×2 grid with arrows */}
        <div className="md:hidden">
          {/* Row 1: Step 1 → Arrow1 → Step 2 */}
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm">
              <div className="w-12 h-12 flex items-center justify-center mb-2">
                <Image src={steps[0].icon} alt={steps[0].title} width={48} height={48} className="object-contain" />
              </div>
              <h3 className="font-bold text-[#0A5168] text-xs leading-snug">{steps[0].title}</h3>
            </div>
            <div className="flex-shrink-0">
              <Image src="/icons/Arrow1.png" alt="→" width={36} height={24} className="object-contain" />
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm">
              <div className="w-12 h-12 flex items-center justify-center mb-2">
                <Image src={steps[1].icon} alt={steps[1].title} width={48} height={48} className="object-contain" />
              </div>
              <h3 className="font-bold text-[#0A5168] text-xs leading-snug">{steps[1].title}</h3>
            </div>
          </div>

          {/* Arrow2 — right-side connector going down */}
          <div className="flex justify-end pr-[calc(25%-18px)] mb-1">
            <Image src="/icons/Arrow2.png" alt="↓" width={36} height={24} className="object-contain rotate-90" />
          </div>

          {/* Row 2: Step 4 (Pembangunan) → Arrow3 → Step 3 (Design dan RAB) */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm">
              <div className="w-12 h-12 flex items-center justify-center mb-2">
                <Image src={steps[3].icon} alt={steps[3].title} width={48} height={48} className="object-contain" />
              </div>
              <h3 className="font-bold text-[#0A5168] text-xs leading-snug">{steps[3].title}</h3>
            </div>
            <div className="flex-shrink-0">
              <Image src="/icons/Arrow3.png" alt="←" width={36} height={24} className="object-contain -scale-x-100" />
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm">
              <div className="w-12 h-12 flex items-center justify-center mb-2">
                <Image src={steps[2].icon} alt={steps[2].title} width={48} height={48} className="object-contain" />
              </div>
              <h3 className="font-bold text-[#0A5168] text-xs leading-snug">{steps[2].title}</h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
