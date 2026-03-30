/**
 * Sidebar navigation definition.
 * Diperbarui sesuai struktur menu baru.
 */

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  permission?: string; // item-level: jika diset, user harus punya permission ini untuk melihat item
}

export interface NavGroup {
  title: string;
  color: string;
  roles: string[];        // fallback: role-based check (backward compat)
  permission: string;     // primary: show if user has this permission (e.g. "bd.view")
  alwaysShow?: boolean;   // show to all logged-in users regardless of role/permission
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  // ── BD ───────────────────────────────────────────────────────────────────────
  // Group: bd.view | Items: bd.dashboard, bd.kanban, bd.meta_ads
  {
    title: "BD",
    color: "#6366f1",
    permission: "bd.view",
    roles: ["BD"],
    items: [
      { label: "Dashboard BD",  href: "/bd/dashboard",  icon: "LayoutDashboard", permission: "bd.dashboard" },
      { label: "Kanban BD",     href: "/bd/kanban",     icon: "Kanban",          permission: "bd.kanban" },
      { label: "Meta Ads",      href: "/bd/meta-ads",   icon: "TrendingUp",      permission: "bd.meta_ads" },
    ],
  },

  // ── Content Creator ───────────────────────────────────────────────────────────
  // Group: content.view | Items: content.dashboard_sosmed, content.social_media, content.timelines, content.laporan_harian
  {
    title: "Content Creator",
    color: "#ec4899",
    permission: "content.view",
    roles: ["Content Creator"],
    items: [
      { label: "Dashboard Sosmed",  href: "/content/dashboard-sosmed", icon: "BarChart2",    permission: "content.dashboard_sosmed" },
      { label: "Sosial Media",      href: "/content/social-media",     icon: "Share2",       permission: "content.social_media" },
      { label: "Timeline Konten",   href: "/content/timelines",        icon: "CalendarDays", permission: "content.timelines" },
      { label: "Laporan Harian",    href: "/content/laporan-harian",   icon: "ClipboardList",permission: "content.laporan_harian" },
    ],
  },

  // ── Database Client ───────────────────────────────────────────────────────────
  // Group: sales_admin.view | Input leads database klien mandiri
  {
    title: "Database Client",
    color: "#0ea5e9",
    permission: "sales_admin.view",
    roles: ["Sales Admin", "Telemarketing"],
    items: [
      { label: "Data Klien", href: "/database-client", icon: "Database", permission: "sales_admin.view" },
    ],
  },

  // ── Sales Admin ───────────────────────────────────────────────────────────────
  // Group: sales_admin.view | Items: sales_admin.kanban, sales_admin.follow_up, sales_admin.kalender, sales_admin.laporan_harian
  {
    title: "Sales Admin",
    color: "#f59e0b",
    permission: "sales_admin.view",
    roles: ["Leads", "Sales Admin"],
    items: [
      { label: "Kanban Admin",     href: "/sales-admin/kanban",         icon: "Kanban",       permission: "sales_admin.kanban" },
      { label: "Follow Up Leads",  href: "/sales-admin/follow-up",      icon: "PhoneCall",    permission: "sales_admin.follow_up" },
      { label: "Kalender Survey",  href: "/sales-admin/kalender-survey",icon: "CalendarDays", permission: "sales_admin.kalender" },
      { label: "Laporan Harian",   href: "/sales-admin/laporan-harian", icon: "ClipboardList",permission: "sales_admin.laporan_harian" },
    ],
  },

  // ── Telemarketing ─────────────────────────────────────────────────────────────
  // Group: telemarketing.view | Items: telemarketing.kanban, telemarketing.follow_up, telemarketing.kalender, telemarketing.laporan_harian
  {
    title: "Telemarketing",
    color: "#10b981",
    permission: "telemarketing.view",
    roles: ["Telemarketing"],
    items: [
      { label: "Kanban Telemarketing", href: "/telemarketing/kanban",          icon: "Kanban",       permission: "telemarketing.kanban" },
      { label: "Follow Up Leads",      href: "/telemarketing/follow-up",       icon: "PhoneCall",    permission: "telemarketing.follow_up" },
      { label: "Kalender Survey",      href: "/telemarketing/kalender-survey", icon: "CalendarDays", permission: "telemarketing.kalender" },
      { label: "Laporan Harian",       href: "/telemarketing/laporan-harian",  icon: "ClipboardList",permission: "telemarketing.laporan_harian" },
    ],
  },

  // ── Desain ───────────────────────────────────────────────────────────────────
  // Group: desain.view | Items: desain.follow_up, desain.kanban_paket, desain.laporan_harian
  {
    title: "Desain",
    color: "#8b5cf6",
    permission: "desain.view",
    roles: ["Desain"],
    items: [
      { label: "Follow Up After Survey", href: "/desain/follow-up-survey",         icon: "Kanban",          permission: "desain.follow_up" },
      { label: "Kanban Paket Desain",    href: "/desain/kanban-paket-desain",       icon: "LayoutDashboard", permission: "desain.kanban_paket" },
      { label: "Laporan Harian",         href: "/desain/laporan-harian",            icon: "ClipboardList", permission: "desain.laporan_harian" },
    ],
  },

  // ── Sales ────────────────────────────────────────────────────────────────────
  // Group: sales.view | Items: sales.kanban, sales.laporan_harian
  {
    title: "Sales",
    color: "#3b82f6",
    permission: "sales.view",
    roles: ["Sales"],
    items: [
      { label: "Kanban Sales",   href: "/sales/kanban",         icon: "Kanban",        permission: "sales.kanban" },
      { label: "Laporan Harian", href: "/sales/laporan-harian", icon: "ClipboardList", permission: "sales.laporan_harian" },
    ],
  },

