import cron from "node-cron";
import { prisma } from "./prisma";
import { sendFonnte, FRONTEND_URL } from "./fontee";

const TZ = "Asia/Jakarta";

type ReminderUser = {
  id: bigint;
  name: string;
  whatsapp_number: string | null;
};

function jakartaDateParts(offsetDays = 0): { year: number; month: number; day: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const base = new Date(Date.UTC(
    Number(parts.find((p) => p.type === "year")!.value),
    Number(parts.find((p) => p.type === "month")!.value) - 1,
    Number(parts.find((p) => p.type === "day")!.value) + offsetDays,
  ));
  return { year: base.getUTCFullYear(), month: base.getUTCMonth() + 1, day: base.getUTCDate() };
}

function dayRange(offsetDays = 0): { start: Date; end: Date } {
  const { year, month, day } = jakartaDateParts(offsetDays);
  return {
    start: new Date(Date.UTC(year, month - 1, day)),
    end: new Date(Date.UTC(year, month - 1, day + 1)),
  };
}

function formatDateID(date: Date | null | undefined): string {
  if (!date) return "-";
  return date.toLocaleDateString("id-ID", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function calendarPath(modul?: string | null): string {
  if (modul === "golden") return "golden/kalender-survey";
  if (modul === "telemarketing") return "telemarketing/kalender-survey";
  return "sales-admin/kalender-survey";
}

function uniqueUsers(users: ReminderUser[]): ReminderUser[] {
  const map = new Map<string, ReminderUser>();
  for (const user of users) map.set(user.id.toString(), user);
  return Array.from(map.values());
}

async function usersByRoles(roleNames: string[]): Promise<ReminderUser[]> {
  return prisma.user.findMany({
    where: {
      roles: { some: { role: { name: { in: roleNames } } } },
      NOT: { email: { startsWith: "deleted+" } },
    },
    select: { id: true, name: true, whatsapp_number: true },
  });
}

async function allActiveUsersExcept(roleNames: string[] = []): Promise<ReminderUser[]> {
  return prisma.user.findMany({
    where: {
      NOT: [
        { email: { startsWith: "deleted+" } },
        ...(roleNames.length > 0 ? [{ roles: { some: { role: { name: { in: roleNames } } } } }] : []),
      ],
    },
    select: { id: true, name: true, whatsapp_number: true },
  });
}

async function surveyRecipients(picName?: string | null): Promise<ReminderUser[]> {
  const [picUsers, superAdmins] = await Promise.all([
    picName
      ? prisma.user.findMany({
          where: { name: picName, NOT: { email: { startsWith: "deleted+" } } },
          select: { id: true, name: true, whatsapp_number: true },
        })
      : Promise.resolve([]),
    usersByRoles(["Super Admin"]),
  ]);
  return uniqueUsers([...picUsers, ...superAdmins]);
}

async function superAdminRecipients(): Promise<ReminderUser[]> {
  return usersByRoles(["Super Admin"]);
}

async function visitProjectRecipients(picIds: bigint[]): Promise<ReminderUser[]> {
  const [pics, superAdmins] = await Promise.all([
    picIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: picIds }, NOT: { email: { startsWith: "deleted+" } } },
          select: { id: true, name: true, whatsapp_number: true },
        })
      : Promise.resolve([]),
    superAdminRecipients(),
  ]);
  return uniqueUsers([...pics, ...superAdmins]);
}

async function hasReminderLog(args: {
  type: string;
  remindableType: string;
  remindableId: bigint;
  userId: bigint;
  deadlineDate: Date;
}): Promise<boolean> {
  const existing = await prisma.whatsappReminderLog.findFirst({
    where: {
      reminder_type: args.type,
      remindable_type: args.remindableType,
      remindable_id: args.remindableId,
      user_id: args.userId,
      deadline_date: args.deadlineDate,
      status: { in: ["sent", "no_whatsapp"] },
    },
    select: { id: true },
  });
  return Boolean(existing);
}

