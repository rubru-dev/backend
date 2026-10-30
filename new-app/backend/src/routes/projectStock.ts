import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { sendNotifToPermission, sendNotifToSuperAdmins, sendNotifToUserIds, FRONTEND_URL } from "../lib/notify";
import {
  PB_DRAFT,
  canReceiveFromPBStatus,
  pbCountsTowardQuota,
  prReadyForReceipt,
  quantitiesMatch,
  receiptStatus,
  remainingQuantity,
  validReceiptKey,
} from "../lib/projectStockPolicy";

const router = Router();
const VALID_TYPES = ["sipil", "interior"];
const VALID_JENIS = ["Alat", "Material"];
const VALID_MOVEMENTS = ["BARANG_MASUK", "BARANG_KELUAR", "DIKEMBALIKAN"];

// Alur status PB:
//   Draft ──(PIC kirim)──▶ Diajukan ──(Finance)──▶ Disetujui Finance ──(Super Admin)──▶ Disetujui
//   ──(create-pr)──▶ Diproses PR ──(receive)──▶ Selesai
// Sebelum ada PR, Finance/Super Admin bisa "Ditolak" atau "Minta Revisi" (kembali ke Draft).
const PB_REVIEWABLE = ["Diajukan", "Disetujui Finance", "Disetujui"];

class HttpError extends Error {
  constructor(public statusCode: number, message: string, public extra?: Record<string, unknown>) { super(message); }
}

function sendError(res: Response, error: any, fallback: string) {
  if (error instanceof HttpError) return res.status(error.statusCode).json({ detail: error.message, ...error.extra });
  console.error(error);
  return res.status(500).json({ detail: fallback });
}

function isSuperAdmin(req: Request) {
  return req.user?.roles.some((r: any) => r.role.name === "Super Admin") ?? false;
}

function isFinanceUser(req: Request) {
  return isSuperAdmin(req)
    || req.userPermissions?.has("finance.pb_projek") === true;
}

function hasPermission(req: Request, permission: string) {
  return isSuperAdmin(req) || req.userPermissions?.has(permission) === true;
}

function canManageProjectStock(req: Request, projectType: string) {
  return isSuperAdmin(req)
    || hasPermission(req, "project_stock.manage")
    || hasPermission(req, `projek_${projectType}.stock_opname`);
}

function canReadProjectStock(req: Request, projectType: string) {
  return canManageProjectStock(req, projectType)
    || hasPermission(req, "project_stock.view")
    || hasPermission(req, "pic.pb_projek")
    || hasPermission(req, "pic.laporan_harian");
}

function canReceiveProjectStock(req: Request) {
  return isSuperAdmin(req)
    || hasPermission(req, "project_stock.receive");
}

function canCreateProjectPB(req: Request) {
  return isSuperAdmin(req) || hasPermission(req, "pic.pb_projek");
}

function canViewPB(req: Request) {
  return canCreateProjectPB(req) || isFinanceUser(req);
}

// Tahap pertama membutuhkan permission Finance, dengan bypass Super Admin.
// Transisi status tetap dua tahap agar jejak approval tidak terlewati.
function hasFinancePBPermission(req: Request) {
  return isSuperAdmin(req) || req.userPermissions?.has("finance.pb_projek") === true;
}

function canApprovePB(req: Request) {
  return isFinanceUser(req);
}

function canViewAllProjects(req: Request) {
  return isFinanceUser(req);
}

type QuotaRequest = { stock_item_id: bigint; qty: number };
type PBItemInput = QuotaRequest & { catatan: string | null };

const PB_INCLUDE = {
  items: { include: { stock_item: true }, orderBy: { id: "asc" } },
  creator: { select: { name: true } },
  finance_approver: { select: { name: true } },
  sa_approver: { select: { name: true } },
  reviewer: { select: { name: true } },
} satisfies Prisma.ProjectPBInclude;

type PBWithRelations = Prisma.ProjectPBGetPayload<{ include: typeof PB_INCLUDE }>;

function serializePB(pb: PBWithRelations) {
  return {
    id: String(pb.id), project_type: pb.project_type, project_id: String(pb.project_id),
    nomor_pb: pb.nomor_pb, status: pb.status, catatan: pb.catatan,
    created_by: pb.created_by ? String(pb.created_by) : null, creator: pb.creator?.name ?? null, created_at: pb.created_at,
    submitted_at: pb.submitted_at,
    finance_approver: pb.finance_approver?.name ?? null, finance_approved_at: pb.finance_approved_at,
    sa_approver: pb.sa_approver?.name ?? null, sa_approved_at: pb.sa_approved_at,
    reviewer: pb.reviewer?.name ?? null, reviewed_at: pb.reviewed_at, catatan_review: pb.catatan_review,
    pr_id: pb.pr_id ? String(pb.pr_id) : null,
    items: pb.items.map((i) => ({
      id: String(i.id), stock_item_id: String(i.stock_item_id), nama_item: i.stock_item.nama_item,
      jenis: i.stock_item.jenis, satuan: i.stock_item.satuan, qty: num(i.qty),
      qty_received: num(i.qty_received), qty_remaining: remainingQuantity(num(i.qty), num(i.qty_received)), catatan: i.catatan,
    })),
  };
}

function parsePBItems(body: any): PBItemInput[] {
  const raw = Array.isArray(body?.items) ? body.items : [];
  let items: PBItemInput[];
  try {
    items = raw.map((i: any) => ({ stock_item_id: BigInt(i.stock_item_id), qty: num(i.qty), catatan: i.catatan ? String(i.catatan).trim() || null : null }));
  } catch {
    throw new HttpError(400, "Item PB tidak valid");
  }
  if (!items.length) throw new HttpError(400, "Minimal satu item PB harus diisi");
  if (items.some((r) => !Number.isFinite(r.qty) || r.qty <= 0)) throw new HttpError(400, "Qty PB harus lebih besar dari 0");
  if (new Set(items.map((r) => String(r.stock_item_id))).size !== items.length) throw new HttpError(400, "Item PB tidak boleh duplikat — gabungkan qty pada satu baris");
  return items;
}

