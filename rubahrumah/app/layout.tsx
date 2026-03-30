import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RubahRumah - Platform Renovasi",
  description: "Pantau progres renovasi rumah Anda secara real-time",
  icons: { icon: "/images/logo-browser.ico", apple: "/images/logo-browser.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={inter.className} suppressHydrationWarning>{children}</body>
    </html>
  );
}
