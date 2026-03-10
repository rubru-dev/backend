/**
 * Sidebar navigation definition.
 * Diperbarui sesuai struktur menu baru.
 */

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export interface NavGroup {
  title: string;
  color: string;
  roles: string[];        // fallback: role-based check (backward compat)
  permission: string;     // primary: show if user has this permission (e.g. "bd.view")
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  // ── BD ───────────────────────────────────────────────────────────────────────
  {
    title: "BD",
    color: "#6366f1",
    permission: "bd.view",
    roles: ["BD"],
    items: [
      { label: "Dashboard BD",  href: "/bd/dashboard",  icon: "LayoutDashboard" },
      { label: "Kanban BD",     href: "/bd/kanban",     icon: "Kanban" },
      { label: "Meta Ads",      href: "/bd/meta-ads",   icon: "TrendingUp" },
    ],
  },

  // ── Content Creator ───────────────────────────────────────────────────────────
  {
    title: "Content Creator",
    color: "#ec4899",
    permission: "content.view",
    roles: ["Content Creator"],
    items: [
      { label: "Dashboard Sosmed",  href: "/content/dashboard-sosmed", icon: "BarChart2" },
      { label: "Sosial Media",      href: "/content/social-media",     icon: "Share2" },
      { label: "Timeline Konten",   href: "/content/timelines",        icon: "CalendarDays" },
      { label: "Laporan Harian",    href: "/content/laporan-harian",   icon: "ClipboardList" },
    ],
  },

  // ── Sales Admin (dulunya Leads) ───────────────────────────────────────────────
  {
    title: "Sales Admin",
    color: "#f59e0b",
    permission: "sales_admin.view",
    roles: ["Leads", "Sales Admin"],  // terima keduanya (Leads = nama lama di DB)
    items: [
      { label: "Follow Up Leads",   href: "/sales-admin/follow-up",       icon: "PhoneCall" },
      { label: "Kanban Admin",      href: "/sales-admin/kanban",           icon: "Kanban" },
      { label: "Kalender Survey",   href: "/sales-admin/kalender-survey",  icon: "CalendarDays" },
      { label: "Laporan Harian",    href: "/sales-admin/laporan-harian",   icon: "ClipboardList" },
    ],
  },

  // ── Telemarketing ─────────────────────────────────────────────────────────────
  {
    title: "Telemarketing",
    color: "#10b981",
    permission: "telemarketing.view",
    roles: ["Telemarketing"],
    items: [
      { label: "Follow Up Leads",      href: "/telemarketing/follow-up",         icon: "PhoneCall" },
      { label: "Kanban Telemarketing", href: "/telemarketing/kanban",            icon: "Kanban" },
      { label: "Kalender Survey",      href: "/telemarketing/kalender-survey",   icon: "CalendarDays" },
      { label: "Laporan Harian",       href: "/telemarketing/laporan-harian",    icon: "ClipboardList" },
    ],
  },

  // ── Desain ───────────────────────────────────────────────────────────────────
  {
    title: "Desain",
    color: "#8b5cf6",
    permission: "desain.view",
    roles: ["Desain"],
    items: [
      { label: "Laporan Harian", href: "/desain/laporan-harian", icon: "ClipboardList" },
    ],
  },

  // ── Sales ────────────────────────────────────────────────────────────────────
  {
    title: "Sales",
    color: "#3b82f6",
    permission: "sales.view",
    roles: ["Sales"],
    items: [
      { label: "Kanban Sales",   href: "/sales/kanban",          icon: "Kanban" },
      { label: "Laporan Harian", href: "/sales/laporan-harian",  icon: "ClipboardList" },
    ],
  },

  // ── Projek ───────────────────────────────────────────────────────────────────
  {
    title: "Projek",
    color: "#14b8a6",
    permission: "projek_sipil.view",   // show if any projek permission exists
    roles: ["Sales", "PIC Project"],
    items: [
      { label: "Projek Sipil",    href: "/projek/sipil",    icon: "Building2" },
      { label: "Projek Desain",   href: "/projek/desain",   icon: "Palette" },
      { label: "Projek Interior", href: "/projek/interior", icon: "Home" },
    ],
  },

  // ── Finance ──────────────────────────────────────────────────────────────────
  {
    title: "Finance",
    color: "#ef4444",
    permission: "finance.view",
    roles: ["Finance"],
    items: [
      { label: "Invoice & Kwitansi",    href: "/finance/invoice-kwitansi",    icon: "FileText" },
      { label: "Administrasi Projek",   href: "/finance/administrasi-projek", icon: "Calculator" },
      { label: "Administrasi Kantor",   href: "/finance/administrasi-kantor", icon: "Folder" },
      { label: "Laporan Harian",        href: "/finance/laporan-harian",      icon: "ClipboardList" },
    ],
  },

  // ── PIC Project ───────────────────────────────────────────────────────────────
  {
    title: "PIC Project",
    color: "#f97316",
    permission: "pic.view",
    roles: ["PIC Project"],
    items: [
      { label: "Laporan Harian", href: "/pic/laporan-harian", icon: "ClipboardList" },
    ],
  },

  // ── Tukang ───────────────────────────────────────────────────────────────────
  {
    title: "Tukang",
    color: "#f97316",
    permission: "tukang.absen_submit",
    roles: ["Tukang"],
    items: [
      { label: "Absen Harian", href: "/absen", icon: "Camera" },
    ],
  },

  // ── Admin (Super Admin only) ──────────────────────────────────────────────────
  {
    title: "Admin",
    color: "#64748b",
    permission: "admin.view",
    roles: [],  // kosong = Super Admin only
    items: [
      { label: "Users",       href: "/admin/users",    icon: "UserCog" },
      { label: "Roles",       href: "/admin/roles",    icon: "ShieldCheck" },
      { label: "Pengaturan",  href: "/admin/settings", icon: "Settings" },
    ],
  },
];
