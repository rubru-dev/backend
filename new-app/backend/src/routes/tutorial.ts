import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requirePermission, requireRole } from "../middleware/requireRole";

const router = Router();

function fmtDate(d: Date | null | undefined) {
  return d ? d.toISOString().split("T")[0] : null;
}

function normalizeRoles(value: unknown, legacyRole?: string | null) {
  const fromJson = Array.isArray(value)
    ? value.map((role) => String(role).trim()).filter(Boolean)
    : [];
  if (fromJson.length) return [...new Set(fromJson)];
  if (!legacyRole) return [];
  return legacyRole.split(",").map((role) => role.trim()).filter(Boolean);
}

function parseRoles(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((role) => String(role).trim()).filter(Boolean))];
}

function validateImage(imageData?: string | null, imageMime?: string | null) {
  if (!imageData) return true;
  const mime = imageMime || imageData.match(/^data:([^;]+);base64,/)?.[1] || "";
  return ["image/png", "image/jpeg", "image/jpg"].includes(mime);
}

function canAccessSop(req: Request, sop: { roles?: unknown; role?: string | null }) {
  const userRoles = req.user?.roles.map((r) => r.role.name) ?? [];
  if (userRoles.includes("Super Admin")) return true;
  const sopRoles = normalizeRoles(sop.roles, sop.role);
  if (sopRoles.length === 0) return false;
  return userRoles.some((role) => sopRoles.includes(role));
}

function sopDict(sop: {
  id: bigint;
  nama_sop: string;
  role: string | null;
  roles?: unknown;
  tanggal: Date;
  deskripsi: string;
  image_data?: string | null;
  image_mime?: string | null;
  image_name?: string | null;
  created_by: bigint | null;
  created_at: Date;
  updated_at: Date;
}) {
  const roles = normalizeRoles(sop.roles, sop.role);
  return {
    id: Number(sop.id),
    nama_sop: sop.nama_sop,
    role: sop.role,
    roles,
    tanggal: fmtDate(sop.tanggal),
    deskripsi: sop.deskripsi,
    image_data: sop.image_data ?? null,
    image_mime: sop.image_mime ?? null,
    image_name: sop.image_name ?? null,
    created_by: sop.created_by ? Number(sop.created_by) : null,
    created_at: sop.created_at,
    updated_at: sop.updated_at,
  };
}

router.get("/sop", requirePermission("tutorial", "sop"), async (req: Request, res: Response) => {
  const items = await prisma.sop.findMany({ orderBy: [{ tanggal: "desc" }, { id: "desc" }] });
  return res.json(items.filter((sop) => canAccessSop(req, sop)).map(sopDict));
});

router.get("/sop/:id", requirePermission("tutorial", "sop"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const sop = await prisma.sop.findUnique({ where: { id } });
  if (!sop) return res.status(404).json({ detail: "SOP tidak ditemukan" });
  if (!canAccessSop(req, sop)) return res.status(403).json({ detail: "Role Anda tidak memiliki akses ke SOP ini" });
  return res.json(sopDict(sop));
});

router.post("/sop", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const { nama_sop, tanggal, deskripsi, image_data, image_mime, image_name } = req.body;
  const roles = parseRoles(req.body.roles);
  const cleanDescription = String(deskripsi ?? "").trim();
  if (!nama_sop?.trim() || !tanggal || roles.length === 0 || (!cleanDescription && !image_data)) {
    return res.status(400).json({ detail: "Nama SOP, role, tanggal, dan deskripsi atau gambar wajib diisi" });
  }
  if (!validateImage(image_data, image_mime)) {
    return res.status(400).json({ detail: "Gambar SOP harus PNG, JPG, atau JPEG" });
  }
  const sop = await prisma.sop.create({
    data: {
      nama_sop: nama_sop.trim(),
      role: roles.length ? roles.join(", ") : null,
      roles,
      tanggal: new Date(tanggal),
      deskripsi: cleanDescription,
      image_data: image_data || null,
      image_mime: image_mime || null,
      image_name: image_name || null,
      created_by: req.user!.id,
    },
  });
  return res.status(201).json(sopDict(sop));
});

router.patch("/sop/:id", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const sop = await prisma.sop.findUnique({ where: { id } });
  if (!sop) return res.status(404).json({ detail: "SOP tidak ditemukan" });

  const { nama_sop, tanggal, deskripsi, image_data, image_mime, image_name } = req.body;
  const updates: Record<string, unknown> = {};
  if (nama_sop !== undefined) updates.nama_sop = String(nama_sop).trim();
  if (req.body.roles !== undefined) {
    const roles = parseRoles(req.body.roles);
    if (roles.length === 0) return res.status(400).json({ detail: "Minimal pilih satu role SOP" });
    updates.roles = roles;
    updates.role = roles.length ? roles.join(", ") : null;
  }
  if (tanggal !== undefined) updates.tanggal = new Date(tanggal);
  if (deskripsi !== undefined) updates.deskripsi = String(deskripsi).trim();
  if (image_data !== undefined || image_mime !== undefined) {
    if (!validateImage(image_data, image_mime)) {
      return res.status(400).json({ detail: "Gambar SOP harus PNG, JPG, atau JPEG" });
    }
    updates.image_data = image_data || null;
    updates.image_mime = image_mime || null;
    updates.image_name = image_name || null;
  }

  const updated = await prisma.sop.update({ where: { id }, data: updates });
  return res.json(sopDict(updated));
});

router.delete("/sop/:id", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const sop = await prisma.sop.findUnique({ where: { id } });
  if (!sop) return res.status(404).json({ detail: "SOP tidak ditemukan" });
  await prisma.sop.delete({ where: { id } });
  return res.json({ message: "SOP dihapus" });
});

export default router;
