"use client";

import { MessageCircle } from "lucide-react";

export function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/6281376405550?text=Halo%20Rubah%20Rumah%2C%20saya%20ingin%20melakukan%20konsultasi!"
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
      aria-label="Chat WhatsApp"
    >
      <MessageCircle size={26} className="text-white" />
    </a>
  );
}
