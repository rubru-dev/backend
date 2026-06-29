import cron from "node-cron";
import { prisma } from "./prisma";
import { sendFonnte } from "./fontee";

// ── Timezone helpers ──────────────────────────────────────────────────────────

function getJakartaTimeParts(): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  return {
    hour: parseInt(parts.find((p) => p.type === "hour")!.value, 10),
    minute: parseInt(parts.find((p) => p.type === "minute")!.value, 10),
  };
}

function getJakartaDateParts(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return {
    year: Number(parts.find((p) => p.type === "year")!.value),
    month: Number(parts.find((p) => p.type === "month")!.value),
    day: Number(parts.find((p) => p.type === "day")!.value),
  };
}

function targetUTCMidnight(daysFromNow: number): { start: Date; end: Date } {
  const { year, month, day } = getJakartaDateParts();
  const start = new Date(Date.UTC(year, month - 1, day + daysFromNow));
  const end = new Date(Date.UTC(year, month - 1, day + daysFromNow + 1));
  return { start, end };
}

function formatTanggalID(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{([^}]+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

// ── Send helpers ──────────────────────────────────────────────────────────────

const PRIORITY_EMOJI: Record<string, string> = { rendah: "🟢", sedang: "🟡", tinggi: "🔴" };

async function getUsersForRoleIds(roleIds: bigint[]): Promise<{ whatsapp_number: string }[]> {
  if (roleIds.length === 0) return [];
  return prisma.user.findMany({
    where: { roles: { some: { role_id: { in: roleIds } } }, whatsapp_number: { not: null } },
    select: { whatsapp_number: true },
  }) as Promise<{ whatsapp_number: string }[]>;
}

async function sendMessages(rule: any, messages: string[]): Promise<void> {
  const roleIds = (rule.role_ids as bigint[]) ?? [];
  if (roleIds.length === 0 || messages.length === 0) return;
  const users = await getUsersForRoleIds(roleIds);
  if (users.length === 0) return;
  const prio: string = rule.priority_manual ?? "sedang";
  const priorityLine = `${PRIORITY_EMOJI[prio] ?? "🟡"} Prioritas: ${prio.toUpperCase()}`;
  for (const msg of messages) {
    const fullMsg = `${msg}\n${priorityLine}`;
    for (const u of users) {
      await sendFonnte(u.whatsapp_number, fullMsg).catch(() => {});
    }
  }
}

// ── Feature processors ────────────────────────────────────────────────────────

async function processRule(rule: any): Promise<number> {
  const daysBefore: number = rule.days_before ?? 0;
  const tpl: string = rule.message_template ?? "";
  if (!tpl) return 0;

  const { start, end } = targetUTCMidnight(daysBefore);
  const tanggalStr = formatTanggalID(start);
  const baseVars: Record<string, string> = { days_before: String(daysBefore), tanggal: tanggalStr };
  const messages: string[] = [];

  switch (rule.feature) {
    case "task_deadline": {
      const [sipil, interior] = await Promise.all([
        prisma.proyekBerjalanTask.findMany({
          where: { tanggal_selesai: { gte: start, lt: end }, status: { not: "Selesai" } },
          select: { nama_pekerjaan: true },
        }),
        prisma.proyekInteriorTask.findMany({
          where: { tanggal_selesai: { gte: start, lt: end }, status: { not: "Selesai" } },
          select: { nama_pekerjaan: true },
        }),
      ]);
      for (const t of [...sipil, ...interior]) {
        messages.push(fillTemplate(tpl, { ...baseVars, nama: t.nama_pekerjaan ?? "—", item: t.nama_pekerjaan ?? "—" }));
      }
      break;
    }

    case "item_pekerjaan_sipil": {
      const tasks = await prisma.proyekBerjalanTask.findMany({
        where: { tanggal_selesai: { gte: start, lt: end }, status: { not: "Selesai" } },
        include: { termin: { include: { proyek_berjalan: true } } },
      });
      for (const t of tasks) {
        const namaProyek = (t.termin as any)?.proyek_berjalan?.nama_proyek ?? "—";
        messages.push(fillTemplate(tpl, { ...baseVars, nama: namaProyek, item: t.nama_pekerjaan ?? "—" }));
      }
      break;
    }

    case "termin_deadline": {
      const [pbTermins, piTermins, desainTimelines] = await Promise.all([
        prisma.proyekBerjalanTermin.findMany({
          where: { tanggal_selesai: { gte: start, lt: end } },
          include: { proyek_berjalan: true },
        }),
        prisma.proyekInteriorTermin.findMany({
          where: { tanggal_selesai: { gte: start, lt: end } },
          include: { proyek_interior: true },
        }),
        (prisma.desainTimeline as any).findMany({
          where: { tanggal_selesai: { gte: start, lt: end } },
          include: { lead: { select: { nama: true } } },
        }),
      ]);
      for (const t of pbTermins) {
        messages.push(fillTemplate(tpl, { ...baseVars, nama: (t as any).proyek_berjalan?.nama_proyek ?? "—", termin: String(t.urutan + 1) }));
      }
      for (const t of piTermins) {
        messages.push(fillTemplate(tpl, { ...baseVars, nama: (t as any).proyek_interior?.nama_proyek ?? "—", termin: String(t.urutan + 1) }));
      }
      for (const t of desainTimelines) {
        const nama = t.lead?.nama ?? t.jenis_desain ?? "—";
        messages.push(fillTemplate(tpl, { ...baseVars, nama, termin: t.jenis_desain ?? "Desain" }));
      }
      break;
    }

    case "item_pekerjaan_desain":
    case "desain_deadline": {
      const items = await prisma.desainTimelineItem.findMany({
        where: { target_selesai: { gte: start, lt: end } },
        include: { desain_timeline: true },
      });
      for (const i of items) {
        const jenis = (i as any).desain_timeline?.jenis_desain ?? "—";
        messages.push(fillTemplate(tpl, { ...baseVars, nama: jenis, item: i.item_pekerjaan ?? "—", jenis }));
      }
      break;
    }

    case "item_pekerjaan_interior": {
      const items = await prisma.interiorTimelineItem.findMany({
        where: { target_selesai: { gte: start, lt: end } },
        include: { interior_timeline: true },
      });
      for (const i of items) {
        const nama = (i as any).interior_timeline?.nama_proyek ?? "—";
        messages.push(fillTemplate(tpl, { ...baseVars, nama, item: i.item_pekerjaan ?? "—" }));
      }
      break;
    }

    case "desain_follow_up_survey": {
      const fus = await prisma.followUpClient.findMany({
        where: { next_follow_up: { gte: start, lt: end } },
        include: { lead: { select: { nama: true, tanggal_survey: true } } },
      });
      for (const fu of fus) {
        if (!fu.lead) continue;
        const tanggalSurvey = fu.lead.tanggal_survey ? formatTanggalID(fu.lead.tanggal_survey) : "—";
        messages.push(fillTemplate(tpl, { ...baseVars, nama: fu.lead.nama ?? "—", tanggal_survey: tanggalSurvey }));
      }
      break;
    }

    case "konten_deadline": {
      const items = await prisma.contentTimeline.findMany({
        where: { deadline: { gte: start, lt: end }, approval_status: { not: "approved" } },
        select: { judul: true, title: true },
      });
      for (const i of items) {
        messages.push(fillTemplate(tpl, { ...baseVars, nama: i.judul ?? i.title ?? "—" }));
      }
      break;
    }

    case "survey_scheduled": {
      // Kirim sehari sebelum survey terjadwal (days_before=1)
      const leads = await prisma.lead.findMany({
        where: { tanggal_survey: { gte: start, lt: end }, rencana_survey: "Ya" },
        select: { nama: true, tanggal_survey: true, alamat: true, jam_survey: true },
      });
      for (const l of leads) {
        const tglSurvey = l.tanggal_survey ? formatTanggalID(l.tanggal_survey) : "—";
        messages.push(fillTemplate(tpl, { ...baseVars, nama: l.nama ?? "—", tanggal: tglSurvey, alamat: l.alamat ?? "—" }));
      }
      break;
    }

    case "laporan_harian_siang":
    case "laporan_harian_sore": {
      // Selalu pakai tanggal WIB hari ini, bukan dari days_before
      const hariIni = formatTanggalID(new Date());
      messages.push(fillTemplate(tpl, { days_before: "0", tanggal: hariIni }));
      break;
    }

    case "kalender_visit_reminder": {
      // Kirim ke PICs spesifik dari setiap visit (bukan role-based)
      const visits = await prisma.kalenderVisit.findMany({
        where: { tanggal: { gte: start, lt: end } },
        include: {
          pics: { include: { user: { select: { whatsapp_number: true } } } },
        },
      });
      const prio: string = rule.priority_manual ?? "sedang";
      const priorityLine = `${PRIORITY_EMOJI[prio] ?? "🟡"} Prioritas: ${prio.toUpperCase()}`;
      let sentCount = 0;
      for (const visit of visits) {
        const msg = fillTemplate(tpl, {
          ...baseVars,
          nama_proyek: (visit as any).nama_projek ?? "—",
          jam: (visit as any).jam ?? "—",
          keterangan: (visit as any).keterangan ?? "",
        });
        const fullMsg = `${msg}\n${priorityLine}`;
        for (const pic of (visit as any).pics) {
          const wa = pic.user?.whatsapp_number;
          if (wa) { await sendFonnte(wa, fullMsg).catch(() => {}); sentCount++; }
        }
      }
      return sentCount;
    }

    default:
      break;
  }

  if (messages.length > 0) await sendMessages(rule, messages);
  return messages.length;
}

// ── Absen karyawan reminder ───────────────────────────────────────────────────

async function checkAbsenReminders(): Promise<void> {
  const cfg = await (prisma.absenKaryawanConfig as any).findFirst();
  if (!cfg) return;

  const { hour: nowH, minute: nowM } = getJakartaTimeParts();
  const nowTotalMin = nowH * 60 + nowM;

  const [masukH, masukM] = cfg.jam_masuk_awal.split(":").map(Number);
  const masukReminderMin = masukH * 60 + masukM - 10; // 10 menit sebelum jam masuk

  const [pulangH, pulangM] = cfg.jam_pulang.split(":").map(Number);
  const pulangReminderMin = pulangH * 60 + pulangM + 5; // 5 menit setelah jam pulang

  const isMasukWindow = Math.abs(nowTotalMin - masukReminderMin) <= 2;
  const isPulangWindow = Math.abs(nowTotalMin - pulangReminderMin) <= 2;

  if (!isMasukWindow && !isPulangWindow) return;

  const { year, month, day } = getJakartaDateParts();
  const todayStart = new Date(Date.UTC(year, month - 1, day));
  const todayEnd = new Date(Date.UTC(year, month - 1, day + 1));

  if (isMasukWindow) {
    const rule: any = await (prisma.fonteeReminderRule as any).findFirst({
      where: { feature: "absen_masuk_reminder", is_active: true },
    });
    if (!rule?.message_template) return;

    const roleIds = (rule.role_ids as bigint[]) ?? [];
    const userWhere: any = { whatsapp_number: { not: null }, NOT: { email: { startsWith: "deleted+" } } };
    if (roleIds.length > 0) userWhere.roles = { some: { role_id: { in: roleIds } } };

    const allUsers = await prisma.user.findMany({ where: userWhere, select: { id: true, whatsapp_number: true } });
    const checkedIn = await prisma.absenKaryawan.findMany({
      where: { tanggal: { gte: todayStart, lt: todayEnd }, jam_masuk: { not: null } },
      select: { user_id: true },
    });
    const checkedInSet = new Set(checkedIn.map((a) => a.user_id.toString()));
    const notYetMasuk = allUsers.filter((u) => !checkedInSet.has(u.id.toString()));

    const jamMasukStr = cfg.jam_masuk_awal;
    const msg = fillTemplate(rule.message_template, { jam_masuk: jamMasukStr });
    const prio: string = rule.priority_manual ?? "sedang";
    const fullMsg = `${msg}\n${PRIORITY_EMOJI[prio] ?? "🟡"} Prioritas: ${prio.toUpperCase()}`;
    for (const u of notYetMasuk) {
      await sendFonnte(u.whatsapp_number!, fullMsg).catch(() => {});
    }
    console.log(`[AbsenReminder] Masuk: ${notYetMasuk.length} reminder terkirim`);
  }

  if (isPulangWindow) {
    const rule: any = await (prisma.fonteeReminderRule as any).findFirst({
      where: { feature: "absen_keluar_reminder", is_active: true },
    });
    if (!rule?.message_template) return;

    const roleIds = (rule.role_ids as bigint[]) ?? [];
    const userWhere: any = { whatsapp_number: { not: null }, NOT: { email: { startsWith: "deleted+" } } };
    if (roleIds.length > 0) userWhere.roles = { some: { role_id: { in: roleIds } } };

    // Cari yang sudah absen masuk tapi belum keluar
    const masukTapiBelumKeluar = await prisma.absenKaryawan.findMany({
      where: {
        tanggal: { gte: todayStart, lt: todayEnd },
        jam_masuk: { not: null },
        jam_keluar: null,
      },
      include: { user: { select: { id: true, whatsapp_number: true } } },
    });

    // Filter by role if needed
    const targets = roleIds.length > 0
      ? masukTapiBelumKeluar.filter(async (a) => {
          const u = (a as any).user;
          return u?.whatsapp_number;
        })
      : masukTapiBelumKeluar.filter((a) => (a as any).user?.whatsapp_number);

    const jamPulangStr = cfg.jam_pulang;
    const msg = fillTemplate(rule.message_template, { jam_pulang: jamPulangStr });
    const prio: string = rule.priority_manual ?? "sedang";
    const fullMsg = `${msg}\n${PRIORITY_EMOJI[prio] ?? "🟡"} Prioritas: ${prio.toUpperCase()}`;
    for (const absen of masukTapiBelumKeluar) {
      const wa = (absen as any).user?.whatsapp_number;
      if (wa) await sendFonnte(wa, fullMsg).catch(() => {});
    }
    console.log(`[AbsenReminder] Keluar: ${masukTapiBelumKeluar.length} reminder terkirim`);
  }
}

// ── Main runner ───────────────────────────────────────────────────────────────

export async function runDeadlineReminders(currentHour?: number, currentMinute = 0): Promise<void> {
  const { hour, minute } = getJakartaTimeParts();
  const targetHour = currentHour ?? hour;
  const targetMinute = currentMinute;

  const rules: any[] = await (prisma.fonteeReminderRule as any).findMany({
    where: { is_active: true, trigger_type: "deadline" },
  });

  for (const rule of rules) {
    const [ruleH, ruleM] = (rule.send_time ?? "08:00").split(":").map(Number);
    // Match exact send_time
    if (ruleH !== targetHour || ruleM !== targetMinute) continue;
    try {
      const count = await processRule(rule);
      if (count > 0) console.log(`[ReminderScheduler] ${rule.feature}: ${count} pesan dikirim`);
    } catch (err) {
      console.error(`[ReminderScheduler] Error pada rule ${rule.feature}:`, err);
    }
  }
}

// ── Scheduler setup ───────────────────────────────────────────────────────────

export function startReminderScheduler(): void {
  const tz = { timezone: "Asia/Jakarta" };

  // Deadline rules — tiap jam tepat WIB
  cron.schedule("0 * * * *", () => {
    const { hour } = getJakartaTimeParts();
    runDeadlineReminders(hour, 0).catch((err) => console.error("[ReminderScheduler] Error:", err));
  }, tz);

  // Laporan harian sore jam 16:50 WIB (satu-satunya send_time non-:00)
  cron.schedule("50 16 * * 1-5", () => {
    runDeadlineReminders(16, 50).catch((err) => console.error("[ReminderScheduler] 16:50 error:", err));
  }, tz);

  // Absen masuk/keluar check setiap 3 menit, jam 06:00–18:00 WIB, Senin–Sabtu
  cron.schedule("*/3 6-18 * * 1-6", () => {
    checkAbsenReminders().catch((err) => console.error("[AbsenReminder] Error:", err));
  }, tz);

  console.log("✓ Fontee reminder scheduler aktif — WIB (tiap jam + 16:50 + absen check)");
}