async function assertItemsBelongToProject(tx: Prisma.TransactionClient, items: PBItemInput[], projectType: string, projectId: bigint) {
  const owned = await tx.projectStockItem.count({ where: { id: { in: items.map((r) => r.stock_item_id) }, project_type: projectType, project_id: projectId } });
  if (owned !== items.length) throw new HttpError(400, "Item PB harus berasal dari Stock Opname projek ini");
}

// Draft hanya boleh diubah/dikirim/dihapus oleh pembuatnya atau PIC projek tersebut.
async function canManageDraft(req: Request, pb: { created_by: bigint | null; project_type: string; project_id: bigint }) {
  return pb.created_by === req.user!.id || (await isProjectPIC(req.user!.id, pb.project_type, pb.project_id));
}

function notify(fn: () => Promise<unknown>) {
  fn().catch((error) => console.error("[PB notify]", error?.message ?? error));
}

function pbLabel(pb: { nomor_pb: string | null; id: bigint }) {
  return pb.nomor_pb ?? `PB-${pb.id}`;
}

// Kunci baris item stok lalu pastikan total PB (yang dihitung kuota) + permintaan
// baru tidak melebihi Qty Total. Harus dipanggil di dalam transaksi.
async function assertPBQuota(tx: Prisma.TransactionClient, requests: QuotaRequest[], excludePbId?: bigint) {
  if (!requests.length) return;
  const ids = requests.map((r) => r.stock_item_id);
  await tx.$queryRaw`SELECT id FROM project_stock_items WHERE id IN (${Prisma.join(ids)}) FOR UPDATE`;
  const rows = await tx.projectStockItem.findMany({ where: { id: { in: ids } }, include: { pb_items: { include: { pb: { select: { id: true, status: true } } } } } });
  for (const request of requests) {
    const row = rows.find((s) => s.id === request.stock_item_id);
    if (!row) throw new HttpError(400, "Item PB tidak ditemukan");
    const used = row.pb_items
      .filter((p) => pbCountsTowardQuota(p.pb.status) && (excludePbId === undefined || p.pb.id !== excludePbId))
      .reduce((s, p) => s + num(p.qty), 0);
    const sisa = Math.max(0, num(row.qty_total) - used);
    if (request.qty > sisa) throw new HttpError(400, `Qty PB untuk ${row.nama_item} melebihi sisa pengajuan (sisa ${sisa} ${row.satuan})`);
  }
}

async function canAccessProject(req: Request, projectType: string, projectId: bigint) {
  if (canViewAllProjects(req)) return true;
  return isProjectPIC(req.user!.id, projectType, projectId);
}

async function requireProjectRead(req: Request, res: Response, projectType: string, projectId: bigint) {
  if (!canReadProjectStock(req, projectType) || !(await canAccessProject(req, projectType, projectId))) {
    res.status(403).json({ detail: "Tidak memiliki akses Stock Opname projek ini" });
    return false;
  }
  return true;
}

async function requireProjectManage(req: Request, res: Response, projectType: string, projectId: bigint) {
  if (!canManageProjectStock(req, projectType) || !(await canAccessProject(req, projectType, projectId))) {
    res.status(403).json({ detail: "Tidak memiliki akses mengubah Stock Opname projek ini" });
    return false;
  }
  return true;
}

async function isProjectPIC(userId: bigint, projectType: string, projectId: bigint) {
  if (projectType === "interior") {
    const project = await prisma.proyekInterior.findUnique({ where: { id: projectId }, select: { pic_user_id: true, pic_assignments: { where: { user_id: userId }, select: { user_id: true } } } });
    return Boolean(project && (project.pic_user_id === userId || project.pic_assignments.length > 0));
  }
  const project = await prisma.proyekBerjalan.findUnique({ where: { id: projectId }, select: { pic_user_id: true, pic_assignments: { where: { user_id: userId }, select: { user_id: true } } } });
  return Boolean(project && (project.pic_user_id === userId || project.pic_assignments.length > 0));
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
    const pb = item.pb_items.filter((p) => pbCountsTowardQuota(p.pb.status)).reduce((s, p) => s + num(p.qty), 0);
    const masuk = movement("BARANG_MASUK");
    const keluar = movement("BARANG_KELUAR");
    const dikembalikan = movement("DIKEMBALIKAN");
    const penyesuaian = movement("PENYESUAIAN");
    return {
      id: String(item.id), project_type: item.project_type, project_id: String(item.project_id), jenis: item.jenis,
      nama_item: item.nama_item, satuan: item.satuan, qty_total: num(item.qty_total), pb, sisa_pengajuan: Math.max(0, num(item.qty_total) - pb),
      barang_masuk: masuk, barang_keluar: keluar, dikembalikan, sisa_fisik: Math.max(0, masuk - keluar - dikembalikan + penyesuaian),
      keterangan: item.keterangan,
      pb_history: item.pb_items.map((p) => ({ id: String(p.pb.id), nomor_pb: p.pb.nomor_pb, status: p.pb.status, qty: num(p.qty), created_at: p.pb.created_at })),
      history: item.movements.map((m) => ({ id: String(m.id), type: m.movement_type, qty: num(m.qty), tanggal: m.tanggal, reference_type: m.reference_type, reference_id: m.reference_id ? String(m.reference_id) : null, warehouse_id: m.warehouse_id ? String(m.warehouse_id) : null, catatan: m.catatan, created_by: m.created_by ? String(m.created_by) : null })),
    };
  });
}

router.get("/:projectType(sipil|interior)/:projectId", async (req, res) => {
  const projectType = cleanType(req.params.projectType);
  const projectId = BigInt(req.params.projectId);
  if (!(await requireProjectRead(req, res, projectType, projectId))) return;
  return res.json(await stockSummary(projectType, projectId));
});

