// WhatsApp self-host via Baileys (@whiskeysockets/baileys).
// Menggantikan gateway Fonnte yang sering "disconnected device".
//
// Catatan:
// - Baileys dimuat lewat dynamic import() agar kompatibel CJS/ESM sekaligus
//   membuat file ini tetap bisa di-typecheck tanpa paketnya terpasang (di-load runtime di VPS).
// - Butuh scan QR sekali; kredensial disimpan di folder auth (persisten antar restart).
// - Kirim diberi jeda antar-pesan untuk mengurangi risiko nomor diblokir WhatsApp.

import fs from "fs";
import path from "path";
import { config } from "../config";

const AUTH_DIR = process.env.WA_AUTH_DIR || path.join(config.storagePath, "baileys_auth");
const SEND_DELAY_MS = parseInt(process.env.WA_SEND_DELAY_MS ?? "1200", 10);

// Dipertahankan sebagai `import()` asli walau target CJS (tsc tidak boleh menurunkannya ke require).
const dynamicImport = new Function("m", "return import(m)") as (m: string) => Promise<any>;

let sock: any = null;
let connected = false;
let starting = false;
let currentQR: string | null = null;

function pickDefault(mod: any): any {
  return mod?.default ?? mod;
}

/** Normalisasi nomor lokal → format internasional Indonesia (628xxx). */
export function normalizeWaNumber(raw: string): string | null {
  let n = String(raw || "").replace(/\D/g, "");
  if (!n) return null;
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  // kalau sudah diawali kode negara lain (mis. 62..., 60...), biarkan apa adanya
  if (n.length < 10 || n.length > 15) return null;
  return n;
}

export function isWhatsAppConnected(): boolean {
  return connected;
}

/** QR string terakhir (untuk ditampilkan via endpoint bila perlu). null bila sudah tersambung. */
export function getWhatsAppQR(): string | null {
  return currentQR;
}

/**
 * Inisialisasi koneksi WhatsApp. Idempotent — aman dipanggil ulang.
 * Auto-reconnect kecuali logged out (harus scan ulang).
 */
export async function initWhatsApp(): Promise<void> {
  if (starting || sock) return;
  starting = true;
  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true });

    const baileys = await dynamicImport("@whiskeysockets/baileys");
    // Baileys mengekspor factory socket sebagai default export (fallback ke named export).
    const makeSocket = baileys.default ?? baileys.makeWASocket;
    const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = baileys;

    const pinoMod = await dynamicImport("pino");
    const logger = pickDefault(pinoMod)({ level: "silent" });

    const qrMod = await dynamicImport("qrcode-terminal");
    const qrcode = pickDefault(qrMod);

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    let version: any;
    try {
      ({ version } = await fetchLatestBaileysVersion());
    } catch {
      /* pakai versi bawaan Baileys bila gagal ambil versi terbaru */
    }

    sock = makeSocket({
      auth: state,
      version,
      logger,
      browser: Browsers?.appropriate ? Browsers.appropriate("RubahRumah") : ["RubahRumah", "Chrome", "1.0.0"],
      markOnlineOnConnect: false,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQR = qr;
        console.log("\n[WhatsApp] Scan QR berikut via WhatsApp → Perangkat Tertaut (Linked Devices):\n");
        try {
          qrcode.generate(qr, { small: true });
        } catch {
          console.log("[WhatsApp] QR string:", qr);
        }
      }

      if (connection === "open") {
        connected = true;
        currentQR = null;
        console.log("✓ [WhatsApp] Baileys tersambung — siap kirim pesan");
      } else if (connection === "close") {
        connected = false;
        sock = null;
        starting = false;
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason?.loggedOut;
        if (loggedOut) {
          console.error(
            `[WhatsApp] Sesi LOGGED OUT. Hapus folder auth lalu scan ulang:\n  rm -rf "${AUTH_DIR}"\n  (restart backend untuk memunculkan QR baru)`,
          );
        } else {
          console.warn(`[WhatsApp] Terputus (code ${statusCode ?? "?"}). Mencoba reconnect dalam 3 detik...`);
          setTimeout(() => {
            initWhatsApp().catch((e) => console.error("[WhatsApp] Reconnect gagal:", e));
          }, 3000);
        }
      }
    });
  } catch (err) {
    console.error("[WhatsApp] Gagal inisialisasi Baileys:", err);
    sock = null;
    starting = false;
    // Coba lagi nanti agar tidak permanen mati bila paket/koneksi belum siap
    setTimeout(() => {
      initWhatsApp().catch((e) => console.error("[WhatsApp] Retry init gagal:", e));
    }, 15000);
  } finally {
    if (sock) starting = false;
  }
}

/**
 * Kirim pesan WhatsApp via Baileys. Melempar error bila nomor invalid /
 * belum tersambung / gagal kirim (agar pemanggil bisa mencatat status & retry).
 */
export async function sendWhatsApp(rawNumber: string, message: string): Promise<void> {
  const num = normalizeWaNumber(rawNumber);
  if (!num) throw new Error(`Nomor WA tidak valid: ${rawNumber}`);
  if (!sock || !connected) throw new Error("WhatsApp (Baileys) belum tersambung");

  const jid = `${num}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text: message });
  if (SEND_DELAY_MS > 0) await new Promise((r) => setTimeout(r, SEND_DELAY_MS));
}
