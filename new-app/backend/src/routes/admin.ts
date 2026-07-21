import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/requireRole";
import { hashPassword } from "../lib/security";
import { sendFonnte } from "../lib/fontee";
import {
  evolutionConfigured,
  describeEvolutionError,
  getConnectionState,
  createInstance,
  connectInstance,
  logoutInstance,
  deleteInstance,
  getConnectedNumber,
  ensureWebhook,
} from "../lib/evolution";

const router = Router();

function userDict(u: { id: bigint; name: string; email: string; whatsapp_number: string | null; sub_role: string | null; created_at: Date; roles: Array<{ role: { id: bigint; name: string } }> }) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    whatsapp_number: u.whatsapp_number,
    sub_role: u.sub_role ?? "Karyawan",
    roles: u.roles.map((r) => ({ id: r.role.id, name: r.role.name })),
    created_at: u.created_at?.toISOString() ?? null,
  };
}

function uniqueRoleIds(roleIds: (number | string)[]) {
  return Array.from(new Set(roleIds.map((rid) => BigInt(rid))));
}

function isSoftDeletedEmail(email: string) {
  return email.startsWith("deleted+");
}

async function softDeleteUser(user: { id: bigint; name: string }) {
  const deletedAt = Date.now();
  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { user_id: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        name: `[Dihapus] ${user.name}`.slice(0, 255),
        email: `deleted+${user.id}-${deletedAt}@rubahrumah.local`,
        password: hashPassword(`deleted-${user.id}-${deletedAt}-${Math.random()}`),
        whatsapp_number: null,
        sub_role: "Nonaktif",
        updated_at: new Date(),
      },
    }),
  ]);
}

// GET /users
router.get("/users", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string) || 20, 100);
  const search = req.query.search as string | undefined;

  const activeUsersOnly = { NOT: { email: { startsWith: "deleted+" } } };
  const where = search
    ? {
        AND: [
          activeUsersOnly,
          { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] },
        ],
      }
    : activeUsersOnly;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: { roles: { include: { role: true } } },
      orderBy: { id: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return res.json({ items: users.map(userDict), total, page, per_page: perPage });
});

// POST /users
router.post("/users", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const { name, email, password, whatsapp_number, sub_role, role_ids = [] } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(400).json({ detail: "Email sudah terdaftar" });
  }
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashPassword(password),
      whatsapp_number: whatsapp_number ?? null,
      sub_role: sub_role ?? "Karyawan",
      roles: {
        create: uniqueRoleIds(role_ids as (number | string)[]).map((rid) => ({ role: { connect: { id: rid } } })),
      },
    },
  });
  return res.status(201).json({ id: user.id, name: user.name, email: user.email, message: "User berhasil dibuat" });
});

// PATCH /users/:id
router.patch("/users/:id", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const userId = BigInt(req.params.id);
  const { name, email, whatsapp_number, sub_role, role_ids } = req.body;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ detail: "User tidak ditemukan" });

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (whatsapp_number !== undefined) updates.whatsapp_number = whatsapp_number;
  if (sub_role !== undefined) updates.sub_role = sub_role;
  if (email !== undefined) {
    const conflict = await prisma.user.findFirst({ where: { email, id: { not: userId } } });
    if (conflict) return res.status(400).json({ detail: "Email sudah digunakan" });
    updates.email = email;
  }

  await prisma.user.update({ where: { id: userId }, data: updates });

  if (Array.isArray(role_ids)) {
    const uniqueRoles = uniqueRoleIds(role_ids as (number | string)[]);
    await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { user_id: userId } });
      if (uniqueRoles.length > 0) {
        await tx.userRole.createMany({
          data: uniqueRoles.map((rid) => ({ user_id: userId, role_id: rid })),
          skipDuplicates: true,
        });
      }
    });
  }

  return res.json({ message: "User berhasil diupdate" });
});

// DELETE /users/:id
router.delete("/users/:id", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const userId = BigInt(req.params.id);
  if (userId === req.user!.id) {
    return res.status(400).json({ detail: "Tidak bisa hapus akun sendiri" });
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  if (!user) return res.status(404).json({ detail: "User tidak ditemukan" });
  if (isSoftDeletedEmail(user.email)) return res.status(404).json({ detail: "User tidak ditemukan" });
  const isSuperAdmin = user.roles.some((ur) => ur.role.name === "Super Admin");
  if (isSuperAdmin) {
    return res.status(400).json({ detail: "User dengan role Super Admin tidak bisa dihapus" });
  }
  try {
    await prisma.user.delete({ where: { id: userId } });
    return res.json({ message: "User berhasil dihapus" });
  } catch (err: any) {
    if (err?.code !== "P2003") throw err;
    await softDeleteUser(user);
    return res.json({
      message: "User dinonaktifkan karena masih memiliki riwayat data. Role dicabut dan akun tidak bisa login lagi.",
    });
  }
});

