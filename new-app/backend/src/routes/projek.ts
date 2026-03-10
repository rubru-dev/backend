import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// ── Kategori Barang ───────────────────────────────────────────────────────────

router.get("/kategori-barang", async (_req: Request, res: Response) => {
  const items = await prisma.kategoriBarang.findMany({ orderBy: { nama: "asc" } });
  return res.json(items.map((k) => ({ id: k.id, nama: k.nama })));
});

router.post("/kategori-barang", async (req: Request, res: Response) => {
  const k = await prisma.kategoriBarang.create({ data: { nama: req.body.nama } });
  return res.status(201).json({ id: k.id, nama: k.nama });
});

router.delete("/kategori-barang/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const k = await prisma.kategoriBarang.findUnique({ where: { id } });
  if (!k) return res.status(404).json({ detail: "Kategori tidak ditemukan" });
  await prisma.kategoriBarang.delete({ where: { id } });
  return res.json({ message: "Kategori dihapus" });
});

// ── Barang ────────────────────────────────────────────────────────────────────

router.get("/barang", async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string) || 50, 200);
  const search = req.query.search as string | undefined;
  const kategoriId = req.query.kategori_id ? parseInt(req.query.kategori_id as string) : undefined;

  const where: Record<string, unknown> = {};
  if (search) where.nama = { contains: search, mode: "insensitive" };
  if (kategoriId) where.kategori_id = kategoriId;

  const [total, items] = await Promise.all([
    prisma.barang.count({ where }),
    prisma.barang.findMany({
      where,
      include: { kategori: true },
      orderBy: { nama: "asc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);
  return res.json({
    items: items.map((b) => ({
      id: b.id, nama: b.nama, supplier: b.supplier, price: parseFloat(String(b.price ?? 0)), satuan: b.satuan,
      kategori: b.kategori ? { id: b.kategori.id, nama: b.kategori.nama } : null,
    })),
    total, page, per_page: perPage,
  });
});

router.post("/barang", async (req: Request, res: Response) => {
  const { kategori_id, nama, supplier, price, satuan } = req.body;
  const b = await prisma.barang.create({
    data: { kategori_id: kategori_id ?? null, nama, supplier: supplier ?? null, price: price ?? 0, satuan: satuan ?? null },
  });
  return res.status(201).json({ id: b.id, nama: b.nama });
});

router.patch("/barang/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const b = await prisma.barang.findUnique({ where: { id } });
  if (!b) return res.status(404).json({ detail: "Barang tidak ditemukan" });
  const { kategori_id, nama, supplier, price, satuan } = req.body;
  const updates: Record<string, unknown> = {};
  if (kategori_id !== undefined) updates.kategori_id = kategori_id;
  if (nama !== undefined) updates.nama = nama;
  if (supplier !== undefined) updates.supplier = supplier;
  if (price !== undefined) updates.price = price;
  if (satuan !== undefined) updates.satuan = satuan;
  await prisma.barang.update({ where: { id }, data: updates });
  return res.json({ message: "Barang diupdate" });
});

router.delete("/barang/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const b = await prisma.barang.findUnique({ where: { id } });
  if (!b) return res.status(404).json({ detail: "Barang tidak ditemukan" });
  await prisma.barang.delete({ where: { id } });
  return res.json({ message: "Barang dihapus" });
});

// ── Warehouse ─────────────────────────────────────────────────────────────────

router.get("/warehouse", async (_req: Request, res: Response) => {
  const whs = await prisma.warehouse.findMany({ include: { stok: true } });
  return res.json(whs.map((w) => ({ id: w.id, nama: w.nama, jumlah_item: w.stok.length })));
});

router.post("/warehouse", async (req: Request, res: Response) => {
  const w = await prisma.warehouse.create({ data: { nama: req.body.nama } });
  return res.status(201).json({ id: w.id, nama: w.nama });
});

router.get("/warehouse/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const w = await prisma.warehouse.findUnique({ where: { id }, include: { stok: { include: { barang: true } } } });
  if (!w) return res.status(404).json({ detail: "Warehouse tidak ditemukan" });
  return res.json({
    id: w.id, nama: w.nama,
    stok: w.stok.map((s) => ({
      id: s.id, barang_id: s.barang_id, nama_barang: s.nama_barang ?? (s.barang ? s.barang.nama : ""),
      is_custom: s.is_custom, quantity: parseFloat(String(s.quantity ?? 0)), price: parseFloat(String(s.price ?? 0)),
      satuan: s.satuan, supplier: s.supplier, total_harga: parseFloat(String(s.total_harga ?? 0)),
    })),
  });
});

