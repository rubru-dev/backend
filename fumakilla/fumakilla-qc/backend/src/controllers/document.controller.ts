import { NextFunction, Response } from "express";
import prisma from "../prisma";
import { AuthRequest } from "../middleware/auth";
import { getPagination, paged } from "../lib/pagination";
import { publicUploadPath } from "../lib/upload";

export async function listDocuments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = getPagination(req);
    const where: any = {};
    if (req.query.category) where.category = req.query.category;
    if (req.query.search) where.title = { contains: String(req.query.search), mode: "insensitive" };
    const [total, data] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        include: { author: true, versions: { orderBy: { version: "desc" } } },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
    return res.json(paged(data, total, page, limit));
  } catch (err) {
    return next(err);
  }
}

export async function createDocument(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ error: "File wajib diupload" });
    const { title, category, description, changelog } = req.body;
    const filePath = publicUploadPath(req.file.path);
    const item = await prisma.document.create({
      data: {
        title,
        category,
        description: description || null,
        authorId: req.user!.id,
        versions: { create: { version: 1, filePath, changelog: changelog || null } },
      },
      include: { author: true, versions: true },
    });
    return res.status(201).json(item);
  } catch (err) {
    return next(err);
  }
}

export async function getDocument(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const item = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: { author: true, versions: { orderBy: { version: "desc" } } },
    });
    if (!item) return res.status(404).json({ error: "Dokumen tidak ditemukan" });
    return res.json(item);
  } catch (err) {
    return next(err);
  }
}

export async function createDocumentVersion(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ error: "File wajib diupload" });
    const item = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Dokumen tidak ditemukan" });
    const nextVersion = item.currentVersion + 1;
    await prisma.$transaction([
      prisma.documentVersion.create({
        data: {
          documentId: item.id,
          version: nextVersion,
          filePath: publicUploadPath(req.file.path),
          changelog: req.body.changelog || null,
        },
      }),
      prisma.document.update({ where: { id: item.id }, data: { currentVersion: nextVersion } }),
    ]);
    return res.status(201).json({ message: "Versi dokumen ditambahkan", version: nextVersion });
  } catch (err) {
    return next(err);
  }
}

export async function deleteDocument(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.document.delete({ where: { id: req.params.id } });
    return res.json({ message: "Dokumen dihapus" });
  } catch (err) {
    return next(err);
  }
}