async function logReminder(args: {
  type: string;
  remindableType: string;
  remindableId: bigint;
  user: ReminderUser;
  deadlineDate: Date;
  message: string;
  status: string;
  error?: string;
}) {
  await prisma.whatsappReminderLog.create({
    data: {
      reminder_type: args.type,
      remindable_type: args.remindableType,
      remindable_id: args.remindableId,
      user_id: args.user.id,
      deadline_date: args.deadlineDate,
      message_sent: args.message,
      status: args.status,
      error_message: args.error ?? null,
    },
  });
  await (prisma.notificationLog as any).create({
    data: {
      sender_name: "System Reminder",
      recipient_user_id: args.user.id,
      recipient_name: args.user.name,
      target_number: args.user.whatsapp_number ?? null,
      message: args.message,
      status: args.status,
    },
  });
}

async function sendOnce(args: {
  type: string;
  remindableType: string;
  remindableId: bigint;
  users: ReminderUser[];
  deadlineDate: Date;
  message: string;
}): Promise<number> {
  let sent = 0;
  for (const user of uniqueUsers(args.users)) {
    if (await hasReminderLog({ ...args, userId: user.id })) continue;
    if (!user.whatsapp_number) {
      await logReminder({ ...args, user, status: "no_whatsapp" });
      continue;
    }
    try {
      await sendFonnte(user.whatsapp_number, args.message);
      await logReminder({ ...args, user, status: "sent" });
      sent++;
    } catch (err: any) {
      await logReminder({ ...args, user, status: "failed", error: err?.message ?? "Unknown error" });
    }
  }
  return sent;
}

async function sendGlobalDaily(type: string, users: ReminderUser[], message: string): Promise<void> {
  const { start } = dayRange(0);
  const count = await sendOnce({
    type,
    remindableType: "global",
    remindableId: BigInt(0),
    users,
    deadlineDate: start,
    message,
  });
  console.log(`[HardcodedReminder] ${type}: ${count} WA terkirim`);
}

export async function sendSurveyScheduledReminder(leadId: bigint): Promise<void> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, nama: true, alamat: true, modul: true, tanggal_survey: true, jam_survey: true, pic_survey: true },
  });
  if (!lead?.tanggal_survey) return;
  const recipients = await surveyRecipients(lead.pic_survey);
  const message =
    `*Assign Survey Baru*\n\n` +
    `*Nama Client:* ${lead.nama ?? "-"}\n` +
    `*Tanggal:* ${formatDateID(lead.tanggal_survey)}\n` +
    `*Jam Survey:* ${lead.jam_survey || "-"}\n` +
    `*PIC Survey:* ${lead.pic_survey || "-"}\n` +
    `*Lokasi:* ${lead.alamat || "-"}\n\n` +
    `${FRONTEND_URL}/${calendarPath(lead.modul)}`;
  await sendOnce({
    type: "hardcoded_survey_assigned",
    remindableType: "lead",
    remindableId: lead.id,
    users: recipients,
    deadlineDate: lead.tanggal_survey,
    message,
  });
}

export async function sendVisitProjectAssignedReminder(visitId: bigint): Promise<void> {
  const visit = await prisma.kalenderVisit.findUnique({
    where: { id: visitId },
    include: { pics: { include: { user: { select: { id: true } } } } },
  });
  if (!visit?.tanggal) return;
  const picIds = visit.pics.map((pic) => pic.user_id);
  const recipients = await visitProjectRecipients(picIds);
  const message =
    `*Assign Visit Projek Baru*\n\n` +
    `*Projek:* ${visit.nama_projek ?? "-"}\n` +
    `*Tanggal:* ${formatDateID(visit.tanggal)}\n` +
    `*Jam:* ${visit.jam || "-"}\n` +
    `*Keterangan:* ${visit.keterangan || "-"}\n\n` +
    `${FRONTEND_URL}/pic/kalender-visit`;
  await sendOnce({
    type: "hardcoded_visit_project_assigned",
    remindableType: "kalender_visit",
    remindableId: visit.id,
    users: recipients,
    deadlineDate: visit.tanggal,
    message,
  });
}

