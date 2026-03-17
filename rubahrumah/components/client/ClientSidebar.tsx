"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/ui/Logo";

const mainMenu = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    href: "/pembayaran",
    label: "Pembayaran",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="10" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 8h16" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    href: "/galeri",
    label: "Galeri Proyek",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="4" width="16" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 13l4-4 3 3 3-3 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx="7" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    href: "/dokumen",
    label: "Dokumen Proyek",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M5 3h7l4 4v11a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M12 3v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/aktivitas",
    label: "Aktivitas & Progress",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 7h4M3 10h14M3 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <rect x="9" y="5.5" width="8" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="9" y="11.5" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    href: "/monitoring",
    label: "Monitoring Live",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="4" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="10" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="10" cy="9.5" r="1" fill="currentColor"/>
        <circle cx="15" cy="5.5" r="1" fill="#ef4444"/>
      </svg>
    ),
  },
];

const otherMenu = [
  {
    href: "/kontak",
    label: "Kontak Bantuan",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 4.5C4 3.7 4.7 3 5.5 3h9C15.3 3 16 3.7 16 4.5v11l-3-2H5.5C4.7 13.5 4 12.8 4 12V4.5z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 7.5h6M7 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/login",
    label: "Keluar Akun",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M13 10H5m8 0l-3-3m3 3l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10 4H15a1 1 0 011 1v10a1 1 0 01-1 1H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ClientSidebar({ isOpen, onClose }: Props) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={`fixed left-0 top-0 h-full w-64 lg:w-56 bg-white border-r border-slate-100 z-40 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
    >
      {/* Logo row */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 shrink-0">
        <Logo size="md" />
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition"
          aria-label="Tutup menu"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-0.5">
        <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider px-3 mb-2">
          Menu Utama
        </p>
        {mainMenu.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className={active ? "text-white" : "text-slate-400"}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider px-3 mb-2 pt-4">
          Lainnya
        </p>
        {otherMenu.map((item) => {
          const active = isActive(item.href) && item.href !== "/login";
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className={active ? "text-white" : "text-slate-400"}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