router.get("/pb", async (req, res) => {
  if (!canViewPB(req)) return res.status(403).json({ detail: "Tidak memiliki akses PB Projek" });
  const all = canViewAllProjects(req);
  const userId = req.user!.id;

  // Non-Finance: PB dari projek tempat user menjadi PIC (aturan yang sama dengan
  // canAccessProject) ditambah PB yang ia ajukan sendiri.
  // Finance dan Super Admin melihat seluruh PB, termasuk Draft, agar pekerjaan
  // yang belum dikirim tidak dianggap hilang saat koordinasi lintas user.
  let where: Prisma.ProjectPBWhereInput = {};
  if (!all) {
    const picWhere = { OR: [{ pic_user_id: userId }, { pic_assignments: { some: { user_id: userId } } }] };
    const [sipilIds, interiorIds] = await Promise.all([
      prisma.proyekBerjalan.findMany({ where: picWhere, select: { id: true } }),
      prisma.proyekInterior.findMany({ where: picWhere, select: { id: true } }),
    ]);
    where = { OR: [
      { created_by: userId },
      { project_type: "sipil", project_id: { in: sipilIds.map((p) => p.id) } },
      { project_type: "interior", project_id: { in: interiorIds.map((p) => p.id) } },
    ] };
  }
  const rows = await prisma.projectPB.findMany({ where, include: PB_INCLUDE, orderBy: { created_at: "desc" } });

  const projectSelect = { id: true, nama_proyek: true, pic_user: { select: { name: true } }, pic_assignments: { include: { user: { select: { name: true } } } } } as const;
  const [sipilProjects, interiorProjects] = await Promise.all([
    prisma.proyekBerjalan.findMany({ where: { id: { in: [...new Set(rows.filter((pb) => pb.project_type !== "interior").map((pb) => pb.project_id))] } }, select: projectSelect }),
    prisma.proyekInterior.findMany({ where: { id: { in: [...new Set(rows.filter((pb) => pb.project_type === "interior").map((pb) => pb.project_id))] } }, select: projectSelect }),
  ]);
  const projectMap = new Map<string, { name: string; pics: string[] }>();
  for (const p of sipilProjects) projectMap.set(`sipil:${p.id}`, { name: p.nama_proyek ?? `Sipil #${p.id}`, pics: [p.pic_user?.name, ...p.pic_assignments.map((x) => x.user.name)].filter(Boolean) as string[] });
  for (const p of interiorProjects) projectMap.set(`interior:${p.id}`, { name: p.nama_proyek ?? `Interior #${p.id}`, pics: [p.pic_user?.name, ...p.pic_assignments.map((x) => x.user.name)].filter(Boolean) as string[] });

  const prIds = rows.map((pb) => pb.pr_id).filter((id): id is bigint => id !== null);
  const prs = prIds.length ? await prisma.projekPR.findMany({
    where: { id: { in: prIds } },
    select: {
      id: true, nomor_pr: true, status: true, hf_signed_at: true, adm_finance_project_id: true,
      items: { select: { project_pb_item_id: true, qty: true } },
    },
  }) : [];
  const prMap = new Map(prs.map((pr) => [String(pr.id), pr]));

  return res.json(rows.map((pb) => {
    const project = projectMap.get(`${pb.project_type}:${pb.project_id}`);
    const pr = pb.pr_id ? prMap.get(String(pb.pr_id)) : undefined;
    const serialized = serializePB(pb);
    return {
      ...serialized,
      project_name: project?.name ?? `Projek #${pb.project_id}`, pic_names: project?.pics ?? [],
      nomor_pr: pr?.nomor_pr ?? null, pr_status: pr?.status ?? null,
      pr_hf_signed_at: pr?.hf_signed_at ?? null,
      pr_ready_to_receive: pr ? prReadyForReceipt(pr.status, pr.hf_signed_at) : false,
      adm_finance_project_id: pr ? String(pr.adm_finance_project_id) : null,
      items: serialized.items.map((item) => {
        const prItem = pr?.items.find((row) => row.project_pb_item_id !== null && String(row.project_pb_item_id) === item.id);
        const ordered = prItem ? num(prItem.qty) : item.qty;
        return { ...item, ordered_qty: ordered, qty_remaining: remainingQuantity(ordered, item.qty_received) };
      }),
    };
  }));
});

