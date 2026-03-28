import { publicApi } from "@/lib/api";
import { HeroBanner } from "@/components/sections/hero-banner";
import { ContactForm } from "./contact-form";
import { MapPin, Phone, Mail, Clock, Building2 } from "lucide-react";

export const metadata = {
  title: "Kontak Kami",
  description: "Hubungi tim Rubah Rumah untuk konsultasi gratis jasa bangun & renovasi rumah",
};


export default async function KontakPage() {
  // Fetch config from API
  let cfg: any = null;
  try {
    const cfgRes = await publicApi.rb.config();
    cfg = (cfgRes as any).data ?? null;
  } catch {}

  // Use API values with fallback to defaults
  const alamatKantor = cfg?.alamat_kantor ?? "Jl. Pandu II No.420, Bekasi, Jawa Barat";
  const alamatWorkshop = cfg?.alamat_workshop ?? "Jl. Mutiara Gading Timur, Bekasi, Jawa Barat";
  const telepon = cfg?.telepon ?? "+62 813-7640-5550";
  const email = cfg?.email ?? "info.rubahrumah@gmail.com";
  const jamKerja = cfg?.jam_kerja ?? "Senin – Sabtu: 08.00 – 17.00 WIB";
  const lokasiMaps = cfg?.lokasi_maps ?? null;

  const contactItems = [
    { icon: MapPin, label: "Alamat Kantor", value: alamatKantor },
    { icon: Building2, label: "Workshop", value: alamatWorkshop },
    {
      icon: Phone,
      label: "Telepon",
      value: telepon,
      href: telepon ? `tel:${telepon.replace(/\D/g, "")}` : undefined,
    },
    {
      icon: Mail,
      label: "Email",
      value: email,
      href: email ? `mailto:${email}` : undefined,
    },
    { icon: Clock, label: "Jam Kerja", value: jamKerja },
  ].filter((item) => item.value);

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <HeroBanner />

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Kiri: Info Kontak */}
          <div>
            <h1 className="section-title mb-2">Informasi Kontak</h1>
            <p className="section-subtitle mb-8">
              Kami siap membantu Anda. Hubungi kami melalui salah satu kontak berikut.
            </p>

            <div className="space-y-5">
              {contactItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-[#FF9122] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-[#FF9122]" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">{item.label}</p>
                      {item.href ? (
                        <a
                          href={item.href}
                          className="text-sm font-semibold text-[#0A5168] hover:text-[#FF9122] transition-colors"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-sm font-semibold text-[#0A5168] whitespace-pre-line">{item.value}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kanan: Form Pesan */}
          <div>
            <h2 className="section-title mb-2">Kirim Pesan Kepada Kami</h2>
            <p className="section-subtitle mb-8">
              Isi form di bawah dan kami akan membalas dalam 1×24 jam
            </p>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <ContactForm />
            </div>
          </div>
        </div>

        {/* Google Maps Embed or placeholder */}
        <div className="mt-14">
          <h2 className="section-title mb-6 text-center">Lokasi Kami di Google Maps</h2>
          {lokasiMaps ? (
            <div className="w-full rounded-2xl overflow-hidden border border-slate-200" style={{ height: "360px" }}>
              <iframe
                src={lokasiMaps}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Lokasi Rubah Rumah"
              />
            </div>
          ) : (
            <div className="w-full h-72 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
              <div className="text-center text-slate-400">
                <MapPin size={32} className="mx-auto mb-2 text-[#FF9122]" />
                <p className="text-sm font-medium">Google Maps</p>
                <p className="text-xs mt-1">{alamatKantor}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
