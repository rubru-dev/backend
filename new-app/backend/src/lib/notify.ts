import { prisma } from "./prisma";
import { config } from "../config";
import { sendTelegram } from "./telegram";
import { sendEmail, isEmailConfigured } from "./email";
import { createNativeInboxItem, sendNativePush } from "./nativePush";

/**
 * Dispatcher notifikasi multi-channel.
 *
 * Semua pengiriman di aplikasi lewat file ini — tidak ada route yang memanggil
 * Telegram atau SMTP langsung. Menambah/mengganti channel cukup di sini.
 *
 * Kebijakan channel: Telegram DAN email dikirim bersamaan. User yang punya
 * telegram_chat_id sekaligus email menerima keduanya; yang hanya punya salah
 * satu menerima satu. Karena User.email wajib di schema, cakupan email praktis
 * 100% — inilah yang menutup lubang lama di mana notifikasi diam-diam hilang
 * untuk user tanpa telegram_chat_id (tercatat sebagai status "no_telegram").
 */

export type NotifyRecipient = {
  id?: bigint;
  name?: string | null;
  telegram_chat_id?: string | null;
  email?: string | null;
};

export type DeliveryResult = {
  telegram: boolean;
  email: boolean;
  push: boolean;
  /** true bila penerima tidak punya channel aktif sama sekali */
  skipped: boolean;
  errors: string[];
};

export type DeliverOptions = { nativePush?: boolean };

