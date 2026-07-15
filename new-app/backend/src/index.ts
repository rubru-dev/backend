import "express-async-errors";
import dns from "dns";
// VPS sering punya IPv6 yang tidak terroute → koneksi keluar ke host dual-stack
// (WhatsApp WebSocket, Meta Graph API) menunggu IPv6 mati lalu timeout (ETIMEDOUT / 408).
// Paksa Node mendahulukan IPv4 agar koneksi langsung pakai jalur yang hidup.
dns.setDefaultResultOrder("ipv4first");
import express from "express";
import cors from "cors";
import path from "path";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { authenticate } from "./middleware/auth";

import { PrismaClient } from "@prisma/client";
import { syncCamerasToMediaMTX } from "./lib/mediamtx";
import { startMetaAutoRefresh } from "./lib/metaAutoRefresh";
import { startReminderScheduler } from "./lib/fonteeReminderScheduler";
import { startHardcodedReminderScheduler } from "./lib/hardcodedReminderScheduler";
import { initWhatsApp } from "./lib/whatsapp";

const prismaSync = new PrismaClient();

import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";
import bdRouter from "./routes/bd";
import contentCreatorRouter from "./routes/contentCreator";
import desainRouter from "./routes/desain";
import interiorRouter from "./routes/interior";
import sipilRouter from "./routes/sipil";
import salesRouter from "./routes/sales";
import salesVisitRouter from "./routes/salesVisit";
import geoRouter from "./routes/geo";
import projekRouter from "./routes/projek";
import financeRouter from "./routes/finance";
import picProjectRouter from "./routes/picProject";
import laporanHarianRouter from "./routes/laporanHarian";
import salesAdminKanbanRouter from "./routes/salesAdminKanban";
import telemarketingKanbanRouter from "./routes/telemarketingKanban";
import clientRouter from "./routes/client";
import clientPortalRouter from "./routes/clientPortal";
import notificationsRouter from "./routes/notifications";
import publicRbRouter from "./routes/publicRb";
import websiteAdminRouter from "./routes/websiteAdmin";
import absenKaryawanRouter from "./routes/absenKaryawan";
import goldenRouter from "./routes/golden";
import goldenKanbanAdminRouter from "./routes/goldenKanbanAdmin";
import goldenKanbanSalesRouter from "./routes/goldenKanbanSales";
import tutorialRouter from "./routes/tutorial";
import penawaranRouter from "./routes/penawaran";

// BigInt serialization fix
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

const app = express();

// Di produksi backend ada di belakang proxy berlapis: Client → nginx → Next.js → Node.
// (Next.js ikut jadi proxy karena next.config.js me-rewrite /api/v1/* ke backend.)
// Tanpa ini `req.ip` = IP proxy untuk SEMUA user, sehingga rate limiter menghitung seluruh
// tim sebagai satu klien — jatah request dipakai bersama dan user acak kena 429.
// Nilainya = jumlah hop proxy (nginx + Next.js = 2). Jangan pakai `true` (rawan spoof
// header X-Forwarded-For).
// CATATAN: saat ini praktis tidak berpengaruh karena Next.js tidak meneruskan
// X-Forwarded-For (lihat catatan pada rate limiter di bawah). Dibiarkan agar langsung
// berfungsi bila kelak nginx/Next dikonfigurasi meneruskan IP asli.
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? 2));

// CORS
const corsOrigins = config.corsAllowAll ? "*" : config.corsOrigins;
app.use(
  cors({
    origin: corsOrigins,
    credentials: corsOrigins !== "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting
//
// PENTING: request dari browser masuk lewat proxy rewrite Next.js (next.config.js),
// dan header X-Forwarded-For TIDAK diteruskan ke backend — sudah diverifikasi di
// produksi: req.headers["x-forwarded-for"] = null dan req.ip = ::ffff:127.0.0.1
// untuk semua user. Akibatnya SEMUA user terlihat
// beralamat sama, sehingga rate limit berbasis IP menjadi satu jatah bersama untuk
// seluruh tim → user acak kena 429 (dulu bikin input lead gagal random).
//
// Karena itu kuncinya memakai identitas user dari JWT, bukan IP. Token hanya di-decode
// (tanpa verify) — ini sekadar pengelompokan kuota, bukan kontrol keamanan; verifikasi
// token yang sebenarnya tetap dilakukan middleware `authenticate` di tiap router.
function rateLimitKey(req: express.Request): string {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try {
      const decoded = jwt.decode(auth.slice(7)) as { sub?: string } | null;
      if (decoded?.sub) return `user:${decoded.sub}`;
    } catch {
      /* token tidak terbaca → jatuh ke IP */
    }
  }
  return `ip:${req.ip ?? "unknown"}`;
}

// max 100/15mnt terlalu ketat untuk dashboard entri data (satu halaman saja sudah
// belasan request: list, filter, dropdown, invalidate). Bisa disetel via env bila perlu.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX ?? "1000", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: "Terlalu banyak request, coba lagi dalam 15 menit" },
  keyGenerator: rateLimitKey,
  // Peringatan bawaan soal normalisasi IPv6 tidak relevan: kunci utama kita user JWT,
  // dan IP di sini selalu 127.0.0.1 (proxy Next.js).
  validate: { keyGeneratorIpFallback: false },
  skip: () => config.corsAllowAll, // skip rate limit di development
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { detail: "Terlalu banyak percobaan login, coba lagi dalam 15 menit" },
  skip: () => config.corsAllowAll,
});