router.get("/warehouses", async (req, res) => {
  if (!(isFinanceUser(req) || hasPermission(req, "project_stock.view") || hasPermission(req, "project_stock.manage") || hasPermission(req, "pic.pb_projek") || hasPermission(req, "pic.laporan_harian"))) {
    return res.status(403).json({ detail: "Tidak memiliki akses data Warehouse" });
  }
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
  if (!(isFinanceUser(req) || hasPermission(req, "project_stock.manage"))) return res.status(403).json({ detail: "Tidak memiliki akses alokasi Warehouse" });
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

router.post("/:projectType(sipil|interior)/:projectId/items", async (req: Request, res: Response) => {
  const projectType = cleanType(req.params.projectType);
  const projectId = BigInt(req.params.projectId);
  if (!(await requireProjectManage(req, res, projectType, projectId))) return;
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
  if (!(await requireProjectManage(req, res, item.project_type, item.project_id))) return;
  if (item.movements.length || item.pb_items.length) return res.status(400).json({ detail: "Item yang sudah memiliki transaksi tidak dapat diubah" });
  if (jenis !== undefined && !VALID_JENIS.includes(jenis)) return res.status(400).json({ detail: "Jenis item tidak valid" });
  if (nama_item !== undefined && !String(nama_item).trim()) return res.status(400).json({ detail: "Nama item wajib diisi" });
  if (satuan !== undefined && !String(satuan).trim()) return res.status(400).json({ detail: "Satuan wajib diisi" });
  if (qty_total !== undefined && (!Number.isFinite(num(qty_total)) || num(qty_total) <= 0)) return res.status(400).json({ detail: "Qty Total harus lebih besar dari 0" });
  await prisma.projectStockItem.update({ where: { id }, data: { ...(jenis && { jenis }), ...(nama_item && { nama_item: String(nama_item).trim() }), ...(satuan && { satuan: String(satuan).trim() }), ...(qty_total !== undefined && { qty_total: num(qty_total) }), ...(keterangan !== undefined && { keterangan: keterangan || null }) } });
  return res.json({ message: "Item diupdate" });
});

router.post("/items/:id/movements", async (req: Request, res: Response) => {
  const stockItemId = BigInt(req.params.id);
  const item = await prisma.projectStockItem.findUnique({ where: { id: stockItemId } });
  if (!item) return res.status(404).json({ detail: "Item Stock Opname tidak ditemukan" });
  if (!(await requireProjectManage(req, res, item.project_type, item.project_id))) return;
  const { movement_type, qty, tanggal, warehouse_id, warehouse_stock_id, reference_type, reference_id, catatan } = req.body;
  const amount = num(qty);
  if (!VALID_MOVEMENTS.includes(movement_type) || amount <= 0) return res.status(400).json({ detail: "Jenis transaksi dan qty wajib valid" });
  if (movement_type === "DIKEMBALIKAN" && !warehouse_id) return res.status(400).json({ detail: "Warehouse tujuan wajib dipilih untuk pengembalian" });
  if (movement_type === "BARANG_MASUK" && warehouse_id && !warehouse_stock_id) return res.status(400).json({ detail: "Item Warehouse sumber wajib dipilih" });
  const movementDate = tanggal ? new Date(tanggal) : new Date();
  if (Number.isNaN(movementDate.getTime())) return res.status(400).json({ detail: "Tanggal transaksi tidak valid" });

  let movement;
  try {
    movement = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM project_stock_items WHERE id = ${stockItemId} FOR UPDATE`;
    if (movement_type === "BARANG_MASUK") {
      const activePb = await tx.projectPBItem.findFirst({
        where: {
          stock_item_id: stockItemId,
          pb: { status: { in: ["Diajukan", "Disetujui Finance", "Disetujui", "Diproses PR", "Sebagian Diterima"] } },
        },
        select: { pb: { select: { nomor_pb: true } } },
      });
      if (activePb) throw new HttpError(409, `Barang masuk item ini sedang diproses melalui ${activePb.pb.nomor_pb ?? "PB"}. Gunakan Catat Penerimaan pada PB atau batalkan PB terlebih dahulu.`);
    }
    const totals = await tx.projectStockMovement.groupBy({ by: ["movement_type"], where: { stock_item_id: stockItemId }, _sum: { qty: true } });
    const total = (kind: string) => num(totals.find((row) => row.movement_type === kind)?._sum.qty);
    const masuk = total("BARANG_MASUK");
    const sisaFisik = masuk - total("BARANG_KELUAR") - total("DIKEMBALIKAN") + total("PENYESUAIAN");
    if ((movement_type === "BARANG_KELUAR" || movement_type === "DIKEMBALIKAN") && amount > sisaFisik) {
      throw new HttpError(400, `${movement_type === "DIKEMBALIKAN" ? "Pengembalian" : "Barang Keluar"} melebihi sisa fisik (${Math.max(0, sisaFisik)} ${item.satuan})`);
    }
    if (movement_type === "BARANG_MASUK" && masuk + amount > num(item.qty_total)) {
      throw new HttpError(400, `Barang Masuk melebihi Qty Total (${item.qty_total} ${item.satuan})`);
    }
    let warehouseStockId: bigint | null = warehouse_stock_id ? BigInt(warehouse_stock_id) : null;
    if (movement_type === "BARANG_MASUK" && warehouse_id) {
      await tx.$queryRaw`SELECT id FROM stok_warehouses WHERE id = ${warehouseStockId!} FOR UPDATE`;
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
    return tx.projectStockMovement.create({ data: { stock_item_id: stockItemId, movement_type, qty: amount, project_type: item.project_type, project_id: item.project_id, tanggal: movementDate, warehouse_id: warehouse_id ? BigInt(warehouse_id) : null, warehouse_stock_id: warehouseStockId, reference_type: reference_type || null, reference_id: reference_id ? BigInt(reference_id) : null, catatan: catatan || null, created_by: req.user!.id } });
  }).catch((error: any) => {
    if (error instanceof HttpError) throw error;
    if (["Item Warehouse sumber tidak ditemukan", "Item Warehouse tidak sesuai dengan item projek", "Quantity Warehouse tidak mencukupi"].includes(error?.message)) throw new HttpError(400, error.message);
    throw error;
    });
  } catch (error: any) {
    return sendError(res, error, "Gagal mencatat transaksi stok");
  }
  return res.status(201).json({ id: String(movement.id) });
});

// PIC cukup mencatat hasil hitung fisik saat ini. Selisih disimpan sebagai
// penyesuaian internal agar transaksi PB/penerimaan lama tetap dapat diaudit.
router.post("/items/:id/physical-stock", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const target = num(req.body?.qty);
  if (!Number.isFinite(target) || target < 0) return res.status(400).json({ detail: "Sisa fisik harus berupa angka 0 atau lebih" });

  const item = await prisma.projectStockItem.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ detail: "Item Stock Opname tidak ditemukan" });
  const assignedPic = await isProjectPIC(req.user!.id, item.project_type, item.project_id);
  if (!canManageProjectStock(req, item.project_type) || (!isSuperAdmin(req) && !assignedPic)) {
    return res.status(403).json({ detail: "Sisa fisik hanya dapat diperbarui PIC projek atau Super Admin" });
  }
  if (target > num(item.qty_total)) return res.status(400).json({ detail: `Sisa fisik tidak boleh melebihi Qty Total (${item.qty_total} ${item.satuan})` });

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM project_stock_items WHERE id = ${id} FOR UPDATE`;
      const totals = await tx.projectStockMovement.groupBy({ by: ["movement_type"], where: { stock_item_id: id }, _sum: { qty: true } });
      const total = (kind: string) => num(totals.find((row) => row.movement_type === kind)?._sum.qty);
      const current = Math.max(0, total("BARANG_MASUK") - total("BARANG_KELUAR") - total("DIKEMBALIKAN") + total("PENYESUAIAN"));
      const adjustment = target - current;
      if (Math.abs(adjustment) <= 0.000001) return { updated: false, sisa_fisik: target };
      await tx.projectStockMovement.create({
        data: {
          stock_item_id: id,
          movement_type: "PENYESUAIAN",
          qty: adjustment,
          project_type: item.project_type,
          project_id: item.project_id,
          tanggal: new Date(),
          reference_type: "STOCK_OPNAME_MANUAL",
          catatan: String(req.body?.catatan ?? "").trim() || `Penyesuaian stok fisik dari ${current} menjadi ${target} ${item.satuan}`,
          created_by: req.user!.id,
        },
      });
      return { updated: true, sisa_fisik: target };
    });
    return res.json(result);
  } catch (error) {
    return sendError(res, error, "Gagal memperbarui sisa fisik");
  }
});

