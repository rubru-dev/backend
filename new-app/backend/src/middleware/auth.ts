import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { decodeToken } from "../lib/security";

export interface AuthUser {
  id: bigint;
  name: string;
  email: string;
  whatsapp_number: string | null;
  created_at: Date;
  roles: Array<{ role: { id: bigint; name: string } }>;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      userPermissions?: Set<string>;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ detail: "Not authenticated" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = decodeToken(token);
    if (payload.type !== "access") {
      res.status(401).json({ detail: "Invalid token type" });
      return;
    }
    const userId = BigInt(payload.sub as string);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) {
      res.status(401).json({ detail: "User not found" });
      return;
    }
    req.user = user as unknown as AuthUser;

    // Load flat permission set from all roles
    const roleIds = user.roles.map((r) => r.role.id);
    if (roleIds.length > 0) {
      const rolePerms = await prisma.rolePermission.findMany({
        where: { role_id: { in: roleIds } },
        include: { permission: true },
      });
      req.userPermissions = new Set(rolePerms.map((rp) => rp.permission.name));
    } else {
      req.userPermissions = new Set();
    }

    next();
  } catch {
    res.status(401).json({ detail: "Invalid token" });
  }
};
