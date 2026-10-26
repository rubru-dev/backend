import { prisma } from "../src/lib/prisma";
import { ensureImageThumbnails } from "../src/lib/imageThumbnail";

function parsePaths(value: string | null, single: string | null): string[] {
  if (value) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
    } catch {
      // Gunakan kolom path tunggal untuk data lama yang JSON-nya tidak valid.
    }
  }
  return single ? [single] : [];
}

async function main() {
  const [sipil, interior, reportFiles, legacyReports] = await Promise.all([
    prisma.checklistSipil.findMany({ select: { gambar_path: true, gambar_paths: true, gambar_selesai_path: true, gambar_selesai_paths: true } }),
    prisma.checklistInterior.findMany({ select: { gambar_path: true, gambar_paths: true, gambar_selesai_path: true, gambar_selesai_paths: true } }),
    prisma.laporanPicProjekImage.findMany({ select: { file_path: true } }),
    prisma.laporanPicProjek.findMany({ select: { images: true } }),
  ]);

  const paths = new Set<string>();
  for (const item of [...sipil, ...interior]) {
    parsePaths(item.gambar_paths, item.gambar_path).forEach((value) => paths.add(value));
    parsePaths(item.gambar_selesai_paths, item.gambar_selesai_path).forEach((value) => paths.add(value));
  }
  reportFiles.forEach((item) => paths.add(item.file_path));
  for (const report of legacyReports) {
    if (Array.isArray(report.images)) {
      report.images.filter((item): item is string => typeof item === "string").forEach((item) => paths.add(item));
    }
  }

  const result = await ensureImageThumbnails([...paths], 4);
  console.log(`Thumbnail checklist selesai: ${result.created}/${result.total}, gagal: ${result.failed}`);
  if (result.failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Backfill thumbnail gagal:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