router.get("/:projectType(sipil|interior)/:projectId/pb", async (req, res) => {
  const projectType = cleanType(req.params.projectType);
  const projectId = BigInt(req.params.projectId);
  if (!canViewPB(req) || !(await canAccessProject(req, projectType, projectId))) return res.status(403).json({ detail: "Tidak memiliki akses PB projek ini" });
  const rows = await prisma.projectPB.findMany({ where: { project_type: projectType, project_id: projectId }, include: PB_INCLUDE, orderBy: { created_at: "desc" } });
  return res.json(rows.map(serializePB));
});

// Langkah 1 (PIC): simpan PB sebagai Draft. Masih bisa diedit sebelum dikirim.
router.post("/:projectType(sipil|interior)/:projectId/pb", async (req: Request, res: Response) => {
  const projectType = cleanType(req.params.projectType);
  const projectId = BigInt(req.params.projectId);
  if (!canCreateProjectPB(req) || (!(await isProjectPIC(req.user!.id, projectType, projectId)) && !isSuperAdmin(req))) return res.status(403).json({ detail: "Tidak memiliki akses membuat PB projek ini" });

  try {
    const items = parsePBItems(req.body);
    const pb = await prisma.$transaction(async (tx) => {
      await assertItemsBelongToProject(tx, items, projectType, projectId);
      await assertPBQuota(tx, items);
      const created = await tx.projectPB.create({ data: { project_type: projectType, project_id: projectId, status: PB_DRAFT, catatan: req.body.catatan || null, created_by: req.user!.id, items: { create: items.map((r) => ({ stock_item_id: r.stock_item_id, qty: r.qty, catatan: r.catatan })) } } });
      return tx.projectPB.update({ where: { id: created.id }, data: { nomor_pb: `PB-${String(created.id).padStart(6, "0")}` } });
    });
    return res.status(201).json({ id: String(pb.id), status: pb.status });
  } catch (error) {
    return sendError(res, error, "Gagal menyimpan draft PB");
  }
});

router.get("/pb/:id", async (req: Request, res: Response) => {
  if (!canViewPB(req)) return res.status(403).json({ detail: "Tidak memiliki akses PB Projek" });
  const pb = await prisma.projectPB.findUnique({ where: { id: BigInt(req.params.id) }, include: PB_INCLUDE });
  if (!pb) return res.status(404).json({ detail: "PB tidak ditemukan" });
  if (!(await canAccessProject(req, pb.project_type, pb.project_id)) && pb.created_by !== req.user!.id) return res.status(403).json({ detail: "Anda tidak ditugaskan pada projek ini" });
  return res.json(serializePB(pb));
});

// Edit Draft (termasuk PB yang dikembalikan Finance/Super Admin untuk revisi).
router.put("/pb/:id", async (req: Request, res: Response) => {
  if (!canCreateProjectPB(req)) return res.status(403).json({ detail: "Tidak memiliki akses mengubah PB Projek" });
  const id = BigInt(req.params.id);
  const pb = await prisma.projectPB.findUnique({ where: { id } });
  if (!pb) return res.status(404).json({ detail: "PB tidak ditemukan" });
  if (!(await canManageDraft(req, pb))) return res.status(403).json({ detail: "Hanya PIC projek yang bisa mengubah PB ini" });

  try {
    const items = parsePBItems(req.body);
    await prisma.$transaction(async (tx) => {
      await assertItemsBelongToProject(tx, items, pb.project_type, pb.project_id);
      await assertPBQuota(tx, items, id);
      const locked = await tx.projectPB.updateMany({ where: { id, status: PB_DRAFT }, data: { catatan: req.body.catatan ?? pb.catatan } });
      if (!locked.count) throw new HttpError(400, "PB yang sudah dikirim tidak bisa diedit");
      await tx.projectPBItem.deleteMany({ where: { pb_id: id } });
      await tx.projectPBItem.createMany({ data: items.map((r) => ({ pb_id: id, stock_item_id: r.stock_item_id, qty: r.qty, catatan: r.catatan })) });
    });
    return res.json({ id: String(id), status: PB_DRAFT });
  } catch (error) {
    return sendError(res, error, "Gagal mengubah PB");
  }
});

router.delete("/pb/:id", async (req: Request, res: Response) => {
  if (!canCreateProjectPB(req)) return res.status(403).json({ detail: "Tidak memiliki akses menghapus PB Projek" });
  const id = BigInt(req.params.id);
  const pb = await prisma.projectPB.findUnique({ where: { id } });
  if (!pb) return res.status(404).json({ detail: "PB tidak ditemukan" });
  if (!(await canManageDraft(req, pb))) return res.status(403).json({ detail: "Hanya PIC projek yang bisa menghapus PB ini" });
  const deleted = await prisma.projectPB.deleteMany({ where: { id, status: PB_DRAFT } });
  if (!deleted.count) return res.status(400).json({ detail: "Hanya PB berstatus Draft yang bisa dihapus" });
  return res.json({ message: "Draft PB dihapus" });
});

