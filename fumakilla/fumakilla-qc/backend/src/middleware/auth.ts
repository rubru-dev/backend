import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../prisma";

export type AuthUser = { id: string; name: string; email: string; role: string };

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;

  if (!token) return res.status(401).json({ error: "Token tidak ditemukan" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as { sub?: string };
    if (!decoded.sub) return res.status(401).json({ error: "Token tidak valid" });

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User tidak aktif atau tidak ditemukan" });
    }

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    return next();
  } catch {
    return res.status(401).json({ error: "Token tidak valid" });
  }
}

export async function authenticateFile(req: Request, res: Response, next: NextFunction) {
  const headerToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  const queryToken = typeof req.query.t === "string" ? req.query.t : null;
  const token = headerToken || queryToken;

  if (!token) return res.status(401).end();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as { sub?: string };
    if (!decoded.sub) return res.status(401).end();

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) return res.status(401).end();
    return next();
  } catch {
    return res.status(401).end();
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Akses ditolak" });
    }
    return next();
  };
}