// POST /users/:id/reset-password
router.post("/users/:id/reset-password", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const userId = BigInt(req.params.id);
  const { new_password } = req.body ?? {};
  if (!new_password || typeof new_password !== "string" || new_password.length < 6) {
    return res.status(400).json({ detail: "new_password wajib diisi dan minimal 6 karakter" });
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ detail: "User tidak ditemukan" });
  await prisma.user.update({ where: { id: userId }, data: { password: hashPassword(new_password) } });
  return res.json({ message: "Password direset" });
});

// GET /roles
router.get("/roles", requireRole("Super Admin"), async (_req: Request, res: Response) => {
  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { permissions: true, users: true } } },
  });
  return res.json(roles.map((r) => ({
    id: r.id,
    name: r.name,
    permission_count: r._count.permissions,
    user_count: r._count.users,
  })));
});

// POST /roles
router.post("/roles", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ detail: "name wajib diisi" });
  const existing = await prisma.role.findUnique({ where: { name: name.trim() } });
  if (existing) return res.status(400).json({ detail: "Role sudah ada" });
  const role = await prisma.role.create({ data: { name: name.trim() } });
  return res.status(201).json({ id: role.id, name: role.name, permission_count: 0, user_count: 0 });
});

// PATCH /roles/:id
router.patch("/roles/:id", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const roleId = BigInt(req.params.id);
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ detail: "name wajib diisi" });
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return res.status(404).json({ detail: "Role tidak ditemukan" });
  if (role.name === "Super Admin") return res.status(400).json({ detail: "Tidak bisa mengubah Super Admin" });
  const conflict = await prisma.role.findFirst({ where: { name: name.trim(), id: { not: roleId } } });
  if (conflict) return res.status(400).json({ detail: "Nama role sudah digunakan" });
  const updated = await prisma.role.update({ where: { id: roleId }, data: { name: name.trim() } });
  return res.json({ id: updated.id, name: updated.name });
});

// DELETE /roles/:id
router.delete("/roles/:id", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const roleId = BigInt(req.params.id);
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return res.status(404).json({ detail: "Role tidak ditemukan" });
  if (role.name === "Super Admin") return res.status(400).json({ detail: "Tidak bisa hapus Super Admin" });
  await prisma.role.delete({ where: { id: roleId } });
  return res.json({ message: "Role dihapus" });
});

// GET /roles/:id/permissions
router.get("/roles/:id/permissions", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const roleId = BigInt(req.params.id);
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: { include: { permission: true } } },
  });
  if (!role) return res.status(404).json({ detail: "Role tidak ditemukan" });
  return res.json({
    id: role.id,
    name: role.name,
    permissions: role.permissions.map((rp) => ({
      id: rp.permission.id,
      name: rp.permission.name,
      module: rp.permission.module,
      label: rp.permission.label,
    })),
  });
});

// PUT /roles/:id/permissions — replace full permission set
router.put("/roles/:id/permissions", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const roleId = BigInt(req.params.id);
  const { permission_ids = [] } = req.body as { permission_ids: (number | string)[] };
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return res.status(404).json({ detail: "Role tidak ditemukan" });
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { role_id: roleId } }),
    prisma.rolePermission.createMany({
      data: permission_ids.map((pid) => ({
        role_id: roleId,
        permission_id: BigInt(pid),
      })),
    }),
  ]);
  return res.json({ message: "Permission berhasil diperbarui" });
});