// Langkah 2 (PIC): kirim Draft ke Finance. Kuota dicek ulang dengan row lock.
router.post("/pb/:id/submit", async (req: Request, res: Response) => {
  if (!canCreateProjectPB(req)) return res.status(403).json({ detail: "Tidak memiliki akses mengirim PB Projek" });
  const id = BigInt(req.params.id);
  const pb = await prisma.projectPB.findUnique({ where: { id }, include: { items: true } });
  if (!pb) return res.status(404).json({ detail: "PB tidak ditemukan" });
  if (!(await canManageDraft(req, pb))) return res.status(403).json({ detail: "Hanya PIC projek yang bisa mengirim PB ini" });
  if (!pb.items.length) return res.status(400).json({ detail: "PB tidak memiliki item" });

  try {
    await prisma.$transaction(async (tx) => {
      await assertPBQuota(tx, pb.items.map((i) => ({ stock_item_id: i.stock_item_id, qty: num(i.qty) })), id);
      const sent = await tx.projectPB.updateMany({ where: { id, status: PB_DRAFT }, data: { status: "Diajukan", submitted_at: new Date() } });
      if (!sent.count) throw new HttpError(409, "PB ini sudah dikirim");
    });
  } catch (error) {
    return sendError(res, error, "Gagal mengirim PB");
  }
  notify(() => sendNotifToPermission("finance.pb_projek", `📦 *PB Projek Baru*\n\n${pbLabel(pb)} diajukan oleh ${req.user!.name ?? "PIC"} dan menunggu persetujuan Finance.\n\n🔗 ${FRONTEND_URL}/finance/pb-projek`, "PB Projek Baru"));
  return res.json({ id: String(id), status: "Diajukan" });
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

  // Data lama belum memiliki relasi eksplisit. Nama hanya aman dipakai jika
  // menghasilkan tepat satu kandidat, agar PB tidak masuk ke projek yang salah.
  const legacyMatches = await prisma.admFinanceProject.findMany({ where: { nama_proyek: project.nama_proyek ?? undefined }, take: 2 });
  return legacyMatches.length === 1 ? legacyMatches[0] : null;
}

router.post("/pb/:id/create-pr", async (req: Request, res: Response) => {
  if (!canApprovePB(req)) return res.status(403).json({ detail: "Tidak memiliki akses membuat PR" });
  const id = BigInt(req.params.id);
  const pb = await prisma.projectPB.findUnique({ where: { id }, include: { items: { include: { stock_item: true } } } });
  if (!pb) return res.status(404).json({ detail: "PB tidak ditemukan" });
  if (pb.pr_id) return res.status(409).json({ detail: "PB ini sudah memiliki PR", pr_id: String(pb.pr_id) });
  if (pb.status !== "Disetujui" || !pb.sa_approved_at) return res.status(400).json({ detail: "PB harus disetujui Finance dan Super Admin sebelum dibuat menjadi PR" });
  if (!pb.items.length) return res.status(400).json({ detail: "PB tidak memiliki item" });

  const financeProject = await findFinanceProject(pb.project_type, pb.project_id);
  if (!financeProject) return res.status(400).json({ detail: "Projek belum terhubung ke Administrasi Projek Finance" });

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
    // Klaim PB secara atomik supaya klik ganda / dua user tidak membuat dua PR.
    const claimed = await tx.projectPB.updateMany({ where: { id, status: "Disetujui", pr_id: null, sa_approved_at: { not: null } }, data: { status: "Diproses PR" } });
    if (!claimed.count) throw new HttpError(409, "PB ini sudah diproses oleh pengguna lain");

    // Kunci projek finance agar penomoran PR tidak bentrok.
    await tx.$queryRaw`SELECT id FROM adm_finance_projects WHERE id = ${financeProject.id} FOR UPDATE`;
    const existingPrs = await tx.projekPR.findMany({ where: { adm_finance_project_id: financeProject.id }, select: { nomor_pr: true } });
    const maxNumber = existingPrs.reduce((max, pr) => Math.max(max, Number(/PR-(\d+)/.exec(pr.nomor_pr ?? "")?.[1] ?? 0)), existingPrs.length);
    const nomorPr = `PR-${String(maxNumber + 1).padStart(3, "0")}`;

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
            project_pb_item_id: item.id,
          })),
        },
      },
      include: { items: true },
    });
    // Barang Masuk TIDAK dicatat di sini — PR baru pengajuan pembelian. Barang
    // masuk dicatat saat barang benar-benar diterima (POST /pb/:id/receive).
    await tx.projectPB.update({ where: { id }, data: { pr_id: pr.id } });
    return pr;
  });
  } catch (error) {
    return sendError(res, error, "Gagal membuat PR dari PB");
  }

  return res.status(201).json({ message: "PR berhasil dibuat dari PB", pr_id: String(result.id), nomor_pr: result.nomor_pr, adm_finance_project_id: String(financeProject.id) });
});

