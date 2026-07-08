"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/useAuth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const login = pathname.startsWith("/login");
  const { loading, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (login) return <>{children}</>;

  return (
    <div>
      <Sidebar mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} user={user} logout={logout} />
      <header className="fixed left-0 right-0 top-0 z-20 flex h-16 items-center gap-3 border-b border-[#e1e4ef] bg-white/95 px-4 backdrop-blur md:left-64 md:h-20 md:px-8">
        <button
          aria-label="Buka menu"
          onClick={() => setMenuOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-lg text-xl text-accent hover:bg-[#f2f3fd] md:hidden"
        >
          ☰
        </button>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <div className="hidden border-l border-[#d9ddeb] pl-4 text-right md:block">
            <p className="text-xs font-bold text-accent">{user?.name || "ERP Fumakilla"}</p>
            <p className="mt-0.5 text-[10px] font-semibold tracking-wide text-ts">{user?.role || "SERVICE OPERATIONS"}</p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#4478ab] text-xs font-bold text-white">
            {user?.name?.slice(0, 1).toUpperCase() || "F"}
          </span>
        </div>
      </header>
      <main className="min-h-screen pt-16 md:ml-64 md:pt-20">
        {loading ? <div className="p-8 text-sm text-ts">Memuat aplikasi...</div> : children}
      </main>
    </div>
  );
}
