"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Users, TrendingUp,
  FileText, Kanban, CalendarDays, ShieldCheck, Home,
  BarChart2, ClipboardList, Settings, Palette,
} from "lucide-react";

type QuickCard = { title: string; desc: string; href: string; icon: React.ElementType; color: string };

/** All quick-link cards shown to Super Admin & Head Finance */
const ALL_CARDS: QuickCard[] = [
  { title: "Leads BD",          desc: "Daftar prospek bisnis",          href: "/bd/leads",                 icon: Users,         color: "text-indigo-600" },
  { title: "Kanban BD",         desc: "Pipeline BD",                    href: "/bd/kanban",                icon: Kanban,        color: "text-indigo-600" },
  { title: "Meta Ads",          desc: "Performa iklan Meta",            href: "/bd/meta-ads",              icon: TrendingUp,    color: "text-indigo-600" },
  { title: "Timeline Konten",   desc: "Jadwal konten media sosial",     href: "/content/timelines",        icon: CalendarDays,  color: "text-pink-600" },
  { title: "Kanban Sales",      desc: "Pipeline penjualan",             href: "/sales/kanban",             icon: Kanban,        color: "text-blue-600" },
  { title: "Proyek Berjalan",   desc: "Proyek penjualan aktif",         href: "/sales/proyek",             icon: Building2,     color: "text-blue-600" },
  { title: "Kanban Admin",      desc: "Pipeline sales admin",           href: "/sales-admin/kanban",       icon: Kanban,        color: "text-cyan-600" },
  { title: "Kanban TM",         desc: "Pipeline telemarketing",         href: "/telemarketing/kanban",     icon: Kanban,        color: "text-purple-600" },
  { title: "Adm. Projek",       desc: "Administrasi keuangan proyek",   href: "/finance/adm-projek",       icon: FileText,      color: "text-red-600" },
  { title: "Proyek Sipil",      desc: "Kelola proyek sipil",            href: "/projek/sipil",             icon: Building2,     color: "text-teal-600" },
  { title: "Proyek Interior",   desc: "Kelola proyek interior",         href: "/projek/interior",          icon: Home,          color: "text-orange-600" },
  { title: "Proyek Desain",     desc: "Kelola proyek desain",           href: "/projek/desain",            icon: Palette,       color: "text-violet-600" },
  { title: "PIC Proyek",        desc: "Monitor proyek sebagai PIC",     href: "/pic/proyek-interior",      icon: ClipboardList, color: "text-orange-600" },
  { title: "Pengaturan",        desc: "Konfigurasi sistem",             href: "/admin/settings",           icon: Settings,      color: "text-slate-600" },
];

