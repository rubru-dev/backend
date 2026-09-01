import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "./prisma";
import { config } from "../config";

/**
 * Channel email.
 *
 * Sengaja ditulis sebagai SMTP generik, bukan khusus Gmail: Gmail cukup diisi
 * host smtp.gmail.com + App Password. Kalau nanti volume melewati kuota Gmail
 * (500/hari untuk @gmail.com, 2.000/hari untuk Workspace), pindah ke Resend /
 * Brevo cukup dengan mengubah env — tidak ada kode yang perlu disentuh.
 *
 * PASSWORD TIDAK DISIMPAN DI DATABASE. AppSetting hanya memuat data non-rahasia
 * (host, port, user, alamat pengirim); passwordnya dibaca dari env SMTP_PASSWORD.
 */

export type EmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  from_name: string;
  from_email: string;
};

const EMPTY_CONFIG: EmailConfig = {
  host: "",
  port: 465,
  secure: true,
  user: "",
  from_name: "Backend Notifikasi Rubru",
  from_email: "",
};

/**
 * Config di-cache 60 detik. Tanpa ini scheduler menembak satu query AppSetting
 * per email — puluhan query tidak berguna tiap siklus reminder.
 */
let cachedConfig: { value: EmailConfig; at: number } | null = null;
const CONFIG_TTL_MS = 60_000;

export async function getEmailConfig(): Promise<EmailConfig> {
  if (cachedConfig && Date.now() - cachedConfig.at < CONFIG_TTL_MS) return cachedConfig.value;
  const cfg = await readEmailConfigFromDb();
  cachedConfig = { value: cfg, at: Date.now() };
  return cfg;
}

async function readEmailConfigFromDb(): Promise<EmailConfig> {
  const setting = await prisma.appSetting.findUnique({ where: { key: "email_config" } });
  const cfg = (setting?.value as Record<string, unknown> | null) ?? {};
  const port = Number(cfg.port ?? config.smtpPort);
  return {
    host: String(cfg.host ?? "") || config.smtpHost,
    port: Number.isFinite(port) && port > 0 ? port : 465,
    // Port 465 = SMTPS (secure), 587 = STARTTLS (secure=false lalu upgrade).
    secure: cfg.secure != null ? Boolean(cfg.secure) : (Number(cfg.port ?? config.smtpPort) !== 587),
    user: String(cfg.user ?? "") || config.smtpUser,
    from_name: String(cfg.from_name ?? "") || "Backend Notifikasi Rubru",
    from_email: String(cfg.from_email ?? "") || config.smtpUser,
  };
}

/** Password hanya dari env — jangan pernah dikembalikan lewat API. */
export function getEmailPassword(): string {
  return config.smtpPassword;
}

export async function isEmailConfigured(): Promise<boolean> {
  const cfg = await getEmailConfig();
  return Boolean(cfg.host && cfg.user && getEmailPassword());
}

/**
 * Transporter di-cache supaya koneksi SMTP tidak dibuka ulang tiap pesan —
 * penting saat scheduler mengirim puluhan email berturut-turut.
 * Cache di-reset lewat resetEmailTransport() ketika konfigurasi diubah admin.
 */
let cachedTransport: Transporter | null = null;
let cachedKey = "";

export function resetEmailTransport() {
  cachedTransport = null;
  cachedKey = "";
  cachedConfig = null;
}

async function getTransport(): Promise<{ transport: Transporter; cfg: EmailConfig }> {
  const cfg = await getEmailConfig();
  const pass = getEmailPassword();
  if (!cfg.host) throw new Error("SMTP host belum dikonfigurasi");
  if (!cfg.user) throw new Error("SMTP user belum dikonfigurasi");
  if (!pass) throw new Error("SMTP_PASSWORD belum di-set di environment server");

  const key = `${cfg.host}|${cfg.port}|${cfg.secure}|${cfg.user}|${pass.length}`;
  if (!cachedTransport || cachedKey !== key) {
    cachedTransport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass },
      // Scheduler mengirim berurutan; pool menahan koneksi supaya tidak
      // kena rate-limit "too many login attempts" dari Gmail.
      pool: true,
      maxConnections: 1,
      maxMessages: 50,
    });
    cachedKey = key;
  }
  return { transport: cachedTransport, cfg };
}

/** Verifikasi kredensial tanpa mengirim pesan (dipakai tombol "Cek Koneksi"). */
export async function verifyEmailTransport(): Promise<true> {
  const { transport } = await getTransport();
  await transport.verify();
  return true;
}

const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPE[c]);
}

/**
 * Template pesan ditulis untuk Telegram (`*tebal*`, `_miring_`, emoji). Kalau
 * dikirim mentah sebagai email, bintangnya ikut terbaca. Converter kecil ini
 * memakai template yang SAMA untuk kedua channel — jadi tidak perlu menulis
 * dan merawat dua versi tiap pesan.
 */
export function telegramMarkdownToHtml(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[\s(])_([^_\n]+)_/g, "$1<em>$2</em>");
  html = html.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#c2410c">$1</a>',
  );
  return html.replace(/\n/g, "<br>");
}

/** Baris pertama pesan dipakai sebagai subjek bila pemanggil tidak memberi subjek. */
export function subjectFromMessage(message: string): string {
  const first = message.split("\n").find((l) => l.trim().length > 0) ?? "Notifikasi";
  const clean = first
    .replace(/\*/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .trim();
  const subject = clean || "Notifikasi";
  return subject.length > 120 ? `${subject.slice(0, 117)}...` : subject;
}

function wrapHtml(bodyHtml: string, fromName: string) {
  return `<!doctype html>
<html lang="id"><body style="margin:0;padding:24px;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <div style="background:#f59e0b;height:4px"></div>
    <div style="padding:24px;color:#111827;font-size:14px;line-height:1.6">${bodyHtml}</div>
    <div style="padding:14px 24px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px">
      Pesan otomatis dari ${escapeHtml(fromName)}. Mohon tidak membalas email ini.
    </div>
  </div>
</body></html>`;
}

/**
 * Kirim satu email. Melempar error bila gagal — pemanggil yang memutuskan
 * apakah kegagalan satu penerima boleh menjatuhkan seluruh proses.
 */
export async function sendEmail(to: string, message: string, subject?: string): Promise<void> {
  if (!to) throw new Error("Alamat email tujuan kosong");
  const { transport, cfg } = await getTransport();
  const subj = subject?.trim() || subjectFromMessage(message);
  // Gmail menolak / menandai spam bila From berbeda dari akun yang login,
  // jadi alamat pengirim selalu dikunci ke cfg.user bila from_email kosong.
  const fromEmail = cfg.from_email || cfg.user;
  await transport.sendMail({
    from: `"${cfg.from_name}" <${fromEmail}>`,
    to,
    subject: subj,
    text: message.replace(/\*/g, ""),
    html: wrapHtml(telegramMarkdownToHtml(message), cfg.from_name),
  });
}
