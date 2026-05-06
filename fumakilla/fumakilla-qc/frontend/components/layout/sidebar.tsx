"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { cls } from "@/lib/utils";

const menu = [
  ["/dashboard", "Dashboard"],
  ["/inspection", "Inspeksi"],
  ["/ocr", "OCR Dokumen"],
  ["/ncr", "Non-Conformance"],
  ["/batch", "Batch Tracking"],
  ["/documents", "Dokumen & SOP"],
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-bdr bg-white">
      <div className="border-b border-bdr p-5">
        <div className="text-2xl font-bold text-accent">FQC</div>
        <p className="text-xs text-ts">Quality Control System</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {menu.map(([href, label]) => (
          <Link key={href} href={href} className={cls("sidebar-link", pathname.startsWith(href) && "active")}>{label}</Link>
        ))}
      </nav>
      <div className="border-t border-bdr p-4">
        <p className="text-sm font-semibold">{user?.name || "-"}</p>
        <p className="text-xs text-ts">{user?.role || "-"}</p>
        <button className="btn mt-3 w-full" onClick={logout}>Logout</button>
      </div>
    </aside>
  );
}