// Permission yang harus selalu ada (auto-sync tanpa perlu re-run seeder)
const ENSURED_PERMISSIONS: Array<{ name: string; module: string; label: string }> = [
  { name: "pic.kalender_visit", module: "pic", label: "Sub-menu: Kalender Visit PIC" },
  { name: "pic.dokumentasi", module: "pic", label: "Sub-menu: Upload Dokumentasi Projek" },
  { name: "projek.gudang_workshop", module: "projek", label: "Sub-menu: Gudang/Workshop" },
  { name: "projek.form_bast", module: "projek", label: "Sub-menu: Form BAST" },
  // Projek Sipil tab-level (dijamin muncul di matrix Roles)
  { name: "projek_sipil.termin",       module: "projek_sipil", label: "Tab: Daftar Termin Sipil" },
  { name: "projek_sipil.gantt",        module: "projek_sipil", label: "Tab: Gantt Chart Sipil" },
  { name: "projek_sipil.docs",         module: "projek_sipil", label: "Tab: Docs/Link Sipil" },
  { name: "projek_sipil.rapp",         module: "projek_sipil", label: "Tab: RAPP Sipil" },
  { name: "projek_sipil.stock_opname", module: "projek_sipil", label: "Tab: Stock Opname Sipil" },
  { name: "projek_sipil.dokumentasi",  module: "projek_sipil", label: "Tab: Dokumentasi Foto Sipil" },
  { name: "projek_sipil.checklist",    module: "projek_sipil", label: "Tab: Form Checklist Sipil" },
  { name: "projek_sipil.laporan_pic",  module: "projek_sipil", label: "Tab: Laporan PIC Project Sipil" },
  // Projek Interior tab-level (lengkapi yang belum terdaftar)
  { name: "projek_interior.termin",       module: "projek_interior", label: "Tab: Daftar Termin Interior" },
  { name: "projek_interior.gantt",        module: "projek_interior", label: "Tab: Gantt Chart Interior" },
  { name: "projek_interior.rapp",         module: "projek_interior", label: "Tab: RAPP Interior" },
  { name: "projek_interior.docs",         module: "projek_interior", label: "Tab: Docs/Link Interior" },
  { name: "projek_interior.dokumentasi",  module: "projek_interior", label: "Tab: Dokumentasi Foto Interior" },
  { name: "projek_interior.checklist",    module: "projek_interior", label: "Tab: Form Checklist Interior" },
  { name: "projek_interior.laporan_pic",  module: "projek_interior", label: "Tab: Laporan PIC Project Interior" },
  // Projek Desain tab-level
  { name: "projek_desain.gantt",  module: "projek_desain", label: "Tab: Gantt Chart Desain" },
  { name: "projek_desain.docs",   module: "projek_desain", label: "Tab: Docs/Link Desain" },
  { name: "projek_desain.kanban", module: "projek_desain", label: "Tab: Kanban Pekerjaan Desain" },
  { name: "bd.report_analytics", module: "bd", label: "Sub-menu: Report dan Analytics BD" },
  { name: "telemarketing.view",          module: "telemarketing", label: "Lihat Sales Admin Product dan Mitra" },
  { name: "telemarketing.create",        module: "telemarketing", label: "Buat Sales Admin Product dan Mitra" },
  { name: "telemarketing.edit",          module: "telemarketing", label: "Edit Sales Admin Product dan Mitra" },
  { name: "telemarketing.delete",        module: "telemarketing", label: "Hapus Sales Admin Product dan Mitra" },
  { name: "telemarketing.kanban",        module: "telemarketing", label: "Sub-menu: Kanban Admin Product / Kanban Golden" },
  { name: "telemarketing.follow_up",     module: "telemarketing", label: "Sub-menu: Follow Up Leads RKR / Golden" },
  { name: "telemarketing.kalender",      module: "telemarketing", label: "Sub-menu: Kalender Survey RKR / Golden / After Pengerjaan Golden" },
  { name: "telemarketing.laporan_harian",module: "telemarketing", label: "Sub-menu: Laporan Harian Sales Admin Product dan Mitra" },
  // RubahrumahxGolden
  { name: "golden.view",         module: "golden", label: "Lihat menu RubahrumahxGolden" },
  { name: "golden.create",       module: "golden", label: "Tambah data Golden" },
  { name: "golden.edit",         module: "golden", label: "Edit data Golden" },
  { name: "golden.delete",       module: "golden", label: "Hapus data Golden" },
  { name: "golden.meta_ads",     module: "golden", label: "Sub-menu: Meta Ads Golden" },
  { name: "golden.dashboard_ads",module: "golden", label: "Sub-menu: Dashboard Ads Golden" },
  { name: "golden.follow_up",    module: "golden", label: "Sub-menu: Follow Up Leads Golden" },
  { name: "golden.kanban_admin", module: "golden", label: "Sub-menu: Kanban Admin Golden" },
  { name: "golden.kalender",       module: "golden", label: "Sub-menu: Kalender Survey Golden" },
  { name: "golden.kalender_after", module: "golden", label: "Sub-menu: Kalender After Pengerjaan Golden" },
  { name: "golden.kanban_sales",   module: "golden", label: "Sub-menu: Kanban Sales Golden" },
  { name: "golden.ar",             module: "golden", label: "Sub-menu: AR Golden" },
  { name: "finance.ar",            module: "finance", label: "Sub-menu: AR Tagihan Outstanding" },
  { name: "tutorial.sop",          module: "tutorial", label: "Sub-menu: SOP" },
  { name: "penawaran.view",        module: "penawaran", label: "Lihat menu Penawaran" },
  { name: "penawaran.desain",      module: "penawaran", label: "Sub-menu: Penawaran Desain" },
  { name: "penawaran.rkr",         module: "penawaran", label: "Sub-menu: Penawaran RKR" },
  { name: "penawaran.golden",      module: "penawaran", label: "Sub-menu: Penawaran Golden" },
  { name: "penawaran.filter_air",  module: "penawaran", label: "Sub-menu: Penawaran Filter Air" },
];

