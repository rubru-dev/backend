import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, Mail, Instagram, Facebook } from "lucide-react";
import { publicApi } from "@/lib/api";

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08z" />
    </svg>
  );
}

export async function Footer() {
  let cfg: any = null;
  try {
    const res = await publicApi.rb.config();
    cfg = (res as any).data;
  } catch {}

  const instagramUrl = cfg?.instagram_url || "https://www.instagram.com/rubahrumah/";
  const tiktokUrl    = cfg?.tiktok_url    || "https://www.tiktok.com/@rubahrumah";
  const facebookUrl  = cfg?.facebook_url  || "https://www.facebook.com/rubahrumah";
  const alamatKantor = cfg?.alamat_kantor || "Jl. Pandu II No.420, Bekasi, Jawa Barat";
  const alamatWorkshop = cfg?.alamat_workshop || "Jl. Mutiara Gading Timur, Bekasi, Jawa Barat";
  const telepon = cfg?.telepon || "+62 813-7640-5550";
  const email   = cfg?.email   || "info.rubahrumah@gmail.com";

  return (
    <footer className="bg-[#ffb871] pt-10 pb-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-orange-200">
          {/* Kolom 1: Brand + Deskripsi + Sosmed */}
          <div>
            <Link href="/">
              <Image
                src="/logo.png"
                alt="Rubah Rumah"
                width={140}
                height={40}
                className="h-10 w-auto object-contain mb-3"
              />
            </Link>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Kami di sini membantu Anda untuk menemukan rumah impian Anda, dengan pengalaman terpercaya dan tenaga ahli berpengalaman.
            </p>
            <div className="flex gap-2 mt-2">
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-[#FF9122] hover:text-white transition-colors text-slate-600"
                aria-label="Instagram"
              >
                <Instagram size={14} />
              </a>
              <a
                href={tiktokUrl}
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-[#FF9122] hover:text-white transition-colors text-slate-600"
                aria-label="TikTok"
              >
                <TikTokIcon />
              </a>
              <a
                href={facebookUrl}
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-[#FF9122] hover:text-white transition-colors text-slate-600"
                aria-label="Facebook"
              >
                <Facebook size={14} />
              </a>
            </div>
          </div>

          {/* Kolom 2: Alamat Kantor + Workshop */}
          <div>
            <h4 className="font-bold text-[#0A5168] mb-3 text-sm">Alamat Kantor</h4>
            <div className="flex items-start gap-2 text-sm text-slate-600 mb-4">
              <MapPin size={14} className="mt-0.5 text-[#FF9122] flex-shrink-0" />
              <span className="whitespace-pre-line">{alamatKantor}</span>
            </div>
            <h4 className="font-bold text-[#0A5168] mb-3 text-sm">Workshop</h4>
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <MapPin size={14} className="mt-0.5 text-[#FF9122] flex-shrink-0" />
              <span className="whitespace-pre-line">{alamatWorkshop}</span>
            </div>
          </div>

          {/* Kolom 3: Kontak Kami */}
          <div>
            <h4 className="font-bold text-[#0A5168] mb-3 text-sm">Kontak Kami</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-slate-600">
                <Phone size={14} className="text-[#FF9122] flex-shrink-0" />
                <a href={`tel:${telepon.replace(/\D/g, "")}`} className="hover:text-[#FF9122] transition-colors">
                  {telepon}
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-600">
                <Mail size={14} className="text-[#FF9122] flex-shrink-0" />
                <a href={`mailto:${email}`} className="hover:text-[#FF9122] transition-colors">
                  {email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          © {new Date().getFullYear()} PT Rubah Rumah Inovasi Pemuda. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
