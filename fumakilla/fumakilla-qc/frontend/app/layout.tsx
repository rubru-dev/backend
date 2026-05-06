"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { PageLoading } from "@/components/ui/loading";
import { useAuth } from "@/hooks/useAuth";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname.startsWith("/login");
  const { loading } = useAuth();

  return (
    <html lang="id">
      <body>
        {isLogin ? children : (
          <div>
            <Sidebar />
            <main className="ml-64 min-h-screen p-6">
              {loading ? <PageLoading /> : children}
            </main>
          </div>
        )}
      </body>
    </html>
  );
}
