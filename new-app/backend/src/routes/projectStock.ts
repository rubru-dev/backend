import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();
const VALID_TYPES = ["sipil", "interior"];
const VALID_JENIS = ["Alat", "Material"];
const VALID_MOVEMENTS = ["BARANG_MASUK", "BARANG_KELUAR", "DIKEMBALIKAN"];

function isSuperAdmin(req: Request) {
  return req.user?.roles.some((r: any) => r.role.name === "Super Admin") ?? false;
}

function canApprovePB(req: Request) {
  return isSuperAdmin(req) || req.user?.roles.some((r: any) => ["Head Finance", "Admin Finance"].includes(r.role.name)) === true;
}

function num(value: unknown) { return Number(value ?? 0); }
function cleanType(value: unknown) { return String(value) === "interior" ? "interior" : "sipil"; }

async function stockSummary(projectType: string, projectId: bigint) {
  const items = await prisma.projectStockItem.findMany({
    where: { project_type: projectType, project_id: projectId },
    include: { movements: { orderBy: [{ tanggal: "desc" }, { id: "desc" }] }, pb_items: { include: { pb: true } } },
    orderBy: [{ jenis: "asc" }, { nama_item: "asc" }],
  });
  return items.map((item) => {
    const movement = (type: string) => item.movements.filter((m) => m.movement_type === type).reduce((s, m) => s + num(m.qty), 0);
    const pb = item.pb_items.filter((p) => ["Disetujui", "Diproses PR", "Sebagian Dipenuhi"].includes(p.pb.status)).reduce((s, p) => s + num(p.qty), 0);
    const masuk = movement("BARANG_MASUK");
    const keluar = movement("BARANG_KELUAR");
    const dikembalikan = movement("DIKEMBALIKAN");
    return {
      id: String(item.id), project_type: item.project_type, project_id: String(item.project_id), jenis: item.jenis,
      nama_item: item.nama_item, satuan: item.satuan, qty_total: num(item.qty_total), pb, sisa_pengajuan: Math.max(0, num(item.qty_total) - pb),
      barang_masuk: masuk, barang_keluar: keluar, dikembalikan, sisa_fisik: Math.max(0, masuk - keluar - dikembalikan),
      keterangan: item.keterangan,
      pb_history: item.pb_items.map((p) => ({ id: String(p.pb.id), nomor_pb: p.pb.nomor_pb, status: p.pb.status, qty: num(p.qty), created_at: p.pb.created_at })),
      history: item.movements.map((m) => ({ id: String(m.id), type: m.movement_type, qty: num(m.qty), tanggal: m.tanggal, reference_type: m.reference_type, reference_id: m.reference_id ? String(m.reference_id) : null, warehouse_id: m.warehouse_id ? String(m.warehouse_id) : null, catatan: m.catatan, created_by: m.created_by ? String(m.created_by) : null })),
    };
  });
}

router.get("/:projectType/:projectId", async (req, res) => {
  const projectType = cleanType(req.params.projectType);
  const projectId = BigInt(req.params.projectId);
  return res.json(await stockSummary(projectType, projectId));
});

router.get("/pb", async (_req, res) => {
  const rows = await prisma.projectPB.findMany({ include: { items: { include: { stock_item: true } }, creator: { select: { name: true } } }, orderBy: { created_at: "desc" } });
  return res.json(rows.map((pb) => ({ id: String(pb.id), project_type: pb.project_type, project_id: String(pb.project_id), nomor_pb: pb.nomor_pb, status: pb.status, pr_id: pb.pr_id ? String(pb.pr_id) : null, created_at: pb.created_at, creator: pb.creator?.name ?? null, items: pb.items.map((i) => ({ nama_item: i.stock_item.nama_item, satuan: i.stock_item.satuan, qty: num(i.qty) })) })));
});

router.get("/warehouses", async (_req, res) => {
  const warehouses = await prisma.warehouse.findMany({ include: { stok: true }, orderBy: { nama: "asc" } });
  return res.json(warehouses.map((warehouse) => ({
    id: String(warehouse.id),
    nama: warehouse.nama,
    items: warehouse.stok.map((stock) => ({
      id: String(stock.id), nama_barang: stock.nama_barang ?? "", jenis: stock.jenis,
      quantity: num(stock.quantity), satuan: stock.satuan, kondisi_barang: stock.kondisi_barang,
    })),
  })));
});