export async function sendVisitClientAssignedReminder(visitId: bigint): Promise<void> {
  const visit = await prisma.salesVisitAttendance.findUnique({ where: { id: visitId } });
  if (!visit?.tanggal) return;
  const recipients = await superAdminRecipients();
  const message =
    `*Assign Visit Client Baru*\n\n` +
    `*Client:* ${visit.client_nama || "-"}\n` +
    `*Tanggal:* ${formatDateID(visit.tanggal)}\n` +
    `*Jam:* ${visit.jam || "-"}\n\n` +
    `${FRONTEND_URL}/sales/kalender-visit-client`;
  await sendOnce({
    type: "hardcoded_visit_client_assigned",
    remindableType: "sales_visit_attendance",
    remindableId: visit.id,
    users: recipients,
    deadlineDate: visit.tanggal,
    message,
  });
}

async function sendTodaySurveyReminders(): Promise<void> {
  const { start, end } = dayRange(0);
  const leads = await prisma.lead.findMany({
    where: { rencana_survey: "Ya", tanggal_survey: { gte: start, lt: end } },
    select: { id: true, nama: true, alamat: true, modul: true, tanggal_survey: true, jam_survey: true, pic_survey: true },
  });
  let total = 0;
  for (const lead of leads) {
    const recipients = await surveyRecipients(lead.pic_survey);
    const message =
      `*Reminder Survey Hari Ini*\n\n` +
      `*Nama Client:* ${lead.nama ?? "-"}\n` +
      `*Tanggal:* ${formatDateID(lead.tanggal_survey)}\n` +
      `*Jam Survey:* ${lead.jam_survey || "-"}\n` +
      `*PIC Survey:* ${lead.pic_survey || "-"}\n` +
      `*Lokasi:* ${lead.alamat || "-"}\n\n` +
      `${FRONTEND_URL}/${calendarPath(lead.modul)}`;
    total += await sendOnce({
      type: "hardcoded_survey_today_0800",
      remindableType: "lead",
      remindableId: lead.id,
      users: recipients,
      deadlineDate: start,
      message,
    });
  }
  console.log(`[HardcodedReminder] survey hari ini: ${total} WA terkirim`);
}

async function sendTodayVisitProjectReminders(): Promise<void> {
  const { start, end } = dayRange(0);
  const visits = await prisma.kalenderVisit.findMany({
    where: { tanggal: { gte: start, lt: end } },
    include: { pics: true },
  });
  let total = 0;
  for (const visit of visits) {
    const recipients = await visitProjectRecipients(visit.pics.map((pic) => pic.user_id));
    const message =
      `*Reminder Visit Projek Hari Ini*\n\n` +
      `*Projek:* ${visit.nama_projek ?? "-"}\n` +
      `*Tanggal:* ${formatDateID(visit.tanggal)}\n` +
      `*Jam:* ${visit.jam || "-"}\n` +
      `*Keterangan:* ${visit.keterangan || "-"}\n\n` +
      `${FRONTEND_URL}/pic/kalender-visit`;
    total += await sendOnce({
      type: "hardcoded_visit_project_today_0800",
      remindableType: "kalender_visit",
      remindableId: visit.id,
      users: recipients,
      deadlineDate: start,
      message,
    });
  }
  console.log(`[HardcodedReminder] visit projek hari ini: ${total} WA terkirim`);
}

async function sendTodayVisitClientReminders(): Promise<void> {
  const { start, end } = dayRange(0);
  const visits = await prisma.salesVisitAttendance.findMany({
    where: { tanggal: { gte: start, lt: end } },
  });
  const recipients = await superAdminRecipients();
  let total = 0;
  for (const visit of visits) {
    const message =
      `*Reminder Visit Client Hari Ini*\n\n` +
      `*Client:* ${visit.client_nama || "-"}\n` +
      `*Tanggal:* ${formatDateID(visit.tanggal)}\n` +
      `*Jam:* ${visit.jam || "-"}\n\n` +
      `${FRONTEND_URL}/sales/kalender-visit-client`;
    total += await sendOnce({
      type: "hardcoded_visit_client_today_0800",
      remindableType: "sales_visit_attendance",
      remindableId: visit.id,
      users: recipients,
      deadlineDate: start,
      message,
    });
  }
  console.log(`[HardcodedReminder] visit client hari ini: ${total} WA terkirim`);
}

