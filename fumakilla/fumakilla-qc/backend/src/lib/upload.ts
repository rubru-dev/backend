import fs from "fs";
import path from "path";
import multer from "multer";

export const uploadRoot = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeFileName(originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  const base = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base || "file"}${ext}`;
}

export function createUploader(subdir: string, allowedMime: string[], maxSizeMb = 10) {
  const targetDir = path.join(uploadRoot, subdir);
  ensureDir(targetDir);

  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, targetDir),
      filename: (_req, file, cb) => cb(null, safeFileName(file.originalname)),
    }),
    limits: { fileSize: maxSizeMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!allowedMime.includes(file.mimetype)) {
        return cb(new Error(`Tipe file tidak diizinkan: ${file.mimetype}`));
      }
      return cb(null, true);
    },
  });
}

export function publicUploadPath(filePath: string) {
  const relative = path.relative(uploadRoot, filePath).replace(/\\/g, "/");
  return `/uploads/${relative}`;
}

export function resolveUploadPath(publicPath: string) {
  const cleaned = publicPath.replace(/^\/uploads\//, "");
  return path.join(uploadRoot, cleaned);
}

export function deleteFileIfExists(publicPath?: string | null) {
  if (!publicPath) return;
  const fullPath = resolveUploadPath(publicPath);
  if (fullPath.startsWith(uploadRoot) && fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
}