// GET /permissions — list all, grouped by module
router.get("/permissions", requireRole("Super Admin"), async (_req: Request, res: Response) => {
  // Auto-upsert permission yang dideklarasikan tapi mungkin belum ada di DB
  for (const p of ENSURED_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: { module: p.module, label: p.label },
      create: p,
    });
  }
  const permissions = await prisma.permission.findMany({
    orderBy: [{ module: "asc" }, { name: "asc" }],
  });
  const grouped: Record<string, { id: bigint; name: string; label: string }[]> = {};
  for (const p of permissions) {
    if (!grouped[p.module]) grouped[p.module] = [];
    grouped[p.module].push({ id: p.id, name: p.name, label: p.label });
  }
  return res.json(grouped);
});

// ── Fontee Settings ──────────────────────────────────────────────────────────────

// GET /settings/fontee
router.get("/settings/fontee", requireRole("Super Admin"), async (_req: Request, res: Response) => {
  const setting = await prisma.appSetting.findUnique({ where: { key: "fontee_config" } });
  const cfg = (setting?.value as Record<string, string> | null) ?? {};
  return res.json({
    api_key: cfg.api_key ?? "",
    base_url: cfg.base_url ?? "",
    sender_number: cfg.sender_number ?? "",
  });
});

// PUT /settings/fontee
router.put("/settings/fontee", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const { api_key, base_url, sender_number } = req.body;
  const value = { api_key: api_key ?? "", base_url: base_url ?? "", sender_number: sender_number ?? "" };
  await prisma.appSetting.upsert({
    where: { key: "fontee_config" },
    update: { value },
    create: { key: "fontee_config", value },
  });
  return res.json({ message: "Fontee config disimpan" });
});

// POST /fontee/send-test — kirim pesan test lewat provider WA aktif (Evolution)
router.post("/fontee/send-test", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const { target_number, message } = req.body;
  if (!target_number || !message) {
    return res.status(400).json({ detail: "target_number dan message wajib diisi" });
  }
  try {
    await sendFonnte(String(target_number), String(message));
    return res.json({ message: "Pesan terkirim" });
  } catch (err: any) {
    return res.status(502).json({ detail: "Gagal kirim pesan: " + (err?.message ?? "Unknown error") });
  }
});

const PRIORITY_EMOJI: Record<string, string> = {
  rendah: "🟢",
  sedang: "🟡",
  tinggi: "🔴",
};

function ruleDict(r: any) {
  const tt = r.trigger_type ?? "deadline";
  const priority: string = r.priority_manual ?? "sedang";
  return {
    id: r.id,
    feature: r.feature,
    label: r.label,
    days_before: r.days_before,
    send_time: r.send_time ?? "08:00",
    is_active: r.is_active,
    role_ids: r.role_ids,
    message_template: r.message_template ?? null,
    trigger_type: tt,
    priority,
  };
}

// GET /settings/reminder-rules
router.get("/settings/reminder-rules", requireRole("Super Admin"), async (_req: Request, res: Response) => {
  const rules = await prisma.fonteeReminderRule.findMany({ orderBy: { id: "asc" } });
  const allRoles = await prisma.role.findMany({ orderBy: { name: "asc" } });
  return res.json({
    rules: rules.map(ruleDict),
    roles: allRoles.map((r) => ({ id: r.id, name: r.name })),
  });
});

