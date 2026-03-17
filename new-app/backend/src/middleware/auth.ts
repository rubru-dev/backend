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

export interface ClientPortalAuth {
  accountId: bigint;
  leadId: bigint;
  projectId: bigint;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      userPermissions?: Set<string>;
      clientPortal?: ClientPortalAuth;
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

export const authenticateClientPortal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ detail: "Not authenticated" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = decodeToken(token);
    if (payload.type !== "client_portal_access") {
      res.status(401).json({ detail: "Invalid token type" });
      return;
    }
    const accountId = BigInt(payload.sub as string);
    const account = await prisma.clientPortalAccount.findUnique({
      where: { id: accountId },
      include: { lead: { include: { client_portal_project: { select: { id: true } } } } },
    });
    if (!account || !account.is_active) {
      res.status(401).json({ detail: "Akun tidak ditemukan atau tidak aktif" });
      return;
    }
    const project = account.lead?.client_portal_project;
    if (!project) {
      res.status(401).json({ detail: "Proyek klien tidak ditemukan" });
      return;
    }
    req.clientPortal = {
      accountId: account.id,
      leadId: account.lead_id,
      projectId: project.id,
      username: account.username,
    };
    next();
  } catch {
    res.status(401).json({ detail: "Invalid token" });
  }
};