router.get("/warehouse/:id/allocations", async (req, res) => {
  const warehouseId = BigInt(req.params.id);
  const movements = await prisma.projectStockMovement.findMany({ where: { warehouse_id: warehouseId }, include: { stock_item: true }, orderBy: { tanggal: "desc" } });
  const sipilIds = [...new Set(movements.filter((m) => m.project_type === "sipil").map((m) => m.project_id))];
  const interiorIds = [...new Set(movements.filter((m) => m.project_type === "interior").map((m) => m.project_id))];
  const [sipils, interiors] = await Promise.all([
    prisma.proyekBerjalan.findMany({ where: { id: { in: sipilIds } }, select: { id: true, nama_proyek: true } }),
    prisma.proyekInterior.findMany({ where: { id: { in: interiorIds } }, select: { id: true, nama_proyek: true } }),
  ]);
  const names = new Map<string, string>([...sipils.map((p) => [`sipil:${p.id}`, p.nama_proyek ?? `Projek #${p.id}`] as [string, string]), ...interiors.map((p) => [`interior:${p.id}`, p.nama_proyek ?? `Projek #${p.id}`] as [string, string])]);
  return res.json(movements.map((m) => ({ id: String(m.id), nama_item: m.stock_item.nama_item, project_type: m.project_type, project_id: String(m.project_id), project_name: names.get(`${m.project_type}:${m.project_id}`) || `Projek #${m.project_id}`, movement_type: m.movement_type, qty: num(m.qty), satuan: m.stock_item.satuan, tanggal: m.tanggal, catatan: m.catatan })));
});

router.post("/:projectType/:projectId/items", async (req: Request, res: Response) => {
  const projectType = cleanType(req.params.projectType);
  const projectId = BigInt(req.params.projectId);
  const { jenis, nama_item, satuan, qty_total, keterangan } = req.body;
  if (!VALID_JENIS.includes(jenis) || !nama_item?.trim() || !satuan?.trim()) return res.status(400).json({ detail: "Jenis, nama item, dan satuan wajib diisi" });
  const qty = num(qty_total);
  if (qty <= 0) return res.status(400).json({ detail: "Qty Total harus lebih besar dari 0" });
  const item = await prisma.projectStockItem.create({ data: { project_type: projectType, project_id: projectId, jenis, nama_item: String(nama_item).trim(), satuan: String(satuan).trim(), qty_total: qty, keterangan: keterangan || null, created_by: req.user!.id } });
  return res.status(201).json({ id: String(item.id) });
});

router.patch("/items/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { jenis, nama_item, satuan, qty_total, keterangan } = req.body;
  const item = await prisma.projectStockItem.findUnique({ where: { id }, include: { movements: true, pb_items: true } });
  if (!item) return res.status(404).json({ detail: "Item Stock Opname tidak ditemukan" });
  if (item.movements.length || item.pb_items.length) return res.status(400).json({ detail: "Item yang sudah memiliki transaksi tidak dapat diubah" });
  await prisma.projectStockItem.update({ where: { id }, data: { ...(jenis && { jenis }), ...(nama_item && { nama_item: String(nama_item).trim() }), ...(satuan && { satuan: String(satuan).trim() }), ...(qty_total !== undefined && { qty_total: num(qty_total) }), ...(keterangan !== undefined && { keterangan: keterangan || null }) } });
  return res.json({ message: "Item diupdate" });
});

