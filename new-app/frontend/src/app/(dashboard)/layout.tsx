"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";

const WARN_SECONDS = 60; // countdown yang ditampilkan di dialog

/**
 * Dashboard shell layout.
 *
 * Desktop: fixed sidebar (260px) + scrollable main content
 * Mobile: sidebar hidden behind a Sheet (drawer)
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated, logout } = useAuthStore();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // ── Idle logout state ──────────────────────────────────────────────────────
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARN_SECONDS);
  const countdownRef = useRef<ReturnType<typeof setInterval>>();

  const startCountdown = useCallback(() => {
    setCountdown(WARN_SECONDS);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  const stopCountdown = useCallback(() => {
    clearInterval(countdownRef.current);
  }, []);

  const handleLogout = useCallback(() => {
    stopCountdown();
    setShowIdleWarning(false);
    logout();
    document.cookie = "is_authed=; path=/; max-age=0"; document.cookie = "is_tukang=; path=/; max-age=0";
    router.replace("/login");
  }, [logout, router, stopCountdown]);

  const handleWarn = useCallback(() => {
    setShowIdleWarning(true);
    startCountdown();
  }, [startCountdown]);

  const handleActive = useCallback(() => {
    setShowIdleWarning(false);
    stopCountdown();
  }, [stopCountdown]);

  useIdleTimeout({
    onLogout: handleLogout,
    onWarn: handleWarn,
    onActive: handleActive,
  });

  // Cleanup countdown on unmount
  useEffect(() => () => clearInterval(countdownRef.current), []);
  // ───────────────────────────────────────────────────────────────────────────

  // Wait for Zustand to rehydrate from localStorage before checking auth
  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      document.cookie = "is_authed=; path=/; max-age=0"; document.cookie = "is_tukang=; path=/; max-age=0";
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

      {/* ── Idle Warning Dialog ───────────────────────────────────────────── */}
      <Dialog open={showIdleWarning}>
        <DialogContent
          className="sm:max-w-sm"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Sesi Tidak Aktif</DialogTitle>
            <DialogDescription>
              Anda tidak melakukan aktivitas selama beberapa saat. Sesi akan otomatis berakhir
              dalam{" "}
              <span className="font-semibold text-destructive">{countdown} detik</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleLogout}>
              Keluar Sekarang
            </Button>
            <Button onClick={handleActive}>
              Tetap Masuk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
