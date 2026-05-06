import { NextFunction, Response } from "express";
import prisma from "../prisma";
import { AuthRequest } from "../middleware/auth";
import { getPagination, paged } from "../lib/pagination";
import { createWithNcrNumber } from "../lib/generateNcrNumber";

export async function listNcr(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = getPagination(req);
    const { severity, status, search } = req.query;
    const where: any = {};
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (search) where.OR = [
      { ncrNumber: { contains: String(search), mode: "insensitive" } },
      { productName: { contains: String(search), mode: "insensitive" } },
      { description: { contains: String(search), mode: "insensitive" } },
    ];
    const [total, data] = await Promise.all([
      prisma.nCR.count({ where }),
      prisma.nCR.findMany({
        where,
        include: { reportedBy: true, capas: true, batch: true },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);
    return res.json(paged(data, total, page, limit));
  } catch (err) {
    return next(err);
  }
}

export async function createNcr(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { productName, batchId, inspectionId, description, severity } = req.body;
    const item = await createWithNcrNumber((ncrNumber) =>
      prisma.nCR.create({
        data: {
          ncrNumber,
          productName,
          batchId: batchId || null,
          inspectionId: inspectionId || null,
          description,
          severity: severity || "MINOR",
          reportedById: req.user!.id,
        },
        include: { reportedBy: true, batch: true, inspection: true, capas: true },
      }),
    );
    return res.status(201).json(item);
  } catch (err) {
    return next(err);
  }
}

export async function getNcr(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const item = await prisma.nCR.findUnique({
      where: { id: req.params.id },
      include: { reportedBy: true, capas: true, batch: true, inspection: true },
    });
    if (!item) return res.status(404).json({ error: "NCR tidak ditemukan" });
    return res.json(item);
  } catch (err) {
    return next(err);
  }
}

export async function updateNcr(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, rootCause, description } = req.body;
    const item = await prisma.nCR.update({
      where: { id: req.params.id },
      data: {
        status,
        rootCause,
        description,
        closedAt: status === "CLOSED" ? new Date() : status ? null : undefined,
      },
      include: { reportedBy: true, capas: true, batch: true, inspection: true },
    });
    return res.json(item);
  } catch (err) {
    return next(err);
  }
}

export async function createCapa(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { type, description, dueDate } = req.body;
    const item = await prisma.cAPA.create({
      data: {
        ncrId: req.params.id,
        type,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });
    return res.status(201).json(item);
  } catch (err) {
    return next(err);
  }
}

export async function updateCapa(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const item = await prisma.cAPA.update({ where: { id: req.params.id }, data: { status: req.body.status } });
    return res.json(item);
  } catch (err) {
    return next(err);
  }
}
