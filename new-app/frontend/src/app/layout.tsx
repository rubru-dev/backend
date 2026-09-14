import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Report Rubru",
    template: "%s | Report Rubru",
  },
  description: "Sistem manajemen operasional terintegrasi",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/pwa-192.png", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Report Rubru" },
};

export const viewport: Viewport = { themeColor: "#262478", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}<PwaRegister /></Providers>
      </body>
    </html>
  );
}