router.patch("/warehouse/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const w = await prisma.warehouse.findUnique({ where: { id } });
  if (!w) return res.status(404).json({ detail: "Warehouse tidak ditemukan" });
  await prisma.warehouse.update({ where: { id }, data: { nama: req.body.nama } });
  return res.json({ message: "Warehouse diupdate" });
});

router.delete("/warehouse/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const w = await prisma.warehouse.findUnique({ where: { id } });
  if (!w) return res.status(404).json({ detail: "Warehouse tidak ditemukan" });
  await prisma.warehouse.delete({ where: { id } });
  return res.json({ message: "Warehouse dihapus" });
});

router.get("/warehouse/:id/stok", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const items = await prisma.stokWarehouse.findMany({
    where: { warehouse_id: id },
    include: { barang: true },
  });
  return res.json(
    items.map((s) => ({
      id: s.id, barang_id: s.barang_id, nama_barang: s.nama_barang ?? (s.barang ? s.barang.nama : ""),
      is_custom: s.is_custom, quantity: parseFloat(String(s.quantity ?? 0)), price: parseFloat(String(s.price ?? 0)),
      satuan: s.satuan, supplier: s.supplier, total_harga: parseFloat(String(s.total_harga ?? 0)),
    }))
  );
});

router.post("/warehouse/:id/stok", async (req: Request, res: Response) => {
  const wid = BigInt(req.params.id);
  const { barang_id, nama_barang, is_custom, quantity, price, satuan, supplier } = req.body;
  const qty = quantity ?? 0;
  const prc = price ?? 0;
  let barangNama = nama_barang ?? null;
  if (!is_custom && barang_id) {
    const b = await prisma.barang.findUnique({ where: { id: barang_id } });
    if (b) barangNama = b.nama;
  }
  const s = await prisma.stokWarehouse.create({
    data: {
      warehouse_id: wid, barang_id: barang_id ?? null, nama_barang: barangNama,
      is_custom: is_custom ?? false, quantity: qty, price: prc,
      satuan: satuan ?? null, supplier: supplier ?? null, total_harga: qty * prc,
    },
  });
  return res.status(201).json({ id: s.id, message: "Stok ditambahkan" });
});

router.patch("/warehouse/:wid/stok/:sid", async (req: Request, res: Response) => {
  const wid = BigInt(req.params.wid);
  const sid = BigInt(req.params.sid);
  const s = await prisma.stokWarehouse.findFirst({ where: { id: sid, warehouse_id: wid } });
  if (!s) return res.status(404).json({ detail: "Stok tidak ditemukan" });
  const { quantity, price, satuan } = req.body;
  const updates: Record<string, unknown> = {};
  if (quantity !== undefined) updates.quantity = quantity;
  if (price !== undefined) updates.price = price;
  if (satuan !== undefined) updates.satuan = satuan;
  const updated = await prisma.stokWarehouse.update({ where: { id: sid }, data: updates });
  await prisma.stokWarehouse.update({
    where: { id: sid },
    data: { total_harga: parseFloat(String(updated.quantity ?? 0)) * parseFloat(String(updated.price ?? 0)) },
  });
  return res.json({ message: "Stok diupdate" });
});

router.delete("/warehouse/:wid/stok/:sid", async (req: Request, res: Response) => {
  const wid = BigInt(req.params.wid);
  const sid = BigInt(req.params.sid);
  const s = await prisma.stokWarehouse.findFirst({ where: { id: sid, warehouse_id: wid } });
  if (!s) return res.status(404).json({ detail: "Stok tidak ditemukan" });
  await prisma.stokWarehouse.delete({ where: { id: sid } });
  return res.json({ message: "Stok dihapus" });
});

// ── By-type summary ───────────────────────────────────────────────────────────

