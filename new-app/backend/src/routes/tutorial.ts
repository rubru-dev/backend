import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { requirePermission, requireRole } from "../middleware/requireRole";
import { config } from "../config";

const router = Router();

// ── Save base64 image to disk, return /storage/sop/<filename> path ────────────
function saveSopImage(dataUrl: string, mime: string, originalName: string): string {
  const ext = mime === "image/png" ? "png" : "jpg";
  const safeName = (originalName || "sop").replace(/[^a-zA-Z0-9_.-]/g, "_").replace(/\.[^.]+$/, "");
  const dir = path.resolve(config.storagePath, "sop");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const base64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}.${ext}`;
  fs.writeFileSync(path.join(dir, filename), Buffer.from(base64, "base64"));
  return `/storage/sop/${filename}`;
}

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
  images?: unknown;
  created_by: bigint | null;
  created_at: Date;
  updated_at: Date;
}) {
  const roles = normalizeRoles(sop.roles, sop.role);
  const images: { path: string; name: string; mime: string }[] = Array.isArray(sop.images)
    ? (sop.images as any[]).filter((img) => img && img.path)
    : [];
  return {
    id: Number(sop.id),
    nama_sop: sop.nama_sop,
    role: sop.role,
    roles,
    tanggal: fmtDate(sop.tanggal),
    deskripsi: sop.deskripsi,
    // Backward compat: expose first image as image_data for old clients
    image_data: images.length > 0 ? images[0].path : (sop.image_data ?? null),
    image_mime: images.length > 0 ? images[0].mime : (sop.image_mime ?? null),
    image_name: images.length > 0 ? images[0].name : (sop.image_name ?? null),
    images,
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

  // Support new multi-image format: images = [{data, mime, name}, ...]
  const imagesInput: { data: string; mime: string; name: string }[] = Array.isArray(req.body.images)
    ? req.body.images
    : image_data ? [{ data: image_data, mime: image_mime ?? "", name: image_name ?? "sop" }] : [];

  if (!nama_sop?.trim() || !tanggal || roles.length === 0 || (!cleanDescription && imagesInput.length === 0)) {
    return res.status(400).json({ detail: "Nama SOP, role, tanggal, dan deskripsi atau gambar wajib diisi" });
  }
  for (const img of imagesInput) {
    if (!validateImage(img.data, img.mime)) {
      return res.status(400).json({ detail: "Gambar SOP harus PNG, JPG, atau JPEG" });
    }
  }

  // Save each image to disk
  const savedImages = imagesInput.map((img) => ({
    path: saveSopImage(img.data, img.mime, img.name),
    mime: img.mime,
    name: img.name,
  }));

  const sop = await prisma.sop.create({
    data: {
      nama_sop: nama_sop.trim(),
      role: roles.length ? roles.join(", ") : null,
      roles,
      tanggal: new Date(tanggal),
      deskripsi: cleanDescription,
      image_data: savedImages[0]?.path ?? null,
      image_mime: savedImages[0]?.mime ?? null,
      image_name: savedImages[0]?.name ?? null,
      images: savedImages.length > 0 ? savedImages : undefined,
      created_by: req.user!.id,
    } as any,
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

  // Handle images update (new multi-image format or legacy single image)
  if (req.body.images !== undefined || image_data !== undefined) {
    const imagesInput: { data: string; mime: string; name: string }[] = Array.isArray(req.body.images)
      ? req.body.images
      : image_data ? [{ data: image_data, mime: image_mime ?? "", name: image_name ?? "sop" }] : [];

    // Validate only new images (base64), skip kept images (paths)
    for (const img of imagesInput) {
      if (img.data?.startsWith("data:") && !validateImage(img.data, img.mime)) {
        return res.status(400).json({ detail: "Gambar SOP harus PNG, JPG, atau JPEG" });
      }
    }

    // Collect old image paths from DB
    const existing = sop as any;
    const oldImages: { path: string }[] = Array.isArray(existing.images) ? existing.images : [];
    if (oldImages.length === 0 && existing.image_data?.startsWith("/storage/sop/")) {
      oldImages.push({ path: existing.image_data });
    }

    // Kept paths = images from input that already exist on disk (not base64)
    const keptPaths = new Set(
      imagesInput.filter((img) => img.data?.startsWith("/storage/")).map((img) => img.data)
    );

    // Delete old images NOT being kept
    for (const old of oldImages) {
      if (!keptPaths.has(old.path)) {
        const filePath = path.resolve(config.storagePath, old.path.replace(/^\/storage\//, ""));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }

    // Build final images list: kept + newly saved
    const finalImages: { path: string; mime: string; name: string }[] = [];
    for (const img of imagesInput) {
      if (img.data?.startsWith("/storage/")) {
        // Kept image — find original metadata
        const orig = oldImages.find((o) => o.path === img.data) as any;
        finalImages.push({ path: img.data, mime: img.mime || orig?.mime || "image/jpeg", name: img.name });
      } else if (img.data?.startsWith("data:")) {
        // New image — save to disk
        finalImages.push({ path: saveSopImage(img.data, img.mime, img.name), mime: img.mime, name: img.name });
      }
    }

    updates.images = finalImages.length > 0 ? finalImages : [];
    updates.image_data = finalImages[0]?.path ?? null;
    updates.image_mime = finalImages[0]?.mime ?? null;
    updates.image_name = finalImages[0]?.name ?? null;
  }

  const updated = await prisma.sop.update({ where: { id }, data: updates as any });
  return res.json(sopDict(updated));
});

router.delete("/sop/:id", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const sop = await prisma.sop.findUnique({ where: { id } }) as any;
  if (!sop) return res.status(404).json({ detail: "SOP tidak ditemukan" });

  // Delete image files from disk
  const oldImages: { path: string }[] = Array.isArray(sop.images) ? sop.images : [];
  if (oldImages.length === 0 && sop.image_data?.startsWith("/storage/sop/")) {
    oldImages.push({ path: sop.image_data });
  }
  for (const old of oldImages) {
    const filePath = path.resolve(config.storagePath, old.path.replace(/^\/storage\//, ""));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  await prisma.sop.delete({ where: { id } });
  return res.json({ message: "SOP dihapus" });
});

export default router;
