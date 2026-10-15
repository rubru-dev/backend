import webpush from "web-push";
import { prisma } from "./prisma";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@rubru.id";

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export type NativePushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export function getVapidPublicKey(): string | null {
  return publicKey ?? null;
}

export async function sendNativePush(userId: bigint, payload: NativePushPayload): Promise<boolean> {
  if (!publicKey || !privateKey) return false;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { user_id: userId } });
  let sent = false;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(payload),
      );
      sent = true;
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
      } else {
        console.warn(`[NativePush] gagal mengirim ke user ${userId}:`, error?.message ?? error);
      }
    }
  }
  return sent;
}

export async function createNativeInboxItem(userId: bigint, payload: NativePushPayload): Promise<void> {
  await prisma.notification.create({
    data: {
      type: payload.tag ?? "reminder",
      notifiable_type: "User",
      notifiable_id: userId,
      data: payload,
    },
  });
}