router.get("/by-type", async (_req: Request, res: Response) => {
  const [projekCount, stockOpnameCount, proyekBerjalanCount] = await Promise.all([
    prisma.projek.count(),
    prisma.stockOpnameProject.count(),
    prisma.proyekBerjalan.count(),
  ]);
  return res.json({
    types: [
      { type: "projek", label: "Projek Interior", count: projekCount },
      { type: "stock-opname", label: "Stock Opname", count: stockOpnameCount },
      { type: "proyek-berjalan", label: "Proyek Berjalan", count: proyekBerjalanCount },
    ],
    total: projekCount + stockOpnameCount + proyekBerjalanCount,
  });
});

// ── Projek ────────────────────────────────────────────────────────────────────

router.get("/projeks", async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string) || 20, 100);
  const search = req.query.search as string | undefined;

  const where = search ? { nama: { contains: search, mode: "insensitive" as const } } : {};
  const [total, items] = await Promise.all([
    prisma.projek.count({ where }),
    prisma.projek.findMany({
      where,
      include: { pic: true, termins: true },
      orderBy: { id: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);
  return res.json({
    items: items.map((p) => ({
      id: p.id, nama: p.nama, tanggal_mulai: p.tanggal_mulai, tanggal_selesai: p.tanggal_selesai,
      jumlah_termin: p.termins.length, pic: p.pic ? { name: p.pic.name } : null,
    })),
    total, page, per_page: perPage,
  });
});

router.post("/projeks", async (req: Request, res: Response) => {
  const { nama, tanggal_mulai, tanggal_selesai, pic_user_id } = req.body;
  const p = await prisma.projek.create({
    data: {
      nama, pic_user_id: pic_user_id ?? null,
      tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null,
      tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null,
    },
  });
  return res.status(201).json({ id: p.id, nama: p.nama });
});

router.get("/projeks/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.projek.findUnique({
    where: { id },
    include: { pic: true, termins: { include: { barang_termins: true } } },
  });
  if (!p) return res.status(404).json({ detail: "Projek tidak ditemukan" });
  return res.json({
    id: p.id, nama: p.nama, tanggal_mulai: p.tanggal_mulai, tanggal_selesai: p.tanggal_selesai,
    pic: p.pic ? { id: p.pic.id, name: p.pic.name } : null,
    termins: p.termins.map((t) => ({
      id: t.id, nama: t.nama, status: t.status, tanggal_mulai: t.tanggal_mulai, tanggal_selesai: t.tanggal_selesai,
      barang_termins: t.barang_termins.map((b) => ({
        id: b.id, quantity: parseFloat(String(b.quantity ?? 0)),
        satuan: b.satuan, price: parseFloat(String(b.price ?? 0)), total_harga: parseFloat(String(b.total_harga ?? 0)),
        keterangan: b.keterangan,
      })),
    })),
  });
});

router.patch("/projeks/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.projek.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ detail: "Projek tidak ditemukan" });
  const { nama, tanggal_mulai, tanggal_selesai, pic_user_id } = req.body;
  const updates: Record<string, unknown> = {};
  if (nama !== undefined) updates.nama = nama;
  if (tanggal_mulai !== undefined) updates.tanggal_mulai = tanggal_mulai ? new Date(tanggal_mulai) : null;
  if (tanggal_selesai !== undefined) updates.tanggal_selesai = tanggal_selesai ? new Date(tanggal_selesai) : null;
  if (pic_user_id !== undefined) updates.pic_user_id = pic_user_id;
  await prisma.projek.update({ where: { id }, data: updates });
  return res.json({ message: "Projek diupdate" });
});

router.delete("/projeks/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.projek.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ detail: "Projek tidak ditemukan" });
  await prisma.projek.delete({ where: { id } });
  return res.json({ message: "Projek dihapus" });
});

// ── Termin ────────────────────────────────────────────────────────────────────

router.get("/projeks/:pid/termins", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.pid);
  const items = await prisma.termin.findMany({ where: { projek_id: pid }, orderBy: { id: "asc" } });
  return res.json(items.map((t) => ({ id: t.id, nama: t.nama, status: t.status, tanggal_mulai: t.tanggal_mulai, tanggal_selesai: t.tanggal_selesai })));
});

