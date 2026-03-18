import { prisma } from "./prisma";
import axios from "axios";
import { config } from "../config";

export async function sendFonnte(target: string, message: string) {
  const setting = await prisma.appSetting.findUnique({ where: { key: "fontee_config" } });
  const cfg = (setting?.value as Record<string, string> | null) ?? {};
  if (!cfg.api_key || !cfg.base_url) return;
  try {
    await axios.post(cfg.base_url, { target, message, countryCode: "62" }, {
      headers: { Authorization: cfg.api_key, "Content-Type": "application/json" },
      timeout: 8000,
    });
  } catch { /* fire-and-forget */ }
}

/** Send to all users with a specific role name */
export async function sendFonntToRoles(roleNames: string[], message: string) {
  const users = await prisma.user.findMany({
    where: {
      role: { name: { in: roleNames } },
      whatsapp_number: { not: null },
    },
    select: { whatsapp_number: true, name: true },
  });
  for (const u of users) {
    if (u.whatsapp_number) await sendFonnte(u.whatsapp_number, message);
  }
}

/** Send to user(s) by ID(s) */
export async function sendFonnteToUserIds(userIds: bigint[], message: string) {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, whatsapp_number: { not: null } },
    select: { whatsapp_number: true },
  });
  for (const u of users) {
    if (u.whatsapp_number) await sendFonnte(u.whatsapp_number, message);
  }
}

export const FRONTEND_URL = config.frontendUrl;
