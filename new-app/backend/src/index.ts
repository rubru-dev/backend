import "express-async-errors";
import express from "express";
import cors from "cors";
import path from "path";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { authenticate } from "./middleware/auth";

import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";
import bdRouter from "./routes/bd";
import contentCreatorRouter from "./routes/contentCreator";
import desainRouter from "./routes/desain";
import interiorRouter from "./routes/interior";
import sipilRouter from "./routes/sipil";
import salesRouter from "./routes/sales";
import projekRouter from "./routes/projek";
import financeRouter from "./routes/finance";
import picProjectRouter from "./routes/picProject";
import laporanHarianRouter from "./routes/laporanHarian";
import salesAdminKanbanRouter from "./routes/salesAdminKanban";
import telemarketingKanbanRouter from "./routes/telemarketingKanban";

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

// Body parsing
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Static files (uploaded storage)
app.use("/storage", express.static(path.resolve(config.storagePath)));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
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
app.use("/api/v1/projek", authenticate, projekRouter);
app.use("/api/v1/finance", authenticate, financeRouter);
app.use("/api/v1/pic-project", authenticate, picProjectRouter);
app.use("/api/v1/laporan-harian", authenticate, laporanHarianRouter);
app.use("/api/v1/sales-admin", authenticate, salesAdminKanbanRouter);
app.use("/api/v1/telemarketing", authenticate, telemarketingKanbanRouter);

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
    const status = err.status ?? err.statusCode ?? 500;
    res.status(status).json({ detail: err.message ?? "Internal server error" });
  }
);

app.listen(config.port, () => {
  console.log(`✓ StockOpname API running on http://localhost:${config.port}`);
  console.log(`  • Health: http://localhost:${config.port}/health`);
  console.log(`  • API:    http://localhost:${config.port}/api/v1`);
});

export default app;
