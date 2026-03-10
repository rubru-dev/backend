import { Request, Response, NextFunction } from "express";

export const requireRole = (...roles: string[]) => (req: Request, res: Response, next: NextFunction): void => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ detail: "Not authenticated" });
    return;
  }
  const userRoles = user.roles.map((r) => r.role.name);
  if (userRoles.includes("Super Admin") || roles.some((r) => userRoles.includes(r))) {
    next();
    return;
  }
  res.status(403).json({ detail: `Required role(s): ${roles.join(", ")}` });
};

export const requirePermission = (module: string, action: string) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ detail: "Not authenticated" });
      return;
    }
    // Super Admin always passes
    const isSuperAdmin = user.roles.some((r) => r.role.name === "Super Admin");
    if (isSuperAdmin) { next(); return; }

    const permKey = `${module}.${action}`;
    if (req.userPermissions?.has(permKey)) { next(); return; }

    res.status(403).json({ detail: "Tidak memiliki akses" });
  };
