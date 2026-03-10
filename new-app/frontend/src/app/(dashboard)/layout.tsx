"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuthStore } from "@/store/authStore";

/**
 * Dashboard shell layout.
 *
 * Desktop: fixed sidebar (260px) + scrollable main content
 * Mobile: sidebar hidden behind a Sheet (drawer)
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Wait for Zustand to rehydrate from localStorage before checking auth
  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      document.cookie = "is_authed=; path=/; max-age=0";
      router.replace("/login");
    }
  }, [isAuthenticated, _hasHydrated, router]);

  // Show nothing while store is hydrating to avoid flash
  if (!_hasHydrated) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar />
      </div>

      {/* ── Mobile sidebar (Sheet) ────────────────────────────────────────── */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-[var(--sidebar-width)] p-0 border-0">
          <SheetTitle className="sr-only">Navigasi</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
