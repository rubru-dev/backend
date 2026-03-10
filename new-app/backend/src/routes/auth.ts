import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import {
  verifyPassword,
  hashPassword,
  createAccessToken,
  createRefreshToken,
  decodeToken,
} from "../lib/security";

const router = Router();

// POST /login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } },
  });
  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ detail: "Email atau password salah." });
  }
  // Load permissions
  const roleIds = user.roles.map((r) => r.role.id);
  const rolePerms = roleIds.length > 0
    ? await prisma.rolePermission.findMany({
        where: { role_id: { in: roleIds } },
        include: { permission: true },
      })
    : [];
  const permissions = [...new Set(rolePerms.map((rp) => rp.permission.name))];

  const accessToken = createAccessToken(Number(user.id));
  const refreshToken = createRefreshToken(Number(user.id));
  return res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "bearer",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      whatsapp_number: user.whatsapp_number,
      roles: user.roles.map((r) => ({ id: r.role.id, name: r.role.name })),
      permissions,
      created_at: user.created_at,
    },
  });
});

// POST /logout
router.post("/logout", authenticate, (_req: Request, res: Response) => {
  return res.json({ message: "Berhasil logout." });
});

// POST /refresh
router.post("/refresh", async (req: Request, res: Response) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(401).json({ detail: "Refresh token tidak valid atau sudah kedaluwarsa." });
  }
  try {
    const payload = decodeToken(refresh_token);
    if (payload.type !== "refresh") {
      return res.status(401).json({ detail: "Refresh token tidak valid atau sudah kedaluwarsa." });
    }
    const userId = BigInt(payload.sub as string);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(401).json({ detail: "Refresh token tidak valid atau sudah kedaluwarsa." });
    }
    return res.json({ access_token: createAccessToken(Number(user.id)) });
  } catch {
    return res.status(401).json({ detail: "Refresh token tidak valid atau sudah kedaluwarsa." });
  }
});

// GET /me
router.get("/me", authenticate, (req: Request, res: Response) => {
  const u = req.user!;
  return res.json({
    id: u.id,
    name: u.name,
    email: u.email,
    whatsapp_number: u.whatsapp_number,
    roles: u.roles.map((r) => ({ id: r.role.id, name: r.role.name })),
    permissions: [...(req.userPermissions ?? [])],
    created_at: u.created_at,
  });
});

// PATCH /me
router.patch("/me", authenticate, async (req: Request, res: Response) => {
  const { name, whatsapp_number } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (whatsapp_number !== undefined) updates.whatsapp_number = whatsapp_number;
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: updates,
    include: { roles: { include: { role: true } } },
  });
  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    whatsapp_number: user.whatsapp_number,
    roles: user.roles.map((r) => ({ id: r.role.id, name: r.role.name })),
    permissions: [...(req.userPermissions ?? [])],
    created_at: user.created_at,
  });
});

// PATCH /me/password
router.patch("/me/password", authenticate, async (req: Request, res: Response) => {
  const { current_password, new_password } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !verifyPassword(current_password, user.password)) {
    return res.status(400).json({ detail: "Password saat ini tidak sesuai." });
  }
  if (verifyPassword(new_password, user.password)) {
    return res.status(400).json({ detail: "Password baru tidak boleh sama dengan password lama." });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashPassword(new_password) },
  });
  return res.json({ message: "Password berhasil diubah." });
});

export default router;
