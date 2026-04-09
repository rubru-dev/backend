import cron from "node-cron";
import { prisma } from "./prisma";
import { sendFonnte } from "./fontee";

/**
 * Reminder WhatsApp untuk PIC Kalender Visit.
 * Cron: setiap hari jam 08:00 (Asia/Jakarta) → kirim WA ke semua user yang
 * di-assign sebagai PIC pada KalenderVisit yang tanggalnya = hari ini.
 *
 * Idempotency: pakai AppSetting key `kalender_visit_reminder_last_run` untuk
 * skip kalau sudah pernah dijalankan untuk tanggal yang sama.
 */

const SETTING_KEY = "kalender_visit_reminder_last_run";

function todayISODate(): string {
  // YYYY-MM-DD di timezone server (server diasumsikan WIB / sudah TZ-aware)
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatTanggalID(date: Date): string {
  return new Date(date).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function alreadyRanToday(): Promise<boolean> {
  const setting = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY } });
  const last = (setting?.value as { date?: string } | null)?.date;
  return last === todayISODate();
}

async function markRanToday() {
  await prisma.appSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: { date: todayISODate() } },
    create: { key: SETTING_KEY, value: { date: todayISODate() } },
  });
}

export async function sendKalenderVisitReminders(force = false) {
  if (!force && (await alreadyRanToday())) {
    console.log("[KalenderVisitReminder] Sudah dijalankan untuk hari ini — skip");
    return;
  }

  // Range hari ini (00:00 sampai 23:59:59) — KalenderVisit.tanggal adalah @db.Date
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const visits = await prisma.kalenderVisit.findMany({
    where: { tanggal: { gte: start, lt: end } },
    include: {
      pics: {
        include: {
          user: { select: { id: true, name: true, whatsapp_number: true } },
        },
      },
    },
  });

  if (visits.length === 0) {
    console.log("[KalenderVisitReminder] Tidak ada visit hari ini");
    await markRanToday();
    return;
  }

  let sentCount = 0;
  for (const visit of visits) {
    const tanggalStr = formatTanggalID(visit.tanggal);
    const jamStr = visit.jam ? ` jam ${visit.jam}` : "";
    const ketStr = visit.keterangan ? `\nCatatan: ${visit.keterangan}` : "";
    const message =
      `🔔 *Reminder Kunjungan Hari Ini*\n\n` +
      `Halo, Anda dijadwalkan untuk visit projek hari ini:\n\n` +
      `📍 *${visit.nama_projek}*\n` +
      `📅 ${tanggalStr}${jamStr}${ketStr}\n\n` +
      `Mohon konfirmasi kehadiran dan upload foto bukti via aplikasi setelah kunjungan.\n\n` +
      `— RubahRumah`;

    for (const pic of visit.pics) {
      const wa = pic.user?.whatsapp_number;
      if (!wa) continue;
      try {
        await sendFonnte(wa, message);
        sentCount++;
      } catch (err) {
        console.error(
          `[KalenderVisitReminder] Gagal kirim ke ${pic.user?.name ?? pic.user_id}:`,
          err,
        );
      }
    }
  }

  await markRanToday();
  console.log(
    `[KalenderVisitReminder] ✓ Dikirim ${sentCount} reminder untuk ${visits.length} visit`,
  );
}

export function startKalenderVisitReminder() {
  // Cron: setiap hari jam 08:00 — node-cron menggunakan TZ server.
  // Server diasumsikan sudah WIB (Asia/Jakarta).
  cron.schedule("0 8 * * *", () => {
    console.log("[KalenderVisitReminder] Menjalankan reminder harian 08:00...");
    sendKalenderVisitReminders().catch((err) =>
      console.error("[KalenderVisitReminder] Error:", err),
    );
  });

  console.log("✓ Kalender Visit reminder scheduler aktif (harian jam 08:00)");
}