// PUT /settings/reminder-rules/:id
router.put("/settings/reminder-rules/:id", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { days_before, is_active, role_ids, send_time, message_template, priority } = req.body;
  const rule = await prisma.fonteeReminderRule.findUnique({ where: { id } });
  if (!rule) return res.status(404).json({ detail: "Rule tidak ditemukan" });
  const updated = await prisma.fonteeReminderRule.update({
    where: { id },
    data: {
      days_before: days_before !== undefined ? Number(days_before) : undefined,
      send_time: send_time !== undefined ? String(send_time) : undefined,
      is_active: is_active !== undefined ? Boolean(is_active) : undefined,
      role_ids: Array.isArray(role_ids) ? role_ids.map(BigInt) : undefined,
      message_template: message_template !== undefined ? (message_template === "" ? null : String(message_template)) : undefined,
      priority_manual: priority && ["rendah", "sedang", "tinggi"].includes(priority) ? String(priority) : undefined,
    } as any,
  });
  return res.json(ruleDict(updated));
});

// POST /settings/reminder-rules/:id/test — kirim test WA ke semua user dengan role yang dipilih rule
router.post("/settings/reminder-rules/:id/test", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const rule = await prisma.fonteeReminderRule.findUnique({ where: { id } });
  if (!rule) return res.status(404).json({ detail: "Rule tidak ditemukan" });

  // Find users with matching roles
  const roleIds = (rule.role_ids as bigint[]) ?? [];
  if (roleIds.length === 0) return res.status(400).json({ detail: "Rule ini belum memiliki role tujuan" });

  const usersWithRole = await prisma.user.findMany({
    where: {
      roles: { some: { role_id: { in: roleIds } } },
      whatsapp_number: { not: null },
    },
    select: { id: true, name: true, whatsapp_number: true },
  });

  if (usersWithRole.length === 0) {
    return res.status(400).json({ detail: "Tidak ada user dengan role tersebut yang memiliki nomor WhatsApp" });
  }

  const priority: string = (rule as any).priority_manual ?? "sedang";
  const priorityEmoji = PRIORITY_EMOJI[priority] ?? "🟡";
  const priorityLabel = `${priorityEmoji} *Prioritas: ${priority.toUpperCase()}*`;
  const customTpl = (rule as any).message_template;
  const message = customTpl
    ? `*[TEST]* ${priorityLabel}\n${customTpl.replace(/\{[^}]+\}/g, (m: string) => `_(${m})_`)}`
    : `*[TEST] Reminder: ${rule.label}*\n${priorityLabel}\nIni adalah test pengiriman reminder otomatis dari sistem RubahRumah.`;
  let sent = 0;
  const errors: string[] = [];

  for (const u of usersWithRole) {
    try {
      await sendFonnte(u.whatsapp_number!, message);
      sent++;
    } catch (err: any) {
      errors.push(`${u.name}: ${err?.message ?? "error"}`);
    }
  }

  return res.json({
    sent,
    total_targets: usersWithRole.length,
    targets: usersWithRole.map((u) => ({ name: u.name, wa: u.whatsapp_number })),
    errors: errors.length > 0 ? errors : undefined,
    message: `Test terkirim ke ${sent} dari ${usersWithRole.length} user`,
  });
});

// ── WhatsApp (Evolution API) — tab "GET QR Whatsapp" di Pengaturan ─────────────

// GET /settings/whatsapp/status — status koneksi instance + nomor tersambung
router.get("/settings/whatsapp/status", requireRole("Super Admin"), async (_req: Request, res: Response) => {
  const cfg = evolutionConfigured();
  if (!cfg.ok) return res.json({ configured: false, detail: cfg.detail, state: null, number: null });
  try {
    const { state } = await getConnectionState();
    const number = state === "open" ? await getConnectedNumber() : null;
    return res.json({ configured: true, state, number, instance: process.env.EVOLUTION_INSTANCE ?? null });
  } catch (err: any) {
    return res.status(502).json({ detail: `Gagal hubungi Evolution API: ${describeEvolutionError(err)}` });
  }
});

