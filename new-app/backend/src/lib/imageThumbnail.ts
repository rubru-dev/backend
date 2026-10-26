import fs from "fs";
import path from "path";
import sharp from "sharp";
import { config } from "../config";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

function storageRelativePath(publicPath: string): string | null {
  const clean = publicPath.split("?")[0].replace(/^\/api\/v1/, "");
  if (!clean.startsWith("/storage/")) return null;
  const relative = clean.slice("/storage/".length).replace(/\\/g, "/");
  if (!relative || relative.startsWith("_thumbs/") || relative.includes("../")) return null;
  return relative;
}

export function thumbnailStoragePath(publicPath: string): string {
  const relative = storageRelativePath(publicPath);
  if (!relative) return publicPath;
  const parsed = path.posix.parse(relative);
  return `/storage/_thumbs/${parsed.dir ? `${parsed.dir}/` : ""}${parsed.base}.webp`;
}

export async function ensureImageThumbnail(publicPath: string): Promise<string | null> {
  const relative = storageRelativePath(publicPath);
  if (!relative || !IMAGE_EXTENSIONS.has(path.extname(relative).toLowerCase())) return null;

  const sourcePath = path.resolve(config.storagePath, relative);
  const thumbnailPublicPath = thumbnailStoragePath(publicPath);
  const thumbnailRelative = thumbnailPublicPath.slice("/storage/".length);
  const outputPath = path.resolve(config.storagePath, thumbnailRelative);
  const storageRoot = `${path.resolve(config.storagePath)}${path.sep}`;
  if (!sourcePath.startsWith(storageRoot) || !outputPath.startsWith(storageRoot) || !fs.existsSync(sourcePath)) return null;

  if (fs.existsSync(outputPath)) {
    const [sourceStat, outputStat] = await Promise.all([fs.promises.stat(sourcePath), fs.promises.stat(outputPath)]);
    if (outputStat.mtimeMs >= sourceStat.mtimeMs) return thumbnailPublicPath;
  }

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(sourcePath, { animated: false })
    .rotate()
    .resize({ width: 320, height: 320, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 72, effort: 4 })
    .toFile(outputPath);
  return thumbnailPublicPath;
}

export async function ensureImageThumbnails(publicPaths: string[], concurrency = 4) {
  const uniquePaths = Array.from(new Set(publicPaths));
  let created = 0;
  let failed = 0;
  for (let offset = 0; offset < uniquePaths.length; offset += concurrency) {
    const batch = uniquePaths.slice(offset, offset + concurrency);
    const results = await Promise.allSettled(batch.map((publicPath) => ensureImageThumbnail(publicPath)));
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) created += 1;
      else if (result.status === "rejected") failed += 1;
    }
  }
  return { total: uniquePaths.length, created, failed };
}

export function deleteImageThumbnail(publicPath: string) {
  const thumbnailPath = thumbnailStoragePath(publicPath);
  if (thumbnailPath === publicPath) return;
  const relative = thumbnailPath.slice("/storage/".length);
  const absolutePath = path.resolve(config.storagePath, relative);
  const storageRoot = `${path.resolve(config.storagePath)}${path.sep}`;
  if (absolutePath.startsWith(storageRoot) && fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
}
