import { NextFunction, Response } from "express";
import { InspectionStatus, ParameterStatus } from "@prisma/client";
import prisma from "../prisma";
import { AuthRequest } from "../middleware/auth";
import { getPagination, paged } from "../lib/pagination";

function parameterStatus(p: any): ParameterStatus {
  if (p.result !== undefined && p.result !== null && p.result !== "") {
    const result = Number(p.result);
    if (p.standardMin != null && result < Number(p.standardMin)) return "FAIL";
    if (p.standardMax != null && result > Number(p.standardMax)) return "FAIL";
    return "PASS";
  }
  if (p.resultText) return p.status === "FAIL" ? "FAIL" : "PASS";
  return "PENDING";
}

function inspectionStatus(statuses: ParameterStatus[]): InspectionStatus {
  if (statuses.length === 0 || statuses.some((s) => s === "PENDING")) return "ON_HOLD";
  if (statuses.some((s) => s === "FAIL")) return "FAIL";
  return "PASS";
}

export async function listInspections(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = getPagination(req);
    const { type, status, search } = req.query;
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) where.OR = [
      { productName: { contains: String(search), mode: "insensitive" } },
      { supplierName: { contains: String(search), mode: "insensitive" } },
    ];
    const [total, data] = await Promise.all([
      prisma.inspection.count({ where }),
      prisma.inspection.findMany({
        where,
        include: { officer: { select: { id: true, name: true, role: true } }, parameters: true, batch: true },
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

export async function createInspection(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { type, productName, supplierName, batchId, notes, parameters = [] } = req.body;
    const prepared = (parameters as any[]).map((p) => ({
      name: p.name,
      unit: p.unit || null,
      standardMin: p.standardMin === "" || p.standardMin == null ? null : Number(p.standardMin),
      standardMax: p.standardMax === "" || p.standardMax == null ? null : Number(p.standardMax),
      result: p.result === "" || p.result == null ? null : Number(p.result),
      resultText: p.resultText || null,
      status: parameterStatus(p),
    }));
    const status = inspectionStatus(prepared.map((p) => p.status));
    const inspection = await prisma.inspection.create({
      data: {
        type,
        productName,
        supplierName: supplierName || null,
        batchId: batchId || null,
        notes: notes || null,
        status,
        officerId: req.user!.id,
        parameters: { create: prepared },
      },
      include: { officer: true, parameters: true, batch: true },
    });
    return res.status(201).json(inspection);
  } catch (err) {
    return next(err);
  }
}

export async function getInspection(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const item = await prisma.inspection.findUnique({
      where: { id: req.params.id },
      include: { officer: true, parameters: true, batch: true, ncrs: true },
    });
    if (!item) return res.status(404).json({ error: "Inspeksi tidak ditemukan" });
    return res.json(item);
  } catch (err) {
    return next(err);
  }
}

export async function updateInspection(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, notes } = req.body;
    const item = await prisma.inspection.update({
      where: { id: req.params.id },
      data: { status, notes },
      include: { parameters: true, officer: true, batch: true },
    });
    return res.json(item);
  } catch (err) {
    return next(err);
  }
}

export async function deleteInspection(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const hasNcr = await prisma.nCR.count({ where: { inspectionId: req.params.id } });
    if (hasNcr > 0) return res.status(409).json({ error: "Inspeksi sudah memiliki NCR dan tidak bisa dihapus" });
    await prisma.inspection.delete({ where: { id: req.params.id } });
    return res.json({ message: "Inspeksi dihapus" });
  } catch (err) {
    return next(err);
  }
}
