import { NextFunction, Response } from "express";
import prisma from "../prisma";
import { AuthRequest } from "../middleware/auth";

export async function overview(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const [totalInspections, passCount, ncrOpen, batchActive, recentNCRs, recentInspections] = await Promise.all([
      prisma.inspection.count({ where: { createdAt: { gte: since } } }),
      prisma.inspection.count({ where: { createdAt: { gte: since }, status: "PASS" } }),
      prisma.nCR.count({ where: { status: "OPEN" } }),
      prisma.batch.count({ where: { status: { in: ["ACTIVE", "QUARANTINE"] } } }),
      prisma.nCR.findMany({ take: 3, orderBy: [{ status: "asc" }, { createdAt: "desc" }], include: { reportedBy: true } }),
      prisma.inspection.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { officer: true } }),
    ]);
    const passRate = totalInspections > 0 ? Math.round((passCount / totalInspections) * 100) : 0;
    return res.json({ totalInspections, passRate, ncrOpen, batchActive, recentNCRs, recentInspections });
  } catch (err) {
    return next(err);
  }
}

export async function passRate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days || 30)));
    const since = new Date();
    since.setDate(since.getDate() - days);
    const grouped = await prisma.inspection.groupBy({
      by: ["productName", "status"],
      where: { createdAt: { gte: since } },
      _count: true,
    });
    const map = new Map<string, { product: string; total: number; pass: number; fail: number; onHold: number }>();
    grouped.forEach((g) => {
      const row = map.get(g.productName) || { product: g.productName, total: 0, pass: 0, fail: 0, onHold: 0 };
      row.total += g._count;
      if (g.status === "PASS") row.pass += g._count;
      if (g.status === "FAIL") row.fail += g._count;
      if (g.status === "ON_HOLD" || g.status === "PENDING") row.onHold += g._count;
      map.set(g.productName, row);
    });
    return res.json([...map.values()].map((r) => ({ ...r, passRate: r.total ? Math.round((r.pass / r.total) * 100) : 0 })));
  } catch (err) {
    return next(err);
  }
}

export async function defectTrend(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const weeks = Math.min(52, Math.max(1, Number(req.query.weeks || 8)));
    const rows = await prisma.$queryRaw<Array<{ week: Date; fail_count: bigint; total_count: bigint }>>`
      SELECT date_trunc('week', "createdAt") AS week,
             COUNT(*) FILTER (WHERE status = 'FAIL') AS fail_count,
             COUNT(*) AS total_count
      FROM inspections
      WHERE "createdAt" >= NOW() - (${weeks}::int * INTERVAL '1 week')
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    return res.json(rows.map((r) => ({
      week: r.week,
      failCount: Number(r.fail_count),
      totalCount: Number(r.total_count),
    })));
  } catch (err) {
    return next(err);
  }
}