async function sendDesainLateReminders(): Promise<void> {
  const { start, end } = dayRange(-1);
  const users = await usersByRoles(["Sr. Arsitek", "Jr. Arsitek", "Sr Arsitek", "Jr Arsitek", "Desain", "Super Admin"]);
  const items = await prisma.desainTimelineItem.findMany({
    where: { target_selesai: { gte: start, lt: end }, status: { not: "Selesai" } },
    include: { desain_timeline: { include: { lead: { select: { nama: true } } } } },
  });
  let total = 0;
  for (const item of items) {
    const message =
      `*Reminder Deadline Desain Terlambat 1 Hari*\n\n` +
      `*Client/Proyek:* ${item.desain_timeline?.lead?.nama ?? item.desain_timeline?.jenis_desain ?? "-"}\n` +
      `*Item:* ${item.item_pekerjaan ?? "-"}\n` +
      `*Deadline:* ${formatDateID(item.target_selesai)}\n` +
      `*Status:* ${item.status ?? "-"}\n\n` +
      `${FRONTEND_URL}/projek/desain`;
    total += await sendOnce({
      type: "hardcoded_desain_item_late_1d",
      remindableType: "desain_timeline_item",
      remindableId: item.id,
      users,
      deadlineDate: start,
      message,
    });
  }
  console.log(`[HardcodedReminder] desain telat 1 hari: ${total} WA terkirim`);
}

async function sendTerminH3Reminders(): Promise<void> {
  const { start, end } = dayRange(3);
  const users = await usersByRoles(["PIC Project", "Super Admin"]);
  const [sipil, interior] = await Promise.all([
    prisma.proyekBerjalanTermin.findMany({
      where: { tanggal_selesai: { gte: start, lt: end } },
      include: { proyek_berjalan: { select: { nama_proyek: true } } },
    }),
    prisma.proyekInteriorTermin.findMany({
      where: { tanggal_selesai: { gte: start, lt: end } },
      include: { proyek_interior: { select: { nama_proyek: true } } },
    }),
  ]);
  let total = 0;
  for (const termin of sipil) {
    const message =
      `*Reminder Deadline Termin H-3*\n\n` +
      `*Tipe:* Sipil\n*Proyek:* ${termin.proyek_berjalan?.nama_proyek ?? "-"}\n` +
      `*Termin:* ${termin.nama ?? `Termin ${termin.urutan + 1}`}\n` +
      `*Deadline:* ${formatDateID(termin.tanggal_selesai)}\n\n${FRONTEND_URL}/projek/sipil`;
    total += await sendOnce({ type: "hardcoded_termin_sipil_h3", remindableType: "proyek_berjalan_termin", remindableId: termin.id, users, deadlineDate: start, message });
  }
  for (const termin of interior) {
    const message =
      `*Reminder Deadline Termin H-3*\n\n` +
      `*Tipe:* Interior\n*Proyek:* ${termin.proyek_interior?.nama_proyek ?? "-"}\n` +
      `*Termin:* ${termin.nama ?? `Termin ${termin.urutan + 1}`}\n` +
      `*Deadline:* ${formatDateID(termin.tanggal_selesai)}\n\n${FRONTEND_URL}/projek/interior`;
    total += await sendOnce({ type: "hardcoded_termin_interior_h3", remindableType: "proyek_interior_termin", remindableId: termin.id, users, deadlineDate: start, message });
  }
  console.log(`[HardcodedReminder] termin H-3: ${total} WA terkirim`);
}

