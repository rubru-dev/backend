"use client";

import Image from "next/image";

export function MascotCTA() {
  return (
    <a
      href="https://wa.me/6281376405550?text=Halo%20Rubah%20Rumah%2C%20saya%20ingin%20konsultasi%20gratis!"
      target="_blank"
      rel="noreferrer"
      aria-label="Konsultasi Gratis"
      className="fixed bottom-6 z-50 group flex flex-col items-center"
      style={{ right: "max(1.5rem, calc((100vw - 80rem) / 2 + 1.5rem))" }}
    >
      {/* Tooltip */}
      <span className="mb-2 px-3 py-1.5 rounded-lg bg-[#FF9122] text-white text-sm font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
        Konsultasi Gratis!
      </span>
      {/* Mascot image */}
      <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-44 md:h-44 drop-shadow-xl hover:scale-110 transition-transform duration-200">
        <Image
          src="/images/mascot.png"
          alt="Konsultasi Gratis"
          width={128}
          height={128}
          className="w-full h-full object-contain"
        />
      </div>
    </a>
  );
}