// Barang dari PR sudah sampai di projek: catat Barang Masuk per item lalu PB selesai.
router.post("/pb/:id/receive", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const pb = await prisma.projectPB.findUnique({ where: { id }, include: { items: { include: { stock_item: true } } } });
  if (!pb) return res.status(404).json({ detail: "PB tidak ditemukan" });
  const assignedPic = await isProjectPIC(req.user!.id, pb.project_type, pb.project_id);
  if (!canReceiveProjectStock(req) || (!isSuperAdmin(req) && !assignedPic)) return res.status(403).json({ detail: "Penerimaan barang hanya dapat dicatat PIC projek atau Super Admin" });
  const tanggal = req.body?.tanggal ? new Date(req.body.tanggal) : new Date();
  if (Number.isNaN(tanggal.getTime())) return res.status(400).json({ detail: "Tanggal penerimaan tidak valid" });
  const receiptKey = String(req.body?.request_id ?? "").trim();
  if (!validReceiptKey(receiptKey)) return res.status(400).json({ detail: "ID transaksi penerimaan tidak valid. Muat ulang form penerimaan." });
  const inputRows = Array.isArray(req.body?.items) ? req.body.items : null;
  if (inputRows && new Set(inputRows.map((row: any) => String(row.pb_item_id))).size !== inputRows.length) return res.status(400).json({ detail: "Item penerimaan tidak boleh duplikat" });
  let result: { status: string; idempotent: boolean };
  try {
    result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM project_pbs WHERE id = ${id} FOR UPDATE`;
      const current = await tx.projectPB.findUnique({ where: { id }, include: { items: { include: { stock_item: true } } } });
      if (!current) throw new HttpError(404, "PB tidak ditemukan");

      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${receiptKey}))`;
      const priorReceipt = await tx.projectStockMovement.findMany({ where: { receipt_key: receiptKey }, select: { reference_type: true, reference_id: true } });
      if (priorReceipt.length) {
        const belongsToThisPB = current.pr_id && priorReceipt.every((row) => row.reference_type === "PR" && row.reference_id === current.pr_id);
        if (!belongsToThisPB) throw new HttpError(409, "ID transaksi penerimaan sudah digunakan untuk transaksi lain");
        return { status: current.status, idempotent: true };
      }

      if (!canReceiveFromPBStatus(current.status) || !current.pr_id) throw new HttpError(409, "Hanya PB yang sudah dibuatkan PR yang bisa menerima barang");
      await tx.$queryRaw`SELECT id FROM projek_prs WHERE id = ${current.pr_id} FOR UPDATE`;
      const pr = await tx.projekPR.findUnique({ where: { id: current.pr_id }, include: { items: true } });
      if (!pr) throw new HttpError(409, "PR terkait PB tidak ditemukan");
      if (!prReadyForReceipt(pr.status, pr.hf_signed_at)) throw new HttpError(400, "PR harus berstatus Disetujui dan ditandatangani Head Finance sebelum barang diterima");

      const validPbItemIds = new Set(current.items.map((item) => String(item.id)));
      if (inputRows?.some((row: any) => !validPbItemIds.has(String(row.pb_item_id)))) throw new HttpError(400, "Terdapat item penerimaan yang tidak berasal dari PB ini");
      if (inputRows?.some((row: any) => !Number.isFinite(num(row.qty)) || num(row.qty) < 0)) throw new HttpError(400, "Qty penerimaan harus berupa angka nol atau lebih besar");

      const receipts = current.items.map((item) => {
        const prItem = pr.items.find((row) => row.project_pb_item_id === item.id)
          ?? pr.items.find((row) => row.nama_item.trim().toLowerCase() === item.stock_item.nama_item.trim().toLowerCase() && String(row.satuan ?? "").trim().toLowerCase() === item.stock_item.satuan.trim().toLowerCase());
        if (!prItem) throw new HttpError(409, `Item PR untuk ${item.stock_item.nama_item} tidak ditemukan`);
        const ordered = num(prItem.qty);
        if (!quantitiesMatch(ordered, num(item.qty))) throw new HttpError(409, `Qty ${item.stock_item.nama_item} pada PR harus sama dengan PB (${num(item.qty)} ${item.stock_item.satuan}). Edit PR sebelum menerima barang.`);
        const requested = inputRows?.find((row: any) => String(row.pb_item_id) === String(item.id));
        const qty = inputRows ? (requested ? num(requested.qty) : 0) : remainingQuantity(ordered, num(item.qty_received));
        return { pbItemId: item.id, stockItemId: item.stock_item_id, qty, ordered, currentReceived: num(item.qty_received), name: item.stock_item.nama_item, unit: item.stock_item.satuan };
      }).filter((row) => row.qty > 0);
      if (!receipts.length) throw new HttpError(400, "Minimal satu qty penerimaan harus lebih besar dari 0");
      for (const row of receipts) {
        const remaining = remainingQuantity(row.ordered, row.currentReceived);
        if (!Number.isFinite(row.qty) || row.qty <= 0 || row.qty > remaining) throw new HttpError(400, `Qty diterima ${row.name} melebihi sisa PR (${remaining} ${row.unit})`);
      }

      const stockItemIds = [...new Set(receipts.map((row) => row.stockItemId))];
      await tx.$queryRaw`SELECT id FROM project_stock_items WHERE id IN (${Prisma.join(stockItemIds)}) FOR UPDATE`;
      const [stockItems, incomingTotals] = await Promise.all([
        tx.projectStockItem.findMany({ where: { id: { in: stockItemIds } } }),
        tx.projectStockMovement.groupBy({ by: ["stock_item_id"], where: { stock_item_id: { in: stockItemIds }, movement_type: "BARANG_MASUK" }, _sum: { qty: true } }),
      ]);
      for (const row of receipts) {
        const stockItem = stockItems.find((item) => item.id === row.stockItemId);
        const incoming = num(incomingTotals.find((item) => item.stock_item_id === row.stockItemId)?._sum.qty);
        if (!stockItem || incoming + row.qty > num(stockItem.qty_total)) throw new HttpError(409, `Penerimaan ${row.name} membuat Barang Masuk melebihi Qty Total. Periksa transaksi stok manual sebelum melanjutkan.`);
      }
      // receipt_key membuat pengulangan request yang sama aman tanpa menambah stok dua kali.
      await tx.projectStockMovement.createMany({
        data: receipts.map((item) => ({
          stock_item_id: item.stockItemId,
          movement_type: "BARANG_MASUK",
          qty: item.qty,
          project_type: current.project_type,
          project_id: current.project_id,
          tanggal,
          reference_type: "PR",
          reference_id: current.pr_id,
          receipt_key: receiptKey,
          catatan: `Barang masuk dari ${pr.nomor_pr} (${current.nomor_pb ?? `PB-${current.id}`})`,
          created_by: req.user!.id,
        })),
      });
      for (const row of receipts) {
        await tx.projectPBItem.update({
          where: { id: row.pbItemId },
          data: { qty_received: { increment: row.qty } },
        });
      }
      const nextStatus = receiptStatus(current.items.map((item) => {
        const receipt = receipts.find((row) => row.pbItemId === item.id);
        return {
          ordered: num(item.qty),
          received: num(item.qty_received) + (receipt?.qty ?? 0),
        };
      }));
      const updated = await tx.projectPB.updateMany({
        where: { id, status: current.status },
        data: { status: nextStatus },
      });
      if (!updated.count) throw new HttpError(409, "Status PB sudah berubah, muat ulang halaman");
      return { status: nextStatus, idempotent: false };
    });
  } catch (error) {
    return sendError(res, error, "Gagal mencatat penerimaan barang");
  }
  return res.json({ id: String(id), status: result.status, idempotent: result.idempotent });
});

