import type { Metadata, Viewport } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Ruangkeruang", template: "%s | Ruangkeruang" },
  description: "Website publik Ruangkeruang.",
};

export const viewport: Viewport = { themeColor: "#f7f5f1", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${manrope.variable} ${sora.variable} font-body antialiased`}>{children}</body>
    </html>
  );
}
