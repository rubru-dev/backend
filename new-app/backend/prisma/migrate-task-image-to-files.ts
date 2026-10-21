/**
 * Migrasi task_image ContentTimeline dari base64 (kolom DB) → file di /storage.
 *
 * Kenapa: dulu task_image disimpan sebagai base64 @db.Text, sehingga endpoint list
 * (/calendar, /upload-calendar, dll) membawa puluhan MB dan membuat Timeline Konten
 * lag di produksi. Upload baru sudah disimpan sebagai path file; skrip ini mengonversi
 * data LAMA yang masih base64.
 *
 * Aman dijalankan berulang (idempoten): hanya memproses baris yang task_image-nya
 * masih diawali "data:".
 *
 * Jalankan: npm run migrate:task-image   (dari folder backend)
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { config } from "../src/config";

const prisma = new PrismaClient();

function saveTaskImage(dataUrl: string): string {
  const m = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!m) throw new Error("Format gambar tidak valid");
  const ext = m[1].split("/")[1] === "jpeg" ? "jpg" : m[1].split("/")[1];
  const buffer = Buffer.from(m[2], "base64");
  const dir = path.join(path.resolve(config.storagePath), "content-timeline");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/storage/content-timeline/${filename}`;
}

async function main() {
  const rows = await prisma.contentTimeline.findMany({
    where: { task_image: { startsWith: "data:" } },
    select: { id: true, task_image: true },
  });
  console.log(`Ditemukan ${rows.length} baris task_image base64 untuk dimigrasi.`);
  let ok = 0;
  let fail = 0;
  for (const row of rows) {
    try {
      const filePath = saveTaskImage(row.task_image as string);
      await prisma.contentTimeline.update({ where: { id: row.id }, data: { task_image: filePath } });
      ok += 1;
    } catch (err) {
      fail += 1;
      console.error(`  ✗ id=${row.id}: ${(err as Error).message}`);
    }
  }
  console.log(`Selesai. Berhasil: ${ok}, gagal: ${fail}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