// Review Finance / Super Admin. Body: { status, catatan }
//   "Disetujui Finance" — Finance, dari Diajukan
//   "Disetujui"         — Super Admin, dari Disetujui Finance (atau PB lama berstatus
//                         Disetujui yang belum pernah di-approve Super Admin)
//   "Ditolak"           — Finance/Super Admin, sebelum ada PR, wajib alasan
//   "Draft"             — Minta Revisi: kembali ke PIC untuk diedit, wajib catatan
router.patch("/pb/:id/status", async (req: Request, res: Response) => {
  if (!canApprovePB(req)) return res.status(403).json({ detail: "Tidak memiliki akses approval PB" });
  const id = BigInt(req.params.id);
  const status = String(req.body?.status ?? "");
  const catatan = String(req.body?.catatan ?? "").trim();
  if (!["Disetujui Finance", "Disetujui", "Ditolak", PB_DRAFT].includes(status)) return res.status(400).json({ detail: "Status PB tidak valid" });
  if (status === "Disetujui Finance" && !hasFinancePBPermission(req)) return res.status(403).json({ detail: "Approval tahap Finance membutuhkan permission PB Projek Finance" });
  if (status === "Disetujui" && !isSuperAdmin(req)) return res.status(403).json({ detail: "Approval final PB hanya bisa dilakukan oleh Super Admin" });
  if ((status === "Ditolak" || status === PB_DRAFT) && !catatan) return res.status(400).json({ detail: status === "Ditolak" ? "Alasan penolakan wajib diisi" : "Catatan revisi wajib diisi" });

  const userId = req.user!.id;
  const now = new Date();
  let pb: { id: bigint; nomor_pb: string | null; created_by: bigint | null };
  try {
    pb = await prisma.$transaction(async (tx) => {
      const current = await tx.projectPB.findUnique({ where: { id }, include: { items: true } });
      if (!current) throw new HttpError(404, "PB tidak ditemukan");
      const legacyApproved = current.status === "Disetujui" && !current.sa_approved_at;
      const allowedFrom: Record<string, boolean> = {
        "Disetujui Finance": current.status === "Diajukan",
        Disetujui: current.status === "Disetujui Finance" || legacyApproved,
        Ditolak: PB_REVIEWABLE.includes(current.status) && !current.pr_id,
        [PB_DRAFT]: PB_REVIEWABLE.includes(current.status) && !current.pr_id,
      };
      if (!allowedFrom[status]) throw new HttpError(400, `PB berstatus "${current.status}" tidak bisa diubah ke "${status === PB_DRAFT ? "Revisi" : status}"`);

      // Cek ulang kuota saat approve (melindungi data lama yang lolos validasi).
      if (status === "Disetujui Finance" || status === "Disetujui") {
        await assertPBQuota(tx, current.items.map((i) => ({ stock_item_id: i.stock_item_id, qty: num(i.qty) })), id);
      }
      const data: Prisma.ProjectPBUncheckedUpdateManyInput =
        status === "Disetujui Finance" ? { status, finance_approved_by: userId, finance_approved_at: now }
        : status === "Disetujui" ? { status, sa_approved_by: userId, sa_approved_at: now, approved_by: userId, approved_at: now }
        : status === "Ditolak" ? { status, reviewed_by: userId, reviewed_at: now, catatan_review: catatan }
        // Revisi: approval sebelumnya gugur karena isi PB akan berubah.
        : { status, reviewed_by: userId, reviewed_at: now, catatan_review: catatan, finance_approved_by: null, finance_approved_at: null, sa_approved_by: null, sa_approved_at: null };
      const updated = await tx.projectPB.updateMany({ where: { id, status: current.status }, data });
      if (!updated.count) throw new HttpError(409, "Status PB sudah diubah pengguna lain, muat ulang halaman");
      return current;
    });
  } catch (error) {
    return sendError(res, error, "Gagal memperbarui status PB");
  }

  const label = pbLabel(pb);
  const link = `${FRONTEND_URL}/finance/pb-projek`;
  if (status === "Disetujui Finance") notify(() => sendNotifToSuperAdmins(`📦 *PB Menunggu Approval Super Admin*\n\n${label} sudah disetujui Finance (${req.user!.name}).\n\n🔗 ${link}`, "PB Menunggu Approval"));
  if (status === "Disetujui") notify(() => sendNotifToPermission("finance.pb_projek", `✅ *PB Disetujui Super Admin*\n\n${label} siap dibuatkan PR.\n\n🔗 ${link}`, "PB Siap Dibuat PR"));
  if ((status === "Ditolak" || status === PB_DRAFT) && pb.created_by) {
    const msg = status === "Ditolak"
      ? `❌ *PB Ditolak*\n\n${label} ditolak oleh ${req.user!.name}.\nAlasan: ${catatan}\n\n🔗 ${FRONTEND_URL}/pic/pb-projek`
      : `✏️ *PB Perlu Revisi*\n\n${label} dikembalikan oleh ${req.user!.name} untuk direvisi.\nCatatan: ${catatan}\n\n🔗 ${FRONTEND_URL}/pic/pb-projek`;
    notify(() => sendNotifToUserIds([pb.created_by!], msg, status === "Ditolak" ? "PB Ditolak" : "PB Perlu Revisi"));
  }
  return res.json({ id: String(id), status });
});

export default router;
