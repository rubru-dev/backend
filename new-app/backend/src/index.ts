import "express-async-errors";
import express from "express";
import cors from "cors";
import path from "path";
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
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: "Terlalu banyak request, coba lagi dalam 15 menit" },
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