router.post("/projeks/:pid/termins", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.pid);
  const { nama, tanggal_mulai, tanggal_selesai, status } = req.body;
  const t = await prisma.termin.create({
    data: {
      nama, projek_id: pid, status: status ?? "Aktif",
      tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null,
      tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null,
    },
  });
  return res.status(201).json({ id: t.id, nama: t.nama });
});

router.get("/termins/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.termin.findUnique({ where: { id }, include: { barang_termins: true } });
  if (!t) return res.status(404).json({ detail: "Termin tidak ditemukan" });
  return res.json({
    id: t.id, nama: t.nama, status: t.status, tanggal_mulai: t.tanggal_mulai, tanggal_selesai: t.tanggal_selesai,
    barang_termins: t.barang_termins.map((b) => ({
      id: b.id, quantity: parseFloat(String(b.quantity ?? 0)),
      satuan: b.satuan, price: parseFloat(String(b.price ?? 0)),
      total_harga: parseFloat(String(b.total_harga ?? 0)), keterangan: b.keterangan,
    })),
  });
});

router.patch("/termins/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.termin.findUnique({ where: { id } });
  if (!t) return res.status(404).json({ detail: "Termin tidak ditemukan" });
  const { nama, tanggal_mulai, tanggal_selesai, status } = req.body;
  const updates: Record<string, unknown> = {};
  if (nama !== undefined) updates.nama = nama;
  if (tanggal_mulai !== undefined) updates.tanggal_mulai = tanggal_mulai ? new Date(tanggal_mulai) : null;
  if (tanggal_selesai !== undefined) updates.tanggal_selesai = tanggal_selesai ? new Date(tanggal_selesai) : null;
  if (status !== undefined) updates.status = status;
  await prisma.termin.update({ where: { id }, data: updates });
  return res.json({ message: "Termin diupdate" });
});

router.delete("/termins/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.termin.findUnique({ where: { id } });
  if (!t) return res.status(404).json({ detail: "Termin tidak ditemukan" });
  await prisma.termin.delete({ where: { id } });
  return res.json({ message: "Termin dihapus" });
});

router.post("/termins/:id/barang", async (req: Request, res: Response) => {
  const tid = BigInt(req.params.id);
  const { barang_id, quantity, satuan, price, keterangan } = req.body;
  const qty = quantity ?? 0;
  const harga = price ?? 0;
  const bt = await prisma.barangTermin.create({
    data: {
      termin_id: tid, barang_id: barang_id ?? null,
      quantity: qty, satuan: satuan ?? null, price: harga,
      keterangan: keterangan ?? null, total_harga: qty * harga,
    },
  });
  return res.status(201).json({ id: bt.id, message: "Barang ditambahkan" });
});

router.delete("/termin-barang/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const bt = await prisma.barangTermin.findUnique({ where: { id } });
  if (!bt) return res.status(404).json({ detail: "Item tidak ditemukan" });
  await prisma.barangTermin.delete({ where: { id } });
  return res.json({ message: "Item dihapus" });
});

// ── Stock Opname ──────────────────────────────────────────────────────────────

router.get("/stock-opname", async (_req: Request, res: Response) => {
  const items = await prisma.stockOpnameProject.findMany({
    include: { termins: true },
  });
  return res.json(
    items.map((p) => ({
      id: p.id, nama_client: p.nama_client, lokasi: p.lokasi, status: p.status,
      tanggal_mulai: p.tanggal_mulai, tanggal_selesai: p.tanggal_selesai,
      jumlah_termin: p.termins.length,
    }))
  );
});

router.post("/stock-opname", async (req: Request, res: Response) => {
  const { nama_client, lokasi, tanggal_mulai, tanggal_selesai, status } = req.body;
  const p = await prisma.stockOpnameProject.create({
    data: {
      nama_client: nama_client ?? null, lokasi: lokasi ?? null, status: status ?? "aktif",
      tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null,
      tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null,
      created_by: req.user!.id,
    },
  });
  return res.status(201).json({ id: p.id, nama_client: p.nama_client });
});