router.post("/items/:id/movements", async (req: Request, res: Response) => {
  const stockItemId = BigInt(req.params.id);
  const item = await prisma.projectStockItem.findUnique({ where: { id: stockItemId } });
  if (!item) return res.status(404).json({ detail: "Item Stock Opname tidak ditemukan" });
  const { movement_type, qty, tanggal, warehouse_id, warehouse_stock_id, reference_type, reference_id, catatan } = req.body;
  const amount = num(qty);
  if (!VALID_MOVEMENTS.includes(movement_type) || amount <= 0) return res.status(400).json({ detail: "Jenis transaksi dan qty wajib valid" });
  const current = await stockSummary(item.project_type, item.project_id);
  const row = current.find((x) => x.id === String(stockItemId));
  if (movement_type === "BARANG_KELUAR" && amount > (row?.sisa_fisik ?? 0)) return res.status(400).json({ detail: "Barang Keluar melebihi sisa fisik" });
  if (movement_type === "DIKEMBALIKAN" && !warehouse_id) return res.status(400).json({ detail: "Warehouse tujuan wajib dipilih untuk pengembalian" });
  if (movement_type === "BARANG_MASUK" && warehouse_id && !warehouse_stock_id) return res.status(400).json({ detail: "Item Warehouse sumber wajib dipilih" });

  let movement;
  try {
    movement = await prisma.$transaction(async (tx) => {
    let warehouseStockId: bigint | null = warehouse_stock_id ? BigInt(warehouse_stock_id) : null;
    if (movement_type === "BARANG_MASUK" && warehouse_id) {
      const source = await tx.stokWarehouse.findFirst({ where: { id: warehouseStockId!, warehouse_id: BigInt(warehouse_id) } });
      if (!source) throw new Error("Item Warehouse sumber tidak ditemukan");
      if ((source.nama_barang ?? "").trim().toLowerCase() !== item.nama_item.trim().toLowerCase() || source.jenis !== item.jenis) throw new Error("Item Warehouse tidak sesuai dengan item projek");
      if (num(source.quantity) < amount) throw new Error("Quantity Warehouse tidak mencukupi");
      await tx.stokWarehouse.update({ where: { id: source.id }, data: { quantity: num(source.quantity) - amount } });
    }
    if (movement_type === "DIKEMBALIKAN") {
      let target = warehouseStockId
        ? await tx.stokWarehouse.findFirst({ where: { id: warehouseStockId, warehouse_id: BigInt(warehouse_id) } })
        : await tx.stokWarehouse.findFirst({ where: { warehouse_id: BigInt(warehouse_id), nama_barang: item.nama_item, jenis: item.jenis } });
      if (!target) {
        target = await tx.stokWarehouse.create({ data: { warehouse_id: BigInt(warehouse_id), nama_barang: item.nama_item, quantity: amount, satuan: item.satuan, jenis: item.jenis, kondisi_barang: "Baik", is_custom: true } });
      } else {
        await tx.stokWarehouse.update({ where: { id: target.id }, data: { quantity: num(target.quantity) + amount } });
      }
      warehouseStockId = target.id;
    }
    return tx.projectStockMovement.create({ data: { stock_item_id: stockItemId, movement_type, qty: amount, project_type: item.project_type, project_id: item.project_id, tanggal: tanggal ? new Date(tanggal) : new Date(), warehouse_id: warehouse_id ? BigInt(warehouse_id) : null, warehouse_stock_id: warehouseStockId, reference_type: reference_type || null, reference_id: reference_id ? BigInt(reference_id) : null, catatan: catatan || null, created_by: req.user!.id } });
  }).catch((error: any) => {
    if (["Item Warehouse sumber tidak ditemukan", "Item Warehouse tidak sesuai dengan item projek", "Quantity Warehouse tidak mencukupi"].includes(error?.message)) throw Object.assign(new Error(error.message), { statusCode: 400 });
    throw error;
    });
  } catch (error: any) {
    return res.status(error?.statusCode === 400 ? 400 : 500).json({ detail: error?.message || "Gagal mencatat transaksi stok" });
  }
  return res.status(201).json({ id: String(movement.id) });
});

router.get("/:projectType/:projectId/pb", async (req, res) => {
  const rows = await prisma.projectPB.findMany({ where: { project_type: cleanType(req.params.projectType), project_id: BigInt(req.params.projectId) }, include: { items: { include: { stock_item: true } }, creator: { select: { name: true } } }, orderBy: { created_at: "desc" } });
  return res.json(rows.map((pb) => ({ id: String(pb.id), nomor_pb: pb.nomor_pb, status: pb.status, catatan: pb.catatan, created_at: pb.created_at, creator: pb.creator?.name ?? null, items: pb.items.map((i) => ({ id: String(i.id), stock_item_id: String(i.stock_item_id), nama_item: i.stock_item.nama_item, satuan: i.stock_item.satuan, qty: num(i.qty) })) })));
});

router.post("/:projectType/:projectId/pb", async (req: Request, res: Response) => {
  const projectType = cleanType(req.params.projectType);
  const projectId = BigInt(req.params.projectId);
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ detail: "Minimal satu item PB harus dipilih" });
  const stockIds = items.map((i: any) => BigInt(i.stock_item_id));
  const stockRows = await prisma.projectStockItem.findMany({ where: { id: { in: stockIds }, project_type: projectType, project_id: projectId }, include: { pb_items: { include: { pb: true } } } });
  if (stockRows.length !== stockIds.length) return res.status(400).json({ detail: "Item PB tidak sesuai dengan projek" });
  for (const input of items) {
    const row = stockRows.find((s) => String(s.id) === String(input.stock_item_id));
    const approved = row?.pb_items.filter((p) => ["Disetujui", "Diproses PR", "Sebagian Dipenuhi"].includes(p.pb.status)).reduce((s, p) => s + num(p.qty), 0) ?? 0;
    if (num(input.qty) <= 0 || approved + num(input.qty) > num(row?.qty_total)) return res.status(400).json({ detail: `Qty PB untuk ${row?.nama_item} melebihi sisa pengajuan` });
  }
  const pb = await prisma.projectPB.create({ data: { project_type: projectType, project_id: projectId, nomor_pb: `PB-${Date.now()}`, catatan: req.body.catatan || null, created_by: req.user!.id, items: { create: items.map((i: any) => ({ stock_item_id: BigInt(i.stock_item_id), qty: num(i.qty) })) } } });
  return res.status(201).json({ id: String(pb.id), status: pb.status });
});

