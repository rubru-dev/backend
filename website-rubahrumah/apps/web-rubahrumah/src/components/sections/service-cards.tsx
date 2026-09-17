"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const services = [
  { icon: "/icons/BangunRumah.png", label: "Bangun Rumah", href: "/pilihanjasa/bangunrumah", iconW: 80, iconH: 80 },
  { icon: "/icons/RenovasiRumah.png", label: "Renovasi Rumah", href: "/pilihanjasa/renovasirumah", iconW: 120, iconH: 120 },
  { icon: "/icons/DesainPerencanaan.png", label: "Design & Perencanaan", href: "/pilihanjasa/designrumah", iconW: 80, iconH: 80 },
  { icon: "/icons/InteriorRumah.png", label: "Interior Rumah", href: "/pilihanjasa/interiorrumah", iconW: 80, iconH: 80 },
];

export function ServiceCards() {
  const [active, setActive] = useState<string | null>(null);
  const router = useRouter();

  return (
    <section className="py-14 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="section-title text-center mb-10">
          Pesan Jasa Renovasi Rumah & Perencanaan Arsitektur
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {services.map((s) => {
            const isActive = active === s.href;
            return (
              <button
                key={s.href}
                onClick={() => { setActive(s.href); router.push(s.href); }}
                className={`aspect-square md:aspect-auto flex flex-col items-center justify-center text-center p-3 md:p-6 rounded-2xl border-2 shadow-none transition-all duration-200 ${
                  isActive
                    ? "bg-[#FF9122] border-[#FF9122]"
                    : "bg-white border-[#3B82F6]/30 hover:border-[#FF9122]"
                }`}
              >
                <div className="flex w-20 h-20 md:w-[120px] md:h-[120px] items-center justify-center mb-3 md:mb-4">
                  <Image
                    src={s.icon}
                    alt={s.label}
                    width={s.iconW}
                    height={s.iconH}
                    className={`object-contain max-w-full max-h-full [filter:none] ${isActive ? "brightness-0 invert" : ""}`}
                  />
                </div>
                <h3 className={`font-bold text-xs md:text-sm leading-snug ${isActive ? "text-white" : "text-[#0A5168]"}`}>
                  {s.label}
                </h3>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
