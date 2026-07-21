import { Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { authenticate } from "../middleware/auth";
import { resolveUploadPath, uploadRoot, createUploader, publicUploadPath } from "../lib/upload";
import { isAiConfigured, aiInfo } from "../lib/aiProvider";
import { identifyPestFromImage, identifyPestConversation } from "../lib/pestIdentify";

const router = Router();
router.use(authenticate);

// Upload di memori (tidak simpan ke disk) — gambar aslinya sudah diupload lewat alur laporan.
const memUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

// Cek konfigurasi (tanpa membocorkan API key) — frontend pakai ini utk tampil/sembunyikan tombol AI.
router.get("/status", (_req, res) => {
  res.json({ configured: isAiConfigured(), model: aiInfo.model });
});

// Upload foto generik (persist ke disk) — dipakai komponen AI di semua report.
const photoUpload = createUploader("ai-photos", ["image/jpeg", "image/png", "image/webp"], 15);
router.post("/upload", photoUpload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ path: publicUploadPath(req.file.path) });
});

// Identifikasi hama + draf temuan/rekomendasi.
// Dua cara pakai:
//   1) JSON  { "path": "/uploads/..." }  -> baca gambar yang sudah diupload
//   2) multipart form-data field "file"  -> kirim gambar langsung
router.post("/identify-pest", memUpload.single("file"), async (req, res, next) => {
  try {
    if (!isAiConfigured()) {
      return res.status(503).json({ error: "AI belum dikonfigurasi. Set AI_API_KEY di .env backend." });
    }

    let buffer: Buffer;
    let mimeType: string;

    if (req.file) {
      buffer = req.file.buffer;
      mimeType = req.file.mimetype || "image/jpeg";
    } else if (req.body?.path) {
      const fullPath = resolveUploadPath(String(req.body.path));
      // cegah path traversal: harus di dalam uploadRoot
      if (!path.resolve(fullPath).startsWith(path.resolve(uploadRoot)) || !fs.existsSync(fullPath)) {
        return res.status(400).json({ error: "Gambar tidak ditemukan." });
      }
      buffer = fs.readFileSync(fullPath);
      mimeType = MIME_BY_EXT[path.extname(fullPath).toLowerCase()] || "image/jpeg";
    } else {
      return res.status(400).json({ error: "Sertakan file gambar atau path." });
    }

    const base64 = buffer.toString("base64");

    // Mode percakapan (multi-turn) jika ada `messages`, kalau tidak fallback ke prompt tunggal.
    let rawMsgs = req.body?.messages;
    if (typeof rawMsgs === "string") { try { rawMsgs = JSON.parse(rawMsgs); } catch { rawMsgs = null; } }

    let draft;
    if (Array.isArray(rawMsgs) && rawMsgs.length) {
      const turns = rawMsgs
        .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content }));
      draft = await identifyPestConversation(base64, mimeType, turns);
    } else {
      const instruction = typeof req.body?.prompt === "string" ? req.body.prompt : req.body?.instruction;
      draft = await identifyPestFromImage(base64, mimeType, instruction);
    }
    res.json({ data: draft });
  } catch (e) {
    next(e);
  }
});

export default router;
