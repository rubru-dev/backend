"use client";
import { useRouter } from "next/navigation";
import { getUsername, clearAuth } from "@/lib/apiClient";

interface Props {
  onMenuClick: () => void;
}

export default function ClientHeader({ onMenuClick }: Props) {
  const router = useRouter();
  const username = getUsername();

  function handleLogout() {
    clearAuth();
    router.replace("/login");
  }

  return (
    <header className="fixed top-0 left-0 lg:left-56 right-0 h-16 bg-white border-b border-slate-100 z-20 flex items-center justify-between px-4 lg:px-6">
      {/* Left: hamburger (mobile) */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          onClick={onMenuClick}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          aria-label="Buka menu"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="hidden lg:block" />

      {/* Right: notification + profile + logout */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notification Bell */}
        <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path
              d="M11 2a7 7 0 00-7 7v3.5L2.5 15H19.5L18 12.5V9a7 7 0 00-7-7z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M8.5 15.5a2.5 2.5 0 005 0" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 bg-slate-50 rounded-xl px-2.5 py-2">
          <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center overflow-hidden shrink-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="6" r="3" fill="#F97316"/>
              <path d="M3 15c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="#F97316"/>
            </svg>
          </div>
          <span className="text-sm font-medium text-slate-700 hidden sm:block">{username || "Klien"}</span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
          title="Keluar"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 10H5m8 0l-3-3m3 3l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 4H15a1 1 0 011 1v10a1 1 0 01-1 1H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
