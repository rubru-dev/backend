// ─── Common API Types ────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiError {
  detail: string;
  errors?: Record<string, string[]>;
}

// ─── Enums (mirror Prisma enums) ─────────────────────────────────────────────

export type JenisJasa = "BANGUN_RUMAH" | "RENOVASI" | "DESIGN" | "INTERIOR";

export type ProjectStatus = "BERJALAN" | "SELESAI" | "DITUNDA";

export type AdminRole = "SUPER_ADMIN" | "EDITOR";

export type RkJenisLayanan = "DESIGN_INTERIOR" | "FURNITURE" | "KEDUANYA";

// ─── Media ───────────────────────────────────────────────────────────────────

export interface Media {
  id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  alt_text: string | null;
  created_at: string;
}
