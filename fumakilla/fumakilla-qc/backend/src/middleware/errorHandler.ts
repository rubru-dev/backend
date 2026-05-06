import { NextFunction, Request, Response } from "express";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Ukuran file melebihi batas" });
  }
  return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
}
