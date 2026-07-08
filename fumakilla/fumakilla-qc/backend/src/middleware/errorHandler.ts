import { NextFunction, Request, Response } from "express";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Ukuran file melebihi batas" });
  }
  if (err?.code === "P2003" || err?.message?.includes("violates RESTRICT setting of foreign key constraint")) {
    return res.status(409).json({ error: "Data tidak bisa dihapus karena masih dipakai oleh data lain yang saling terhubung." });
  }
  return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
}
