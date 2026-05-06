import { NextFunction, Response } from "express";
import { createWorker } from "tesseract.js";
import prisma from "../prisma";
import { AuthRequest } from "../middleware/auth";
import { getPagination, paged } from "../lib/pagination";
import { publicUploadPath } from "../lib/upload";

export async function processOcr(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ error: "File image wajib diupload" });
    const lang = ["ind", "eng", "ind+eng"].includes(String(req.body.lang)) ? String(req.body.lang) : "ind+eng";
    const worker = await createWorker(lang);
    try {
      const result = await worker.recognize(req.file.path);
      return res.json({
        text: result.data.text,
        confidence: result.data.confidence,
        filePath: publicUploadPath(req.file.path),
      });
    } finally {
      await worker.terminate();
    }
  } catch (err) {
    return next(err);
  }
}

export async function createOcr(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, category, originalFile, ocrText, confidence } = req.body;
    const item = await prisma.ocrDocument.create({
      data: {
        title,
        category,
        originalFile,
        ocrText,
        confidence: confidence == null ? null : Number(confidence),
        uploadedById: req.user!.id,
      },
      include: { uploadedBy: true },
    });
    return res.status(201).json(item);
  } catch (err) {
    return next(err);
  }
}

export async function listOcr(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = getPagination(req);
    const where: any = {};
    if (req.query.category) where.category = req.query.category;
    if (req.query.status) where.status = req.query.status;
    const [total, data] = await Promise.all([
      prisma.ocrDocument.count({ where }),
      prisma.ocrDocument.findMany({ where, include: { uploadedBy: true }, orderBy: { createdAt: "desc" }, skip, take: limit }),
    ]);
    return res.json(paged(data, total, page, limit));
  } catch (err) {
    return next(err);
  }
}

export async function getOcr(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const item = await prisma.ocrDocument.findUnique({ where: { id: req.params.id }, include: { uploadedBy: true } });
    if (!item) return res.status(404).json({ error: "Dokumen OCR tidak ditemukan" });
    return res.json(item);
  } catch (err) {
    return next(err);
  }
}

export async function updateOcr(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, ocrText, status, category } = req.body;
    const item = await prisma.ocrDocument.update({
      where: { id: req.params.id },
      data: { title, ocrText, status, category },
    });
    return res.json(item);
  } catch (err) {
    return next(err);
  }
}

export async function deleteOcr(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.ocrDocument.delete({ where: { id: req.params.id } });
    return res.json({ message: "Dokumen OCR dihapus" });
  } catch (err) {
    return next(err);
  }
}