async function findFinanceProject(projectType: string, projectId: bigint) {
  const project = projectType === "interior"
    ? await prisma.proyekInterior.findUnique({ where: { id: projectId }, select: { nama_proyek: true } })
    : await prisma.proyekBerjalan.findUnique({ where: { id: projectId }, select: { nama_proyek: true } });
  if (!project) return null;

  const direct = await prisma.admFinanceProject.findFirst({
    where: projectType === "interior" ? { proyek_interior_id: projectId } : { proyek_berjalan_id: projectId },
  });
  if (direct) return direct;

  // Fallback for older finance projects that were created before the explicit
  // project relation existed.
  return prisma.admFinanceProject.findFirst({ where: { nama_proyek: project.nama_proyek ?? undefined } });
}

router.post("/pb/:id/create-pr", async (req: Request, res: Response) => {
  if (!canApprovePB(req)) return res.status(403).json({ detail: "Tidak memiliki akses membuat PR" });
  const id = BigInt(req.params.id);
  const pb = await prisma.projectPB.findUnique({ where: { id }, include: { items: { include: { stock_item: true } } } });
  if (!pb) return res.status(404).json({ detail: "PB tidak ditemukan" });
  if (pb.pr_id) return res.status(409).json({ detail: "PB ini sudah memiliki PR", pr_id: String(pb.pr_id) });
  if (pb.status !== "Disetujui") return res.status(400).json({ detail: "PB harus disetujui sebelum dibuat menjadi PR" });
  if (!pb.items.length) return res.status(400).json({ detail: "PB tidak memiliki item" });

  const financeProject = await findFinanceProject(pb.project_type, pb.project_id);
  if (!financeProject) return res.status(400).json({ detail: "Projek belum terhubung ke Administrasi Projek Finance" });

  const prCount = await prisma.projekPR.count({ where: { adm_finance_project_id: financeProject.id } });
  const nomorPr = `PR-${String(prCount + 1).padStart(3, "0")}`;
  const result = await prisma.$transaction(async (tx) => {
    if (pb.project_type === "interior" && !financeProject.proyek_interior_id) {
      await tx.admFinanceProject.update({ where: { id: financeProject.id }, data: { proyek_interior_id: pb.project_id } });
    }
    if (pb.project_type !== "interior" && !financeProject.proyek_berjalan_id) {
      await tx.admFinanceProject.update({ where: { id: financeProject.id }, data: { proyek_berjalan_id: pb.project_id } });
    }
    const pr = await tx.projekPR.create({
      data: {
        adm_finance_project_id: financeProject.id,
        nomor_pr: nomorPr,
        tanggal: new Date(),
        keperluan: `Pengadaan berdasarkan ${pb.nomor_pb ?? `PB-${pb.id}`}`,
        catatan: pb.catatan ?? null,
        status: "Pending",
        items: {
          create: pb.items.map((item) => ({
            nama_item: item.stock_item.nama_item,
            satuan: item.stock_item.satuan,
            qty: Number(item.qty),
            harga_perkiraan: 0,
            diskon_harga_satuan: 0,
            is_from_rapp: false,
          })),
        },
      },
      include: { items: true },
    });
    await tx.projectStockMovement.createMany({
      data: pb.items.map((item) => ({
        stock_item_id: item.stock_item_id,
        movement_type: "BARANG_MASUK",
        qty: Number(item.qty),
        project_type: pb.project_type,
        project_id: pb.project_id,
        tanggal: new Date(),
        reference_type: "PR",
        reference_id: pr.id,
        catatan: `Barang masuk dari ${nomorPr}`,
        created_by: req.user!.id,
      })),
    });
    await tx.projectPB.update({ where: { id }, data: { status: "Diproses PR", pr_id: pr.id } });
    return pr;
  });

  return res.status(201).json({ message: "PR berhasil dibuat dari PB", pr_id: String(result.id), nomor_pr: result.nomor_pr, adm_finance_project_id: String(financeProject.id) });
});

router.patch("/pb/:id/status", async (req: Request, res: Response) => {
  if (!canApprovePB(req)) return res.status(403).json({ detail: "Tidak memiliki akses approval PB" });
  const id = BigInt(req.params.id);
  const status = ["Disetujui", "Ditolak", "Diproses PR", "Selesai"].includes(req.body.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ detail: "Status PB tidak valid" });
  const pb = await prisma.projectPB.update({ where: { id }, data: { status, approved_by: req.user!.id, approved_at: new Date() } });
  return res.json({ id: String(pb.id), status: pb.status });
});

export default router;
