import { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../prisma";
import { AuthRequest } from "../middleware/auth";

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return res.status(401).json({ error: "Email atau password salah" });
    const ok = await bcrypt.compare(password || "", user.password);
    if (!ok) return res.status(401).json({ error: "Email atau password salah" });

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, { expiresIn: "12h" });
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    return next(err);
  }
}

export async function me(req: AuthRequest, res: Response) {
  return res.json({ user: req.user });
}