function nativeTitle(subject: string | undefined, message: string): string {
  if (subject) return subject.replace(/[*#]/g, "").trim();
  if (/survey/i.test(message)) return "Pengingat survey";
  if (/visit projek/i.test(message)) return "Pengingat visit proyek";
  if (/item.*pekerjaan|deadline/i.test(message)) return "Pengingat deadline pekerjaan";
  return "Notifikasi Rubah Rumah";
}

function nativeBody(message: string): string {
  return message
    .split("\n")
    .map((line) => line.replace(/[*#]/g, "").trim())
    .filter((line) => line && !/^prioritas:/i.test(line) && !/^https?:\/\//i.test(line))
    .slice(0, 3)
    .join(" • ")
    .slice(0, 220);
}

/** Kolom minimum yang perlu di-select agar penerima bisa dikirimi dua channel. */
export const NOTIFY_USER_SELECT = {
  id: true,
  name: true,
  telegram_chat_id: true,
  email: true,
} as const;

/** User yang dihapus disimpan dengan email placeholder "deleted+..." — jangan pernah dikirimi. */
function isRealEmail(email?: string | null): email is string {
  return Boolean(email && !email.startsWith("deleted+") && email.includes("@"));
}

/**
 * Kirim ke satu penerima lewat semua channel yang tersedia.
 * Tidak pernah melempar: kegagalan satu channel tidak boleh menjatuhkan
 * channel lain, dan kegagalan satu penerima tidak boleh menjatuhkan sisanya.
 */
export async function deliver(
  user: NotifyRecipient,
  message: string,
  subject?: string,
  options: DeliverOptions = {},
): Promise<DeliveryResult> {
  const result: DeliveryResult = { telegram: false, email: false, push: false, skipped: false, errors: [] };

  if (user.telegram_chat_id) {
    try {
      await sendTelegram(user.telegram_chat_id, message);
      result.telegram = true;
    } catch (err: any) {
      result.errors.push(`telegram: ${err?.message ?? "error"}`);
    }
  }

  if (isRealEmail(user.email)) {
    // isEmailConfigured() menyentuh database, jadi ikut dibungkus try —
    // kalau pengecekannya sendiri gagal, Telegram di atas tetap terkirim.
    try {
      if (await isEmailConfigured()) {
        await sendEmail(user.email, message, subject);
        result.email = true;
      }
    } catch (err: any) {
      result.errors.push(`email: ${err?.message ?? "error"}`);
    }
  }

  if (options.nativePush && user.id) {
    try {
      const pushPayload = {
        title: nativeTitle(subject, message),
        body: nativeBody(message),
        tag: "rubru-reminder",
        url: "/dashboard",
      };
      await createNativeInboxItem(user.id, pushPayload);
      result.push = await sendNativePush(user.id, pushPayload);
    } catch (err: any) {
      result.errors.push(`push: ${err?.message ?? "error"}`);
    }
  }

  result.skipped = !result.telegram && !result.email && !result.push && result.errors.length === 0;
  return result;
}

/** Kirim ke banyak penerima. Mengembalikan jumlah penerima yang tersampaikan minimal 1 channel. */
export async function deliverMany(
  users: NotifyRecipient[],
  message: string,
  subject?: string,
  options: DeliverOptions = {},
): Promise<number> {
  let sent = 0;
  for (const u of users) {
    const r = await deliver(u, message, subject, options);
    if (r.telegram || r.email) sent++;
  }
  return sent;
}

/**
 * Kirim ke satu chat_id Telegram mentah (tanpa user record).
 * Dipakai hanya oleh fitur test-kirim di panel admin.
 */
export async function sendTelegramRaw(chatId: string, message: string) {
  await sendTelegram(chatId, message);
}

/** Kirim ke semua user dengan role tertentu */
export async function sendNotifToRoles(roleNames: string[], message: string, subject?: string) {
  const users = await prisma.user.findMany({
    where: {
      roles: { some: { role: { name: { in: roleNames } } } },
      NOT: { email: { startsWith: "deleted+" } },
    },
    select: NOTIFY_USER_SELECT,
  });
  await deliverMany(users, message, subject);
}

/** Kirim ke semua user yang role-nya memiliki permission tertentu. */
export async function sendNotifToPermission(permissionName: string, message: string, subject?: string) {
  const users = await prisma.user.findMany({
    where: {
      roles: { some: { role: { permissions: { some: { permission: { name: permissionName } } } } } },
      NOT: { email: { startsWith: "deleted+" } },
    },
    select: NOTIFY_USER_SELECT,
  });
  await deliverMany(users, message, subject);
}

/** Kirim ke user berdasarkan ID */
export async function sendNotifToUserIds(userIds: bigint[], message: string, subject?: string) {
  if (userIds.length === 0) return;
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, NOT: { email: { startsWith: "deleted+" } } },
    select: NOTIFY_USER_SELECT,
  });
  await deliverMany(users, message, subject);
}

/** Invoice adalah notifikasi manajemen: hanya Super Admin yang menerima. */
export async function sendNotifToSuperAdmins(message: string, subject?: string) {
  const users = await prisma.user.findMany({
    where: {
      roles: { some: { role: { name: "Super Admin" } } },
      NOT: { email: { startsWith: "deleted+" } },
    },
    select: NOTIFY_USER_SELECT,
  });
  await deliverMany(users, message, subject, { nativePush: true });
}

const PRIORITY_EMOJI: Record<string, string> = { rendah: "🟢", sedang: "🟡", tinggi: "🔴" };

function buildRuleMessage(rule: any, vars: Record<string, string>) {
  const message = (rule.message_template as string).replace(
    /\{([^}]+)\}/g,
    (_: string, key: string) => vars[key] ?? `{${key}}`,
  );
  const prio: string = rule.priority_manual ?? "sedang";
  return `${message}\n${PRIORITY_EMOJI[prio] ?? "🟡"} Prioritas: ${prio.toUpperCase()}`;
}

export async function triggerEventReminder(feature: string, vars: Record<string, string>): Promise<void> {
  const rule: any = await (prisma.reminderRule as any).findFirst({
    where: { feature, is_active: true, trigger_type: "event" },
  });
  if (!rule?.message_template) return;

  const roleIds = (rule.role_ids as bigint[]) ?? [];
  if (roleIds.length === 0) return;

  const users = await prisma.user.findMany({
    where: {
      roles: { some: { role_id: { in: roleIds } } },
      NOT: { email: { startsWith: "deleted+" } },
    },
    select: NOTIFY_USER_SELECT,
  });
  if (users.length === 0) return;

  await deliverMany(users, buildRuleMessage(rule, vars), rule.label, { nativePush: feature === "survey_scheduled" || feature === "kalender_visit_assign" });
}

/** Kirim event rule ke daftar user tertentu (mengabaikan role_ids di rule) */
export async function triggerEventReminderToUsers(
  feature: string,
  userIds: bigint[],
  vars: Record<string, string>,
): Promise<void> {
  if (userIds.length === 0) return;
  const rule: any = await (prisma.reminderRule as any).findFirst({ where: { feature, is_active: true } });
  if (!rule?.message_template) return;

  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, NOT: { email: { startsWith: "deleted+" } } },
    select: NOTIFY_USER_SELECT,
  });
  if (users.length === 0) return;

  await deliverMany(users, buildRuleMessage(rule, vars), rule.label, { nativePush: feature === "survey_scheduled" || feature === "kalender_visit_assign" });
}

export const FRONTEND_URL = config.frontendUrl;
export const CLIENT_URL = config.clientUrl;
