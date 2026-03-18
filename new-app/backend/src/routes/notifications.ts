import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { sendFonnte, FRONTEND_URL } from "../lib/fontee";

const router = Router();

// GET /users — daftar user untuk dipilih sebagai penerima
router.get("/users", async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
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

  let recipients: { id: bigint; name: string; whatsapp_number: string | null }[];

  if (allUsers) {
    recipients = await prisma.user.findMany({
      where: { id: { not: senderId } },
      select: { id: true, name: true, whatsapp_number: true },
    });
  } else {
    const ids = recipient_user_ids.map(BigInt);
    recipients = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, whatsapp_number: true },
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

  // Also send via Fonnte WA to recipients who have a whatsapp_number
  const waMessage = `*Pesan dari ${senderName}:*\n${message}\n\n🔗 Buka Dashboard: ${FRONTEND_URL}/dashboard`;
  let waSent = 0;
  for (const r of recipients) {
    if (r.whatsapp_number) {
      await sendFonnte(r.whatsapp_number, waMessage);
      waSent++;
    }
  }

  return res.json({
    sent_to: recipients.length,
    wa_sent: waSent,
    message: `Pesan terkirim ke ${recipients.length} pengguna${waSent > 0 ? ` (${waSent} via WhatsApp)` : ""}`,
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
