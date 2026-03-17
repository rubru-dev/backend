"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Building2, Users, TrendingUp,
  FileText, Kanban, CalendarDays, ShieldCheck, Home,
  ClipboardList, Settings, Palette,
  Send, MessageSquare, RefreshCw,
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

interface NotifLog {
  id: number;
  sender_name: string | null;
  sender_user_id: number | null;
  recipient_name: string | null;
  recipient_user_id: number | null;
  message: string;
  status: string;
  created_at: string;
}

interface UserOption {
  id: number;
  name: string;
  email: string;
}

export function DashboardHome() {
  const { user, isSuperAdmin, hasAnyRole, hasPermission, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ leadsSalesAdmin: null, leadsTelemarketing: null });

  // ── Notification panel ─────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sendAll, setSendAll] = useState(false);
  const [notifMessage, setNotifMessage] = useState("");
  const [notifSending, setNotifSending] = useState(false);
  const [notifHistory, setNotifHistory] = useState<NotifLog[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);

  const loadNotifHistory = useCallback(async () => {
    setNotifLoading(true);
    try {
      const { data } = await apiClient.get<NotifLog[]>("/notifications/history", { params: { limit: 30 } });
      setNotifHistory(data);
    } catch { /* ignore */ }
    finally { setNotifLoading(false); }
  }, []);

  function toggleUser(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSendNotif() {
    if (!notifMessage) return;
    if (!sendAll && selectedIds.length === 0) {
      toast.error("Pilih penerima terlebih dahulu");
      return;
    }
    setNotifSending(true);
    try {
      const payload = sendAll
        ? { recipient_user_ids: [], message: notifMessage }
        : { recipient_user_ids: selectedIds, message: notifMessage };
      const { data } = await apiClient.post("/notifications/send", payload);
      toast.success(data.message ?? "Pesan terkirim");
      setNotifMessage("");
      setSelectedIds([]);
      setSendAll(false);
      loadNotifHistory();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Gagal mengirim pesan");
    } finally {
      setNotifSending(false);
    }
  }

  const showAll = isSuperAdmin() || hasAnyRole("Head Finance");

  useEffect(() => {
    if (!_hasHydrated || !user) return;
    loadNotifHistory();
    apiClient.get<UserOption[]>("/notifications/users")
      .then((r) => setUserOptions(r.data.filter((u) => u.id !== user.id)))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated, user?.id]);

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

      {/* ── Pesan Internal ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Kirim Pesan */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="h-4 w-4 text-green-600" /> Kirim Pesan
            </CardTitle>
            <CardDescription>Kirim pesan ke pengguna lain dalam sistem</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Dari</Label>
              <div className="h-8 px-3 flex items-center text-sm border rounded-md bg-muted text-muted-foreground">
                {user.name}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs">Kepada</Label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <Checkbox
                    checked={sendAll}
                    onCheckedChange={(v) => { setSendAll(!!v); setSelectedIds([]); }}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs text-muted-foreground">Semua User</span>
                </label>
              </div>
              {!sendAll && (
                <ScrollArea className="h-28 border rounded-md p-2">
                  <div className="space-y-1.5">
                    {userOptions.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                        <Checkbox
                          checked={selectedIds.includes(u.id)}
                          onCheckedChange={() => toggleUser(u.id)}
                          className="h-3.5 w-3.5"
                        />
                        <span className="text-xs">{u.name}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              )}
              {sendAll && (
                <div className="h-8 px-3 flex items-center text-xs border rounded-md bg-muted text-muted-foreground">
                  Semua {userOptions.length} pengguna akan menerima pesan ini
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs">Pesan</Label>
              <Textarea
                placeholder="Tulis pesan..."
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                rows={3}
                className="text-sm resize-none"
              />
            </div>
            <Button
              size="sm"
              onClick={handleSendNotif}
              disabled={notifSending || !notifMessage || (!sendAll && selectedIds.length === 0)}
              className="w-full"
            >
              {notifSending
                ? "Mengirim..."
                : <><Send className="h-3.5 w-3.5 mr-1.5" />
                    Kirim{sendAll ? " ke Semua" : selectedIds.length > 1 ? ` ke ${selectedIds.length} User` : ""}
                  </>
              }
            </Button>
          </CardContent>
        </Card>

        {/* Riwayat Pesan */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600" /> Riwayat Pesan
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadNotifHistory} disabled={notifLoading}>
                <RefreshCw className={`h-3.5 w-3.5 ${notifLoading ? "animate-spin" : ""}`} />
              </Button>
            </CardTitle>
            <CardDescription>Pesan masuk dan pesan yang sudah dikirim</CardDescription>
          </CardHeader>
          <CardContent>
            {notifLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
            {!notifLoading && notifHistory.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada pesan</p>
            )}
            {!notifLoading && notifHistory.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {notifHistory.map((log) => {
                  const isSent = log.sender_user_id === user.id;
                  return (
                    <div
                      key={log.id}
                      className={`border rounded-md p-2.5 text-xs space-y-1 ${isSent ? "bg-green-50/50 border-green-200" : "bg-blue-50/50 border-blue-200"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground truncate">
                          {isSent
                            ? <span className="text-green-700">→ {log.recipient_name ?? "—"}</span>
                            : <span className="text-blue-700">← {log.sender_name ?? "—"}</span>
                          }
                        </span>
                        <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${isSent ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                          {isSent ? "Terkirim" : "Masuk"}
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2">{log.message}</p>
                      <div className="text-[10px] text-muted-foreground/60 text-right">
                        {new Date(log.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
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
