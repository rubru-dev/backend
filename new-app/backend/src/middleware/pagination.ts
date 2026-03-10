import { Request } from "express";

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function getPagination(query: Request["query"], defaultLimit = 20, maxLimit = 100): PaginationParams {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const rawLimit = parseInt((query.limit ?? query.per_page) as string) || defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// Returns both legacy shape (items/total/page/per_page) and new meta object for forward compat
export function paginateResponse<T>(data: T[], total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit);
  return {
    items: data,
    total,
    page,
    per_page: limit,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
