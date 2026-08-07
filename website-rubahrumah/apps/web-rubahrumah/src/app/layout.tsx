import type { Metadata } from "next";
import { Maven_Pro, Montserrat } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { MascotCTA } from "@/components/ui/mascot-cta";
import { SITE_URL } from "@/lib/site";

const mavenPro = Maven_Pro({
  subsets: ["latin"],
  variable: "--font-maven",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  // Tanpa metadataBase, URL relatif (OG image, canonical) tidak bisa di-resolve
  // jadi absolut — share link ke WhatsApp/Facebook kehilangan preview.
  metadataBase: new URL(SITE_URL),
  title: { default: "Rubah Rumah — Jasa Renovasi & Bangun Rumah Bekasi", template: "%s | Rubah Rumah" },
  description: "Jasa bangun rumah, renovasi, design, dan interior custom di Bekasi. 100+ project selesai, konsultasi gratis.",
  keywords: ["jasa renovasi rumah", "bangun rumah bekasi", "interior custom", "kontraktor bekasi"],
  // "./" = path halaman yang sedang dibuka, di-resolve terhadap metadataBase.
  // Jadi tiap halaman menunjuk dirinya sendiri di domain utama, bukan semuanya
  // menunjuk beranda. Ini yang mencegah dua domain dibaca sebagai duplicate content.
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Rubah Rumah",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${mavenPro.variable} ${montserrat.variable}`}>
      <body className="font-maven antialiased">
        <Navbar />
        {children}
        <Footer />
        <MascotCTA />
      </body>
    </html>
  );
}
