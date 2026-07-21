import { prisma } from "./prisma";
import axios from "axios";
import { config } from "../config";
import { normalizeWaNumber } from "./waNumber";

// Provider pengiriman WhatsApp: "evolution" (Evolution API, default) atau "fonnte" (gateway lama).
const WA_PROVIDER = config.waProvider;

export async function sendFonnte(target: string, message: string) {
  if (WA_PROVIDER === "evolution") {
    await sendEvolution(target, message);
    return;
  }

  // Fallback: gateway Fonnte lama (aktif bila WA_PROVIDER=fonnte).
  const setting = await prisma.appSetting.findUnique({ where: { key: "fontee_config" } });
  const cfg = (setting?.value as Record<string, string> | null) ?? {};
  if (!cfg.api_key || !cfg.base_url) {
    console.warn("[Fonnte] api_key atau base_url belum dikonfigurasi");
    return;
  }
  try {
    const res = await axios.post(cfg.base_url, { target, message, countryCode: "62" }, {
      headers: { Authorization: cfg.api_key, "Content-Type": "application/json" },
      timeout: 8000,
    });
    if (res.data?.status === false || res.data?.response === false) {
      console.error(`[Fonnte] Gagal kirim ke ${target}:`, JSON.stringify(res.data));
    }
  } catch (err: any) {
    console.error(`[Fonnte] Error kirim ke ${target}:`, err?.response?.data ?? err?.message);
  }
}

/**
 * Kirim via Evolution API (self-host). Jalur utama pengiriman WA.
 * Melempar error bila gagal agar pemanggil (mis. sendOnce) mencatat status
 * "failed" dan mencoba ulang di jadwal berikutnya.
 */
async function sendEvolution(target: string, message: string) {
  if (!config.evolutionBaseUrl || !config.evolutionApiKey || !config.evolutionInstance) {
    throw new Error("EVOLUTION_BASE_URL / EVOLUTION_API_KEY / EVOLUTION_INSTANCE belum dikonfigurasi");
  }
  const number = normalizeWaNumber(target);
  if (!number) throw new Error(`Nomor WA tidak valid: ${target}`);

  const url = `${config.evolutionBaseUrl.replace(/\/$/, "")}/message/sendText/${config.evolutionInstance}`;
  const res = await axios.post(
    url,
    { number, text: message },
    { headers: { apikey: config.evolutionApiKey, "Content-Type": "application/json" }, timeout: 8000 }
  );
  if (res.data?.error || res.data?.status === "ERROR") {
    throw new Error(`[Evolution] Gagal kirim ke ${target}: ${JSON.stringify(res.data)}`);
  }
}

/** Send to all users with a specific role name */
export async function sendFonntToRoles(roleNames: string[], message: string) {
  const users = await prisma.user.findMany({
    where: {
      roles: { some: { role: { name: { in: roleNames } } } },
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

const PRIORITY_EMOJI: Record<string, string> = { rendah: "🟢", sedang: "🟡", tinggi: "🔴" };

export async function triggerEventReminder(feature: string, vars: Record<string, string>): Promise<void> {
  const rule: any = await (prisma.fonteeReminderRule as any).findFirst({
    where: { feature, is_active: true, trigger_type: "event" },
  });
  if (!rule) return;

  const tpl: string = rule.message_template ?? "";
  if (!tpl) return;

  const roleIds = (rule.role_ids as bigint[]) ?? [];
  if (roleIds.length === 0) return;

  const users = await prisma.user.findMany({
    where: { roles: { some: { role_id: { in: roleIds } } }, whatsapp_number: { not: null } },
    select: { whatsapp_number: true },
  });
  if (users.length === 0) return;

  const message = tpl.replace(/\{([^}]+)\}/g, (_: string, key: string) => vars[key] ?? `{${key}}`);
  const prio: string = rule.priority_manual ?? "sedang";
  const fullMsg = `${message}\n${PRIORITY_EMOJI[prio] ?? "🟡"} Prioritas: ${prio.toUpperCase()}`;

  for (const u of users) {
    await sendFonnte(u.whatsapp_number!, fullMsg).catch(() => {});
  }
}

/** Send a FonteeReminderRule event to a specific list of user IDs (bypasses role_ids) */
export async function triggerEventReminderToUsers(feature: string, userIds: bigint[], vars: Record<string, string>): Promise<void> {
  const rule: any = await (prisma.fonteeReminderRule as any).findFirst({
    where: { feature, is_active: true },
  });
  if (!rule?.message_template) return;
  if (userIds.length === 0) return;

  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, whatsapp_number: { not: null } },
    select: { whatsapp_number: true },
  });
  if (users.length === 0) return;

  const message = (rule.message_template as string).replace(/\{([^}]+)\}/g, (_: string, key: string) => vars[key] ?? `{${key}}`);
  const prio: string = rule.priority_manual ?? "sedang";
  const fullMsg = `${message}\n${PRIORITY_EMOJI[prio] ?? "🟡"} Prioritas: ${prio.toUpperCase()}`;
  for (const u of users) {
    await sendFonnte(u.whatsapp_number!, fullMsg).catch(() => {});
  }
}

export const FRONTEND_URL = config.frontendUrl;
export const CLIENT_URL = config.clientUrl;
