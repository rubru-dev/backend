import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { normalizeWaNumber } from "../lib/waNumber";

const router = Router();

// POST /evolution/:token — webhook pesan WA masuk dari Evolution API (log-only, v1: belum ada
// aksi otomatis berdasarkan isi balasan). Publik (tanpa authenticate) karena dipanggil server
// Evolution, bukan user login — proteksi pakai token rahasia di path karena tidak semua versi
// Evolution API bisa mengirim custom header di konfigurasi webhook-nya.
router.post("/evolution/:token", async (req: Request, res: Response) => {
  if (!config.evolutionWebhookToken || req.params.token !== config.evolutionWebhookToken) {
    return res.status(404).end();
  }

  // Selalu balas cepat & jangan pernah gagal ke Evolution (log-only, best-effort) — supaya
  // error di sisi kita tidak memicu retry storm dari Evolution.
  try {
    const body = req.body ?? {};
    const data = body.data ?? {};
    const key = data.key ?? {};
    if (key.fromMe) return res.json({ ok: true, skipped: "fromMe" });

    const remoteJid: string | undefined = key.remoteJid;
    if (!remoteJid || !remoteJid.endsWith("@s.whatsapp.net")) {
      return res.json({ ok: true, skipped: "non-personal-jid" });
    }
    const rawNumber = remoteJid.split("@")[0];
    const fromNumber = normalizeWaNumber(rawNumber) ?? rawNumber;

    const messageText: string | null =
      data.message?.conversation ??
      data.message?.extendedTextMessage?.text ??
      data.message?.imageMessage?.caption ??
      data.message?.videoMessage?.caption ??
      null;

    // whatsapp_number tersimpan apa adanya (belum tentu format 62xxxx) — cocokkan
    // dalam bentuk ternormalisasi, bukan exact string match.
    const candidates = await prisma.user.findMany({
      where: { whatsapp_number: { not: null } },
      select: { id: true, whatsapp_number: true },
    });
    const matched = candidates.find((u) => normalizeWaNumber(u.whatsapp_number!) === fromNumber);

    await prisma.waInboundMessage.create({
      data: {
        instance: body.instance ?? null,
        from_number: fromNumber,
        from_jid: remoteJid,
        user_id: matched?.id ?? null,
        message_text: messageText,
        raw_message_id: key.id ?? null,
      },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("[webhook/evolution] Gagal proses pesan masuk:", err);
    return res.json({ ok: true });
  }
});

export default router;