async function sendProjectTaskH3Reminders(): Promise<void> {
  const { start, end } = dayRange(3);
  const users = await usersByRoles(["PIC Project", "Super Admin"]);
  const [sipil, interior] = await Promise.all([
    prisma.proyekBerjalanTask.findMany({
      where: { tanggal_selesai: { gte: start, lt: end }, status: { not: "Selesai" } },
      include: { termin: { include: { proyek_berjalan: { select: { nama_proyek: true } } } } },
    }),
    prisma.proyekInteriorTask.findMany({
      where: { tanggal_selesai: { gte: start, lt: end }, status: { not: "Selesai" } },
      include: { termin: { include: { proyek_interior: { select: { nama_proyek: true } } } } },
    }),
  ]);
  let total = 0;
  for (const task of sipil) {
    const message =
      `*Reminder Deadline Item Pekerjaan H-3*\n\n` +
      `*Tipe:* Sipil\n*Proyek:* ${task.termin?.proyek_berjalan?.nama_proyek ?? "-"}\n` +
      `*Item:* ${task.nama_pekerjaan ?? "-"}\n*Deadline:* ${formatDateID(task.tanggal_selesai)}\n\n${FRONTEND_URL}/projek/sipil`;
    total += await sendOnce({ type: "hardcoded_task_sipil_h3", remindableType: "proyek_berjalan_task", remindableId: task.id, users, deadlineDate: start, message });
  }
  for (const task of interior) {
    const message =
      `*Reminder Deadline Item Pekerjaan H-3*\n\n` +
      `*Tipe:* Interior\n*Proyek:* ${task.termin?.proyek_interior?.nama_proyek ?? "-"}\n` +
      `*Item:* ${task.nama_pekerjaan ?? "-"}\n*Deadline:* ${formatDateID(task.tanggal_selesai)}\n\n${FRONTEND_URL}/projek/interior`;
    total += await sendOnce({ type: "hardcoded_task_interior_h3", remindableType: "proyek_interior_task", remindableId: task.id, users, deadlineDate: start, message });
  }
  console.log(`[HardcodedReminder] task sipil/interior H-3: ${total} WA terkirim`);
}

export function startHardcodedReminderScheduler(): void {
  const tz = { timezone: TZ };

  cron.schedule("0 12 * * *", () => {
    allActiveUsersExcept([]).then((users) =>
      sendGlobalDaily("hardcoded_laporan_harian_1200", users, `*Reminder Laporan Harian*\n\nJangan lupa isi laporan harian hari ini.\n\n${FRONTEND_URL}/dashboard`)
    ).catch((err) => console.error("[HardcodedReminder] laporan 12:00 error:", err));
  }, tz);

  cron.schedule("50 16 * * *", () => {
    allActiveUsersExcept([]).then((users) =>
      sendGlobalDaily("hardcoded_laporan_harian_1650", users, `*Reminder Laporan Harian*\n\nBatas sore, mohon isi laporan harian sebelum pulang.\n\n${FRONTEND_URL}/dashboard`)
    ).catch((err) => console.error("[HardcodedReminder] laporan 16:50 error:", err));
  }, tz);

  cron.schedule("50 7 * * *", () => {
    allActiveUsersExcept(["Super Admin"]).then((users) =>
      sendGlobalDaily("hardcoded_absen_masuk_0750", users, `*Reminder Absen Masuk*\n\nJangan lupa absen masuk hari ini.\n\n${FRONTEND_URL}/absen`)
    ).catch((err) => console.error("[HardcodedReminder] absen masuk error:", err));
  }, tz);

  cron.schedule("55 16 * * *", () => {
    allActiveUsersExcept(["Super Admin"]).then((users) =>
      sendGlobalDaily("hardcoded_absen_keluar_1655", users, `*Reminder Absen Keluar*\n\nJangan lupa absen keluar sebelum pulang.\n\n${FRONTEND_URL}/absen`)
    ).catch((err) => console.error("[HardcodedReminder] absen keluar error:", err));
  }, tz);

  cron.schedule("0 8 * * *", () => {
    Promise.all([
      sendTodaySurveyReminders(),
      sendDesainLateReminders(),
      sendTerminH3Reminders(),
      sendProjectTaskH3Reminders(),
      sendTodayVisitProjectReminders(),
      sendTodayVisitClientReminders(),
    ]).catch((err) => console.error("[HardcodedReminder] batch 08:00 error:", err));
  }, tz);

  console.log("✓ Hardcoded reminder scheduler aktif (WIB)");
}
