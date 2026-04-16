import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/requireRole";
import { hashPassword } from "../lib/security";

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

// GET /users
router.get("/users", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string) || 20, 100);
  const search = req.query.search as string | undefined;

  const where = search
    ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] }
    : {};

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
        create: (role_ids as (number | string)[]).map((rid) => ({ role: { connect: { id: BigInt(rid) } } })),
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
    await prisma.userRole.deleteMany({ where: { user_id: userId } });
    await prisma.userRole.createMany({
      data: (role_ids as (number | string)[]).map((rid) => ({ user_id: userId, role_id: BigInt(rid) })),
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
  const isSuperAdmin = user.roles.some((ur) => ur.role.name === "Super Admin");
  if (isSuperAdmin) {
    return res.status(400).json({ detail: "User dengan role Super Admin tidak bisa dihapus" });
  }
  await prisma.user.delete({ where: { id: userId } });
  return res.json({ message: "User berhasil dihapus" });
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
  // RubahrumahxGolden
  { name: "golden.view",         module: "golden", label: "Lihat menu RubahrumahxGolden" },
  { name: "golden.create",       module: "golden", label: "Tambah data Golden" },
  { name: "golden.edit",         module: "golden", label: "Edit data Golden" },
  { name: "golden.delete",       module: "golden", label: "Hapus data Golden" },
  { name: "golden.meta_ads",     module: "golden", label: "Sub-menu: Meta Ads Golden" },
  { name: "golden.dashboard_ads",module: "golden", label: "Sub-menu: Dashboard Ads Golden" },
  { name: "golden.follow_up",    module: "golden", label: "Sub-menu: Follow Up Leads Golden" },
  { name: "golden.kanban_admin", module: "golden", label: "Sub-menu: Kanban Admin Golden" },
  { name: "golden.kalender",     module: "golden", label: "Sub-menu: Kalender Survey Golden" },
  { name: "golden.kanban_sales", module: "golden", label: "Sub-menu: Kanban Sales Golden" },
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

// POST /fontee/send-test
router.post("/fontee/send-test", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const { target_number, message } = req.body;
  if (!target_number || !message) {
    return res.status(400).json({ detail: "target_number dan message wajib diisi" });
  }
  const setting = await prisma.appSetting.findUnique({ where: { key: "fontee_config" } });
  const cfg = (setting?.value as Record<string, string> | null) ?? {};
  if (!cfg.api_key || !cfg.base_url || !cfg.sender_number) {
    return res.status(400).json({ detail: "Fontee belum dikonfigurasi. Isi API key, base URL, dan sender number terlebih dahulu." });
  }
  try {
    // Fonnte API format: POST to base_url, Authorization: token (no Bearer), body: { target, message }
    const response = await fetch(cfg.base_url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": cfg.api_key },
      body: JSON.stringify({ target: target_number, message, countryCode: "62" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(502).json({ detail: "Fonnte API error", fonnte_response: data });
    }
    return res.json({ message: "Pesan terkirim", fonnte_response: data });
  } catch (err: any) {
    return res.status(502).json({ detail: "Gagal menghubungi Fonnte API: " + (err?.message ?? "Unknown error") });
  }
});

// GET /settings/reminder-rules
router.get("/settings/reminder-rules", requireRole("Super Admin"), async (_req: Request, res: Response) => {
  const rules = await prisma.fonteeReminderRule.findMany({ orderBy: { id: "asc" } });
  const allRoles = await prisma.role.findMany({ orderBy: { name: "asc" } });
  return res.json({
    rules: rules.map((r) => ({
      id: r.id,
      feature: r.feature,
      label: r.label,
      days_before: r.days_before,
      send_time: (r as any).send_time ?? "08:00",
      is_active: r.is_active,
      role_ids: r.role_ids,
    })),
    roles: allRoles.map((r) => ({ id: r.id, name: r.name })),
  });
});

// PUT /settings/reminder-rules/:id
router.put("/settings/reminder-rules/:id", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { days_before, is_active, role_ids, send_time } = req.body;
  const rule = await prisma.fonteeReminderRule.findUnique({ where: { id } });
  if (!rule) return res.status(404).json({ detail: "Rule tidak ditemukan" });
  const updated = await prisma.fonteeReminderRule.update({
    where: { id },
    data: {
      days_before: days_before !== undefined ? Number(days_before) : undefined,
      send_time: send_time !== undefined ? String(send_time) : undefined,
      is_active: is_active !== undefined ? Boolean(is_active) : undefined,
      role_ids: Array.isArray(role_ids) ? role_ids.map(BigInt) : undefined,
    } as any,
  });
  return res.json({
    id: updated.id,
    feature: updated.feature,
    label: updated.label,
    days_before: updated.days_before,
    send_time: (updated as any).send_time ?? "08:00",
    is_active: updated.is_active,
    role_ids: updated.role_ids,
  });
});

// POST /settings/reminder-rules/:id/test — kirim test WA ke semua user dengan role yang dipilih rule
router.post("/settings/reminder-rules/:id/test", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const rule = await prisma.fonteeReminderRule.findUnique({ where: { id } });
  if (!rule) return res.status(404).json({ detail: "Rule tidak ditemukan" });

  const setting = await prisma.appSetting.findUnique({ where: { key: "fontee_config" } });
  const cfg = (setting?.value as Record<string, string> | null) ?? {};
  if (!cfg.api_key || !cfg.base_url) {
    return res.status(400).json({ detail: "Fontee belum dikonfigurasi" });
  }

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

  const message = `*[TEST] Reminder: ${rule.label}*\nIni adalah test pengiriman reminder otomatis dari sistem RubahRumah.`;
  let sent = 0;
  const errors: string[] = [];

  for (const u of usersWithRole) {
    try {
      const response = await fetch(cfg.base_url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": cfg.api_key },
        body: JSON.stringify({ target: u.whatsapp_number, message, countryCode: "62" }),
      });
      if (response.ok) sent++;
      else errors.push(`${u.name}: API error`);
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

export default router;
