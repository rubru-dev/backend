// Helper tipis untuk memanggil REST API Evolution (WhatsApp gateway self-host).
// Dipakai oleh endpoint admin "GET QR Whatsapp" agar admin bisa connect nomor
// pengirim langsung dari UI aplikasi (buat instance, tampilkan QR, cek status).
import axios from "axios";
import { config } from "../config";

export function describeEvolutionError(err: any): string {
  if (err?.response) {
    const status = err.response.status;
    const data = err.response.data;
    return `HTTP ${status}: ${typeof data === "string" ? data : JSON.stringify(data)}`;
  }
  if (err?.code) return `${err.code}: ${err.message ?? "error"}`;
  return err?.message ?? "error";
}

export function evolutionConfigured(): { ok: boolean; detail?: string } {
  if (!config.evolutionBaseUrl) return { ok: false, detail: "EVOLUTION_BASE_URL belum diset" };
  if (!config.evolutionApiKey) return { ok: false, detail: "EVOLUTION_API_KEY belum diset" };
  if (!config.evolutionInstance) return { ok: false, detail: "EVOLUTION_INSTANCE belum diset" };
  return { ok: true };
}

// Timeout dijaga di bawah batas proxy (nginx default 60s) supaya endpoint selalu
// sempat membalas sendiri — kalau tidak, klien menerima 502 dari nginx dan tidak
// pernah melihat pesan error kita.
//
// 30s (bukan 12s): di VPS, inisialisasi socket Baileys jauh lebih lambat daripada
// di lokal — 12s membuat axios menyerah duluan padahal Evolution sebenarnya sehat,
// dan hasilnya jadi 502 "ECONNABORTED" yang menyesatkan. Panggilan murah memakai
// timeout pendek secara eksplisit agar rantai terburuk tetap di bawah 60s.
function client(timeout = 30000) {
  return axios.create({
    baseURL: config.evolutionBaseUrl.replace(/\/$/, ""),
    headers: { apikey: config.evolutionApiKey, "Content-Type": "application/json" },
    timeout,
    // Jangan lempar untuk 4xx — kita tangani manual (mis. 404 = instance belum ada).
    validateStatus: () => true,
  });
}

const INSTANCE = () => config.evolutionInstance;

/** State koneksi instance: "open" (tersambung), "connecting", "close", atau null bila belum ada. */
export async function getConnectionState(): Promise<{ state: string | null; raw: any }> {
  const res = await client(8000).get(`/instance/connectionState/${INSTANCE()}`);
  if (res.status === 404) return { state: null, raw: res.data };
  const state = res.data?.instance?.state ?? res.data?.state ?? null;
  return { state, raw: res.data };
}

/**
 * Buat instance baru (idempotent-ish: pemanggil harus cek dulu belum ada).
 *
 * `number` dikirim agar Evolution/Baileys memakai mode PAIRING CODE (kode 8
 * karakter yang diketik di HP), bukan QR — QR terlalu merepotkan karena
 * kedaluwarsa tiap ~30 detik dan harus di-scan tepat waktu.
 */
export async function createInstance(number?: string): Promise<any> {
  const body: Record<string, unknown> = {
    instanceName: INSTANCE(),
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
  };
  if (number) body.number = number;
  const res = await client().post(`/instance/create`, body);
  if (res.status >= 400) throw new Error(`Evolution create gagal (${res.status}): ${JSON.stringify(res.data)}`);
  return res.data;
}

/**
 * Ambil kode pairing (dan QR sebagai cadangan) untuk instance yang sedang connecting.
 * Bila `number` diisi, Evolution mengembalikan pairingCode untuk nomor tersebut.
 */
export async function connectInstance(
  number?: string
): Promise<{ qr_base64: string | null; pairing_code: string | null; raw: any }> {
  const path = number
    ? `/instance/connect/${INSTANCE()}?number=${encodeURIComponent(number)}`
    : `/instance/connect/${INSTANCE()}`;
  const res = await client().get(path);
  if (res.status >= 400) throw new Error(`Evolution connect gagal (${res.status}): ${JSON.stringify(res.data)}`);
  const d = res.data ?? {};
  return {
    qr_base64: d.base64 ?? d.qrcode?.base64 ?? null,
    pairing_code: d.pairingCode ?? d.qrcode?.pairingCode ?? null,
    raw: d,
  };
}

/**
 * Restart socket instance TANPA menghapusnya.
 *
 * Dipakai untuk memulihkan keadaan aneh setelah delete, di mana Evolution sudah
 * lupa instance-nya di `connectionState` (404) tapi masih menahan namanya sehingga
 * `create` ditolak 403. Sebelum ini, satu-satunya jalan keluar adalah SSH ke VPS
 * lalu `pm2 restart evolution-api` — sekarang aplikasi mengurusnya sendiri.
 *
 * Sengaja tidak melempar: ini upaya pemulihan, kegagalannya bukan akhir dunia.
 */
export async function restartInstance(): Promise<boolean> {
  // Versi Evolution berbeda-beda memakai PUT atau POST untuk endpoint ini.
  const put = await client(15000).put(`/instance/restart/${INSTANCE()}`).catch(() => null);
  if (put && put.status < 400) return true;
  const post = await client(15000).post(`/instance/restart/${INSTANCE()}`).catch(() => null);
  return !!post && post.status < 400;
}

/** Hapus instance sepenuhnya — dipakai untuk mulai dari nol saat sesi nyangkut. */
export async function deleteInstance(): Promise<void> {
  // Logout dulu (diabaikan bila gagal), baru hapus — Evolution kadang menolak
  // delete selama sesi masih dianggap aktif.
  await client(8000).delete(`/instance/logout/${INSTANCE()}`).catch(() => undefined);
  const res = await client(8000).delete(`/instance/delete/${INSTANCE()}`);
  if (res.status >= 400 && res.status !== 404) {
    const message = JSON.stringify(res.data ?? {});
    if (res.status === 400 && /does not exist|not exist|not found/i.test(message)) return;
    throw new Error(`Evolution delete gagal (${res.status}): ${JSON.stringify(res.data)}`);
  }
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
  const res = await client(8000).get(`/instance/fetchInstances?instanceName=${encodeURIComponent(INSTANCE())}`);
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
  await client(8000).post(`/webhook/set/${INSTANCE()}`, {
    webhook: { enabled: true, url, events: ["MESSAGES_UPSERT"] },
  });
}
