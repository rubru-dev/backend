// Helper tipis untuk memanggil REST API Evolution (WhatsApp gateway self-host).
// Dipakai oleh endpoint admin "GET QR Whatsapp" agar admin bisa connect nomor
// pengirim langsung dari UI aplikasi (buat instance, tampilkan QR, cek status).
import axios from "axios";
import { config } from "../config";

export function evolutionConfigured(): { ok: boolean; detail?: string } {
  if (!config.evolutionBaseUrl) return { ok: false, detail: "EVOLUTION_BASE_URL belum diset" };
  if (!config.evolutionApiKey) return { ok: false, detail: "EVOLUTION_API_KEY belum diset" };
  if (!config.evolutionInstance) return { ok: false, detail: "EVOLUTION_INSTANCE belum diset" };
  return { ok: true };
}

function client() {
  return axios.create({
    baseURL: config.evolutionBaseUrl.replace(/\/$/, ""),
    headers: { apikey: config.evolutionApiKey, "Content-Type": "application/json" },
    timeout: 15000,
    // Jangan lempar untuk 4xx — kita tangani manual (mis. 404 = instance belum ada).
    validateStatus: () => true,
  });
}

const INSTANCE = () => config.evolutionInstance;

/** State koneksi instance: "open" (tersambung), "connecting", "close", atau null bila belum ada. */
export async function getConnectionState(): Promise<{ state: string | null; raw: any }> {
  const res = await client().get(`/instance/connectionState/${INSTANCE()}`);
  if (res.status === 404) return { state: null, raw: res.data };
  const state = res.data?.instance?.state ?? res.data?.state ?? null;
  return { state, raw: res.data };
}

/** Buat instance baru (idempotent-ish: pemanggil harus cek dulu belum ada). */
export async function createInstance(number?: string): Promise<any> {
  const body: Record<string, unknown> = {
    instanceName: INSTANCE(),
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
  };
  if (number) body.number = number; // memungkinkan Evolution menyediakan pairing code
  const res = await client().post(`/instance/create`, body);
  if (res.status >= 400) throw new Error(`Evolution create gagal (${res.status}): ${JSON.stringify(res.data)}`);
  return res.data;
}

/** Ambil QR (base64) untuk instance yang sedang connecting. */
export async function connectInstance(): Promise<{ qr_base64: string | null; pairing_code: string | null; raw: any }> {
  const res = await client().get(`/instance/connect/${INSTANCE()}`);
  if (res.status >= 400) throw new Error(`Evolution connect gagal (${res.status}): ${JSON.stringify(res.data)}`);
  const d = res.data ?? {};
  return {
    qr_base64: d.base64 ?? d.qrcode?.base64 ?? null,
    pairing_code: d.pairingCode ?? d.qrcode?.pairingCode ?? null,
    raw: d,
  };
}

/** Logout / putuskan sesi WhatsApp (agar bisa scan ulang dengan nomor lain). */
export async function logoutInstance(): Promise<void> {
  const res = await client().delete(`/instance/logout/${INSTANCE()}`);
  if (res.status >= 400 && res.status !== 404) {
    throw new Error(`Evolution logout gagal (${res.status}): ${JSON.stringify(res.data)}`);
  }
}

/** Nomor WhatsApp yang sedang tersambung (owner instance), bila ada. */
export async function getConnectedNumber(): Promise<string | null> {
  const res = await client().get(`/instance/fetchInstances?instanceName=${encodeURIComponent(INSTANCE())}`);
  if (res.status >= 400) return null;
  const arr = Array.isArray(res.data) ? res.data : [res.data];
  const inst = arr.find((i: any) => (i?.name ?? i?.instance?.instanceName) === INSTANCE()) ?? arr[0];
  const owner: string | undefined =
    inst?.ownerJid ?? inst?.owner ?? inst?.instance?.owner ?? inst?.number;
  if (!owner) return null;
  return String(owner).replace(/@.*/, "");
}

/**
 * Daftarkan webhook pesan masuk ke Evolution agar mengarah ke backend ini sendiri.
 * Dipanggil otomatis saat connect supaya inbound "siap pakai" tanpa curl manual.
 * No-op bila EVOLUTION_WEBHOOK_TOKEN belum diset.
 */
export async function ensureWebhook(): Promise<void> {
  if (!config.evolutionWebhookToken) return;
  const base = config.appUrl.replace(/\/$/, "");
  const url = `${base}/v1/webhooks/evolution/${config.evolutionWebhookToken}`;
  await client().post(`/webhook/set/${INSTANCE()}`, {
    webhook: { enabled: true, url, events: ["MESSAGES_UPSERT"] },
  });
}
