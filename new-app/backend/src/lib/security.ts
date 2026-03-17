import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

export function verifyPassword(plain: string, hashed: string): boolean {
  return bcrypt.compareSync(plain, hashed);
}

export function createAccessToken(userId: number): string {
  const expireSeconds = config.accessTokenExpireMinutes * 60;
  return jwt.sign({ sub: String(userId), type: "access" }, config.secretKey, {
    expiresIn: expireSeconds,
  });
}

export function createRefreshToken(userId: number): string {
  const expireDays = config.refreshTokenExpireDays;
  return jwt.sign({ sub: String(userId), type: "refresh" }, config.secretKey, {
    expiresIn: expireDays * 24 * 3600,
  });
}

export function decodeToken(token: string): jwt.JwtPayload {
  return jwt.verify(token, config.secretKey) as jwt.JwtPayload;
}

export function createClientPortalToken(accountId: number): string {
  const expireSeconds = config.accessTokenExpireMinutes * 60;
  return jwt.sign({ sub: String(accountId), type: "client_portal_access" }, config.secretKey, {
    expiresIn: expireSeconds,
  });
}