// Body parsing — limit 50mb karena foto absen/bon dikirim sebagai base64 (30MB file → ~40MB base64)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static files (uploaded storage)
app.use("/storage", express.static(path.resolve(config.storagePath)));
// Alias di bawah /api/v1 — rute /api/v1/* sudah pasti diteruskan reverse proxy/Next ke backend,
// sedangkan /storage terpisah belum tentu diroute di production. Didaftarkan SEBELUM rate limiter
// & auth agar gambar tidak kena limit dan tetap publik.
app.use("/api/v1/storage", express.static(path.resolve(config.storagePath)));

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Apply rate limiters
app.use("/api/v1", apiLimiter);
app.use("/api/v1/auth/login", loginLimiter);

// Auth routes (no global authenticate — individual endpoints handle it)
app.use("/api/v1/auth", authRouter);

// Admin routes (authenticate individually + role checks inside)
app.use("/api/v1/admin", authenticate, adminRouter);

// All other routes require authentication
app.use("/api/v1/bd", authenticate, bdRouter);
app.use("/api/v1/content-creator", authenticate, contentCreatorRouter);
app.use("/api/v1/desain", authenticate, desainRouter);
app.use("/api/v1/interior", authenticate, interiorRouter);
app.use("/api/v1/sipil", authenticate, sipilRouter);
app.use("/api/v1/sales", authenticate, salesRouter);
app.use("/api/v1/sales-visit", authenticate, salesVisitRouter);
app.use("/api/v1/geo", authenticate, geoRouter);
app.use("/api/v1/projek", authenticate, projekRouter);
app.use("/api/v1/finance", authenticate, financeRouter);
app.use("/api/v1/pic-project", authenticate, picProjectRouter);
app.use("/api/v1/pic", authenticate, picProjectRouter);
app.use("/api/v1/laporan-harian", authenticate, laporanHarianRouter);
app.use("/api/v1/sales-admin", authenticate, salesAdminKanbanRouter);
app.use("/api/v1/telemarketing", authenticate, telemarketingKanbanRouter);
app.use("/api/v1/client", authenticate, clientRouter);
app.use("/api/v1/client-portal", clientPortalRouter);
app.use("/api/v1/notifications", authenticate, notificationsRouter); // auth dihandle per-route (login public, sisanya via authenticateClientPortal)

// Public website routes (no auth — for website-rubahrumah frontend)
app.use("/v1/public/rb", publicRbRouter);

// Website admin routes (auth required — for internal dashboard)
app.use("/api/v1/website", authenticate, websiteAdminRouter);

// Absen Karyawan
app.use("/api/v1/absen-karyawan", authenticate, absenKaryawanRouter);
app.use("/api/v1/golden", authenticate, goldenRouter);
app.use("/api/v1/golden-kanban-admin", authenticate, goldenKanbanAdminRouter);
app.use("/api/v1/golden-kanban-sales", authenticate, goldenKanbanSalesRouter);
app.use("/api/v1/tutorial", authenticate, tutorialRouter);
app.use("/api/v1/penawaran", authenticate, penawaranRouter);

// Global error handler
app.use(
  (
    err: Error & { status?: number; statusCode?: number },
    _req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction
  ) => {
    console.error(err);
    // Konversi BigInt gagal (mis. id/param non-numerik) → 400 Bad Request, bukan 500
    if (err instanceof SyntaxError && /bigint/i.test(err.message)) {
      res.status(400).json({ detail: "Parameter tidak valid" });
      return;
    }
    const status = err.status ?? err.statusCode ?? 500;
    res.status(status).json({ detail: err.message ?? "Internal server error" });
  }
);

app.listen(config.port, async () => {
  console.log(`✓ StockOpname API running on http://localhost:${config.port}`);
  console.log(`  • Health: http://localhost:${config.port}/health`);
  console.log(`  • API:    http://localhost:${config.port}/api/v1`);

  // WhatsApp self-host (Baileys). Fire-and-forget: koneksi async + tampilkan QR di log
  // saat pertama kali / setelah logout. Tidak boleh mengganggu startup lain bila gagal.
  try {
    initWhatsApp().catch((err) => console.error("✗ initWhatsApp gagal:", err));
  } catch (err) {
    console.error("✗ initWhatsApp gagal:", err);
  }

  // Auto-refresh Meta token setiap 45 hari.
  // Tiap starter dibungkus try/catch terpisah: kegagalan satu tidak boleh membatalkan
  // pendaftaran scheduler lain (dulu error di sini membuat semua reminder daily mati diam-diam).
  try {
    startMetaAutoRefresh();
  } catch (err) {
    console.error("✗ startMetaAutoRefresh gagal:", err);
  }

  // Reminder WhatsApp otomatis berdasarkan FonteeReminderRule (cek setiap jam + 16:50 + absen)
  // Termasuk kalender_visit_reminder (menggantikan hardcoded kalenderVisitReminder)
  try {
    startReminderScheduler();
  } catch (err) {
    console.error("✗ startReminderScheduler gagal:", err);
  }
  try {
    startHardcodedReminderScheduler();
  } catch (err) {
    console.error("✗ startHardcodedReminderScheduler gagal:", err);
  }

  // Sync RTSP cameras to MediaMTX (graceful — won't crash if MediaMTX isn't running)
  try {
    const cameras = await prismaSync.clientPortalCctvStream.findMany({
      where: { is_active: true, stream_type: "rtsp" },
      select: { stream_path: true, stream_url: true, stream_type: true },
    });
    await syncCamerasToMediaMTX(cameras);
    if (cameras.filter((c) => c.stream_path).length > 0) {
      console.log(`  • MediaMTX: synced ${cameras.filter((c) => c.stream_path).length} RTSP camera(s)`);
    }
  } catch (err) {
    console.warn("  • MediaMTX: sync skipped (not running or DB error):", (err as Error).message);
  }
});

export default app;
