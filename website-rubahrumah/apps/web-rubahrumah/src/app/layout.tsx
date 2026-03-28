import type { Metadata } from "next";
import { Maven_Pro, Montserrat } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { MascotCTA } from "@/components/ui/mascot-cta";

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
  title: { default: "Rubah Rumah — Jasa Renovasi & Bangun Rumah Bekasi", template: "%s | Rubah Rumah" },
  description: "Jasa bangun rumah, renovasi, design, dan interior custom di Bekasi. 100+ project selesai, konsultasi gratis.",
  keywords: ["jasa renovasi rumah", "bangun rumah bekasi", "interior custom", "kontraktor bekasi"],
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
