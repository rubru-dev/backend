"use client";

import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

export function MascotCTA() {
  return (
    <a
      href="https://wa.me/6281376405550?text=Halo%20Rubah%20Rumah%2C%20saya%20ingin%20konsultasi%20gratis!"
      target="_blank"
      rel="noreferrer"
      aria-label="Hubungi Kami"
      className="fixed bottom-5 right-4 sm:right-6 z-50 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 sm:px-5 text-sm font-bold text-white shadow-lg shadow-green-900/20 transition hover:scale-105 hover:bg-[#1fbd5b]"
      style={{ right: "max(1rem, calc((100vw - 80rem) / 2 + 1rem))" }}
    >
      <WhatsAppIcon />
      <span>Hubungi Kami</span>
    </a>
  );
}
