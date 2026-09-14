import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RubahRumah - Platform Renovasi",
  description: "Pantau progres renovasi rumah Anda secara real-time",
  icons: { icon: "/pwa-192.png", apple: "/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "RubahRumah" },
};

export const viewport: Viewport = { themeColor: "#262478", viewportFit: "cover" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={inter.className} suppressHydrationWarning>{children}<PwaRegister /></body>
    </html>
  );
}