// POST /settings/whatsapp/connect — siapkan instance + kembalikan KODE PAIRING
// untuk diketik di HP (WhatsApp → Perangkat Tertaut → Tautkan dengan nomor telepon).
router.post("/settings/whatsapp/connect", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const cfg = evolutionConfigured();
  if (!cfg.ok) return res.status(400).json({ detail: cfg.detail });
  const number = typeof req.body?.number === "string" ? req.body.number.replace(/\D/g, "") : undefined;
  // mode "code" = pairing code (butuh nomor), "qr" = QR untuk di-scan.
  // Evolution/Baileys menentukannya dari ada/tidaknya field `number`.
  const mode = req.body?.mode === "code" ? "code" : "qr";
  if (mode === "code" && !number) return res.status(400).json({ detail: "Nomor pengirim wajib diisi untuk kode pairing" });
  const numberForMode = mode === "code" ? number : undefined;

  try {
    let { state } = await getConnectionState();

    if (state === "open") {
      const connected = await getConnectedNumber();
      ensureWebhook().catch(() => {}); // tidak ditunggu — jangan menahan respons
      return res.json({ state: "open", number: connected, pairing_code: null, qr_base64: null, message: "WhatsApp sudah tersambung" });
    }

    // Instance belum ada → buat. Ini bagian paling lambat (inisialisasi socket
    // WhatsApp), jadi kegagalan/timeout-nya TIDAK dianggap fatal: instance tetap
    // terbentuk di latar belakang dan artefaknya bisa diambil pada klik berikutnya.
    let resetWarning: string | undefined;
    if (mode === "code" && state !== null) {
      try {
        await deleteInstance();
        state = null;
      } catch (err: any) {
        resetWarning = describeEvolutionError(err);
      }
    }

    if (state === null) {
      try {
        await createInstance(numberForMode);
      } catch (err: any) {
        return res.json({
          state: "preparing",
          pairing_code: null,
          qr_base64: null,
          message: `Sedang menyiapkan koneksi WhatsApp. Tunggu ~10 detik lalu klik lagi. (${describeEvolutionError(err)})`,
        });
      }
    }

    ensureWebhook().catch(() => {}); // best-effort, tidak ditunggu

    let pairing_code: string | null = null;
    let qr_base64: string | null = null;
    try {
      const connectedArtifact = await connectInstance(numberForMode);
      pairing_code = connectedArtifact.pairing_code;
      qr_base64 = connectedArtifact.qr_base64;
    } catch (err: any) {
      return res.json({
        state: "preparing",
        pairing_code: null,
        qr_base64: null,
        message: `Evolution belum siap membuat koneksi. Tunggu beberapa detik lalu klik lagi. (${describeEvolutionError(err)})`,
      });
    }
    const hasConnectArtifact = !!pairing_code || !!qr_base64;
    if (!hasConnectArtifact) {
      return res.json({
        state: "preparing",
        pairing_code,
        qr_base64,
        message: resetWarning
          ? `Belum siap. Reset instance gagal, tapi koneksi tetap dicoba. (${resetWarning})`
          : "Belum siap. Tunggu beberapa detik lalu klik lagi.",
      });
    }
    const fallbackMessage =
      mode === "code" && !pairing_code && qr_base64
        ? "Evolution API tidak mengirim kode pairing untuk versi ini. QR tersedia, silakan scan QR."
        : undefined;
    return res.json({ state: "connecting", pairing_code, qr_base64, number: number ?? null, mode, message: fallbackMessage ?? resetWarning });
  } catch (err: any) {
    return res.status(502).json({ detail: `Gagal hubungi Evolution API: ${describeEvolutionError(err)}` });
  }
});

// POST /settings/whatsapp/reset — hapus instance agar bisa mulai dari nol
// (dipakai saat sesi nyangkut atau ingin berganti metode QR <-> kode pairing).
router.post("/settings/whatsapp/reset", requireRole("Super Admin"), async (_req: Request, res: Response) => {
  const cfg = evolutionConfigured();
  if (!cfg.ok) return res.status(400).json({ detail: cfg.detail });
  try {
    await deleteInstance();
    return res.json({ message: "Koneksi direset. Silakan buat QR / kode pairing baru." });
  } catch (err: any) {
    return res.status(502).json({ detail: `Gagal reset: ${describeEvolutionError(err)}` });
  }
});

// POST /settings/whatsapp/logout — putuskan sesi agar bisa scan ulang nomor lain
router.post("/settings/whatsapp/logout", requireRole("Super Admin"), async (_req: Request, res: Response) => {
  const cfg = evolutionConfigured();
  if (!cfg.ok) return res.status(400).json({ detail: cfg.detail });
  try {
    await logoutInstance();
    return res.json({ message: "Sesi WhatsApp diputuskan" });
  } catch (err: any) {
    return res.status(502).json({ detail: `Gagal logout: ${describeEvolutionError(err)}` });
  }
});

export default router;