/** Permission-based cards for regular roles */
const PERMISSION_CARDS: { permission: string; cards: QuickCard[] }[] = [
  {
    permission: "bd.view",
    cards: [
      { title: "Kanban BD",       desc: "Pipeline BD",                  href: "/bd/kanban",                icon: Kanban,       color: "text-indigo-600" },
      { title: "Meta Ads",        desc: "Performa iklan Meta",          href: "/bd/meta-ads",              icon: TrendingUp,   color: "text-indigo-600" },
    ],
  },
  {
    permission: "content.view",
    cards: [
      { title: "Timeline Konten", desc: "Jadwal konten media sosial",   href: "/content/timelines",        icon: CalendarDays, color: "text-pink-600" },
    ],
  },
  {
    permission: "sales.view",
    cards: [
      { title: "Kanban Sales",    desc: "Pipeline penjualan",           href: "/sales/kanban",             icon: Kanban,       color: "text-blue-600" },
      { title: "Proyek Berjalan", desc: "Proyek penjualan aktif",       href: "/sales/proyek",             icon: Building2,    color: "text-blue-600" },
    ],
  },
  {
    permission: "sales_admin.view",
    cards: [
      { title: "Kanban Admin",    desc: "Pipeline sales admin",         href: "/sales-admin/kanban",       icon: Kanban,       color: "text-cyan-600" },
    ],
  },
  {
    permission: "telemarketing.view",
    cards: [
      { title: "Kanban TM",       desc: "Pipeline telemarketing",       href: "/telemarketing/kanban",     icon: Kanban,       color: "text-purple-600" },
    ],
  },
  {
    permission: "finance.view",
    cards: [
      { title: "Adm. Projek",     desc: "Administrasi keuangan proyek", href: "/finance/adm-projek",       icon: FileText,     color: "text-red-600" },
    ],
  },
  {
    permission: "projek_sipil.view",
    cards: [
      { title: "Proyek Sipil",    desc: "Kelola proyek sipil",          href: "/projek/sipil",             icon: Building2,    color: "text-teal-600" },
    ],
  },
  {
    permission: "projek_interior.view",
    cards: [
      { title: "Proyek Interior", desc: "Kelola proyek interior",       href: "/projek/interior",          icon: Home,         color: "text-orange-600" },
    ],
  },
  {
    permission: "projek_desain.view",
    cards: [
      { title: "Proyek Desain",   desc: "Kelola proyek desain",         href: "/projek/desain",            icon: Palette,      color: "text-violet-600" },
    ],
  },
  {
    permission: "pic.view",
    cards: [
      { title: "PIC Proyek",      desc: "Monitor proyek sebagai PIC",   href: "/pic/proyek-interior",      icon: ClipboardList, color: "text-orange-600" },
    ],
  },
  {
    permission: "admin.view",
    cards: [
      { title: "Pengaturan",      desc: "Konfigurasi sistem",           href: "/admin/settings",           icon: Settings,     color: "text-slate-600" },
    ],
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

interface Stats {
  leadsSalesAdmin: number | null;
  leadsTelemarketing: number | null;
}

export function DashboardHome() {
  const { user, isSuperAdmin, hasAnyRole, hasPermission, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ leadsSalesAdmin: null, leadsTelemarketing: null });

  const showAll = isSuperAdmin() || hasAnyRole("Head Finance");

  useEffect(() => {
    if (!_hasHydrated || !user) return;

    const canSeeAdmin   = showAll || hasPermission("sales_admin",   "view");
    const canSeeTM      = showAll || hasPermission("telemarketing", "view");

    if (canSeeAdmin) {
      apiClient.get<{ id: number; nama: string }[]>("/sales-admin/kanban/leads")
        .then((r) => setStats((s) => ({ ...s, leadsSalesAdmin: r.data.length })))
        .catch(() => setStats((s) => ({ ...s, leadsSalesAdmin: 0 })));
    }
    if (canSeeTM) {
      apiClient.get<{ id: number; nama: string }[]>("/telemarketing/kanban/leads")
        .then((r) => setStats((s) => ({ ...s, leadsTelemarketing: r.data.length })))
        .catch(() => setStats((s) => ({ ...s, leadsTelemarketing: 0 })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated, user?.id]);

  if (!_hasHydrated || !user) return null;

  // Quick access cards
  let uniqueCards: QuickCard[];
  if (showAll) {
    uniqueCards = ALL_CARDS;
  } else {
    const allCards = PERMISSION_CARDS
      .filter(({ permission }) => {
        const [module, action] = permission.split(".");
        return hasPermission(module, action);
      })
      .flatMap(({ cards }) => cards);
    uniqueCards = allCards.filter(
      (card, idx, arr) => arr.findIndex((c) => c.href === card.href) === idx
    );
  }

  const canSeeAdmin = showAll || hasPermission("sales_admin",   "view");
  const canSeeTM    = showAll || hasPermission("telemarketing", "view");

  const statCards = [
    canSeeAdmin && {
      label: "Total Leads Sales Admin",
      value: stats.leadsSalesAdmin,
      icon: Users,
      color: "text-cyan-600",
      href: "/sales-admin/kanban",
    },
    canSeeTM && {
      label: "Total Leads Telemarketing",
      value: stats.leadsTelemarketing,
      icon: Users,
      color: "text-purple-600",
      href: "/telemarketing/kanban",
    },
  ].filter(Boolean) as { label: string; value: number | null; icon: React.ElementType; color: string; href: string }[];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {getGreeting()}, {user.name.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Selamat datang di Report Rubru.
        </p>
      </div>

      {/* Role badges */}
      <div className="flex flex-wrap gap-2">
        {user.roles.map((role) => (
          <Badge key={role.id} variant="secondary" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            {role.name}
          </Badge>
        ))}
      </div>

      {/* Stats cards */}
      {statCards.length > 0 && (
        <div className={`grid gap-4 sm:grid-cols-${Math.min(statCards.length, 3)}`}>
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                onClick={() => router.push(stat.href)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stat.value === null ? "..." : stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Klik untuk lihat detail</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick access cards */}
      {uniqueCards.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Akses Cepat
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {uniqueCards.map((card) => {
              const Icon = card.icon;
              return (
                <a key={card.href} href={card.href}>
                  <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                          <Icon className={`h-5 w-5 ${card.color} group-hover:scale-110 transition-transform`} />
                        </div>
                        <CardTitle className="text-base">{card.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{card.desc}</CardDescription>
                    </CardContent>
                  </Card>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
