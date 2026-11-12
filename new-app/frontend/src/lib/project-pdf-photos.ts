import type { LaporanPicItem } from "@/lib/api/laporanPic";
import { storageUrl } from "@/lib/storage-url";

type TaskPhoto = { file_path?: string | null };

type CollectProjectPdfPhotosOptions = {
  taskIds: string[];
  getTaskPhotos: (taskId: string) => Promise<TaskPhoto[]>;
  reports: LaporanPicItem[];
};

type PreparedPhoto = { dataUrl: string; hash: string | null };

const MAX_IMAGE_EDGE = 1200;
const JPEG_QUALITY = 0.72;
const PHOTO_CONCURRENCY = 4;

function normalizePhotoPath(path: string): string {
  const value = path.trim();
  const storageIndex = value.indexOf("/storage/");
  const normalized = storageIndex >= 0 ? value.slice(storageIndex) : value;
  return normalized.split(/[?#]/, 1)[0];
}

async function sha256(blob: Blob): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  try {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

async function compressForPdf(blob: Blob): Promise<string> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Gambar tidak dapat dibaca"));
      element.src = objectUrl;
    });
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas tidak tersedia");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function preparePhoto(path: string): Promise<PreparedPhoto | null> {
  const url = storageUrl(path);
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const hash = await sha256(blob);
    try {
      return { dataUrl: await compressForPdf(blob), hash };
    } catch {
      return { dataUrl: url, hash };
    }
  } catch {
    return null;
  }
}

async function mapWithConcurrency<T, R>(items: T[], mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(PHOTO_CONCURRENCY, items.length) }, () => worker()));
  return results;
}

export async function collectProjectPdfPhotos({
  taskIds,
  getTaskPhotos,
  reports,
}: CollectProjectPdfPhotosOptions): Promise<{
  taskPhotos: Record<string, string[]>;
  unassignedPhotos: string[];
}> {
  const orderedTaskIds = taskIds.map(String);
  const taskOrder = new Map(orderedTaskIds.map((taskId, index) => [taskId, index]));
  const directPhotos = await Promise.all(
    orderedTaskIds.map(async (taskId) => {
      try {
        return await getTaskPhotos(taskId);
      } catch {
        return [];
      }
    }),
  );
  const candidates: { taskId: string | null; path: string }[] = [];
  orderedTaskIds.forEach((taskId, index) => {
    directPhotos[index].forEach((photo) => {
      if (photo.file_path) candidates.push({ taskId, path: photo.file_path });
    });
  });
  reports.forEach((report) => {
    const linkedTaskIds = [
      ...(report.tasks ?? []).map((task) => String(task.id)),
      ...(report.task_id ? [String(report.task_id)] : []),
    ];
    const targetTaskId = Array.from(new Set(linkedTaskIds))
      .filter((taskId) => taskOrder.has(taskId))
      .sort((left, right) => taskOrder.get(left)! - taskOrder.get(right)!)[0] ?? null;
    (report.images ?? []).forEach((path) => {
      if (path) candidates.push({ taskId: targetTaskId, path });
    });
  });

  const seenPaths = new Set<string>();
  const uniquePathCandidates = candidates.filter(({ path }) => {
    const normalizedPath = normalizePhotoPath(path);
    if (!normalizedPath || seenPaths.has(normalizedPath)) return false;
    seenPaths.add(normalizedPath);
    return true;
  });
  const prepared = await mapWithConcurrency(uniquePathCandidates, ({ path }) => preparePhoto(path));
  const taskPhotos: Record<string, string[]> = Object.fromEntries(orderedTaskIds.map((taskId) => [taskId, []]));
  const unassignedPhotos: string[] = [];
  const seenHashes = new Set<string>();
  prepared.forEach((photo, index) => {
    if (!photo) return;
    if (photo.hash && seenHashes.has(photo.hash)) return;
    if (photo.hash) seenHashes.add(photo.hash);
    const targetTaskId = uniquePathCandidates[index].taskId;
    if (targetTaskId && taskPhotos[targetTaskId]) taskPhotos[targetTaskId].push(photo.dataUrl);
    else unassignedPhotos.push(photo.dataUrl);
  });
  return { taskPhotos, unassignedPhotos };
}
