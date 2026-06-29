import express from "express";
import cors from "cors";
import path from "path";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth";
import erpRoutes from "./routes/erp";
import b2bReportRoutes from "./routes/b2b-report";
import b2cReportRoutes from "./routes/b2c-report";
import { errorHandler } from "./middleware/errorHandler";
import { authenticateFile } from "./middleware/auth";
import { ensureDir, uploadRoot } from "./lib/upload";

const app = express();
const PORT = Number(process.env.PORT || 4003);

ensureDir(uploadRoot);

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3003", credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: true, legacyHeaders: false }));

app.use("/api/files", authenticateFile, (req, res, next) => {
  const subpath = req.path.replace(/^\//, "");
  const fullPath = path.resolve(uploadRoot, subpath);
  if (!fullPath.startsWith(path.resolve(uploadRoot))) return res.status(403).end();
  res.sendFile(fullPath, (err) => { if (err) next(err); });
});

app.use("/api/auth", authRoutes);
app.use("/api/erp", erpRoutes);
app.use("/api/b2b-report", b2bReportRoutes);
app.use("/api/b2c-report", b2cReportRoutes);

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "fumakilla-erp-api", uploadRoot: path.basename(uploadRoot) }));

app.use(errorHandler);

app.listen(PORT, () => console.log(`API Fumakilla ERP berjalan di port ${PORT}`));
