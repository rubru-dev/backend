import { prisma } from "./prisma";
import { config } from "../config";
import { sendTelegram } from "./telegram";

type TelegramRecipient = {
  telegram_chat_id: string | null;
};

export async function sendFonnte(target: string, message: string) {
  // Legacy function name kept for existing imports. Delivery is Telegram-only.
  await sendTelegram(target, message);
}

/** Send to all users with a specific role name */
export async function sendFonntToRoles(roleNames: string[], message: string) {
  const users = await prisma.user.findMany({
    where: {
      roles: { some: { role: { name: { in: roleNames } } } },
      telegram_chat_id: { not: null },
    },
    select: { telegram_chat_id: true, name: true },
  }) as TelegramRecipient[];
  for (const u of users) {
    if (u.telegram_chat_id) await sendTelegram(u.telegram_chat_id, message);
  }
}

/** Send to user(s) by ID(s) */
export async function sendFonnteToUserIds(userIds: bigint[], message: string) {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, telegram_chat_id: { not: null } },
    select: { telegram_chat_id: true },
  }) as TelegramRecipient[];
  for (const u of users) {
    if (u.telegram_chat_id) await sendTelegram(u.telegram_chat_id, message);
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
    where: { roles: { some: { role_id: { in: roleIds } } }, telegram_chat_id: { not: null } },
    select: { telegram_chat_id: true },
  }) as TelegramRecipient[];
  if (users.length === 0) return;

  const message = tpl.replace(/\{([^}]+)\}/g, (_: string, key: string) => vars[key] ?? `{${key}}`);
  const prio: string = rule.priority_manual ?? "sedang";
  const fullMsg = `${message}\n${PRIORITY_EMOJI[prio] ?? "🟡"} Prioritas: ${prio.toUpperCase()}`;

  for (const u of users) {
    if (u.telegram_chat_id) await sendTelegram(u.telegram_chat_id, fullMsg).catch(() => {});
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
    where: { id: { in: userIds }, telegram_chat_id: { not: null } },
    select: { telegram_chat_id: true },
  }) as TelegramRecipient[];
  if (users.length === 0) return;

  const message = (rule.message_template as string).replace(/\{([^}]+)\}/g, (_: string, key: string) => vars[key] ?? `{${key}}`);
  const prio: string = rule.priority_manual ?? "sedang";
  const fullMsg = `${message}\n${PRIORITY_EMOJI[prio] ?? "🟡"} Prioritas: ${prio.toUpperCase()}`;
  for (const u of users) {
    if (u.telegram_chat_id) await sendTelegram(u.telegram_chat_id, fullMsg).catch(() => {});
  }
}

export const FRONTEND_URL = config.frontendUrl;
export const CLIENT_URL = config.clientUrl;
