"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const services = [
  { icon: "/icons/RenovasiRumah.png", label: "Renovasi Rumah", href: "/pilihanjasa/renovasirumah", iconW: 120, iconH: 120 },
  { icon: "/icons/BangunRumah.png", label: "Bangun dari 0", href: "/pilihanjasa/bangunrumah", iconW: 80, iconH: 80 },
  { icon: "/icons/DesainPerencanaan.png", label: "Desain Arsitek", href: "/pilihanjasa/designrumah", iconW: 80, iconH: 80 },
  { icon: "/icons/InteriorRumah.png", label: "Interior Rumah", href: "/pilihanjasa/interiorrumah", iconW: 80, iconH: 80 },
];

export function ServiceCards() {
  const [active, setActive] = useState<string | null>(null);
  const router = useRouter();

  return (
    <section className="py-14 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="section-title text-center mb-10">
          Sesuaikan Kebutuhan anda dengan layanan jasa kami.
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {services.map((s) => {
            const isActive = active === s.href;
            return (
              <button
                key={s.href}
                onClick={() => { setActive(s.href); router.push(s.href); }}
                className={`aspect-square md:aspect-auto flex flex-col items-center justify-center text-center p-3 md:p-6 rounded-2xl border-2 bg-white shadow-none transition-all duration-200 ${
                  isActive
                    ? "border-[#FF9122] ring-2 ring-orange-100"
                    : "border-[#3B82F6]/30 hover:border-[#FF9122]"
                }`}
              >
                <div className="flex w-20 h-20 md:w-[120px] md:h-[120px] items-center justify-center mb-3 md:mb-4">
                  <Image
                    src={s.icon}
                    alt={s.label}
                    width={s.iconW}
                    height={s.iconH}
                    className="object-contain max-w-full max-h-full [filter:none]"
                  />
                </div>
                <h3 className="inline-flex max-w-full items-center justify-center rounded-lg bg-[#FF9122] px-3 py-1.5 text-xs md:text-sm font-bold leading-snug text-white">
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
