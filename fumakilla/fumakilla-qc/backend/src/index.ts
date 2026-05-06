import express from "express";
import cors from "cors";
import path from "path";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth";
import inspectionRoutes from "./routes/inspection";
import ocrRoutes from "./routes/ocr";
import ncrRoutes from "./routes/ncr";
import batchRoutes from "./routes/batch";
import documentRoutes from "./routes/document";
import analyticsRoutes from "./routes/analytics";
import { errorHandler } from "./middleware/errorHandler";
import { ensureDir, uploadRoot } from "./lib/upload";

const app = express();
const PORT = Number(process.env.PORT || 4003);

ensureDir(uploadRoot);

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3003", credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: true, legacyHeaders: false }));
app.use("/uploads", express.static(uploadRoot));

app.use("/api/auth", authRoutes);
app.use("/api/inspection", inspectionRoutes);
app.use("/api/ocr", ocrRoutes);
app.use("/api/ncr", ncrRoutes);
app.use("/api/batch", batchRoutes);
app.use("/api/document", documentRoutes);
app.use("/api/analytics", analyticsRoutes);

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "fumakilla-qc-api", uploadRoot: path.basename(uploadRoot) }));

app.use(errorHandler);

app.listen(PORT, () => console.log(`API Fumakilla QC berjalan di port ${PORT}`));
