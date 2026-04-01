/**
 * Seeder – RubahRumah Backend
 * Run: npm run seed
 *   or: npx ts-node --transpile-only prisma/seed.ts
 *
 * Creates test data for every menu:
 *   Admin, BD, Sales, Finance, Content Creator, Desain, Projek, PIC Project, Laporan Harian
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function hash(pw: string) {
  return bcrypt.hashSync(pw, 10);
}

function d(iso: string) {
  return new Date(iso);
}

async function main() {
  console.log("🌱  Starting seed...\n");

  // ── 0. Permissions ────────────────────────────────────────────────────────────
  const PERMISSIONS = [
    // BD
    { name: "bd.view",    module: "bd",    label: "Lihat BD" },
    { name: "bd.create",  module: "bd",    label: "Buat BD" },
    { name: "bd.edit",    module: "bd",    label: "Edit BD" },
    { name: "bd.delete",  module: "bd",    label: "Hapus BD" },
    { name: "bd.approve", module: "bd",    label: "Approve Survey BD" },
    // Content Creator
    { name: "content.view",    module: "content", label: "Lihat Content" },
    { name: "content.create",  module: "content", label: "Buat Content" },
    { name: "content.edit",    module: "content", label: "Edit Content" },
    { name: "content.delete",  module: "content", label: "Hapus Content" },
    { name: "content.approve", module: "content", label: "Approve Content Timeline" },
    // Sales Admin
    { name: "sales_admin.view",   module: "sales_admin", label: "Lihat Sales Admin" },
    { name: "sales_admin.create", module: "sales_admin", label: "Buat Sales Admin" },
    { name: "sales_admin.edit",   module: "sales_admin", label: "Edit Sales Admin" },
    { name: "sales_admin.delete", module: "sales_admin", label: "Hapus Sales Admin" },
    // Telemarketing
    { name: "telemarketing.view",   module: "telemarketing", label: "Lihat Telemarketing" },
    { name: "telemarketing.create", module: "telemarketing", label: "Buat Telemarketing" },
    { name: "telemarketing.edit",   module: "telemarketing", label: "Edit Telemarketing" },
    { name: "telemarketing.delete", module: "telemarketing", label: "Hapus Telemarketing" },
    // Desain
    { name: "desain.view",   module: "desain", label: "Lihat Desain" },
    { name: "desain.create", module: "desain", label: "Buat Desain" },
    { name: "desain.edit",   module: "desain", label: "Edit Desain" },
    { name: "desain.delete", module: "desain", label: "Hapus Desain" },
    // Sales
    { name: "sales.view",   module: "sales", label: "Lihat Sales" },
    { name: "sales.create", module: "sales", label: "Buat Sales" },
    { name: "sales.edit",   module: "sales", label: "Edit Sales" },
    { name: "sales.delete", module: "sales", label: "Hapus Sales" },
    // Projek Sipil
    { name: "projek_sipil.view",   module: "projek_sipil", label: "Lihat Projek Sipil" },
    { name: "projek_sipil.create", module: "projek_sipil", label: "Buat Projek Sipil" },
    { name: "projek_sipil.edit",   module: "projek_sipil", label: "Edit Projek Sipil" },
    { name: "projek_sipil.delete", module: "projek_sipil", label: "Hapus Projek Sipil" },
    // Projek Desain
    { name: "projek_desain.view",   module: "projek_desain", label: "Lihat Projek Desain" },
    { name: "projek_desain.create", module: "projek_desain", label: "Buat Projek Desain" },
    { name: "projek_desain.edit",   module: "projek_desain", label: "Edit Projek Desain" },
    { name: "projek_desain.delete", module: "projek_desain", label: "Hapus Projek Desain" },
    // Projek Interior
    { name: "projek_interior.view",   module: "projek_interior", label: "Lihat Projek Interior" },
    { name: "projek_interior.create", module: "projek_interior", label: "Buat Projek Interior" },
    { name: "projek_interior.edit",   module: "projek_interior", label: "Edit Projek Interior" },
    { name: "projek_interior.delete", module: "projek_interior", label: "Hapus Projek Interior" },
    // Finance
    { name: "finance.view",       module: "finance", label: "Lihat Finance" },
    { name: "finance.create",     module: "finance", label: "Buat Finance" },
    { name: "finance.edit",       module: "finance", label: "Edit Finance" },
    { name: "finance.delete",     module: "finance", label: "Hapus Finance" },
    { name: "finance.sign_head",      module: "finance", label: "Tanda Tangan Head Finance" },
    { name: "finance.sign_admin",     module: "finance", label: "Tanda Tangan Admin Finance" },
    { name: "finance.reimburse_all",  module: "finance", label: "Lihat/Kelola Semua Reimburse" },
    // PIC Project
    { name: "pic.view",   module: "pic", label: "Lihat PIC Project" },
    { name: "pic.create", module: "pic", label: "Buat PIC Project" },
    { name: "pic.edit",   module: "pic", label: "Edit PIC Project" },
    { name: "pic.delete", module: "pic", label: "Hapus PIC Project" },
    // Admin
    { name: "admin.view",   module: "admin", label: "Lihat Admin Panel" },
    { name: "admin.create", module: "admin", label: "Buat User/Role" },
    { name: "admin.edit",   module: "admin", label: "Edit User/Role" },
    { name: "admin.delete", module: "admin", label: "Hapus User/Role" },

    // ── Sub-menu (item-level) permissions ─────────────────────────────────────
    // BD sub-menus
    { name: "bd.dashboard",  module: "bd", label: "Sub-menu: Dashboard BD" },
    { name: "bd.kanban",     module: "bd", label: "Sub-menu: Kanban BD" },
    { name: "bd.meta_ads",   module: "bd", label: "Sub-menu: Meta Ads BD" },
    // Content sub-menus
    { name: "content.dashboard_sosmed", module: "content", label: "Sub-menu: Dashboard Sosmed" },
    { name: "content.social_media",     module: "content", label: "Sub-menu: Sosial Media" },
    { name: "content.timelines",        module: "content", label: "Sub-menu: Timeline Konten" },
    { name: "content.laporan_harian",   module: "content", label: "Sub-menu: Laporan Harian Content" },
    { name: "content.target",           module: "content", label: "Tab: Target Metrik Sosmed" },
    // Sales Admin sub-menus
    { name: "sales_admin.kanban",        module: "sales_admin", label: "Sub-menu: Kanban Admin" },
    { name: "sales_admin.follow_up",     module: "sales_admin", label: "Sub-menu: Follow Up Leads" },
    { name: "sales_admin.kalender",      module: "sales_admin", label: "Sub-menu: Kalender Survey" },
    { name: "sales_admin.laporan_harian",module: "sales_admin", label: "Sub-menu: Laporan Harian Sales Admin" },
    // Telemarketing sub-menus
    { name: "telemarketing.kanban",        module: "telemarketing", label: "Sub-menu: Kanban Telemarketing" },
    { name: "telemarketing.follow_up",     module: "telemarketing", label: "Sub-menu: Follow Up Leads TM" },
    { name: "telemarketing.kalender",      module: "telemarketing", label: "Sub-menu: Kalender Survey TM" },
    { name: "telemarketing.laporan_harian",module: "telemarketing", label: "Sub-menu: Laporan Harian TM" },
    // Desain sub-menus
    { name: "desain.follow_up",      module: "desain", label: "Sub-menu: Follow Up After Survey" },
    { name: "desain.kanban_paket",   module: "desain", label: "Sub-menu: Kanban Paket Desain" },
    { name: "desain.laporan_harian", module: "desain", label: "Sub-menu: Laporan Harian Desain" },
    // Sales sub-menus
    { name: "sales.kanban",        module: "sales", label: "Sub-menu: Kanban Sales" },
    { name: "sales.laporan_harian",module: "sales", label: "Sub-menu: Laporan Harian Sales" },
    // Finance sub-menus
    { name: "finance.invoice",       module: "finance", label: "Sub-menu: Invoice & Kwitansi" },
    { name: "finance.adm_projek",    module: "finance", label: "Sub-menu: Administrasi Projek" },
    { name: "finance.adm_kantor",    module: "finance", label: "Sub-menu: Administrasi Kantor" },
    { name: "finance.laporan_harian",module: "finance", label: "Sub-menu: Laporan Harian Finance" },
    // Finance tab-level (dalam halaman Administrasi Projek)
    { name: "finance.cashflow",       module: "finance", label: "Tab: Cashflow Project" },
    { name: "finance.pr",             module: "finance", label: "Tab: Purchase Request (PR)" },
    { name: "finance.upload_dokumen", module: "finance", label: "Tab: Upload Nota/Bukti Transfer" },
    { name: "finance.surat_jalan",    module: "finance", label: "Tab: Surat Jalan Material" },
    { name: "finance.tukang",         module: "finance", label: "Tab: Tukang (Gaji & Absen)" },
    // PIC sub-menus
    { name: "pic.laporan_harian", module: "pic", label: "Sub-menu: Laporan Harian PIC" },
    // Admin sub-menus
    { name: "admin.users",    module: "admin", label: "Sub-menu: Users" },
    { name: "admin.roles",    module: "admin", label: "Sub-menu: Roles & Permission" },
    { name: "admin.settings", module: "admin", label: "Sub-menu: Pengaturan" },
    // Projek Sipil tab-level
    { name: "projek_sipil.termin",      module: "projek_sipil", label: "Tab: Daftar Termin Sipil" },
    { name: "projek_sipil.gantt",       module: "projek_sipil", label: "Tab: Gantt Chart Sipil" },
    { name: "projek_sipil.docs",        module: "projek_sipil", label: "Tab: Docs/Link Sipil" },
    { name: "projek_sipil.rapp",        module: "projek_sipil", label: "Tab: RAPP Sipil" },
    { name: "projek_sipil.stock_opname",module: "projek_sipil", label: "Tab: Stock Opname Sipil" },
    // Projek Desain tab-level
    { name: "projek_desain.gantt",  module: "projek_desain", label: "Tab: Gantt Chart Desain" },
    { name: "projek_desain.docs",   module: "projek_desain", label: "Tab: Docs/Link Desain" },
    { name: "projek_desain.kanban", module: "projek_desain", label: "Tab: Kanban Pekerjaan Desain" },
    // Projek Interior tab-level
    { name: "projek_interior.termin",   module: "projek_interior", label: "Tab: Daftar Termin Interior" },
    { name: "projek_interior.gantt",    module: "projek_interior", label: "Tab: Gantt Chart Interior" },
    { name: "projek_interior.rapp",     module: "projek_interior", label: "Tab: RAPP Interior" },
    // Tukang
    { name: "tukang.absen_submit", module: "tukang", label: "Submit Absen Tukang" },
    // Absen Karyawan
    { name: "absen.submit",  module: "absen", label: "Absen Harian Karyawan" },
    { name: "absen.manage",  module: "absen", label: "Kelola Absen Karyawan (Admin)" },
    // Client Portal Management
    { name: "client.view",   module: "client", label: "Lihat Client Portal" },
    { name: "client.manage", module: "client", label: "Kelola Data Client Portal" },
    // Website Rubah Rumah (konten publik)
    { name: "website.view",              module: "website", label: "Lihat Web Rubah Rumah" },
    { name: "website.create",            module: "website", label: "Buat Konten Website" },
    { name: "website.edit",              module: "website", label: "Edit Konten Website" },
    { name: "website.delete",            module: "website", label: "Hapus Konten Website" },
    { name: "website.kalkulator",        module: "website", label: "Sub-menu: Kalkulator Harga" },
    { name: "website.banner",            module: "website", label: "Sub-menu: Banner / Hero" },
    { name: "website.projek_berjalan",   module: "website", label: "Sub-menu: Projek Berjalan Website" },
    { name: "website.portofolio",        module: "website", label: "Sub-menu: Portofolio" },
    { name: "website.artikel",           module: "website", label: "Sub-menu: Artikel" },
    { name: "website.testimoni",         module: "website", label: "Sub-menu: Testimoni" },
    { name: "website.config",            module: "website", label: "Sub-menu: Konfigurasi & Kontak" },
    // Tutorial
    { name: "tutorial.view",              module: "tutorial", label: "Lihat Tutorial" },
    { name: "tutorial.tutorial_aplikasi", module: "tutorial", label: "Sub-menu: Tutorial Aplikasi" },
    { name: "tutorial.api_eksternal",     module: "tutorial", label: "Sub-menu: Tutorial API Eksternal" },
    { name: "tutorial.deployment",        module: "tutorial", label: "Sub-menu: Tutorial Deployment" },
  ];

  const permMap: Record<string, bigint> = {};
  for (const p of PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { name: p.name },
      update: { module: p.module, label: p.label },
      create: p,
    });
    permMap[p.name] = perm.id;
  }
  console.log(`✓  Permissions: ${PERMISSIONS.length} entries upserted`);

  // ── 1. Roles ─────────────────────────────────────────────────────────────────
  const roleNames = [
    "Super Admin", "BD", "Sales", "Finance",
    "Content Creator", "Desain", "PIC Project",
    "Telemarketing", "Sales Admin",
    "Head Finance", "Admin Finance",
  ];

  const roleMap: Record<string, bigint> = {};
  for (const name of roleNames) {
    const r = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    roleMap[name] = r.id;
  }
  console.log("✓  Roles:", roleNames.join(", "));

  // ── 1b. Default Role-Permission assignments ───────────────────────────────────
  const rolePermissions: Record<string, string[]> = {
    "BD": ["bd.view","bd.create","bd.edit","bd.delete"],
    "Content Creator": ["content.view","content.create","content.edit","content.delete"],
    "Sales Admin": ["sales_admin.view","sales_admin.create","sales_admin.edit","sales_admin.delete"],
    "Telemarketing": ["telemarketing.view","telemarketing.create","telemarketing.edit","telemarketing.delete"],
    "Desain": ["desain.view","desain.create","desain.edit","desain.delete"],
    "Sales": [
      "sales.view","sales.create","sales.edit","sales.delete",
      "projek_sipil.view","projek_desain.view","projek_interior.view",
    ],
    "Finance": ["finance.view","finance.create","finance.edit","finance.delete"],
    "PIC Project": ["pic.view","pic.create","pic.edit","pic.delete","projek_interior.view"],
    "Head Finance": ["finance.sign_head", "finance.reimburse_all"],
    "Admin Finance": ["finance.sign_admin", "finance.reimburse_all"],
  };

  for (const [roleName, permNames] of Object.entries(rolePermissions)) {
    const roleId = roleMap[roleName];
    if (!roleId) continue;
    // Only assign if the role has no permissions yet (don't overwrite manual changes)
    const existing = await prisma.rolePermission.count({ where: { role_id: roleId } });
    if (existing > 0) {
      console.log(`  (skip) role permissions already set for: ${roleName}`);
      continue;
    }
    const data = permNames
      .filter((pn) => permMap[pn])
      .map((pn) => ({ role_id: roleId, permission_id: permMap[pn] }));
    if (data.length > 0) {
      await prisma.rolePermission.createMany({ data });
      console.log(`  ✓ permissions assigned to ${roleName}: ${permNames.join(", ")}`);
    }
  }
  console.log("✓  Role-permission defaults done");

  // ── 1c. Sub-menu & tab permissions — upsert (aman untuk existing install) ───
  // Menggunakan createMany + skipDuplicates agar tidak menimpa perubahan manual
  const TUTORIAL_PERMS = ["tutorial.view","tutorial.tutorial_aplikasi","tutorial.api_eksternal","tutorial.deployment"];
  const subMenuRolePerms: Record<string, string[]> = {
    "BD":            ["bd.dashboard","bd.kanban","bd.meta_ads","absen.submit", ...TUTORIAL_PERMS],
    "Content Creator": [
      "content.dashboard_sosmed","content.social_media",
      "content.timelines","content.laporan_harian","content.target",
      "absen.submit", ...TUTORIAL_PERMS,
    ],
    "Sales Admin": [
      "sales_admin.kanban","sales_admin.follow_up",
      "sales_admin.kalender","sales_admin.laporan_harian",
      "absen.submit", ...TUTORIAL_PERMS,
    ],
    "Telemarketing": [
      "telemarketing.kanban","telemarketing.follow_up",
      "telemarketing.kalender","telemarketing.laporan_harian",
      "absen.submit", ...TUTORIAL_PERMS,
    ],
    "Desain":       ["desain.follow_up","desain.kanban_paket","desain.laporan_harian","absen.submit", ...TUTORIAL_PERMS],
    "Sales":        ["sales.kanban","sales.laporan_harian","absen.submit", ...TUTORIAL_PERMS],
    "Finance": [
      "finance.invoice","finance.adm_projek","finance.adm_kantor","finance.laporan_harian",
      "finance.cashflow","finance.pr","finance.upload_dokumen","finance.surat_jalan","finance.tukang",
      "absen.submit", ...TUTORIAL_PERMS,
    ],
    "Head Finance":  ["finance.invoice","finance.adm_projek","absen.submit","absen.manage", ...TUTORIAL_PERMS],
    "Admin Finance": ["finance.invoice","finance.adm_projek","finance.adm_kantor","absen.submit", ...TUTORIAL_PERMS],
    "PIC Project":   ["pic.laporan_harian","absen.submit", ...TUTORIAL_PERMS],
    "Tukang":        ["tukang.absen_submit"],
  };

  let subMenuAdded = 0;
  for (const [roleName, permNames] of Object.entries(subMenuRolePerms)) {
    const roleId = roleMap[roleName];
    if (!roleId) continue;
    const data = permNames
      .filter((pn) => permMap[pn])
      .map((pn) => ({ role_id: roleId, permission_id: permMap[pn] }));
    if (data.length > 0) {
      await prisma.rolePermission.createMany({ data, skipDuplicates: true });
      subMenuAdded += data.length;
    }
  }
  console.log(`✓  Sub-menu & tab permissions synced (${subMenuAdded} assignments added/skipped)`);

  // ── 2. Users ──────────────────────────────────────────────────────────────────
  const usersData = [
    { name: "Admin Test",       email: "admin@test.com",   roles: ["Super Admin"] },
    { name: "BD User",          email: "bd@test.com",      roles: ["BD"] },
    { name: "Sales User",       email: "sales@test.com",   roles: ["Sales"] },
    { name: "Finance User",     email: "finance@test.com", roles: ["Finance"] },
    { name: "Content Creator",  email: "content@test.com", roles: ["Content Creator"] },
    { name: "Desain User",      email: "desain@test.com",  roles: ["Desain"] },
    { name: "PIC Project User", email: "pic@test.com",     roles: ["PIC Project"] },
  ];

  const userMap: Record<string, bigint> = {};
  for (const u of usersData) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      userMap[u.email] = existing.id;
      console.log(`  (skip) user: ${u.email}`);
    } else {
      const created = await prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          password: hash("password123"),
          roles: {
            create: u.roles.map((rname) => ({
              role: { connect: { id: roleMap[rname] } },
            })),
          },
        },
      });
      userMap[u.email] = created.id;
      console.log(`  ✓ created user: ${u.email}`);
    }
  }

  const adminId  = userMap["admin@test.com"];
  const bdId     = userMap["bd@test.com"];
  const salesId  = userMap["sales@test.com"];
  const finId    = userMap["finance@test.com"];
  const ccId     = userMap["content@test.com"];
  const desainId = userMap["desain@test.com"];
  const picId    = userMap["pic@test.com"];

  // ── 3. Leads ──────────────────────────────────────────────────────────────────
  console.log("\n  Creating leads...");

  const lead1 = await prisma.lead.create({
    data: {
      user_id: bdId,
      nama: "Budi Santoso",
      nomor_telepon: "081234567890",
      alamat: "Jl. Merdeka No. 1, Jakarta",
      sumber_leads: "Instagram",
      jenis: "Renovasi",
      status: "Hot",
      tipe: "Residensial",
      bulan: 2, tahun: 2026,
      rencana_survey: "Ya",
      tanggal_survey: d("2026-03-01"),
      jam_survey: "10:00",
      pic_survey: "BD User",
      modul: null,
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      user_id: bdId,
      nama: "Siti Rahayu",
      nomor_telepon: "082345678901",
      alamat: "Jl. Sudirman No. 5, Bandung",
      sumber_leads: "Referral",
      jenis: "Pembangunan Baru",
      status: "Warm",
      tipe: "Komersial",
      bulan: 2, tahun: 2026,
      rencana_survey: "Tidak",
      modul: null,
    },
  });

  await prisma.lead.create({
    data: {
      user_id: salesId,
      nama: "Ahmad Fauzi",
      nomor_telepon: "083456789012",
      alamat: "Jl. Gatot Subroto No. 10, Surabaya",
      sumber_leads: "WhatsApp",
      jenis: "Interior",
      status: "Low",
      modul: "sales-admin",
      bulan: 2, tahun: 2026,
    },
  });

  await prisma.lead.create({
    data: {
      user_id: salesId,
      nama: "Dewi Lestari",
      nomor_telepon: "084567890123",
      alamat: "Jl. Diponegoro No. 20, Semarang",
      sumber_leads: "Cold Call",
      jenis: "Renovasi",
      status: "Low",
      modul: "telemarketing",
      bulan: 2, tahun: 2026,
    },
  });

  await prisma.followUpClient.create({
    data: {
      lead_id: lead1.id,
      user_id: bdId,
      tanggal: new Date(),
      catatan: "Sudah dihubungi, customer tertarik renovasi dapur",
      next_follow_up: d("2026-03-05"),
    },
  });

  console.log(`  ✓ leads created (IDs: ${lead1.id}, ${lead2.id}, ...)`);

  // ── 4. BD Kanban ──────────────────────────────────────────────────────────────
  console.log("\n  Creating BD kanban...");

  const bdCol1 = await prisma.kanbanColumn.create({ data: { title: "Prospek",   urutan: 1, color: "#e2e8f0" } });
  const bdCol2 = await prisma.kanbanColumn.create({ data: { title: "Survey",    urutan: 2, color: "#bee3f8" } });
  await prisma.kanbanColumn.create({ data: { title: "Penawaran", urutan: 3, color: "#fef3c7" } });
  await prisma.kanbanColumn.create({ data: { title: "Deal",      urutan: 4, color: "#c6f6d5" } });

  await prisma.kanbanCard.create({
    data: {
      column_id: bdCol1.id, title: "Budi Santoso – Renovasi",
      description: "Lead dari Instagram, hot prospect",
      assigned_user_id: bdId, urutan: 1,
      deadline: d("2026-03-15"),
    },
  });
  await prisma.kanbanCard.create({
    data: {
      column_id: bdCol2.id, title: "Siti Rahayu – Pembangunan Baru",
      description: "Survey dijadwalkan 1 Maret 2026",
      assigned_user_id: bdId, urutan: 1,
    },
  });

  console.log("  ✓ BD kanban columns & cards created");

  // ── 5. Meta Ads ───────────────────────────────────────────────────────────────
  console.log("\n  Creating meta ads...");

  const camp = await prisma.metaAdsCampaign.create({
    data: {
      campaign_name: "Iklan Renovasi Q1 2026",
      meta_campaign_id: "CAMP-001",
      platform: "Meta",
      status: "aktif",
      start_date: d("2026-01-01"),
      end_date: d("2026-03-31"),
      daily_budget: 150000,
      total_budget: 13500000,
      content_type: "Video",
      content_description: "Video showcase proyek renovasi",
      created_by: bdId,
    },
  });

  await prisma.adContentMetric.create({
    data: {
      meta_ads_campaign_id: camp.id,
      date: d("2026-02-01"),
      impressions: 45000,
      reach: 32000,
      clicks: 1200,
      spend: 1500000,
      likes: 340,
      comments: 45,
      shares: 20,
      video_views: 8000,
      conversions: 38,
      ctr: (1200 / 45000) * 100,
      cost_per_result: 1500000 / 38,
    },
  });

  await prisma.whatsappChatMetric.create({
    data: {
      meta_ads_campaign_id: camp.id,
      date: d("2026-02-01"),
      chats_received: 38,
      chats_responded: 32,
      response_rate: (32 / 38) * 100,
      avg_response_time: 15,
      total_conversions: 12,
      conversion_rate: (12 / 38) * 100,
    },
  });

  console.log(`  ✓ meta ads campaign created (id=${camp.id})`);

  // ── 6. Sales Kanban & Proyek Berjalan ─────────────────────────────────────────
  console.log("\n  Creating sales data...");

  const sCol1 = await prisma.salesKanbanColumn.create({ data: { title: "Negosiasi", urutan: 1, color: "#e2e8f0" } });
  await prisma.salesKanbanColumn.create({ data: { title: "Deal",       urutan: 2, color: "#c6f6d5" } });
  await prisma.salesKanbanColumn.create({ data: { title: "Berjalan",   urutan: 3, color: "#bee3f8" } });

  await prisma.salesKanbanCard.create({
    data: {
      column_id: sCol1.id,
      title: "Negosiasi Harga – Budi Santoso",
      lead_id: lead1.id, assigned_user_id: salesId,
      tipe_pekerjaan: "Renovasi", urutan: 1,
      deadline: d("2026-03-10"),
    },
  });

  const proyekBerjalan = await prisma.proyekBerjalan.create({
    data: {
      lead_id: lead2.id,
      lokasi: "Jl. Sudirman No. 5, Bandung",
      nilai_rab: 85000000,
      tanggal_mulai: d("2026-03-01"),
      tanggal_selesai: d("2026-05-31"),
      created_by: picId,
    },
  });

  console.log(`  ✓ proyek berjalan created (id=${proyekBerjalan.id})`);

  // ── 7. Content Creator ────────────────────────────────────────────────────────
  console.log("\n  Creating content timeline...");

  await prisma.contentTimeline.create({
    data: {
      user_id: ccId,
      judul: "Video Before-After Renovasi Dapur",
      deskripsi: "Konten video transformasi dapur pelanggan",
      platform: "Instagram Reels",
      tanggal_publish: d("2026-03-05"),
      bulan: 3, tahun: 2026,
      status: "Draft",
      planning_status: "pending",
    },
  });

  await prisma.contentTimeline.create({
    data: {
      user_id: ccId,
      judul: "Carousel Tips Renovasi Murah",
      deskripsi: "10 tips renovasi hemat budget",
      platform: "Instagram Feed",
      tanggal_publish: d("2026-03-10"),
      bulan: 3, tahun: 2026,
      status: "In Progress",
      planning_status: "approved",
      produksi_status: "pending",
    },
  });

  await prisma.contentTimeline.create({
    data: {
      user_id: ccId,
      judul: "Reel: 5 Inspirasi Desain Living Room Modern",
      deskripsi: "Short video konten inspirasi desain",
      platform: "TikTok",
      tanggal_publish: d("2026-03-20"),
      bulan: 3, tahun: 2026,
      status: "Draft",
      planning_status: "pending",
    },
  });

  console.log("  ✓ content timelines created");

  // ── 8. Desain Timeline ────────────────────────────────────────────────────────
  console.log("\n  Creating desain timeline...");

  const desainTl = await prisma.desainTimeline.create({
    data: {
      lead_id: lead1.id,
      jenis_desain: "Desain Interior Dapur",
      bulan: 3, tahun: 2026,
      created_by: desainId,
    },
  });

  await prisma.desainTimelineItem.create({
    data: {
      desain_timeline_id: desainTl.id,
      item_pekerjaan: "Konsep Desain Awal",
      pic: desainId,
      target_selesai: d("2026-03-05"),
      status: "Selesai",
    },
  });

  await prisma.desainTimelineItem.create({
    data: {
      desain_timeline_id: desainTl.id,
      item_pekerjaan: "Revisi Desain",
      pic: desainId,
      target_selesai: d("2026-03-10"),
      status: "In Progress",
    },
  });

  console.log(`  ✓ desain timeline created (id=${desainTl.id})`);

  // ── 9. Finance ────────────────────────────────────────────────────────────────
  console.log("\n  Creating finance data...");

  // Invoice
  const invoice = await prisma.invoice.create({
    data: {
      invoice_number: `INV-202602-${Math.floor(Math.random() * 9000) + 1000}`,
      tanggal: d("2026-02-15"),
      lead_id: lead2.id,
      catatan: "Invoice pembayaran DP 30%",
      ppn_percentage: 11,
      created_by: finId,
      subtotal: 25500000,
      ppn_amount: 2805000,
      grand_total: 28305000,
      status: "Draft",
      items: {
        create: [
          {
            description: "Biaya Renovasi DP – Down payment 30% total RAB",
            quantity: 1, unit_price: 25500000, subtotal: 25500000,
          },
        ],
      },
    },
  });

  console.log(`  ✓ invoice created (id=${invoice.id})`);

  // Adm Finance Project
  const admProj = await prisma.admFinanceProject.create({
    data: {
      lead_id: lead2.id,
      lokasi: "Jl. Sudirman No. 5, Bandung",
      tanggal_mulai: d("2026-03-01"),
      tanggal_selesai: d("2026-05-31"),
      status: "Aktif",
      created_by: finId,
      jumlah_termin: 0,
    },
  });

  const admTermin = await prisma.admFinanceTermin.create({
    data: { project_id: admProj.id, nama_termin: "Termin 1 – DP 30%", budget: 25500000 },
  });

  await prisma.admFinanceProject.update({
    where: { id: admProj.id },
    data: { jumlah_termin: { increment: 1 } },
  });

  const admPeriode = await prisma.admFinancePeriode.create({
    data: {
      termin_id: admTermin.id,
      nama_periode: "Periode Maret 2026",
      budget: 25500000,
      tanggal_mulai: d("2026-03-01"),
      tanggal_selesai: d("2026-03-31"),
      is_approved: true,
      approved_by: adminId,
      approved_at: new Date(),
    },
  });

  await prisma.admFinanceItem.create({
    data: {
      periode_id: admPeriode.id,
      description: "Pembelian Material Bahan Bangunan",
      qty: 1, unit_price: 5000000, total: 5000000,
      status: "aktif",
    },
  });

  await prisma.admFinanceItem.create({
    data: {
      periode_id: admPeriode.id,
      description: "Upah Tukang Minggu 1",
      qty: 5, unit_price: 800000, total: 4000000,
      status: "aktif",
    },
  });

  console.log(`  ✓ adm-finance project created (id=${admProj.id})`);

  // Administrasi Kantor
  const admKantor = await prisma.administrasiKantor.create({
    data: {
      lead_id: lead1.id,
      tanggal: d("2026-02-20"),
      keterangan: "Biaya operasional kantor Februari 2026",
      created_by: finId,
      items: {
        create: [
          { description: "Sewa Kantor",     qty: 1, amount: 5000000 },
          { description: "Listrik & Internet", qty: 1, amount: 850000 },
          { description: "ATK & Percetakan",   qty: 1, amount: 250000 },
        ],
      },
    },
  });

  console.log(`  ✓ administrasi kantor created (id=${admKantor.id})`);

  // Surat Jalan
  const suratJalan = await prisma.suratJalan.create({
    data: {
      adm_finance_project_id: admProj.id,
      nomor_surat: "SJ-2026-001",
      tanggal: d("2026-03-05"),
      penerima: "Budi Santoso",
      keterangan: "Pengiriman material renovasi tahap pertama",
      created_by: finId,
      items: {
        create: [
          { description: "Semen Portland 50kg", qty: 20, satuan: "Sak" },
          { description: "Batu Bata Merah",     qty: 500, satuan: "Buah" },
          { description: "Pasir Bangunan",      qty: 2,  satuan: "Kubik" },
        ],
      },
    },
  });

  console.log(`  ✓ surat jalan created (id=${suratJalan.id})`);

  // Absen Tukang
  await prisma.absenTukang.create({
    data: {
      adm_finance_project_id: admProj.id,
      tanggal: d("2026-03-01"),
      created_by: finId,
      items: {
        create: [
          { tukang_name: "Pak Bejo",   hadir: true,  keterangan: null },
          { tukang_name: "Pak Slamet", hadir: true,  keterangan: null },
          { tukang_name: "Pak Suryo",  hadir: false, keterangan: "Sakit" },
        ],
      },
    },
  });

  console.log("  ✓ absen tukang created");

  // Gaji Tukang
  const gaji = await prisma.gajiTukang.create({
    data: {
      adm_finance_project_id: admProj.id,
      bulan: 3, tahun: 2026,
      total_hari_kerja: 48,
      total_gaji: 4800000,
      created_by: finId,
      items: {
        create: [
          { tukang_name: "Pak Bejo",   hari_kerja: 20, daily_rate: 100000, subtotal: 2000000 },
          { tukang_name: "Pak Slamet", hari_kerja: 18, daily_rate: 100000, subtotal: 1800000 },
          { tukang_name: "Pak Suryo",  hari_kerja: 10, daily_rate: 100000, subtotal: 1000000 },
        ],
      },
    },
  });

  await prisma.kwitansiGajiTukang.create({
    data: {
      gaji_tukang_id: gaji.id,
      tukang_name: "Pak Bejo",
      jumlah_gaji: 2000000,
      tanggal_pembayaran: d("2026-03-10"),
      penerima: "Pak Bejo",
    },
  });

  console.log(`  ✓ gaji tukang created (id=${gaji.id})`);

  // ── 10. Projek Interior ───────────────────────────────────────────────────────
  console.log("\n  Creating projek data...");

  // Kategori Barang (create always, no unique constraint)
  const katBahan = await prisma.kategoriBarang.create({ data: { nama: "Bahan Bangunan" } });
  const katFinishing = await prisma.kategoriBarang.create({ data: { nama: "Finishing" } });

  const barang1 = await prisma.barang.create({
    data: { kategori_id: katBahan.id, nama: "Semen Portland 50kg", supplier: "PT Semen Gresik", price: 65000, satuan: "Sak" },
  });
  const barang2 = await prisma.barang.create({
    data: { kategori_id: katFinishing.id, nama: "Cat Tembok Putih 25kg", supplier: "PT Nippon Paint", price: 350000, satuan: "Ember" },
  });

  console.log(`  ✓ kategori & barang created`);

  // Warehouse
  const wh = await prisma.warehouse.create({ data: { nama: "Gudang Pusat Jakarta", lokasi: "Jakarta Selatan" } });

  await prisma.stokWarehouse.create({
    data: {
      warehouse_id: wh.id, barang_id: barang1.id, nama_barang: barang1.nama,
      is_custom: false, quantity: 50, price: 65000, satuan: "Sak",
      supplier: "PT Semen Gresik", total_harga: 50 * 65000,
    },
  });
  await prisma.stokWarehouse.create({
    data: {
      warehouse_id: wh.id, barang_id: barang2.id, nama_barang: barang2.nama,
      is_custom: false, quantity: 20, price: 350000, satuan: "Ember",
      supplier: "PT Nippon Paint", total_harga: 20 * 350000,
    },
  });

  console.log(`  ✓ warehouse & stok created (id=${wh.id})`);

  // Projek
  const projek = await prisma.projek.create({
    data: {
      nama: "Renovasi Villa Budi Santoso",
      pic_user_id: picId,
      tanggal_mulai: d("2026-03-01"),
      tanggal_selesai: d("2026-06-30"),
    },
  });

  const termin1 = await prisma.termin.create({
    data: {
      projek_id: projek.id,
      nama: "Termin 1 – Pekerjaan Struktur",
      status: "Aktif",
      tanggal_mulai: d("2026-03-01"),
      tanggal_selesai: d("2026-04-15"),
    },
  });

  await prisma.barangTermin.create({
    data: {
      termin_id: termin1.id,
      barang_id: barang1.id,
      quantity: 30, satuan: "Sak",
      price: 65000, total_harga: 30 * 65000,
      keterangan: "Untuk pondasi dan dinding",
    },
  });

  await prisma.termin.create({
    data: {
      projek_id: projek.id,
      nama: "Termin 2 – Finishing",
      status: "Aktif",
      tanggal_mulai: d("2026-04-16"),
      tanggal_selesai: d("2026-06-30"),
    },
  });

  console.log(`  ✓ projek created (id=${projek.id}), termins created`);

  // Stock Opname
  const soProject = await prisma.stockOpnameProject.create({
    data: {
      nama_client: "Stock Opname Gudang Q1 2026",
      status: "aktif",
      tanggal_mulai: d("2026-03-31"),
      tanggal_selesai: d("2026-03-31"),
      created_by: finId,
    },
  });

  console.log(`  ✓ stock opname created (id=${soProject.id})`);

  // ── 11. Laporan Harian ────────────────────────────────────────────────────────
  console.log("\n  Creating laporan harian...");

  await prisma.laporanHarian.create({
    data: {
      user_id: bdId,
      modul: "BD",
      kegiatan: "Follow up 3 lead baru dari Instagram, 1 lead konfirmasi survey",
      kendala: null,
      tanggal_mulai: d("2026-02-25"),
      tanggal_selesai: d("2026-02-25"),
    },
  });

  await prisma.laporanHarian.create({
    data: {
      user_id: ccId,
      modul: "Content Creator",
      kegiatan: "Pembuatan konten video before-after renovasi dapur",
      kendala: "Perlu approval desain dari tim desain",
      tanggal_mulai: d("2026-02-25"),
      tanggal_selesai: d("2026-02-25"),
    },
  });

  await prisma.laporanHarian.create({
    data: {
      user_id: desainId,
      modul: "Desain",
      kegiatan: "Membuat 3 konsep alternatif desain dapur Budi Santoso",
      kendala: null,
      tanggal_mulai: d("2026-02-25"),
      tanggal_selesai: d("2026-02-25"),
    },
  });

  console.log("  ✓ laporan harian created");

  // ── Done ──────────────────────────────────────────────────────────────────────
  // ── Fontee Reminder Rules ─────────────────────────────────────────────────────
  const DEFAULT_REMINDER_RULES = [
    { feature: "task_deadline",           label: "Deadline Task Pekerjaan",        days_before: 3, send_time: "08:00" },
    { feature: "invoice_sign_head",       label: "TTD Head Finance Invoice",       days_before: 1, send_time: "08:00" },
    { feature: "invoice_sign_admin",      label: "TTD Admin Finance Invoice",      days_before: 1, send_time: "08:00" },
    { feature: "pr_sign_head",            label: "TTD Head Finance PR",            days_before: 1, send_time: "08:00" },
    { feature: "termin_deadline",         label: "Deadline Termin Proyek",         days_before: 7, send_time: "08:00" },
    { feature: "approval_needed",         label: "Approval / Persetujuan Tertunda",days_before: 1, send_time: "08:00" },
    { feature: "item_pekerjaan_sipil",    label: "Item Pekerjaan Proyek Sipil",    days_before: 2, send_time: "08:00" },
    { feature: "item_pekerjaan_desain",   label: "Item Pekerjaan Proyek Desain",   days_before: 2, send_time: "08:00" },
    { feature: "item_pekerjaan_interior", label: "Item Pekerjaan Proyek Interior", days_before: 2, send_time: "08:00" },
  ];
  for (const rule of DEFAULT_REMINDER_RULES) {
    const existing = await prisma.fonteeReminderRule.findFirst({ where: { feature: rule.feature } });
    if (!existing) {
      await (prisma.fonteeReminderRule as any).create({ data: { ...rule, is_active: true, role_ids: [] } });
    } else if (!(existing as any).send_time) {
      await (prisma.fonteeReminderRule as any).update({ where: { id: existing.id }, data: { send_time: "08:00" } });
    }
  }
  console.log("✅  Fontee reminder rules seeded");

  console.log("\n✅  Seed selesai!\n");
  console.log("  Login credentials (password: password123):");
  console.log("  ┌────────────────────────────────────────────────────────────┐");
  console.log("  │ admin@test.com    – Super Admin                            │");
  console.log("  │ bd@test.com       – BD                                     │");
  console.log("  │ sales@test.com    – Sales                                  │");
  console.log("  │ finance@test.com  – Finance                                │");
  console.log("  │ content@test.com  – Content Creator                        │");
  console.log("  │ desain@test.com   – Desain                                 │");
  console.log("  │ pic@test.com      – PIC Project                            │");
  console.log("  └────────────────────────────────────────────────────────────┘");
}

main()
  .catch((e) => {
    console.error("\n❌  Seed error:", e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