  // ── Projek ───────────────────────────────────────────────────────────────────
  // Group: projek_sipil.view | Items: projek_sipil.view, projek_desain.view, projek_interior.view
  {
    title: "Projek",
    color: "#14b8a6",
    permission: "projek_sipil.view",
    roles: ["Sales", "PIC Project"],
    items: [
      { label: "Projek Sipil",    href: "/projek/sipil",    icon: "Building2", permission: "projek_sipil.view" },
      { label: "Projek Desain",   href: "/projek/desain",   icon: "Palette",   permission: "projek_desain.view" },
      { label: "Projek Interior", href: "/projek/interior", icon: "Home",      permission: "projek_interior.view" },
    ],
  },

  // ── Finance ──────────────────────────────────────────────────────────────────
  // Group: finance.view | Items: finance.invoice, finance.adm_projek, finance.adm_kantor, finance.laporan_harian
  // Tab-level (dalam halaman Adm Projek): finance.cashflow, finance.pr, finance.upload_dokumen, finance.surat_jalan, finance.tukang
  {
    title: "Finance",
    color: "#ef4444",
    permission: "finance.view",
    roles: ["Finance"],
    items: [
      { label: "Invoice & Kwitansi",  href: "/finance/invoice-kwitansi",    icon: "FileText",    permission: "finance.invoice" },
      { label: "Administrasi Projek", href: "/finance/administrasi-projek", icon: "Calculator",  permission: "finance.adm_projek" },
      { label: "Administrasi Kantor", href: "/finance/administrasi-kantor", icon: "Folder",      permission: "finance.adm_kantor" },
      { label: "Laporan Harian",      href: "/finance/laporan-harian",      icon: "ClipboardList",permission: "finance.laporan_harian" },
    ],
  },

  // ── PIC Project ───────────────────────────────────────────────────────────────
  // Group: pic.view | Items: pic.laporan_harian, pic.dokumentasi
  {
    title: "PIC Project",
    color: "#f97316",
    permission: "pic.view",
    roles: ["PIC Project"],
    items: [
      { label: "Laporan Harian",    href: "/pic/laporan-harian",  icon: "ClipboardList", permission: "pic.laporan_harian" },
      { label: "Upload Dokumentasi", href: "/pic/dokumentasi",    icon: "Images",        permission: "pic.view" },
    ],
  },

  // ── Tukang ───────────────────────────────────────────────────────────────────
  // Group: tukang.absen_submit | Items: tukang.absen_submit
  {
    title: "Tukang",
    color: "#f97316",
    permission: "tukang.absen_submit",
    roles: ["Tukang"],
    items: [
      { label: "Absen Harian", href: "/absen", icon: "Camera", permission: "tukang.absen_submit" },
    ],
  },

  // ── Client Portal ────────────────────────────────────────────────────────────
  // Group: client.view | Items: client.manage
  {
    title: "Client Portal",
    color: "#0d9488",
    permission: "client.view",
    roles: [],
    items: [
      { label: "Akun & Data Klien", href: "/client", icon: "Users", permission: "client.manage" },
    ],
  },

  // ── Web Rubah Rumah ───────────────────────────────────────────────────────────
  // Group: website.view | Kelola konten website publik
  {
    title: "Web Rubah Rumah",
    color: "#FF9122",
    permission: "website.view",
    roles: [],
    items: [
      { label: "Kalkulator Harga",     href: "/website/kalkulator",      icon: "Calculator",         permission: "website.kalkulator" },
      { label: "Banner / Hero",        href: "/website/banner",          icon: "Images",             permission: "website.banner" },
      { label: "Projek Berjalan",      href: "/website/projek-berjalan", icon: "HardHat",            permission: "website.projek_berjalan" },
      { label: "Portofolio",           href: "/website/portofolio",      icon: "Briefcase",          permission: "website.portofolio" },
      { label: "Artikel",              href: "/website/artikel",         icon: "FileText",           permission: "website.artikel" },
      { label: "Testimoni",            href: "/website/testimoni",       icon: "MessageSquareQuote", permission: "website.testimoni" },
      { label: "Konfigurasi & Kontak", href: "/website/config",          icon: "Globe",              permission: "website.config" },
    ],
  },

  // ── Admin (Super Admin only) ──────────────────────────────────────────────────
  // Group: admin.view | Items: admin.users, admin.roles, admin.settings
  {
    title: "Admin",
    color: "#64748b",
    permission: "admin.view",
    roles: [],  // kosong = Super Admin only
    items: [
      { label: "Users",      href: "/admin/users",    icon: "UserCog",    permission: "admin.users" },
      { label: "Roles",      href: "/admin/roles",    icon: "ShieldCheck",permission: "admin.roles" },
      { label: "Pengaturan", href: "/admin/settings", icon: "Settings",   permission: "admin.settings" },
    ],
  },

  // ── Tutorial ──────────────────────────────────────────────────────────────────
  // Group: tutorial.view | Items: tutorial.tutorial_aplikasi, tutorial.api_eksternal, tutorial.deployment
  {
    title: "Tutorial",
    color: "#0ea5e9",
    permission: "tutorial.view",
    roles: [],
    items: [
      { label: "Tutorial Aplikasi",      href: "/tutorial/tutorial-aplikasi", icon: "BookOpen", permission: "tutorial.tutorial_aplikasi" },
      { label: "Tutorial API Eksternal", href: "/tutorial/api-eksternal",     icon: "Globe",    permission: "tutorial.api_eksternal" },
      { label: "Tutorial Deployment",    href: "/tutorial/deployment",        icon: "Server",   permission: "tutorial.deployment" },
    ],
  },
];
