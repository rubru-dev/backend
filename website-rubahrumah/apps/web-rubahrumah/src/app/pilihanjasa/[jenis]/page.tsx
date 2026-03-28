import { notFound } from "next/navigation";
import { publicApi } from "@/lib/api";
import { HeroBanner } from "@/components/sections/hero-banner";
import { ServiceForm } from "./service-form";
import Link from "next/link";
import Image from "next/image";

type Jenis = "bangunrumah" | "renovasirumah" | "designrumah" | "interiorrumah";

const JENIS_MAP: Record<Jenis, { label: string; apiKey: string; subtitle: string; icon: string }> = {
  bangunrumah: {
    label: "Bangun Rumah",
    apiKey: "BANGUN_RUMAH",
    subtitle: "Wujudkan rumah impian Anda dari awal bersama tim profesional kami",
    icon: "/icons/BangunRumah.png",
  },
  renovasirumah: {
    label: "Renovasi Rumah",
    apiKey: "RENOVASI",
    subtitle: "Perbarui dan tingkatkan tampilan serta nilai rumah Anda",
    icon: "/icons/RenovasiRumah.png",
  },
  designrumah: {
    label: "Desain & Perencanaan",
    apiKey: "DESIGN",
    subtitle: "Dapatkan desain rumah estetis dan fungsional sesuai selera Anda",
    icon: "/icons/DesainPerencanaan.png",
  },
  interiorrumah: {
    label: "Interior Custom",
    apiKey: "INTERIOR",
    subtitle: "Ciptakan interior yang indah dan nyaman untuk hunian Anda",
    icon: "/icons/InteriorRumah.png",
  },
};

const ALL_JENIS = Object.entries(JENIS_MAP) as [Jenis, (typeof JENIS_MAP)[Jenis]][];

export async function generateStaticParams() {
  return Object.keys(JENIS_MAP).map((jenis) => ({ jenis }));
}

export async function generateMetadata({ params }: { params: { jenis: string } }) {
  const config = JENIS_MAP[params.jenis as Jenis];
  if (!config) return { title: "Pilih Jasa" };
  return {
    title: `Jasa ${config.label}`,
    description: config.subtitle,
  };
}

export default async function PilihJasaPage({ params }: { params: { jenis: string } }) {
  const activeJenis = params.jenis as Jenis;
  const config = JENIS_MAP[activeJenis];
  if (!config) notFound();

  let layanan: any = null;
  try {
    const data = await publicApi.rb.layananByJenis(config.apiKey);
    layanan = data?.data;
  } catch {
    // lanjut tanpa layanan
  }

  const waNumber = "6281376405550";

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <HeroBanner />

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Pilih Layanan */}
        <h2 className="section-title text-center mb-8">Pilih Layanan yang Anda Butuhkan</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {ALL_JENIS.map(([key, cfg]) => {
            const isActive = key === activeJenis;
            return (
              <Link
                key={key}
                href={`/pilihanjasa/${key}`}
                className={`flex flex-col items-center text-center p-5 rounded-2xl border-2 transition-all duration-200 ${
                  isActive
                    ? "bg-[#FF9122] border-[#FF9122]"
                    : "bg-white border-[#3B82F6]/30 hover:border-[#FF9122]"
                }`}
              >
                <div className="w-16 h-16 flex items-center justify-center mb-3">
                  <Image
                    src={cfg.icon}
                    alt={cfg.label}
                    width={64}
                    height={64}
                    className={`object-contain ${isActive ? "brightness-0 invert" : ""}`}
                  />
                </div>
                <p className={`text-sm font-bold leading-snug ${isActive ? "text-white" : "text-[#0A5168]"}`}>
                  {cfg.label}
                </p>
              </Link>
            );
          })}
        </div>

        {/* Isi Data Anda */}
        <div className="max-w-3xl mx-auto">
          <h2 className="section-title mb-1">Isi Data Anda</h2>
          <p className="section-subtitle mb-8">
            Lengkapi form di bawah, tim kami akan menghubungi Anda via WhatsApp
          </p>

          {layanan?.deskripsi && (
            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-sm text-slate-600 leading-relaxed">
              {layanan.deskripsi}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
            <ServiceForm jenis={config.apiKey} jenisLabel={config.label} waNumber={waNumber} />
          </div>
        </div>
      </div>
    </main>
  );
}
