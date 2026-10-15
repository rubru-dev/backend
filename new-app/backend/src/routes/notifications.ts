import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { deliver, NOTIFY_USER_SELECT, FRONTEND_URL } from "../lib/notify";
import { getVapidPublicKey } from "../lib/nativePush";

const router = Router();

router.get("/push/config", async (_req: Request, res: Response) => {
  return res.json({ public_key: getVapidPublicKey() });
});

router.post("/push/subscribe", async (req: Request, res: Response) => {
  const { endpoint, keys } = req.body ?? {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ detail: "Subscription push tidak lengkap" });
  }
  await prisma.pushSubscription.upsert({
    where: { endpoint: String(endpoint) },
    create: {
      user_id: req.user!.id,
      endpoint: String(endpoint),
      p256dh: String(keys.p256dh),
      auth: String(keys.auth),
      user_agent: req.get("user-agent") ?? null,
    },
    update: {
      user_id: req.user!.id,
      p256dh: String(keys.p256dh),
      auth: String(keys.auth),
      user_agent: req.get("user-agent") ?? null,
    },
  });
  return res.json({ subscribed: true });
});

router.delete("/push/subscribe", async (req: Request, res: Response) => {
  const { endpoint } = req.body ?? {};
  if (endpoint) await prisma.pushSubscription.deleteMany({ where: { endpoint: String(endpoint), user_id: req.user!.id } });
  return res.json({ subscribed: false });
});

router.get("/inbox", async (req: Request, res: Response) => {
  const rows = await prisma.notification.findMany({
    where: { notifiable_type: "User", notifiable_id: req.user!.id },
    orderBy: { created_at: "desc" },
    take: Math.min(Number(req.query.limit) || 30, 100),
  });
  return res.json(rows);
});

router.patch("/inbox/:id/read", async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, notifiable_type: "User", notifiable_id: req.user!.id },
    data: { read_at: new Date() },
  });
  return res.json({ read: true });
});

// GET /users — daftar user untuk dipilih sebagai penerima
router.get("/users", async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    where: {
      id: { not: req.user!.id },
      NOT: { email: { startsWith: "deleted+" } },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  return res.json(users);
});

// POST /send — kirim pesan ke satu/banyak user, atau semua user
// Body: { recipient_user_ids: number[], message: string }
// recipient_user_ids = [] atau tidak ada → kirim ke semua user (all)
router.post("/send", async (req: Request, res: Response) => {
  const { recipient_user_ids, message } = req.body as { recipient_user_ids?: number[]; message: string };
  if (!message) return res.status(400).json({ detail: "message wajib diisi" });

  const senderId = req.user!.id;
  const senderName = req.user!.name;

  // Tentukan penerima
  const allUsers = !recipient_user_ids || recipient_user_ids.length === 0;

  let recipients: { id: bigint; name: string; telegram_chat_id: string | null; email: string }[];

  if (allUsers) {
    recipients = await prisma.user.findMany({
      where: { id: { not: senderId }, NOT: { email: { startsWith: "deleted+" } } },
      select: NOTIFY_USER_SELECT,
    });
  } else {
    const ids = [...new Set(recipient_user_ids.map(BigInt))].filter((id) => id !== senderId);
    recipients = await prisma.user.findMany({
      where: { id: { in: ids }, NOT: { email: { startsWith: "deleted+" } } },
      select: NOTIFY_USER_SELECT,
    });
  }

  if (recipients.length === 0) {
    return res.status(400).json({ detail: "Tidak ada penerima yang valid" });
  }

  // Buat satu log per penerima
  await (prisma.notificationLog as any).createMany({
    data: recipients.map((r) => ({
      sender_user_id: senderId,
      sender_name: senderName,
      recipient_user_id: r.id,
      recipient_name: r.name,
      message,
      status: "sent",
    })),
  });

  // Kirim ke Telegram + email. Kegagalan satu penerima tidak boleh
  // menjatuhkan seluruh request — deliver() menelan errornya per-channel.
  const fullMessage = `*Pesan dari ${senderName}:*\n${message}\n\n🔗 Buka Dashboard: ${FRONTEND_URL}/dashboard`;
  const subject = `Pesan dari ${senderName}`;
  let telegramSent = 0;
  let emailSent = 0;
  for (const r of recipients) {
    const hasil = await deliver(r, fullMessage, subject);
    if (hasil.telegram) telegramSent++;
    if (hasil.email) emailSent++;
  }

  const rincian = [
    telegramSent > 0 ? `${telegramSent} Telegram` : null,
    emailSent > 0 ? `${emailSent} email` : null,
  ].filter(Boolean).join(", ");

  return res.json({
    sent_to: recipients.length,
    telegram_sent: telegramSent,
    email_sent: emailSent,
    message: `Pesan terkirim ke ${recipients.length} pengguna${rincian ? ` (${rincian})` : ""}`,
  });
});

// GET /history — riwayat pesan masuk & keluar untuk user ini
router.get("/history", async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const userId = req.user!.id;

  const logs = await (prisma.notificationLog as any).findMany({
    where: {
      OR: [
        { sender_user_id: userId },
        { recipient_user_id: userId },
      ],
    },
    orderBy: { created_at: "desc" },
    take: limit,
    select: {
      id: true,
      sender_name: true,
      sender_user_id: true,
      recipient_name: true,
      recipient_user_id: true,
      message: true,
      status: true,
      created_at: true,
    },
  });

  return res.json(logs);
});

export default router;
