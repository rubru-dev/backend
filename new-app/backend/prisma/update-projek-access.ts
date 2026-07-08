/**
 * Update TERARAH — hanya role access yang baru diminta (Projek + Laporan PIC).
 * TIDAK menjalankan seeder utama / tidak menyentuh data lain.
 *
 * Jalankan di VPS (dari folder backend):
 *   npx ts-node --transpile-only prisma/update-projek-access.ts
 *
 * Aman diulang (idempoten): CREATE TABLE IF NOT EXISTS + upsert permission + grant.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Permission yang didaftarkan agar muncul di Admin > Roles
const NEW_PERMISSIONS: Array<{ name: string; module: string; label: string }> = [
  // Sub-menu PIC
  { name: "pic.dokumentasi", module: "pic", label: "Sub-menu: Upload Dokumentasi Projek" },
  // Projek Sipil tab-level
  { name: "projek_sipil.termin",       module: "projek_sipil", label: "Tab: Daftar Termin Sipil" },
  { name: "projek_sipil.gantt",        module: "projek_sipil", label: "Tab: Gantt Chart Sipil" },
  { name: "projek_sipil.docs",         module: "projek_sipil", label: "Tab: Docs/Link Sipil" },
  { name: "projek_sipil.rapp",         module: "projek_sipil", label: "Tab: RAPP Sipil" },
  { name: "projek_sipil.stock_opname", module: "projek_sipil", label: "Tab: Stock Opname Sipil" },
  { name: "projek_sipil.dokumentasi",  module: "projek_sipil", label: "Tab: Dokumentasi Foto Sipil" },
  { name: "projek_sipil.checklist",    module: "projek_sipil", label: "Tab: Form Checklist Sipil" },
  { name: "projek_sipil.laporan_pic",  module: "projek_sipil", label: "Tab: Laporan PIC Project Sipil" },
  // Projek Interior tab-level
  { name: "projek_interior.termin",      module: "projek_interior", label: "Tab: Daftar Termin Interior" },
  { name: "projek_interior.gantt",       module: "projek_interior", label: "Tab: Gantt Chart Interior" },
  { name: "projek_interior.rapp",        module: "projek_interior", label: "Tab: RAPP Interior" },
  { name: "projek_interior.docs",        module: "projek_interior", label: "Tab: Docs/Link Interior" },
  { name: "projek_interior.dokumentasi", module: "projek_interior", label: "Tab: Dokumentasi Foto Interior" },
  { name: "projek_interior.checklist",   module: "projek_interior", label: "Tab: Form Checklist Interior" },
  { name: "projek_interior.laporan_pic", module: "projek_interior", label: "Tab: Laporan PIC Project Interior" },
  // Projek Desain tab-level
  { name: "projek_desain.gantt",  module: "projek_desain", label: "Tab: Gantt Chart Desain" },
  { name: "projek_desain.docs",   module: "projek_desain", label: "Tab: Docs/Link Desain" },
  { name: "projek_desain.kanban", module: "projek_desain", label: "Tab: Kanban Pekerjaan Desain" },
];

// Permission yang langsung diberikan ke role "PIC Project" (fitur yang diminta)
const GRANT_TO_PIC = ["pic.dokumentasi", "projek_sipil.laporan_pic", "projek_interior.laporan_pic"];

async function main() {
  // 1) Tabel laporan_pic_projeks (untuk fitur Laporan PIC Project) — additive, aman.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS laporan_pic_projeks (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT,
      project_type VARCHAR(20) NOT NULL,
      project_id BIGINT NOT NULL,
      project_nama VARCHAR(255),
      tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
      kegiatan TEXT NOT NULL,
      kendala TEXT,
      images JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_laporan_pic_projeks_project ON laporan_pic_projeks (project_type, project_id);`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'laporan_pic_projeks_user_id_fkey') THEN
        ALTER TABLE laporan_pic_projeks
          ADD CONSTRAINT laporan_pic_projeks_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE NO ACTION ON DELETE SET NULL;
      END IF;
    END $$;
  `);
  console.log("✓ Tabel laporan_pic_projeks siap");

  // 2) Daftarkan / update permission (muncul di matrix Admin > Roles)
  for (const p of NEW_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: { module: p.module, label: p.label },
      create: p,
    });
  }
  console.log(`✓ ${NEW_PERMISSIONS.length} permission didaftarkan/di-update`);

  // 3) Berikan permission fitur ke role "PIC Project" (kalau role-nya ada)
  const role = await prisma.role.findFirst({ where: { name: "PIC Project" } });
  if (!role) {
    console.log("! Role 'PIC Project' tidak ditemukan — lewati grant (silakan centang manual di Admin > Roles)");
  } else {
    let granted = 0;
    for (const name of GRANT_TO_PIC) {
      const perm = await prisma.permission.findUnique({ where: { name } });
      if (!perm) continue;
      const exists = await prisma.rolePermission.findUnique({
        where: { role_id_permission_id: { role_id: role.id, permission_id: perm.id } },
      });
      if (!exists) {
        await prisma.rolePermission.create({ data: { role_id: role.id, permission_id: perm.id } });
        granted++;
      }
    }
    console.log(`✓ Role 'PIC Project' mendapat ${granted} permission baru (${GRANT_TO_PIC.join(", ")})`);
  }

  console.log("Selesai. Tidak ada data lain yang tersentuh.");
}

main()
  .catch((e) => {
    console.error("Gagal:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
