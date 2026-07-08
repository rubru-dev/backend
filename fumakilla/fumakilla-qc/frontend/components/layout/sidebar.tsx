"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { User } from "@/types";

const menu = [{ href: "/dashboard", label: "Dashboard", icon: "D" }] as const;

const groups = [
  {
    label: "Modul A",
    icon: "A",
    paths: ["/inquiries", "/surveys", "/draw-layout", "/quotations"],
    permission: null,
    items: [
      { href: "/inquiries", label: "Inquiry" },
      { href: "/surveys", label: "Survey (Kalender Survey)" },
      { href: "/draw-layout", label: "Draw Layout" },
      { href: "/quotations", label: "Quotation" },
    ],
  },
  {
    label: "Modul B",
    icon: "B",
    paths: ["/agreements", "/service-contracts", "/renewals", "/monthly-report"],
    permission: null,
    items: [
      { href: "/agreements", label: "Agreement" },
      { href: "/service-contracts", label: "Service Contract Active" },
      { href: "/renewals", label: "Renewal" },
      { href: "/monthly-report", label: "Monthly Report" },
    ],
  },
  {
    label: "Modul C",
    icon: "C",
    paths: ["/customers"],
    permission: null,
    items: [{ href: "/customers", label: "Database Client" }],
  },
  {
    label: "Modul D",
    icon: "D",
    paths: ["/order-sheets", "/vendors"],
    permission: null,
    items: [
      { href: "/order-sheets", label: "Order Sheet" },
      { href: "/vendors", label: "Data Vendor" },
    ],
  },
  {
    label: "Modul E",
    icon: "E",
    paths: ["/complaints"],
    permission: null,
    items: [{ href: "/complaints", label: "Complaint Handling" }],
  },
  {
    label: "Modul F",
    icon: "F",
    paths: ["/work-plan"],
    permission: null,
    items: [{ href: "/work-plan", label: "Work Plan" }],
  },
  {
    label: "Modul G",
    icon: "G",
    paths: ["/admin"],
    permission: "admin.users",
    items: [
      { href: "/admin/users", label: "Management User" },
      { href: "/admin/roles", label: "Role and Access" },
      { href: "/admin/reminders", label: "Reminder Settings" },
    ],
  },
];

export function Sidebar({
  mobileOpen,
  onClose,
  user,
  logout,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  user: User | null;
  logout: () => void;
}) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const active = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  const isGroupActive = (paths: string[]) => paths.some(active);
  const hasPerm = (perm: string) => user?.permissions?.includes(perm) ?? false;
  const close = () => onClose();

  return (
    <>
      <button
        aria-label="Tutup navigasi"
        onClick={close}
        className={`fixed inset-0 z-30 bg-[#001d35]/35 transition md:hidden ${mobileOpen ? "block" : "hidden"}`}
      />
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#d9ddeb] bg-[#f2f3fd] text-[#303642] transition-transform duration-200 md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex justify-center px-4 pb-5 pt-6">
          <img src="/refrence/QuotationLogo.jpg" alt="Fumakilla" className="h-14 object-contain" style={{ mixBlendMode: "multiply" }} />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {hasPerm("dashboard.view") && menu.map((item) => (
            <Link
              onClick={close}
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${active(item.href) ? "bg-[#4478ab] text-white shadow-sm" : "text-[#515866] hover:bg-[#e0e8f7] hover:text-[#03497a]"}`}
            >
              <span className="grid w-4 place-items-center text-xs font-extrabold">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          {groups.filter(g => g.permission === null || hasPerm(g.permission)).map((group) => {
            const expanded = openGroups[group.label] ?? isGroupActive(group.paths as unknown as string[]);
            return (
              <div className="pt-1" key={group.label}>
                <button
                  type="button"
                  onClick={() => setOpenGroups((current) => ({ ...current, [group.label]: !expanded }))}
                  className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${isGroupActive(group.paths as unknown as string[]) ? "bg-[#e0e8f7] text-[#03497a]" : "text-[#515866] hover:bg-[#e0e8f7]"}`}
                >
                  <span className="flex items-center gap-3">
                    <span className="grid w-4 place-items-center text-xs font-extrabold">{group.icon}</span>
                    {group.label}
                  </span>
                  <span>{expanded ? "-" : "+"}</span>
                </button>
                {expanded && (
                  <div className="ml-5 border-l border-[#c1c6d5] py-1">
                    {group.items.map((item) => (
                      <Link
                        onClick={close}
                        key={item.href}
                        href={item.href}
                        className={`block rounded-r-lg px-4 py-2 text-xs font-medium ${active(item.href) ? "bg-[#d0e4ff] text-[#03497a]" : "text-ts hover:bg-[#e6e8f1]"}`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-[#d9ddeb] p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#4478ab] text-sm font-bold text-white">
              {user?.name?.slice(0, 1).toUpperCase() || "A"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{user?.name || "-"}</p>
              <p className="mt-0.5 text-[10px] font-bold tracking-wide text-ts">{user?.role || "-"}</p>
            </div>
          </div>
          <button onClick={logout} className="mt-4 text-sm font-semibold text-[#ba1a1a]">Logout</button>
        </div>
      </aside>
    </>
  );
}
