import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../prisma";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;         // primary role (backward compat)
  roles: string[];      // all AppRole names
  permissions: Set<string>;
};

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
      select: {
        id: true, name: true, email: true, role: true, isActive: true,
        userRoles: {
          include: { role: { select: { name: true, permissions: true } } },
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User tidak aktif atau tidak ditemukan" });
    }

    // Build roles list: prefer AppRole assignments, fall back to legacy role string
    let roleNames: string[];
    let permissions: Set<string>;

    if (user.userRoles.length > 0) {
      roleNames = user.userRoles.map((ur) => ur.role.name);
      permissions = new Set(user.userRoles.flatMap((ur) => ur.role.permissions));
    } else {
      // Backward compat: no AppRole assigned yet → use legacy role string
      roleNames = [user.role];
      // Try to load permissions from AppRole with matching name
      const fallbackRole = await prisma.appRole.findUnique({ where: { name: user.role } });
      permissions = new Set(fallbackRole?.permissions ?? []);
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: roleNames[0] ?? user.role,
      roles: roleNames,
      permissions,
    };
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

// Check by role name (works with both legacy string and AppRole names)
export function requireRole(...roleNames: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(403).json({ error: "Akses ditolak" });
    const userRoles = req.user.roles ?? [req.user.role];
    if (!roleNames.some((r) => userRoles.includes(r))) {
      return res.status(403).json({ error: "Akses ditolak" });
    }
    return next();
  };
}

// Check by specific permission string e.g. "agreements.activate"
export function requirePermission(...perms: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(403).json({ error: "Akses ditolak" });
    if (!perms.every((p) => req.user!.permissions.has(p))) {
      return res.status(403).json({ error: "Akses ditolak: tidak ada izin" });
    }
    return next();
  };
}

export function hasPermission(user: AuthUser | undefined, perm: string): boolean {
  return user?.permissions.has(perm) ?? false;
}
