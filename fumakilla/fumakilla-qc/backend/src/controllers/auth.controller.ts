import { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../prisma";
import { AuthRequest } from "../middleware/auth";

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: { include: { role: { select: { name: true, permissions: true } } } },
      },
    });
    if (!user || !user.isActive) return res.status(401).json({ error: "Email atau password salah" });
    const ok = await bcrypt.compare(password || "", user.password);
    if (!ok) return res.status(401).json({ error: "Email atau password salah" });

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, { expiresIn: "12h" });

    let roles: string[];
    let permissions: string[];
    if (user.userRoles.length > 0) {
      roles = user.userRoles.map((ur) => ur.role.name);
      permissions = [...new Set(user.userRoles.flatMap((ur) => ur.role.permissions))];
    } else {
      roles = [user.role];
      const fallbackRole = await prisma.appRole.findUnique({ where: { name: user.role } });
      permissions = fallbackRole?.permissions ?? [];
    }

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: roles[0] ?? user.role,
        roles,
        permissions,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function me(req: AuthRequest, res: Response) {
  return res.json({
    user: {
      ...req.user,
      permissions: req.user ? [...req.user.permissions] : [],
    },
  });
}
