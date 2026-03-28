"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Kanban, TrendingUp, Share2, PhoneCall,
  CalendarDays, Palette, FolderKanban, FolderOpen, ClipboardList,
  Warehouse, Package, ArrowLeftRight, FileText, Receipt, Calculator,
  Banknote, Folder, Truck, Home, UserCog, ShieldCheck, Settings,
  ChevronDown, ChevronRight, BarChart2, BookOpen, Globe, Server,
  Building2, Camera, UserCheck, Wallet, CheckCircle,
  Images, Briefcase, HardHat,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/store/authStore";
import { NAV_GROUPS, type NavItem } from "./sidebar-nav";

// ── Icon resolver ─────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Users, Kanban, TrendingUp, Share2, PhoneCall,
  CalendarDays, Palette, FolderKanban, FolderOpen, ClipboardList,
  Warehouse, Package, ArrowLeftRight, FileText, Receipt, Calculator,
  Banknote, Folder, Truck, Home, UserCog, ShieldCheck, Settings, BarChart2,
  BookOpen, Globe, Server, Building2, Camera, UserCheck, Wallet, CheckCircle,
  Images, Briefcase, HardHat,
};

function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? LayoutDashboard;
  return <Icon className={cn("h-4 w-4 shrink-0", className)} />;
}

// ── Single nav item ───────────────────────────────────────────────────────────
function SidebarItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const { hasPermission, isSuperAdmin } = useAuthStore();
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

  // Item-level permission check (opsional — jika tidak diset, item selalu tampil)
  if (item.permission && !isSuperAdmin()) {
    const [mod, act] = item.permission.split(".");
    if (!hasPermission(mod, act)) return null;
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        isActive ? "sidebar-item-active" : "sidebar-item"
      )}
    >
      <NavIcon name={item.icon} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

// ── Nav group ─────────────────────────────────────────────────────────────────
function SidebarGroup({
  title,
  color,
  items,
}: {
  title: string;
  color: string;
  items: NavItem[];
}) {
  const pathname = usePathname();
  const hasActive = items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
  const [open, setOpen] = useState<boolean>(hasActive || true);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-200 transition-colors"
      >
        {/* Color dot */}
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="flex-1 text-left">{title}</span>
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>

      {open && (
        <div className="mt-0.5 space-y-0.5 pl-2">
          {items.map((item) => (
            <SidebarItem key={item.href} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export function Sidebar({ className }: { className?: string }) {
  const { user, isSuperAdmin, hasAnyRole, hasPermission } = useAuthStore();

  // Filter nav groups: permission-based (primary) with role-based fallback
  const visibleGroups = NAV_GROUPS.filter((group) => {
    if (group.alwaysShow) return true;                       // Tutorial dll: semua user
    if (isSuperAdmin()) return true;                         // Super Admin sees all
    // Permission-based check (new system)
    if (group.permission) {
      const [mod, act] = group.permission.split(".");
      if (hasPermission(mod, act)) return true;
    }
    // Fallback: role-based (for users without permissions loaded yet)
    if (group.roles.length === 0) return false;
    return hasAnyRole(...group.roles);
  });

  return (
    <aside
      className={cn(
        "flex h-full w-[var(--sidebar-width)] flex-col bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-fg))]",
        className
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4 shrink-0">
        <Image src="/images/logo.png" alt="Report Rubru" width={36} height={36} className="h-9 w-9 object-contain rounded-md bg-white p-0.5" />
        <div>
          <p className="text-sm font-bold leading-none text-white">Report Rubru</p>
          <p className="text-[10px] text-gray-400 mt-0.5">PT. Rubah Rumah</p>
        </div>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 py-4">
        <div className="px-2 space-y-0.5">
          {/* Dashboard shortcut */}
          <SidebarItem
            item={{ label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" }}
          />
        </div>

        <div className="mt-4 px-2 space-y-1">
          {visibleGroups.map((group) => (
            <SidebarGroup
              key={group.title}
              title={group.title}
              color={group.color}
              items={group.items}
            />
          ))}
        </div>
      </ScrollArea>

      {/* User info at bottom */}
      {user && (
        <div className="border-t border-white/10 px-4 py-3 shrink-0">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-xs text-gray-400">{user.email}</p>
          {user.roles[0] && (
            <span className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-gray-300">
              {user.roles.map((r) => r.name).join(", ")}
            </span>
          )}
        </div>
      )}
    </aside>
  );
}