router.get("/stock-opname/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.stockOpnameProject.findUnique({
    where: { id },
    include: { termins: true },
  });
  if (!p) return res.status(404).json({ detail: "Project tidak ditemukan" });
  return res.json({
    id: p.id, nama_client: p.nama_client, lokasi: p.lokasi, status: p.status,
    tanggal_mulai: p.tanggal_mulai, tanggal_selesai: p.tanggal_selesai,
    termins: p.termins.map((t) => ({ id: t.id, nama: t.nama, status: t.status, termin_ke: t.termin_ke })),
  });
});

router.patch("/stock-opname/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.stockOpnameProject.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ detail: "Project tidak ditemukan" });
  const { nama_client, lokasi, tanggal_mulai, tanggal_selesai, status } = req.body;
  const updates: Record<string, unknown> = {};
  if (nama_client !== undefined) updates.nama_client = nama_client;
  if (lokasi !== undefined) updates.lokasi = lokasi;
  if (tanggal_mulai !== undefined) updates.tanggal_mulai = tanggal_mulai ? new Date(tanggal_mulai) : null;
  if (tanggal_selesai !== undefined) updates.tanggal_selesai = tanggal_selesai ? new Date(tanggal_selesai) : null;
  if (status !== undefined) updates.status = status;
  await prisma.stockOpnameProject.update({ where: { id }, data: updates });
  return res.json({ message: "Project diupdate" });
});

router.delete("/stock-opname/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.stockOpnameProject.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ detail: "Project tidak ditemukan" });
  await prisma.stockOpnameProject.delete({ where: { id } });
  return res.json({ message: "Project dihapus" });
});

router.post("/stock-opname/:pid/termins", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.pid);
  const { nama, termin_ke, status } = req.body;
  const t = await prisma.stockOpnameTermin.create({
    data: {
      nama: nama ?? null, project_id: pid,
      termin_ke: termin_ke ?? 1, status: status ?? "aktif",
    },
  });
  return res.status(201).json({ id: t.id });
});

router.get("/stock-opname/termins/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.stockOpnameTermin.findUnique({
    where: { id },
    include: { rapp_items: { include: { usage_items: true } } },
  });
  if (!t) return res.status(404).json({ detail: "Termin tidak ditemukan" });
  return res.json({
    id: t.id, nama: t.nama, status: t.status,
    rapp_items: t.rapp_items.map((r) => ({
      id: r.id, nama_pekerjaan: r.nama_pekerjaan, qty_rapp: parseFloat(String(r.qty_rapp ?? 0)),
      qty_tersisa: parseFloat(String(r.qty_tersisa ?? 0)),
      usage_items: r.usage_items.map((u) => ({
        id: u.id, tanggal_pakai: u.tanggal_pakai, qty_dipakai: parseFloat(String(u.qty_dipakai ?? 0)), catatan: u.catatan,
      })),
    })),
  });
});

router.post("/stock-opname/termins/:tid/rapp-items", async (req: Request, res: Response) => {
  const tid = BigInt(req.params.tid);
  const { nama_pekerjaan, qty_rapp } = req.body;
  const r = await prisma.stockOpnameRappItem.create({
    data: { termin_id: tid, nama_pekerjaan: nama_pekerjaan ?? null, qty_rapp: qty_rapp ?? 0 },
  });
  return res.status(201).json({ id: r.id });
});

router.post("/stock-opname/rapp-items/:rid/usage", async (req: Request, res: Response) => {
  const rid = BigInt(req.params.rid);
  const { tanggal_pakai, qty_dipakai, catatan } = req.body;
  const u = await prisma.stockOpnameUsageItem.create({
    data: {
      rapp_item_id: rid, qty_dipakai: qty_dipakai ?? 0, catatan: catatan ?? null,
      tanggal_pakai: tanggal_pakai ? new Date(tanggal_pakai) : null,
    },
  });
  return res.status(201).json({ id: u.id });
});

router.delete("/stock-opname/usage/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const u = await prisma.stockOpnameUsageItem.findUnique({ where: { id } });
  if (!u) return res.status(404).json({ detail: "Item tidak ditemukan" });
  await prisma.stockOpnameUsageItem.delete({ where: { id } });
  return res.json({ message: "Item dihapus" });
});

export default router;
