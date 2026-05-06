import { NextFunction, Response } from "express";
import prisma from "../prisma";
import { AuthRequest } from "../middleware/auth";
import { getPagination, paged } from "../lib/pagination";

export async function listBatches(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = getPagination(req);
    const { status, search } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (search) where.OR = [
      { batchNumber: { contains: String(search), mode: "insensitive" } },
      { productName: { contains: String(search), mode: "insensitive" } },
    ];
    const [total, data] = await Promise.all([
      prisma.batch.count({ where }),
      prisma.batch.findMany({
        where,
        include: { rawMaterials: true, _count: { select: { inspections: true, ncrs: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
    return res.json(paged(data, total, page, limit));
  } catch (err) {
    return next(err);
  }
}

export async function createBatch(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { batchNumber, productName, productCode, quantity, unit, mfgDate, expDate, status, rawMaterials = [] } = req.body;
    const batch = await prisma.batch.create({
      data: {
        batchNumber,
        productName,
        productCode: productCode || null,
        quantity: Number(quantity),
        unit,
        mfgDate: new Date(mfgDate),
        expDate: expDate ? new Date(expDate) : null,
        status: status || "ACTIVE",
        rawMaterials: {
          create: (rawMaterials as any[]).map((m) => ({
            materialName: m.materialName,
            supplierName: m.supplierName || null,
            lotNumber: m.lotNumber || null,
            quantity: Number(m.quantity),
            unit: m.unit,
          })),
        },
      },
      include: { rawMaterials: true },
    });
    return res.status(201).json(batch);
  } catch (err) {
    return next(err);
  }
}

export async function getBatch(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: req.params.id },
      include: {
        rawMaterials: true,
        inspections: { include: { officer: true, parameters: true }, orderBy: { createdAt: "desc" } },
        ncrs: { include: { reportedBy: true }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!batch) return res.status(404).json({ error: "Batch tidak ditemukan" });
    return res.json(batch);
  } catch (err) {
    return next(err);
  }
}

export async function updateBatchStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const batch = await prisma.batch.update({ where: { id: req.params.id }, data: { status: req.body.status } });
    return res.json(batch);
  } catch (err) {
    return next(err);
  }
}
