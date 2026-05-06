import { Request } from "express";

export function getPagination(req: Request, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(String(req.query.limit || defaultLimit), 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function paged<T>(data: T[], total: number, page: number, limit: number) {
  return { data, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
