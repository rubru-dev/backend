import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole, requirePermission } from "../middleware/requireRole";
import { getPagination, paginateResponse } from "../middleware/pagination";

const router = Router();

// ── Invoice helpers ───────────────────────────────────────────────────────────

function generateInvoiceNumber(): string {
  const prefix = `INV-${new Date().toISOString().slice(0, 7).replace("-", "")}-`;
  return prefix + String(Math.floor(Math.random() * 9000) + 1000);
}

function invoiceDict(inv: {
  id: bigint; invoice_number: string | null; tanggal: Date | null; lead_id: bigint | null; catatan: string | null;
  ppn_percentage: unknown; subtotal: unknown; ppn_amount: unknown; grand_total: unknown; status: string | null;
  created_at: Date | null; lead?: { nama: string } | null; creator?: { name: string } | null;
}) {
  return {
    id: inv.id, invoice_number: inv.invoice_number, tanggal: inv.tanggal, lead_id: inv.lead_id,
    catatan: inv.catatan, ppn_percentage: parseFloat(String(inv.ppn_percentage ?? 0)),
    subtotal: parseFloat(String(inv.subtotal ?? 0)), ppn_amount: parseFloat(String(inv.ppn_amount ?? 0)),
    grand_total: parseFloat(String(inv.grand_total ?? 0)), status: inv.status, created_at: inv.created_at,
    lead: inv.lead ? { nama: inv.lead.nama } : null,
    creator: inv.creator ? { name: inv.creator.name } : null,
  };
}

// Maps backend Invoice → frontend-expected shape
const FE_STATUS_FROM_DB: Record<string, string> = {
  draft: "Draft", Draft: "Draft",
  Terbit: "Terbit",
  Lunas: "Lunas", lunas: "Lunas",
  Rejected: "Batal", rejected: "Batal", Batal: "Batal",
};
const DB_STATUS_FROM_FE: Record<string, string> = {
  Draft: "draft", Terbit: "Terbit", Lunas: "Lunas", Batal: "Rejected",
};

function generateNomorInvoice(jenis: string | null | undefined, tanggal: Date): string {
  const d = new Date(tanggal);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const suffix = `${dd}/${mm}/${yyyy}`;
  if (jenis === "Sipil") return `RR-SP-${suffix}`;
  if (jenis === "Desain") return `RR-DS-${suffix}`;
  if (jenis === "Interior") return `RR-INT-${suffix}`;
  return `RR-INV-${suffix}`;
}

function invoiceDictFrontend(inv: any) {
  return {
    id: inv.id,
    nomor_invoice: inv.invoice_number,
    lead: inv.lead ? { id: inv.lead.id, nama: inv.lead.nama, jenis: inv.lead.jenis, alamat: inv.lead.alamat, nomor_telepon: inv.lead.nomor_telepon } : null,
    klien: inv.lead?.nama || "",
    tanggal: inv.tanggal,
    overdue_date: inv.overdue_date || null,
    total: parseFloat(String(inv.grand_total ?? 0)),
    ppn_percentage: parseFloat(String(inv.ppn_percentage ?? 0)),
    ppn_amount: parseFloat(String(inv.ppn_amount ?? 0)),
    subtotal: parseFloat(String(inv.subtotal ?? 0)),
    status: FE_STATUS_FROM_DB[inv.status || "draft"] || "Draft",
    catatan: inv.catatan || "",
    bank_account: inv.bank_account ? {
      id: inv.bank_account.id,
      bank_name: inv.bank_account.bank_name,
      account_number: inv.bank_account.account_number,
      account_name: inv.bank_account.account_name,
    } : null,
    head_finance: inv.head_finance ? { id: inv.head_finance.id, name: inv.head_finance.name } : null,
    head_finance_at: inv.head_finance_at,
    head_finance_signature: inv.head_finance_signature || null,
    admin_finance: inv.admin_finance ? { id: inv.admin_finance.id, name: inv.admin_finance.name } : null,
    admin_finance_at: inv.admin_finance_at,
    admin_finance_signature: inv.admin_finance_signature || null,
    items: (inv.items || []).map((item: any) => ({
      id: item.id,
      keterangan: item.description || "",
      jumlah: parseFloat(String(item.quantity ?? 1)),
      harga_satuan: parseFloat(String(item.unit_price ?? 0)),
    })),
  };
}

// ── Invoice ───────────────────────────────────────────────────────────────────

router.get("/invoice", async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) where.invoice_number = { contains: search, mode: "insensitive" };

  const [total, items] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: { lead: true, creator: true },
      orderBy: { id: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return res.json(paginateResponse(items.map(invoiceDict), total, page, limit));
});

router.post("/invoice", async (req: Request, res: Response) => {
  const { tanggal, lead_id, catatan, ppn_percentage, items = [] } = req.body;
  const invoiceNumber = generateInvoiceNumber();

  let subtotal = 0;
  const itemsData = (items as Array<{ description?: string; quantity?: number; unit_price?: number }>).map((item) => {
    const qty = item.quantity ?? 1;
    const harga = item.unit_price ?? 0;
    const sub = qty * harga;
    subtotal += sub;
    return { description: item.description ?? null, quantity: qty, unit_price: harga, subtotal: sub };
  });

  const ppn = subtotal * ((ppn_percentage ?? 11) / 100);

  const inv = await prisma.invoice.create({
    data: {
      invoice_number: invoiceNumber,
      tanggal: tanggal ? new Date(tanggal) : new Date(),
      lead_id: lead_id ?? null,
      catatan: catatan ?? null,
      ppn_percentage: ppn_percentage ?? 11,
      created_by: req.user!.id,
      subtotal, ppn_amount: ppn, grand_total: subtotal + ppn,
      items: { create: itemsData },
    },
  });
  return res.status(201).json({ id: inv.id, invoice_number: inv.invoice_number });
});

router.get("/invoice/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { lead: true, items: true, kwitansi: true, creator: true },
  });
  if (!inv) return res.status(404).json({ detail: "Invoice tidak ditemukan" });
  const d = invoiceDict(inv);
  return res.json({
    ...d,
    items: inv.items.map((i) => ({
      id: i.id, description: i.description,
      quantity: parseFloat(String(i.quantity ?? 0)),
      unit_price: parseFloat(String(i.unit_price ?? 0)),
      subtotal: parseFloat(String(i.subtotal ?? 0)),
    })),
    kwitansi: inv.kwitansi ? {
      id: inv.kwitansi.id, nomor_kwitansi: inv.kwitansi.nomor_kwitansi,
      tanggal: inv.kwitansi.tanggal, jumlah_diterima: parseFloat(String(inv.kwitansi.jumlah_diterima ?? 0)),
      penerima: inv.kwitansi.penerima,
    } : null,
  });
});

router.patch("/invoice/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) return res.status(404).json({ detail: "Invoice tidak ditemukan" });
  if (inv.status !== "Draft") return res.status(400).json({ detail: "Hanya invoice Draft yang bisa diubah" });
  const { tanggal, lead_id, catatan, ppn_percentage } = req.body;
  const updates: Record<string, unknown> = {};
  if (tanggal !== undefined) updates.tanggal = tanggal ? new Date(tanggal) : null;
  if (lead_id !== undefined) updates.lead_id = lead_id;
  if (catatan !== undefined) updates.catatan = catatan;
  if (ppn_percentage !== undefined) {
    updates.ppn_percentage = ppn_percentage;
    const subtotal = parseFloat(String(inv.subtotal ?? 0));
    const ppn = subtotal * (ppn_percentage / 100);
    updates.ppn_amount = ppn;
    updates.grand_total = subtotal + ppn;
  }
  await prisma.invoice.update({ where: { id }, data: updates });
  return res.json({ message: "Invoice diupdate" });
});

router.post("/invoice/:id/approve", requirePermission("finance", "edit"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) return res.status(404).json({ detail: "Invoice tidak ditemukan" });
  await prisma.invoice.update({
    where: { id },
    data: { status: "Approved", approved_by: req.user!.id, approved_at: new Date() },
  });
  return res.json({ message: "Invoice disetujui" });
});

router.post("/invoice/:id/reject", requirePermission("finance", "edit"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) return res.status(404).json({ detail: "Invoice tidak ditemukan" });
  await prisma.invoice.update({ where: { id }, data: { status: "Rejected", rejection_note: req.body.rejection_note } });
  return res.json({ message: "Invoice ditolak" });
});

router.delete("/invoice/:id", requirePermission("finance", "delete"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) return res.status(404).json({ detail: "Invoice tidak ditemukan" });
  if (inv.status !== "Draft") return res.status(400).json({ detail: "Hanya invoice Draft yang bisa dihapus" });
  await prisma.invoice.delete({ where: { id } });
  return res.json({ message: "Invoice dihapus" });
});

router.post("/invoice/:id/items", async (req: Request, res: Response) => {
  const invId = BigInt(req.params.id);
  const inv = await prisma.invoice.findUnique({ where: { id: invId }, include: { items: true } });
  if (!inv) return res.status(404).json({ detail: "Invoice tidak ditemukan" });
  const { description, quantity, unit_price } = req.body;
  const sub = (quantity ?? 1) * (unit_price ?? 0);
  const item = await prisma.invoiceItem.create({
    data: { invoice_id: invId, description: description ?? null, quantity: quantity ?? 1, unit_price: unit_price ?? 0, subtotal: sub },
  });
  const allItems = [...inv.items, item];
  const subtotal = allItems.reduce((s, i) => s + parseFloat(String(i.subtotal ?? 0)), 0);
  const ppn = subtotal * (parseFloat(String(inv.ppn_percentage ?? 0)) / 100);
  await prisma.invoice.update({ where: { id: invId }, data: { subtotal, ppn_amount: ppn, grand_total: subtotal + ppn } });
  return res.status(201).json({ id: item.id, message: "Item ditambahkan" });
});

router.delete("/invoice/:invId/items/:itemId", async (req: Request, res: Response) => {
  const invId = BigInt(req.params.invId);
  const itemId = BigInt(req.params.itemId);
  const item = await prisma.invoiceItem.findFirst({ where: { id: itemId, invoice_id: invId } });
  if (!item) return res.status(404).json({ detail: "Item tidak ditemukan" });
  await prisma.invoiceItem.delete({ where: { id: itemId } });
  const inv = await prisma.invoice.findUnique({ where: { id: invId }, include: { items: true } });
  if (inv) {
    const subtotal = inv.items.reduce((s, i) => s + parseFloat(String(i.subtotal ?? 0)), 0);
    const ppn = subtotal * (parseFloat(String(inv.ppn_percentage ?? 0)) / 100);
    await prisma.invoice.update({ where: { id: invId }, data: { subtotal, ppn_amount: ppn, grand_total: subtotal + ppn } });
  }
  return res.json({ message: "Item dihapus" });
});

router.post("/invoice/:id/kwitansi", async (req: Request, res: Response) => {
  const invId = BigInt(req.params.id);
  const existing = await prisma.kwitansi.findFirst({ where: { invoice_id: invId } });
  if (existing) return res.status(400).json({ detail: "Kwitansi sudah ada untuk invoice ini" });
  const { nomor_kwitansi, tanggal, jumlah, penerima, keterangan } = req.body;
  const k = await prisma.kwitansi.create({
    data: { invoice_id: invId, nomor_kwitansi: nomor_kwitansi ?? null, tanggal: new Date(tanggal), jumlah_diterima: jumlah ?? 0, penerima: penerima ?? null, keterangan: keterangan ?? null },
  });
  return res.status(201).json({ id: k.id, message: "Kwitansi dibuat" });
});

// ── Adm Finance ───────────────────────────────────────────────────────────────

router.get("/adm-finance", async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string) || 20, 100);
  const [total, items] = await Promise.all([
    prisma.admFinanceProject.count(),
    prisma.admFinanceProject.findMany({
      include: { lead: true, termins: true },
      orderBy: { id: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);
  return res.json({
    items: items.map((p) => ({
      id: p.id, lokasi: p.lokasi, status: p.status, jumlah_termin: p.jumlah_termin,
      tanggal_mulai: p.tanggal_mulai, tanggal_selesai: p.tanggal_selesai,
      lead: p.lead ? { nama: p.lead.nama } : null,
    })),
    total, page, per_page: perPage,
  });
});

router.post("/adm-finance", async (req: Request, res: Response) => {
  const { lead_id, lokasi, tanggal_mulai, tanggal_selesai, status } = req.body;
  const p = await prisma.admFinanceProject.create({
    data: {
      lead_id: lead_id ?? null, lokasi: lokasi ?? null,
      tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null,
      tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null,
      status: status ?? "Aktif", created_by: req.user!.id,
    },
  });
  return res.status(201).json({ id: p.id });
});

router.get("/adm-finance/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.admFinanceProject.findUnique({
    where: { id },
    include: { lead: true, termins: { include: { periodes: true } } },
  });
  if (!p) return res.status(404).json({ detail: "Project tidak ditemukan" });
  return res.json({
    id: p.id, lokasi: p.lokasi, status: p.status, tanggal_mulai: p.tanggal_mulai, tanggal_selesai: p.tanggal_selesai,
    lead: p.lead ? { nama: p.lead.nama } : null,
    termins: p.termins.map((t) => ({
      id: t.id, nama_termin: t.nama_termin, budget: parseFloat(String(t.budget ?? 0)),
      periodes: t.periodes.map((per) => ({
        id: per.id, nama_periode: per.nama_periode, budget: parseFloat(String(per.budget ?? 0)), is_approved: per.is_approved,
      })),
    })),
  });
});

router.patch("/adm-finance/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.admFinanceProject.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ detail: "Project tidak ditemukan" });
  const { lead_id, lokasi, tanggal_mulai, tanggal_selesai, status } = req.body;
  const updates: Record<string, unknown> = {};
  if (lead_id !== undefined) updates.lead_id = lead_id;
  if (lokasi !== undefined) updates.lokasi = lokasi;
  if (tanggal_mulai !== undefined) updates.tanggal_mulai = tanggal_mulai ? new Date(tanggal_mulai) : null;
  if (tanggal_selesai !== undefined) updates.tanggal_selesai = tanggal_selesai ? new Date(tanggal_selesai) : null;
  if (status !== undefined) updates.status = status;
  await prisma.admFinanceProject.update({ where: { id }, data: updates });
  return res.json({ message: "Project diupdate" });
});

router.delete("/adm-finance/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.admFinanceProject.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ detail: "Project tidak ditemukan" });
  await prisma.admFinanceProject.delete({ where: { id } });
  return res.json({ message: "Project dihapus" });
});

// Termins
router.get("/adm-finance/:pid/termins", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.pid);
  const items = await prisma.admFinanceTermin.findMany({ where: { project_id: pid } });
  return res.json(items.map((t) => ({ id: t.id, nama_termin: t.nama_termin, budget: parseFloat(String(t.budget ?? 0)) })));
});

router.post("/adm-finance/:pid/termins", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.pid);
  const { nama_termin, budget } = req.body;
  const t = await prisma.admFinanceTermin.create({ data: { nama_termin, budget: budget ?? 0, project_id: pid } });
  await prisma.admFinanceProject.update({ where: { id: pid }, data: { jumlah_termin: { increment: 1 } } });
  return res.status(201).json({ id: t.id });
});

router.get("/adm-finance/termins/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.admFinanceTermin.findUnique({ where: { id }, include: { periodes: true } });
  if (!t) return res.status(404).json({ detail: "Termin tidak ditemukan" });
  return res.json({
    id: t.id, nama_termin: t.nama_termin, budget: parseFloat(String(t.budget ?? 0)),
    periodes: t.periodes.map((p) => ({ id: p.id, nama_periode: p.nama_periode, budget: parseFloat(String(p.budget ?? 0)), is_approved: p.is_approved })),
  });
});

router.patch("/adm-finance/termins/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.admFinanceTermin.findUnique({ where: { id } });
  if (!t) return res.status(404).json({ detail: "Termin tidak ditemukan" });
  const { nama_termin, budget } = req.body;
  const updates: Record<string, unknown> = {};
  if (nama_termin !== undefined) updates.nama_termin = nama_termin;
  if (budget !== undefined) updates.budget = budget;
  await prisma.admFinanceTermin.update({ where: { id }, data: updates });
  return res.json({ message: "Termin diupdate" });
});

router.delete("/adm-finance/termins/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.admFinanceTermin.findUnique({ where: { id } });
  if (!t) return res.status(404).json({ detail: "Termin tidak ditemukan" });
  await prisma.admFinanceTermin.delete({ where: { id } });
  return res.json({ message: "Termin dihapus" });
});

// Periodes
router.get("/adm-finance/termins/:tid/periodes", async (req: Request, res: Response) => {
  const tid = BigInt(req.params.tid);
  const items = await prisma.admFinancePeriode.findMany({ where: { termin_id: tid } });
  return res.json(items.map((p) => ({
    id: p.id, nama_periode: p.nama_periode, budget: parseFloat(String(p.budget ?? 0)),
    is_approved: p.is_approved, tanggal_mulai: p.tanggal_mulai, tanggal_selesai: p.tanggal_selesai,
  })));
});

router.post("/adm-finance/termins/:tid/periodes", async (req: Request, res: Response) => {
  const tid = BigInt(req.params.tid);
  const { nama_periode, tanggal_mulai, tanggal_selesai, budget } = req.body;
  const p = await prisma.admFinancePeriode.create({
    data: {
      nama_periode, termin_id: tid, budget: budget ?? 0,
      tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null,
      tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null,
    },
  });
  return res.status(201).json({ id: p.id });
});

router.get("/adm-finance/periodes/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.admFinancePeriode.findUnique({ where: { id }, include: { items: true } });
  if (!p) return res.status(404).json({ detail: "Periode tidak ditemukan" });
  const totalPengeluaran = p.items.reduce((s, i) => s + parseFloat(String(i.total ?? 0)), 0);
  const sisaBudget = parseFloat(String(p.budget ?? 0)) - totalPengeluaran;
  return res.json({
    id: p.id, nama_periode: p.nama_periode, budget: parseFloat(String(p.budget ?? 0)),
    is_approved: p.is_approved, tanggal_mulai: p.tanggal_mulai, tanggal_selesai: p.tanggal_selesai,
    budget_warning_threshold: p.budget_warning_threshold ? parseFloat(String(p.budget_warning_threshold)) : null,
    total_pengeluaran: totalPengeluaran, sisa_budget: sisaBudget,
    items: p.items.map((i) => ({ id: i.id, description: i.description, qty: parseFloat(String(i.qty ?? 0)), unit_price: parseFloat(String(i.unit_price ?? 0)), total: parseFloat(String(i.total ?? 0)), status: i.status })),
  });
});

router.patch("/adm-finance/periodes/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.admFinancePeriode.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ detail: "Periode tidak ditemukan" });
  const { nama_periode, tanggal_mulai, tanggal_selesai, budget } = req.body;
  const updates: Record<string, unknown> = {};
  if (nama_periode !== undefined) updates.nama_periode = nama_periode;
  if (tanggal_mulai !== undefined) updates.tanggal_mulai = tanggal_mulai ? new Date(tanggal_mulai) : null;
  if (tanggal_selesai !== undefined) updates.tanggal_selesai = tanggal_selesai ? new Date(tanggal_selesai) : null;
  if (budget !== undefined) updates.budget = budget;
  await prisma.admFinancePeriode.update({ where: { id }, data: updates });
  return res.json({ message: "Periode diupdate" });
});

router.delete("/adm-finance/periodes/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.admFinancePeriode.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ detail: "Periode tidak ditemukan" });
  await prisma.admFinancePeriode.delete({ where: { id } });
  return res.json({ message: "Periode dihapus" });
});

router.post("/adm-finance/periodes/:id/approve", requirePermission("finance", "edit"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.admFinancePeriode.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ detail: "Periode tidak ditemukan" });
  const updates: Record<string, unknown> = {
    is_approved: true, approved_by: req.user!.id, approved_at: new Date(),
  };
  if (req.body.budget_warning_threshold !== undefined) {
    updates.budget_warning_threshold = req.body.budget_warning_threshold;
  }
  await prisma.admFinancePeriode.update({ where: { id }, data: updates });
  return res.json({ message: "Periode disetujui" });
});

router.post("/adm-finance/periodes/:id/items", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const p = await prisma.admFinancePeriode.findUnique({ where: { id: pid } });
  if (!p) return res.status(404).json({ detail: "Periode tidak ditemukan" });
  if (!p.is_approved) return res.status(400).json({ detail: "Periode belum disetujui" });
  const { description, qty, unit_price, status } = req.body;
  const qtyNum = qty ?? 1;
  const priceNum = unit_price ?? 0;
  const item = await prisma.admFinanceItem.create({
    data: {
      periode_id: pid,
      description: description ?? null,
      qty: qtyNum,
      unit_price: priceNum,
      total: qtyNum * priceNum,
      status: status ?? "aktif",
    },
  });
  return res.status(201).json({ id: item.id });
});

router.delete("/adm-finance/periodes/items/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const item = await prisma.admFinanceItem.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ detail: "Item tidak ditemukan" });
  await prisma.admFinanceItem.delete({ where: { id } });
  return res.json({ message: "Item dihapus" });
});

// ── Administrasi Kantor ───────────────────────────────────────────────────────

router.get("/administrasi", async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string) || 20, 100);
  const [total, items] = await Promise.all([
    prisma.administrasiKantor.count(),
    prisma.administrasiKantor.findMany({
      orderBy: { tanggal: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);
  return res.json({
    items: items.map((a) => ({ id: a.id, tanggal: a.tanggal, keterangan: a.keterangan })),
    total, page, per_page: perPage,
  });
});

router.post("/administrasi", async (req: Request, res: Response) => {
  const { lead_id, tanggal, keterangan, items = [] } = req.body;
  const itemsData = (items as Array<{ description: string; qty?: number; amount?: number }>).map((item) => ({
    description: item.description,
    qty: item.qty ?? 1,
    amount: item.amount ?? 0,
  }));
  const a = await prisma.administrasiKantor.create({
    data: {
      lead_id: lead_id ?? null,
      tanggal: new Date(tanggal),
      keterangan: keterangan ?? null,
      created_by: req.user!.id,
      items: { create: itemsData },
    },
  });
  return res.status(201).json({ id: a.id });
});

router.get("/administrasi/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const a = await prisma.administrasiKantor.findUnique({ where: { id }, include: { items: true } });
  if (!a) return res.status(404).json({ detail: "Data tidak ditemukan" });
  const totalPengeluaran = a.items.reduce((s, i) => s + parseFloat(String(i.amount ?? 0)), 0);
  return res.json({
    id: a.id, tanggal: a.tanggal, keterangan: a.keterangan, total: totalPengeluaran,
    items: a.items.map((i) => ({ id: i.id, description: i.description, qty: parseFloat(String(i.qty ?? 0)), amount: parseFloat(String(i.amount ?? 0)) })),
  });
});

router.patch("/administrasi/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const a = await prisma.administrasiKantor.findUnique({ where: { id } });
  if (!a) return res.status(404).json({ detail: "Data tidak ditemukan" });
  const { lead_id, tanggal, keterangan } = req.body;
  const updates: Record<string, unknown> = {};
  if (lead_id !== undefined) updates.lead_id = lead_id;
  if (tanggal !== undefined) updates.tanggal = new Date(tanggal);
  if (keterangan !== undefined) updates.keterangan = keterangan;
  await prisma.administrasiKantor.update({ where: { id }, data: updates });
  return res.json({ message: "Data diupdate" });
});

router.delete("/administrasi/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const a = await prisma.administrasiKantor.findUnique({ where: { id } });
  if (!a) return res.status(404).json({ detail: "Data tidak ditemukan" });
  await prisma.administrasiKantor.delete({ where: { id } });
  return res.json({ message: "Data dihapus" });
});

// ── Surat Jalan ───────────────────────────────────────────────────────────────

router.get("/surat-jalan", async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string) || 20, 100);
  const [total, items] = await Promise.all([
    prisma.suratJalan.count(),
    prisma.suratJalan.findMany({ orderBy: { tanggal: "desc" }, skip: (page - 1) * perPage, take: perPage }),
  ]);
  return res.json({
    items: items.map((s) => ({ id: s.id, nomor_surat: s.nomor_surat, tanggal: s.tanggal, penerima: s.penerima })),
    total, page, per_page: perPage,
  });
});

router.post("/surat-jalan", async (req: Request, res: Response) => {
  const { adm_finance_project_id, nomor_surat, tanggal, penerima, keterangan, items = [] } = req.body;
  const sj = await prisma.suratJalan.create({
    data: {
      adm_finance_project_id: adm_finance_project_id ?? null,
      nomor_surat: nomor_surat ?? null, tanggal: new Date(tanggal),
      penerima: penerima ?? null, keterangan: keterangan ?? null, created_by: req.user!.id,
      items: {
        create: (items as Array<{ description: string; qty?: number; satuan?: string }>).map((i) => ({
          description: i.description ?? null, qty: i.qty ?? 0, satuan: i.satuan ?? null,
        })),
      },
    },
  });
  return res.status(201).json({ id: sj.id });
});

router.get("/surat-jalan/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const sj = await prisma.suratJalan.findUnique({ where: { id }, include: { items: true } });
  if (!sj) return res.status(404).json({ detail: "Surat jalan tidak ditemukan" });
  return res.json({
    id: sj.id, nomor_surat: sj.nomor_surat, tanggal: sj.tanggal, penerima: sj.penerima, keterangan: sj.keterangan,
    items: sj.items.map((i) => ({ id: i.id, description: i.description, qty: parseFloat(String(i.qty ?? 0)), satuan: i.satuan })),
  });
});

router.patch("/surat-jalan/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const sj = await prisma.suratJalan.findUnique({ where: { id } });
  if (!sj) return res.status(404).json({ detail: "Surat jalan tidak ditemukan" });
  const { nomor_surat, tanggal, penerima, keterangan } = req.body;
  const updates: Record<string, unknown> = {};
  if (nomor_surat !== undefined) updates.nomor_surat = nomor_surat;
  if (tanggal !== undefined) updates.tanggal = new Date(tanggal);
  if (penerima !== undefined) updates.penerima = penerima;
  if (keterangan !== undefined) updates.keterangan = keterangan;
  await prisma.suratJalan.update({ where: { id }, data: updates });
  return res.json({ message: "Surat jalan diupdate" });
});

router.delete("/surat-jalan/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const sj = await prisma.suratJalan.findUnique({ where: { id } });
  if (!sj) return res.status(404).json({ detail: "Surat jalan tidak ditemukan" });
  await prisma.suratJalan.delete({ where: { id } });
  return res.json({ message: "Surat jalan dihapus" });
});

// ── Tukang ────────────────────────────────────────────────────────────────────

router.get("/tukang/absen", async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string) || 20, 100);
  const [total, items] = await Promise.all([
    prisma.absenTukang.count(),
    prisma.absenTukang.findMany({ orderBy: { tanggal: "desc" }, skip: (page - 1) * perPage, take: perPage }),
  ]);
  return res.json({
    items: items.map((a) => ({ id: a.id, tanggal: a.tanggal, adm_finance_project_id: a.adm_finance_project_id })),
    total, page, per_page: perPage,
  });
});

router.post("/tukang/absen", async (req: Request, res: Response) => {
  const { adm_finance_project_id, tanggal, items = [] } = req.body;
  const a = await prisma.absenTukang.create({
    data: {
      adm_finance_project_id: adm_finance_project_id ?? null,
      tanggal: new Date(tanggal), created_by: req.user!.id,
      items: {
        create: (items as Array<{ tukang_name: string; hadir?: boolean; keterangan?: string }>).map((i) => ({
          tukang_name: i.tukang_name, hadir: i.hadir ?? true, keterangan: i.keterangan ?? null,
        })),
      },
    },
  });
  return res.status(201).json({ id: a.id });
});

router.delete("/tukang/absen/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const a = await prisma.absenTukang.findUnique({ where: { id } });
  if (!a) return res.status(404).json({ detail: "Data tidak ditemukan" });
  await prisma.absenTukang.delete({ where: { id } });
  return res.json({ message: "Data dihapus" });
});

router.get("/tukang/gaji", async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string) || 20, 100);
  const [total, items] = await Promise.all([
    prisma.gajiTukang.count(),
    prisma.gajiTukang.findMany({ orderBy: { id: "desc" }, skip: (page - 1) * perPage, take: perPage }),
  ]);
  return res.json({
    items: items.map((g) => ({ id: g.id, bulan: g.bulan, tahun: g.tahun, total_hari_kerja: g.total_hari_kerja, total_gaji: parseFloat(String(g.total_gaji ?? 0)) })),
    total, page, per_page: perPage,
  });
});

router.post("/tukang/gaji", async (req: Request, res: Response) => {
  const { adm_finance_project_id, bulan, tahun, items = [] } = req.body;
  let totalGaji = 0;
  let totalHariKerja = 0;
  const itemsData = (items as Array<{ tukang_name: string; hari_kerja?: number; daily_rate?: number }>).map((i) => {
    const hari = i.hari_kerja ?? 0;
    const rate = i.daily_rate ?? 0;
    const sub = hari * rate;
    totalGaji += sub;
    totalHariKerja += hari;
    return { tukang_name: i.tukang_name, hari_kerja: hari, daily_rate: rate, subtotal: sub };
  });
  const g = await prisma.gajiTukang.create({
    data: {
      adm_finance_project_id: adm_finance_project_id ?? null,
      bulan: bulan ?? null,
      tahun: tahun ?? null,
      total_hari_kerja: totalHariKerja,
      created_by: req.user!.id,
      total_gaji: totalGaji,
      items: { create: itemsData },
    },
  });
  return res.status(201).json({ id: g.id });
});

router.get("/tukang/gaji/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const g = await prisma.gajiTukang.findUnique({ where: { id }, include: { items: true } });
  if (!g) return res.status(404).json({ detail: "Data tidak ditemukan" });
  return res.json({
    id: g.id, bulan: g.bulan, tahun: g.tahun,
    total_hari_kerja: g.total_hari_kerja, total_gaji: parseFloat(String(g.total_gaji ?? 0)),
    items: g.items.map((i) => ({
      id: i.id, tukang_name: i.tukang_name, hari_kerja: i.hari_kerja,
      daily_rate: parseFloat(String(i.daily_rate ?? 0)), subtotal: parseFloat(String(i.subtotal ?? 0)),
    })),
  });
});

router.patch("/tukang/gaji/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const g = await prisma.gajiTukang.findUnique({ where: { id } });
  if (!g) return res.status(404).json({ detail: "Data tidak ditemukan" });
  const { bulan, tahun, adm_finance_project_id } = req.body;
  const updates: Record<string, unknown> = {};
  if (bulan !== undefined) updates.bulan = bulan;
  if (tahun !== undefined) updates.tahun = tahun;
  if (adm_finance_project_id !== undefined) updates.adm_finance_project_id = adm_finance_project_id;
  await prisma.gajiTukang.update({ where: { id }, data: updates });
  return res.json({ message: "Data diupdate" });
});

router.delete("/tukang/gaji/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const g = await prisma.gajiTukang.findUnique({ where: { id } });
  if (!g) return res.status(404).json({ detail: "Data tidak ditemukan" });
  await prisma.gajiTukang.delete({ where: { id } });
  return res.json({ message: "Data dihapus" });
});

router.get("/tukang/kwitansi", async (_req: Request, res: Response) => {
  const items = await prisma.kwitansiGajiTukang.findMany({ orderBy: { tanggal_pembayaran: "desc" } });
  return res.json(items.map((k) => ({ id: k.id, tukang_name: k.tukang_name, jumlah_gaji: parseFloat(String(k.jumlah_gaji ?? 0)), tanggal_pembayaran: k.tanggal_pembayaran, penerima: k.penerima })));
});

router.post("/tukang/kwitansi", async (req: Request, res: Response) => {
  const { gaji_tukang_id, tukang_name, jumlah_gaji, tanggal_pembayaran, penerima } = req.body;
  const k = await prisma.kwitansiGajiTukang.create({
    data: {
      gaji_tukang_id: gaji_tukang_id ?? null,
      tukang_name: tukang_name ?? null,
      jumlah_gaji: jumlah_gaji ?? 0,
      tanggal_pembayaran: tanggal_pembayaran ? new Date(tanggal_pembayaran) : null,
      penerima: penerima ?? null,
    },
  });
  return res.status(201).json({ id: k.id });
});

router.delete("/tukang/kwitansi/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const k = await prisma.kwitansiGajiTukang.findUnique({ where: { id } });
  if (!k) return res.status(404).json({ detail: "Data tidak ditemukan" });
  await prisma.kwitansiGajiTukang.delete({ where: { id } });
  return res.json({ message: "Data dihapus" });
});

// ── Aliases & Placeholder routes ──────────────────────────────────────────────

// ── /leads-dropdown – for invoice form lead picker ────────────────────────────
router.get("/leads-dropdown", async (req: Request, res: Response) => {
  const search = (req.query.search as string) || "";
  const leads = await prisma.lead.findMany({
    where: search ? { nama: { contains: search, mode: "insensitive" } } : {},
    select: { id: true, nama: true, jenis: true, nomor_telepon: true, alamat: true },
    orderBy: { nama: "asc" },
    take: 100,
  });
  return res.json({ items: leads });
});

// ── Bank Accounts ─────────────────────────────────────────────────────────────

router.get("/bank-accounts", requirePermission("finance", "view"), async (req: Request, res: Response) => {
  const accounts = await prisma.bankAccount.findMany({ orderBy: { id: "asc" } });
  return res.json(accounts);
});

router.post("/bank-accounts", requirePermission("finance", "view"), async (req: Request, res: Response) => {
  const { bank_name, account_number, account_name } = req.body;
  if (!bank_name || !account_number || !account_name) return res.status(400).json({ detail: "bank_name, account_number, account_name wajib diisi" });
  const acc = await prisma.bankAccount.create({ data: { bank_name, account_number, account_name } });
  return res.status(201).json(acc);
});

router.patch("/bank-accounts/:id", requirePermission("finance", "view"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { bank_name, account_number, account_name, is_active } = req.body;
  const updates: Record<string, unknown> = {};
  if (bank_name !== undefined) updates.bank_name = bank_name;
  if (account_number !== undefined) updates.account_number = account_number;
  if (account_name !== undefined) updates.account_name = account_name;
  if (is_active !== undefined) updates.is_active = is_active;
  const acc = await prisma.bankAccount.update({ where: { id }, data: updates });
  return res.json(acc);
});

router.delete("/bank-accounts/:id", requirePermission("finance", "delete"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  await prisma.bankAccount.delete({ where: { id } });
  return res.json({ message: "Akun bank dihapus" });
});

// ── /invoices – frontend-compatible alias ─────────────────────────────────────
router.get("/invoices", requirePermission("finance", "view"), async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string) || 20, 100);
  const feStatus = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;
  const where: Record<string, unknown> = {};
  if (feStatus && DB_STATUS_FROM_FE[feStatus]) where.status = DB_STATUS_FROM_FE[feStatus];
  else if (feStatus) where.status = feStatus;
  if (search) where.invoice_number = { contains: search, mode: "insensitive" };
  const [total, invs] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where, orderBy: { id: "desc" }, skip: (page - 1) * perPage, take: perPage,
      include: { lead: true, items: true, head_finance: true, admin_finance: true, bank_account: true },
    }),
  ]);
  return res.json({ items: invs.map(invoiceDictFrontend), total, page, per_page: perPage });
});

router.post("/invoices", requirePermission("finance", "view"), async (req: Request, res: Response) => {
  const { lead_id, nomor_invoice, tanggal, overdue_date, catatan, ppn_percentage, bank_account_id, items = [] } = req.body;
  const tgl = tanggal ? new Date(tanggal) : new Date();
  // Determine invoice number: manual input or auto-generate from lead jenis
  let invoiceNumber = nomor_invoice || "";
  if (!invoiceNumber && lead_id) {
    const lead = await prisma.lead.findUnique({ where: { id: BigInt(lead_id) }, select: { jenis: true } });
    invoiceNumber = generateNomorInvoice(lead?.jenis, tgl);
  }
  if (!invoiceNumber) invoiceNumber = generateNomorInvoice(null, tgl);

  const ppnPct = parseFloat(String(ppn_percentage ?? 0));
  let subtotal = 0;
  const itemsData = (items as Array<{ keterangan?: string; jumlah?: number; harga_satuan?: number }>).map((item) => {
    const qty = item.jumlah ?? 1;
    const price = item.harga_satuan ?? 0;
    const sub = qty * price;
    subtotal += sub;
    return { description: item.keterangan ?? null, quantity: qty, unit_price: price, subtotal: sub };
  });
  const ppnAmt = subtotal * ppnPct / 100;
  const inv = await prisma.invoice.create({
    data: {
      invoice_number: invoiceNumber,
      lead_id: lead_id ? BigInt(lead_id) : null,
      bank_account_id: bank_account_id ? BigInt(bank_account_id) : null,
      tanggal: tgl,
      overdue_date: overdue_date ? new Date(overdue_date) : null,
      catatan: catatan || null,
      ppn_percentage: ppnPct, subtotal, ppn_amount: ppnAmt, grand_total: subtotal + ppnAmt,
      status: "draft",
      created_by: req.user!.id,
      items: { create: itemsData },
    },
    include: { lead: true, items: true, head_finance: true, admin_finance: true, bank_account: true },
  });
  return res.status(201).json(invoiceDictFrontend(inv));
});

router.patch("/invoices/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) return res.status(404).json({ detail: "Invoice tidak ditemukan" });
  if (inv.status !== "draft") return res.status(400).json({ detail: "Hanya invoice Draft yang bisa diubah" });
  const { nomor_invoice, lead_id, tanggal, catatan, ppn_percentage } = req.body;
  const updates: Record<string, unknown> = {};
  if (nomor_invoice !== undefined) updates.invoice_number = nomor_invoice;
  if (lead_id !== undefined) updates.lead_id = BigInt(lead_id);
  if (tanggal !== undefined) updates.tanggal = new Date(tanggal);
  if (catatan !== undefined) updates.catatan = catatan;
  if (ppn_percentage !== undefined) {
    const pct = parseFloat(String(ppn_percentage));
    const sub = parseFloat(String(inv.subtotal));
    updates.ppn_percentage = pct;
    updates.ppn_amount = sub * pct / 100;
    updates.grand_total = sub + (sub * pct / 100);
  }
  await prisma.invoice.update({ where: { id }, data: updates });
  return res.json({ message: "Invoice diupdate" });
});

router.delete("/invoices/:id", requirePermission("finance", "delete"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) return res.status(404).json({ detail: "Invoice tidak ditemukan" });
  const isSuperAdmin = req.user!.roles.some((r: any) => r.role.name === "Super Admin");
  if (inv.status === "Lunas" && !isSuperAdmin) {
    return res.status(400).json({ detail: "Invoice yang sudah Lunas tidak bisa dihapus" });
  }
  // Cascade: hapus kwitansi + items terlebih dahulu
  await prisma.$transaction([
    prisma.kwitansi.deleteMany({ where: { invoice_id: id } }),
    prisma.invoiceItem.deleteMany({ where: { invoice_id: id } }),
    prisma.invoice.delete({ where: { id } }),
  ]);
  return res.json({ message: "Invoice dan kwitansi berhasil dihapus" });
});

// ── Tanda tangan Head Finance ─────────────────────────────────────────────────
router.post("/invoices/:id/sign-head", requirePermission("finance", "sign_head"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { admin_finance: true } });
  if (!inv) return res.status(404).json({ detail: "Invoice tidak ditemukan" });
  if (inv.status === "Lunas" || inv.status === "Batal") return res.status(400).json({ detail: "Invoice Lunas/Batal tidak bisa diubah" });
  const { signature_data } = req.body;
  if (!signature_data) return res.status(400).json({ detail: "Signature data wajib diisi" });
  // Jika admin_finance sudah ada → status jadi Terbit, jika belum → status tetap
  const newStatus = inv.admin_finance_id ? "Terbit" : inv.status;
  await prisma.invoice.update({
    where: { id },
    data: { head_finance_id: req.user!.id, head_finance_at: new Date(), head_finance_signature: signature_data, status: newStatus },
  });
  return res.json({ message: "Tanda tangan Head Finance disimpan", status: newStatus });
});

// ── Tanda tangan Admin Finance ────────────────────────────────────────────────
router.post("/invoices/:id/sign-admin", requirePermission("finance", "sign_admin"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { head_finance: true } });
  if (!inv) return res.status(404).json({ detail: "Invoice tidak ditemukan" });
  if (inv.status === "Lunas" || inv.status === "Batal") return res.status(400).json({ detail: "Invoice Lunas/Batal tidak bisa diubah" });
  const { signature_data } = req.body;
  if (!signature_data) return res.status(400).json({ detail: "Signature data wajib diisi" });
  // Jika head_finance sudah ada → status jadi Terbit, jika belum → status tetap
  const newStatus = inv.head_finance_id ? "Terbit" : inv.status;
  await prisma.invoice.update({
    where: { id },
    data: { admin_finance_id: req.user!.id, admin_finance_at: new Date(), admin_finance_signature: signature_data, status: newStatus },
  });
  return res.json({ message: "Tanda tangan Admin Finance disimpan", status: newStatus });
});

// ── Mark Paid ─────────────────────────────────────────────────────────────────
router.post("/invoices/:id/mark-paid", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { kwitansi: true } });
  if (!inv) return res.status(404).json({ detail: "Invoice tidak ditemukan" });
  if (inv.status === "Lunas") return res.status(400).json({ detail: "Invoice sudah Lunas" });
  if (inv.status !== "Terbit") return res.status(400).json({ detail: "Invoice harus berstatus Terbit (sudah ditandatangani) sebelum ditandai lunas" });
  const { metode_bayar, detail_bayar } = req.body;
  const nomorKwitansi = `KWT-${new Date().toISOString().slice(0, 7).replace("-", "")}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  await prisma.invoice.update({ where: { id }, data: { status: "Lunas" } });
  let kwitansi = inv.kwitansi;
  if (!kwitansi) {
    kwitansi = await prisma.kwitansi.create({
      data: {
        invoice_id: inv.id,
        nomor_kwitansi: nomorKwitansi,
        tanggal: new Date(),
        jumlah_diterima: inv.grand_total,
        metode_bayar: metode_bayar || "Transfer Bank",
        detail_bayar: detail_bayar || null,
        keterangan: [metode_bayar, detail_bayar].filter(Boolean).join(" - "),
      },
    });
  }
  return res.json({ message: "Invoice ditandai Lunas — kwitansi dibuat otomatis", kwitansi_id: kwitansi.id });
});

// ── Get Kwitansi ──────────────────────────────────────────────────────────────
router.get("/invoices/:id/kwitansi", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const kwitansi = await prisma.kwitansi.findFirst({ where: { invoice_id: id } });
  if (!kwitansi) return res.status(404).json({ detail: "Kwitansi belum tersedia" });
  // Also load invoice items & lead for PDF rendering
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true, lead: true },
  });
  return res.json({
    id: kwitansi.id,
    nomor_kwitansi: kwitansi.nomor_kwitansi,
    tanggal_lunas: kwitansi.tanggal,
    jumlah: parseFloat(String(kwitansi.jumlah_diterima ?? 0)),
    metode_bayar: kwitansi.metode_bayar || "Transfer Bank",
    detail_bayar: kwitansi.detail_bayar || null,
    penerima: kwitansi.penerima,
    alamat_klien: inv?.lead?.alamat || null,
    telepon_klien: inv?.lead?.nomor_telepon || null,
    items: (inv?.items || []).map((i: any) => ({
      keterangan: i.description || i.keterangan || "",
      jumlah: parseFloat(String(i.quantity ?? i.jumlah ?? 1)),
      harga_satuan: parseFloat(String(i.unit_price ?? i.harga_satuan ?? 0)),
    })),
  });
});

// ── Reimburse helpers ──────────────────────────────────────────────────────────
function reimburseDict(r: any) {
  const karyawan = r.user;
  const roleNames = karyawan?.roles?.map((ur: any) => ur.role?.name).filter(Boolean).join(", ") || null;
  return {
    id: r.id,
    tanggal: r.tanggal,
    user_id: r.user_id,
    nama_karyawan: karyawan?.name || null,
    role_karyawan: roleNames,
    kategori: r.kategori,
    keterangan: r.keterangan,
    total: Number(r.total),
    status: r.status,
    alasan_tolak: r.alasan_tolak,
    head_finance_id: r.head_finance_id,
    head_finance_at: r.head_finance_at,
    head_finance_signature: r.head_finance_signature,
    head_finance: r.head_finance ? { name: r.head_finance.name } : null,
    admin_finance_id: r.admin_finance_id,
    admin_finance_at: r.admin_finance_at,
    admin_finance_signature: r.admin_finance_signature,
    admin_finance: r.admin_finance ? { name: r.admin_finance.name } : null,
    items: (r.items || []).map((it: any) => ({ id: it.id, deskripsi: it.deskripsi, jumlah: Number(it.jumlah) })),
    buktis: (r.buktis || []).map((b: any) => ({ id: b.id, data: b.data, nama: b.nama })),
    created_at: r.created_at,
  };
}

const REIMBURSE_INCLUDE = {
  user: { include: { roles: { include: { role: true } } } },
  head_finance: true,
  admin_finance: true,
  items: true,
  buktis: true,
};

// Helper: check if current user can see/manage all reimburse (Super Admin or has finance.reimburse_all)
function isReimbursePrivileged(req: Request): boolean {
  const isSuperAdmin = req.user!.roles.some((r: any) => r.role.name === "Super Admin");
  return isSuperAdmin || !!req.userPermissions?.has("finance.reimburse_all");
}

// GET /finance/reimburse
router.get("/reimburse", async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string) || 200, 500);
  const status = req.query.status as string | undefined;
  const user_id = req.query.user_id as string | undefined;
  const bulan = req.query.bulan as string | undefined;
  const tahun = req.query.tahun as string | undefined;
  const dari_tanggal = req.query.dari_tanggal as string | undefined;
  const sampai_tanggal = req.query.sampai_tanggal as string | undefined;

  const where: any = {};
  // Non-privileged users can only see their own reimburse
  if (!isReimbursePrivileged(req)) {
    where.user_id = req.user!.id;
  } else {
    if (user_id) where.user_id = BigInt(user_id);
  }
  if (status) where.status = status;
  if (dari_tanggal || sampai_tanggal) {
    where.tanggal = {};
    if (dari_tanggal) where.tanggal.gte = new Date(dari_tanggal);
    if (sampai_tanggal) {
      const d = new Date(sampai_tanggal);
      d.setDate(d.getDate() + 1);
      where.tanggal.lt = d;
    }
  } else if (bulan && tahun) {
    const y = parseInt(tahun), m = parseInt(bulan);
    where.tanggal = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  } else if (tahun) {
    const y = parseInt(tahun);
    where.tanggal = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
  }

  const [total, items] = await Promise.all([
    prisma.reimburse.count({ where }),
    prisma.reimburse.findMany({
      where,
      include: REIMBURSE_INCLUDE,
      orderBy: { id: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);
  return res.json({ items: items.map(reimburseDict), total, page, per_page: perPage });
});

// GET /finance/reimburse/users  – user dropdown for reimburse form
router.get("/reimburse/users", async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    include: { roles: { include: { role: true } } },
    orderBy: { name: "asc" },
  });
  return res.json(users.map((u) => ({
    id: u.id,
    name: u.name,
    roles: u.roles.map((ur) => ur.role?.name).filter(Boolean).join(", "),
  })));
});

// POST /finance/reimburse
router.post("/reimburse", async (req: Request, res: Response) => {
  const { tanggal, kategori, keterangan, items, buktis } = req.body;
  // Non-privileged users can only submit for themselves
  const user_id = isReimbursePrivileged(req)
    ? (req.body.user_id || String(req.user!.id))
    : String(req.user!.id);
  if (!user_id) return res.status(400).json({ detail: "user_id wajib diisi" });
  if (!items || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ detail: "Minimal satu item bon" });

  const total = items.reduce((s: number, it: any) => s + Number(it.jumlah || 0), 0);
  const reimburse = await prisma.reimburse.create({
    data: {
      user_id: BigInt(user_id),
      tanggal: tanggal ? new Date(tanggal) : new Date(),
      kategori: kategori || null,
      keterangan: keterangan || null,
      total,
      status: "Pending",
      created_by: req.user?.id ?? null,
      items: {
        create: items.map((it: any) => ({
          deskripsi: it.deskripsi || null,
          jumlah: Number(it.jumlah || 0),
        })),
      },
      buktis: buktis && Array.isArray(buktis) && buktis.length > 0
        ? { create: buktis.map((b: any) => ({ data: b.data, nama: b.nama || null })) }
        : undefined,
    },
    include: REIMBURSE_INCLUDE,
  });
  return res.status(201).json(reimburseDict(reimburse));
});

// POST /finance/reimburse/:id/sign-head
router.post("/reimburse/:id/sign-head", requirePermission("finance", "sign_head"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { signature_data } = req.body;
  if (!signature_data) return res.status(400).json({ detail: "signature_data wajib diisi" });

  const existing = await prisma.reimburse.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ detail: "Reimburse tidak ditemukan" });
  if (existing.status === "Ditolak") return res.status(400).json({ detail: "Reimburse sudah ditolak" });

  const botchSigned = !!existing.admin_finance_id;
  const updated = await prisma.reimburse.update({
    where: { id },
    data: {
      head_finance_id: req.user!.id,
      head_finance_at: new Date(),
      head_finance_signature: signature_data,
      status: botchSigned ? "Disetujui" : existing.status,
    },
    include: REIMBURSE_INCLUDE,
  });
  return res.json({ message: "Tanda tangan Head Finance disimpan", data: reimburseDict(updated) });
});

// POST /finance/reimburse/:id/sign-admin
router.post("/reimburse/:id/sign-admin", requirePermission("finance", "sign_admin"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { signature_data } = req.body;
  if (!signature_data) return res.status(400).json({ detail: "signature_data wajib diisi" });

  const existing = await prisma.reimburse.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ detail: "Reimburse tidak ditemukan" });
  if (existing.status === "Ditolak") return res.status(400).json({ detail: "Reimburse sudah ditolak" });

  const bothSigned = !!existing.head_finance_id;
  const updated = await prisma.reimburse.update({
    where: { id },
    data: {
      admin_finance_id: req.user!.id,
      admin_finance_at: new Date(),
      admin_finance_signature: signature_data,
      status: bothSigned ? "Disetujui" : existing.status,
    },
    include: REIMBURSE_INCLUDE,
  });
  return res.json({ message: "Tanda tangan Admin Finance disimpan", data: reimburseDict(updated) });
});

// POST /finance/reimburse/:id/reject
router.post("/reimburse/:id/reject", async (req: Request, res: Response) => {
  if (!isReimbursePrivileged(req)) {
    return res.status(403).json({ detail: "Tidak memiliki akses untuk menolak reimburse" });
  }
  const id = BigInt(req.params.id);
  const { alasan } = req.body;
  const existing = await prisma.reimburse.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ detail: "Reimburse tidak ditemukan" });
  const updated = await prisma.reimburse.update({
    where: { id },
    data: { status: "Ditolak", alasan_tolak: alasan || null },
    include: REIMBURSE_INCLUDE,
  });
  return res.json({ message: "Reimburse ditolak", data: reimburseDict(updated) });
});

// DELETE /finance/reimburse/:id
router.delete("/reimburse/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const existing = await prisma.reimburse.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ detail: "Reimburse tidak ditemukan" });
  if (!isReimbursePrivileged(req) && existing.user_id !== req.user!.id) {
    return res.status(403).json({ detail: "Tidak bisa menghapus reimburse milik orang lain" });
  }
  await prisma.reimburse.delete({ where: { id } });
  return res.json({ message: "Pengajuan dihapus" });
});

// /adm-projek – alias for /adm-finance (projects)
router.get("/adm-projek", async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string) || 20, 100);
  const [total, items] = await Promise.all([
    prisma.admFinanceProject.count(),
    prisma.admFinanceProject.findMany({
      include: { lead: true, termins: true, proyek_berjalan: true },
      orderBy: { id: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);
  return res.json({
    items: items.map((p) => ({
      id: p.id,
      nama_proyek: p.nama_proyek || p.lokasi,
      klien: p.klien || (p.lead ? p.lead.nama : null),
      jenis: p.jenis,
      lokasi: p.lokasi,
      status: p.status,
      jumlah_termin: p.jumlah_termin,
      tanggal_mulai: p.tanggal_mulai,
      tanggal_selesai: p.tanggal_selesai,
      lead: p.lead ? { nama: p.lead.nama } : null,
      proyek_berjalan_id: p.proyek_berjalan_id,
      proyek_berjalan: p.proyek_berjalan ? { id: p.proyek_berjalan.id, nama_proyek: p.proyek_berjalan.nama_proyek } : null,
    })),
    total, page, per_page: perPage,
  });
});

// GET /finance/adm-projek/proyek-berjalan-options — list ProyekBerjalan for linking
router.get("/adm-projek/proyek-berjalan-options", async (req: Request, res: Response) => {
  const items = await prisma.proyekBerjalan.findMany({
    include: { lead: true },
    orderBy: { id: "desc" },
  });
  return res.json(items.map((p) => ({
    id: p.id,
    nama_proyek: p.nama_proyek,
    klien: p.lead ? p.lead.nama : null,
    tanggal_mulai: p.tanggal_mulai,
    tanggal_selesai: p.tanggal_selesai,
  })));
});

// POST /finance/adm-projek – create a project
router.post("/adm-projek", async (req: Request, res: Response) => {
  const { nama_proyek, klien, jenis, tanggal_mulai, tanggal_selesai, proyek_berjalan_id } = req.body;
  let resolvedNama = nama_proyek || null;
  let resolvedKlien = klien || null;
  let resolvedJenis = jenis || "Sipil";
  if (proyek_berjalan_id) {
    const pb = await prisma.proyekBerjalan.findUnique({ where: { id: BigInt(proyek_berjalan_id) }, include: { lead: true } });
    if (pb) {
      resolvedNama = resolvedNama || pb.nama_proyek;
      resolvedKlien = resolvedKlien || (pb.lead ? pb.lead.nama : null);
      // ProyekBerjalan has no jenis field; keep resolvedJenis as-is
    }
  }
  const project = await prisma.admFinanceProject.create({
    data: {
      nama_proyek: resolvedNama,
      klien: resolvedKlien,
      jenis: resolvedJenis,
      tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : undefined,
      tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : undefined,
      proyek_berjalan_id: proyek_berjalan_id ? BigInt(proyek_berjalan_id) : undefined,
      created_by: (req as any).user?.id ?? null,
    },
  });
  return res.json({ message: "Proyek dibuat", data: { id: project.id, nama_proyek: project.nama_proyek, klien: project.klien, jenis: project.jenis, proyek_berjalan_id: project.proyek_berjalan_id } });
});

// PATCH /finance/adm-projek/:id
router.patch("/adm-projek/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { nama_proyek, klien, jenis, tanggal_mulai, tanggal_selesai, status } = req.body;
  const project = await prisma.admFinanceProject.findUnique({ where: { id } });
  if (!project) return res.status(404).json({ detail: "Proyek tidak ditemukan" });
  const updated = await prisma.admFinanceProject.update({
    where: { id },
    data: {
      nama_proyek: nama_proyek !== undefined ? nama_proyek : undefined,
      klien: klien !== undefined ? klien : undefined,
      jenis: jenis !== undefined ? jenis : undefined,
      tanggal_mulai: tanggal_mulai !== undefined ? (tanggal_mulai ? new Date(tanggal_mulai) : null) : undefined,
      tanggal_selesai: tanggal_selesai !== undefined ? (tanggal_selesai ? new Date(tanggal_selesai) : null) : undefined,
      status: status !== undefined ? status : undefined,
    },
  });
  return res.json({ message: "Proyek diupdate", data: { id: updated.id, nama_proyek: updated.nama_proyek, klien: updated.klien, jenis: updated.jenis, status: updated.status } });
});

// DELETE /finance/adm-projek/:id
router.delete("/adm-projek/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const project = await prisma.admFinanceProject.findUnique({ where: { id } });
  if (!project) return res.status(404).json({ detail: "Proyek tidak ditemukan" });
  await prisma.admFinanceProject.delete({ where: { id } });
  return res.json({ message: "Proyek dihapus" });
});

// GET /finance/adm-projek/klien-options – clients who have paid invoices (has kwitansi)
router.get("/adm-projek/klien-options", async (req: Request, res: Response) => {
  const invoices = await prisma.invoice.findMany({
    where: { status: "Lunas", kwitansi: { isNot: null }, lead_id: { not: null } },
    include: { lead: true },
    distinct: ["lead_id"],
    orderBy: { lead_id: "asc" },
  });
  const klienList = invoices
    .filter((inv) => inv.lead)
    .map((inv) => ({ lead_id: inv.lead_id, nama: inv.lead!.nama }));
  return res.json(klienList);
});

// GET /finance/adm-projek/:id/rapp-items
router.get('/adm-projek/:id/rapp-items', async (req, res) => {
  const id = BigInt(req.params.id);
  const project = await prisma.admFinanceProject.findUnique({ where: { id } });
  if (!project?.proyek_berjalan_id) return res.json([]);
  const termins = await prisma.proyekBerjalanTermin.findMany({
    where: { proyek_berjalan_id: project.proyek_berjalan_id },
    include: {
      rapp_material_kategoris: { include: { items: true }, orderBy: { urutan: 'asc' } },
      rapp_sipil_items: { orderBy: { urutan: 'asc' } },
    },
    orderBy: { urutan: 'asc' },
  });
  const result = [];
  for (const t of termins) {
    for (const k of t.rapp_material_kategoris) {
      for (const it of k.items) {
        result.push({ nama_item: it.material, satuan: it.sat, qty: Number(it.vol), harga: Number(it.harga_satuan) });
      }
    }
    for (const it of t.rapp_sipil_items) {
      result.push({ nama_item: it.nama, satuan: it.sat, qty: Number(it.vol ?? 0), harga: Number(it.harga_satuan ?? 0) });
    }
  }
  return res.json(result);
});

// ─── Cashflow ─────────────────────────────────────────────────────────────────

// GET /finance/adm-projek/:id/cashflow
router.get("/adm-projek/:id/cashflow", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const items = await prisma.projekCashflow.findMany({
    where: { adm_finance_project_id: id },
    orderBy: [{ tanggal: "asc" }, { id: "asc" }],
  });
  return res.json(items);
});

// POST /finance/adm-projek/:id/cashflow
router.post("/adm-projek/:id/cashflow", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { tanggal, no_pr, kode, termin, keterangan, debit, kredit } = req.body;
  if (!tanggal) return res.status(400).json({ detail: "tanggal wajib diisi" });
  const item = await prisma.projekCashflow.create({
    data: {
      adm_finance_project_id: id,
      tanggal: new Date(tanggal),
      no_pr: no_pr || null,
      kode: kode || null,
      termin: termin || null,
      keterangan: keterangan || null,
      debit: Number(debit) || 0,
      kredit: Number(kredit) || 0,
    },
  });
  return res.json({ message: "Cashflow ditambahkan", data: item });
});

// DELETE /finance/adm-projek/:id/cashflow/:cid
router.delete("/adm-projek/:id/cashflow/:cid", async (req: Request, res: Response) => {
  const cid = BigInt(req.params.cid);
  await prisma.projekCashflow.delete({ where: { id: cid } });
  return res.json({ message: "Dihapus" });
});

// ─── List Material (Toko → Items) ────────────────────────────────────────────

// Helper: recalculate toko total
async function recalcTokoTotal(mid: bigint) {
  const items = await prisma.projekListMaterialItem.findMany({ where: { list_material_id: mid } });
  const total = items.reduce((s, it) => s + Number(it.jumlah), 0);
  await prisma.projekListMaterial.update({ where: { id: mid }, data: { total } });
}

// GET /finance/adm-projek/:id/list-material?toko=&bulan=&tahun=&tanggal_start=&tanggal_end=
router.get("/adm-projek/:id/list-material", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { toko, bulan, tahun, tanggal_start, tanggal_end } = req.query as Record<string, string>;
  const where: any = { adm_finance_project_id: id };
  if (toko) where.nama_toko = { contains: toko, mode: "insensitive" };
  if (bulan && tahun) {
    const m = parseInt(bulan), y = parseInt(tahun);
    where.tanggal = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  } else if (tahun) {
    const y = parseInt(tahun);
    where.tanggal = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
  } else if (tanggal_start || tanggal_end) {
    where.tanggal = {};
    if (tanggal_start) where.tanggal.gte = new Date(tanggal_start);
    if (tanggal_end) where.tanggal.lte = new Date(tanggal_end);
  }
  const tokos = await prisma.projekListMaterial.findMany({
    where,
    include: { items: { orderBy: { id: "asc" } } },
    orderBy: [{ tanggal: "asc" }, { id: "asc" }],
  });
  return res.json(tokos.map((t) => ({
    id: t.id, nama_toko: t.nama_toko, tanggal: t.tanggal, total: Number(t.total),
    items: t.items.map((it) => ({
      id: it.id, nama_item: it.nama_item, qty: Number(it.qty), satuan: it.satuan,
      harga_satuan: Number(it.harga_satuan), jumlah: Number(it.jumlah),
    })),
  })));
});

// POST /finance/adm-projek/:id/list-material — buat entry toko
router.post("/adm-projek/:id/list-material", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { nama_toko, tanggal } = req.body;
  if (!nama_toko) return res.status(400).json({ detail: "nama_toko wajib diisi" });
  const toko = await prisma.projekListMaterial.create({
    data: { adm_finance_project_id: id, nama_toko, tanggal: tanggal ? new Date(tanggal) : null },
    include: { items: true },
  });
  return res.json({ message: "Toko ditambahkan", data: { id: toko.id, nama_toko: toko.nama_toko, tanggal: toko.tanggal, total: 0, items: [] } });
});

// PUT /finance/adm-projek/:id/list-material/:mid — edit toko info
router.put("/adm-projek/:id/list-material/:mid", async (req: Request, res: Response) => {
  const mid = BigInt(req.params.mid);
  const { nama_toko, tanggal } = req.body;
  const toko = await prisma.projekListMaterial.update({
    where: { id: mid },
    data: { nama_toko: nama_toko || undefined, tanggal: tanggal !== undefined ? (tanggal ? new Date(tanggal) : null) : undefined },
  });
  return res.json({ message: "Toko diperbarui", data: { id: toko.id, nama_toko: toko.nama_toko, tanggal: toko.tanggal } });
});

// DELETE /finance/adm-projek/:id/list-material/:mid — hapus toko (cascade items)
router.delete("/adm-projek/:id/list-material/:mid", async (req: Request, res: Response) => {
  const mid = BigInt(req.params.mid);
  await prisma.projekListMaterial.delete({ where: { id: mid } });
  return res.json({ message: "Toko dihapus" });
});

// POST /finance/adm-projek/:id/list-material/:mid/items — tambah item ke toko
router.post("/adm-projek/:id/list-material/:mid/items", async (req: Request, res: Response) => {
  const mid = BigInt(req.params.mid);
  const { nama_item, qty, satuan, harga_satuan } = req.body;
  if (!nama_item) return res.status(400).json({ detail: "nama_item wajib diisi" });
  const q = Number(qty) || 0;
  const h = Number(harga_satuan) || 0;
  const item = await prisma.projekListMaterialItem.create({
    data: { list_material_id: mid, nama_item, qty: q, satuan: satuan || null, harga_satuan: h, jumlah: q * h },
  });
  await recalcTokoTotal(mid);
  return res.json({ message: "Item ditambahkan", data: { id: item.id, nama_item: item.nama_item, qty: q, satuan: item.satuan, harga_satuan: h, jumlah: q * h } });
});

// PUT /finance/adm-projek/:id/list-material/:mid/items/:iid — edit item
router.put("/adm-projek/:id/list-material/:mid/items/:iid", async (req: Request, res: Response) => {
  const mid = BigInt(req.params.mid);
  const iid = BigInt(req.params.iid);
  const { nama_item, qty, satuan, harga_satuan } = req.body;
  const q = Number(qty) || 0;
  const h = Number(harga_satuan) || 0;
  const item = await prisma.projekListMaterialItem.update({
    where: { id: iid },
    data: { nama_item: nama_item || undefined, qty: q, satuan: satuan || null, harga_satuan: h, jumlah: q * h },
  });
  await recalcTokoTotal(mid);
  return res.json({ message: "Item diperbarui", data: { id: item.id, jumlah: q * h } });
});

// DELETE /finance/adm-projek/:id/list-material/:mid/items/:iid
router.delete("/adm-projek/:id/list-material/:mid/items/:iid", async (req: Request, res: Response) => {
  const mid = BigInt(req.params.mid);
  const iid = BigInt(req.params.iid);
  await prisma.projekListMaterialItem.delete({ where: { id: iid } });
  await recalcTokoTotal(mid);
  return res.json({ message: "Item dihapus" });
});

// ─── Purchase Request (PR) ────────────────────────────────────────────────────

// GET /finance/adm-projek/:id/pr
router.get("/adm-projek/:id/pr", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const items = await prisma.projekPR.findMany({
    where: { adm_finance_project_id: id },
    include: { items: true },
    orderBy: { id: "desc" },
  });
  return res.json(items);
});

// POST /finance/adm-projek/:id/pr
router.post("/adm-projek/:id/pr", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { tanggal, nama_toko, catatan, items } = req.body;
  if (!tanggal) return res.status(400).json({ detail: "tanggal wajib diisi" });

  // Auto-generate nomor PR
  const count = await prisma.projekPR.count({ where: { adm_finance_project_id: id } });
  const nomor_pr = `PR-${String(count + 1).padStart(3, "0")}`;

  const pr = await prisma.projekPR.create({
    data: {
      adm_finance_project_id: id,
      nomor_pr,
      tanggal: new Date(tanggal),
      nama_toko: nama_toko || null,
      catatan: catatan || null,
      status: "Pending",
      items: {
        create: (items || []).map((it: any) => ({
          nama_item: it.nama_item,
          satuan: it.satuan || null,
          qty: Number(it.qty) || 0,
          harga_perkiraan: Number(it.harga_perkiraan) || 0,
          is_from_rapp: !!it.is_from_rapp,
          rapp_qty: it.rapp_qty != null ? Number(it.rapp_qty) : null,
          rapp_harga: it.rapp_harga != null ? Number(it.rapp_harga) : null,
        })),
      },
    },
    include: { items: true },
  });
  return res.json({ message: "PR dibuat", data: pr });
});

// PUT /finance/adm-projek/:id/pr/:pid — edit PR (blocked if HF signed)
router.put("/adm-projek/:id/pr/:pid", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.pid);
  const existing = await prisma.projekPR.findUnique({ where: { id: pid } });
  if (!existing) return res.status(404).json({ detail: "PR tidak ditemukan" });
  if (existing.hf_signed_at) return res.status(400).json({ detail: "PR sudah ditandatangani, tidak bisa diedit" });

  const { tanggal, nama_toko, catatan, items } = req.body;
  if (!tanggal) return res.status(400).json({ detail: "tanggal wajib diisi" });

  // Delete old items then re-create
  await prisma.projekPRItem.deleteMany({ where: { projek_pr_id: pid } });
  const pr = await prisma.projekPR.update({
    where: { id: pid },
    data: {
      tanggal: new Date(tanggal),
      nama_toko: nama_toko || null,
      catatan: catatan || null,
      status: "Pending",
      items: {
        create: (items || []).map((it: any) => ({
          nama_item: it.nama_item,
          satuan: it.satuan || null,
          qty: Number(it.qty) || 0,
          harga_perkiraan: Number(it.harga_perkiraan) || 0,
          is_from_rapp: !!it.is_from_rapp,
          rapp_qty: it.rapp_qty != null ? Number(it.rapp_qty) : null,
          rapp_harga: it.rapp_harga != null ? Number(it.rapp_harga) : null,
        })),
      },
    },
    include: { items: true },
  });
  return res.json({ message: "PR diperbarui", data: pr });
});

// PATCH /finance/adm-projek/:id/pr/:pid/status
router.patch("/adm-projek/:id/pr/:pid/status", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.pid);
  const { status, catatan } = req.body;
  const pr = await prisma.projekPR.update({
    where: { id: pid },
    data: { status: status || "Pending", catatan: catatan || undefined },
    include: { items: true },
  });
  return res.json({ message: "Status PR diperbarui", data: pr });
});

// DELETE /finance/adm-projek/:id/pr/:pid
router.delete("/adm-projek/:id/pr/:pid", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.pid);
  await prisma.projekPR.delete({ where: { id: pid } });
  return res.json({ message: "PR dihapus" });
});

// ─── Upload Nota / Bukti Transfer ─────────────────────────────────────────────

// GET /finance/adm-projek/:id/dokumen
router.get("/adm-projek/:id/dokumen", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const items = await prisma.projekDokumen.findMany({
    where: { adm_finance_project_id: id },
    orderBy: { tanggal_upload: "desc" },
    select: {
      id: true,
      kategori: true,
      nama_file: true,
      file_type: true,
      tanggal_upload: true,
      created_at: true,
      // exclude file_data from list to keep response small
    },
  });
  return res.json(items);
});

// GET /finance/adm-projek/:id/dokumen/:did (to download/view file)
router.get("/adm-projek/:id/dokumen/:did", async (req: Request, res: Response) => {
  const did = BigInt(req.params.did);
  const doc = await prisma.projekDokumen.findUnique({ where: { id: did } });
  if (!doc) return res.status(404).json({ detail: "Dokumen tidak ditemukan" });
  return res.json(doc);
});

// POST /finance/adm-projek/:id/dokumen
router.post("/adm-projek/:id/dokumen", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { kategori, nama_file, file_data, file_type, tanggal_upload } = req.body;
  if (!file_data) return res.status(400).json({ detail: "file_data wajib diisi" });
  const doc = await prisma.projekDokumen.create({
    data: {
      adm_finance_project_id: id,
      kategori: kategori || "Nota",
      nama_file: nama_file || null,
      file_data,
      file_type: file_type || null,
      tanggal_upload: tanggal_upload ? new Date(tanggal_upload) : new Date(),
    },
  });
  return res.json({ message: "Dokumen diupload", data: { id: doc.id, kategori: doc.kategori, nama_file: doc.nama_file, file_type: doc.file_type, tanggal_upload: doc.tanggal_upload } });
});

// DELETE /finance/adm-projek/:id/dokumen/:did
router.delete("/adm-projek/:id/dokumen/:did", async (req: Request, res: Response) => {
  const did = BigInt(req.params.did);
  await prisma.projekDokumen.delete({ where: { id: did } });
  return res.json({ message: "Dokumen dihapus" });
});

// ─── Cashflow Termin (per-termin deposit + item system) ───────────────────────

// ─── Adm-Projek Surat Jalan Material ─────────────────────────────────────────

// GET /finance/adm-projek/:id/surat-jalan
router.get("/adm-projek/:id/surat-jalan", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const sjs = await prisma.suratJalan.findMany({
    where: { adm_finance_project_id: pid },
    include: { items: true },
    orderBy: { tanggal: "desc" },
  });
  return res.json(sjs.map((s) => ({
    id: s.id, no_dokumen: s.no_dokumen, tanggal: s.tanggal, penerima: s.penerima, no_telp: s.no_telp,
    af_signed_at: s.af_signed_at, af_name: s.af_name,
    items_count: s.items.length,
  })));
});

// POST /finance/adm-projek/:id/surat-jalan
router.post("/adm-projek/:id/surat-jalan", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const user = (req as any).user;
  const { no_dokumen, tanggal, penerima, no_telp, keterangan, items = [] } = req.body;
  if (!tanggal || !penerima) return res.status(400).json({ detail: "tanggal dan penerima wajib diisi" });
  const sj = await prisma.suratJalan.create({
    data: {
      adm_finance_project_id: pid,
      no_dokumen: no_dokumen || null,
      tanggal: new Date(tanggal),
      penerima: penerima || null,
      no_telp: no_telp || null,
      keterangan: keterangan || null,
      created_by: user?.id ?? null,
      items: {
        create: (items as any[]).map((i) => ({
          nama_barang: i.nama_barang || null,
          description: i.deskripsi || null,
          qty: Number(i.qty) || 0,
          satuan: i.satuan || null,
        })),
      },
    },
  });
  return res.status(201).json({ id: sj.id, message: "Surat jalan dibuat" });
});

// GET /finance/adm-projek/:id/surat-jalan/:sid
router.get("/adm-projek/:id/surat-jalan/:sid", async (req: Request, res: Response) => {
  const sid = BigInt(req.params.sid);
  const pid = BigInt(req.params.id);
  const project = await prisma.admFinanceProject.findUnique({ where: { id: pid } });
  const sj = await prisma.suratJalan.findUnique({ where: { id: sid }, include: { items: true } });
  if (!sj) return res.status(404).json({ detail: "Surat jalan tidak ditemukan" });
  return res.json({
    id: sj.id, no_dokumen: sj.no_dokumen, tanggal: sj.tanggal,
    penerima: sj.penerima, no_telp: sj.no_telp, keterangan: sj.keterangan,
    af_signed_at: sj.af_signed_at, af_name: sj.af_name, af_signature: sj.af_signature || null,
    project: { nama_proyek: project?.nama_proyek, klien: project?.klien },
    items: sj.items.map((i) => ({
      id: i.id, nama_barang: i.nama_barang || "", deskripsi: i.description || "",
      qty: Number(i.qty), satuan: i.satuan || "",
    })),
  });
});

// DELETE /finance/adm-projek/:id/surat-jalan/:sid
router.delete("/adm-projek/:id/surat-jalan/:sid", async (req: Request, res: Response) => {
  const sid = BigInt(req.params.sid);
  await prisma.suratJalan.delete({ where: { id: sid } });
  return res.json({ message: "Surat jalan dihapus" });
});

// POST /finance/adm-projek/:id/surat-jalan/:sid/sign-af — Admin Finance sign
router.post("/adm-projek/:id/surat-jalan/:sid/sign-af", async (req: Request, res: Response) => {
  const sid = BigInt(req.params.sid);
  const user = (req as any).user;
  const { af_signature } = req.body;
  if (!af_signature) return res.status(400).json({ detail: "Tanda tangan wajib diisi" });
  const sj = await prisma.suratJalan.update({
    where: { id: sid },
    data: { af_signed_at: new Date(), af_signed_by: user?.id ?? null, af_name: user?.name ?? null, af_signature },
  });
  return res.json({ message: "Surat jalan ditandatangani AF", data: { af_signed_at: sj.af_signed_at, af_name: sj.af_name } });
});

// GET /finance/adm-projek/:id/surat-jalan/:sid/pdf-data
router.get("/adm-projek/:id/surat-jalan/:sid/pdf-data", async (req: Request, res: Response) => {
  const sid = BigInt(req.params.sid);
  const pid = BigInt(req.params.id);
  const [project, sj] = await Promise.all([
    prisma.admFinanceProject.findUnique({ where: { id: pid } }),
    prisma.suratJalan.findUnique({ where: { id: sid }, include: { items: true } }),
  ]);
  if (!sj) return res.status(404).json({ detail: "Surat jalan tidak ditemukan" });
  return res.json({
    project: { nama_proyek: project?.nama_proyek, klien: project?.klien, lokasi: project?.lokasi },
    surat_jalan: {
      no_dokumen: sj.no_dokumen, tanggal: sj.tanggal, penerima: sj.penerima, no_telp: sj.no_telp,
      af_signed_at: sj.af_signed_at, af_name: sj.af_name, af_signature: sj.af_signature || null,
    },
    items: sj.items.map((i) => ({
      id: i.id, nama_barang: i.nama_barang || "", deskripsi: i.description || "",
      qty: Number(i.qty), satuan: i.satuan || "",
    })),
  });
});

// ─────────────────────────────────────────────────────────────────────────────

// Helper: calculate total estimasi PR
async function getPRTotal(prId: bigint): Promise<number> {
  const items = await prisma.projekPRItem.findMany({ where: { projek_pr_id: prId } });
  return items.reduce((sum, it) => sum + Number(it.qty) * Number(it.harga_perkiraan), 0);
}

// GET /finance/adm-projek/:id/termins — list termins with deposit summary
router.get("/adm-projek/:id/termins", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const termins = await prisma.admFinanceTermin.findMany({
    where: { project_id: id },
    include: { deposits: true, cashflow_items: true },
    orderBy: { id: "asc" },
  });
  const result = termins.map((t) => {
    // Only signed deposits count toward available balance
    const depositAwalSigned = t.hf_signed_at ? Number(t.deposit_awal) : 0;
    const totalDepositTambahan = t.deposits.filter(d => d.hf_signed_at !== null).reduce((s, d) => s + Number(d.jumlah), 0);
    const totalDeposit = depositAwalSigned + totalDepositTambahan;
    const totalDebit = t.cashflow_items.reduce((s, c) => s + Number(c.debit), 0);
    return {
      id: t.id, project_id: t.project_id, nama_termin: t.nama_termin,
      tanggal: t.tanggal,
      deposit_awal: Number(t.deposit_awal),
      hf_signed_at: t.hf_signed_at, hf_signed_by: t.hf_signed_by ? Number(t.hf_signed_by) : null, hf_name: t.hf_name, hf_signature: t.hf_signature || null,
      status: t.status, created_at: t.created_at, updated_at: t.updated_at,
      deposits: t.deposits.map((d) => ({
        id: d.id, termin_id: d.termin_id, jumlah: Number(d.jumlah), catatan: d.catatan,
        hf_signed_at: d.hf_signed_at, hf_signed_by: d.hf_signed_by ? Number(d.hf_signed_by) : null, hf_name: d.hf_name, hf_signature: d.hf_signature || null,
        created_at: d.created_at,
      })),
      summary: { total_deposit: totalDeposit, total_debit: totalDebit, sisa: totalDeposit - totalDebit },
    };
  });
  return res.json(result);
});

// POST /finance/adm-projek/:id/termins — create termin
router.post("/adm-projek/:id/termins", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { nama_termin, deposit_awal, tanggal } = req.body;
  if (!nama_termin) return res.status(400).json({ detail: "nama_termin wajib diisi" });
  const termin = await prisma.admFinanceTermin.create({
    data: { project_id: id, nama_termin, deposit_awal: Number(deposit_awal) || 0, tanggal: tanggal ? new Date(tanggal) : null },
  });
  return res.json({ message: "Termin dibuat", data: { id: termin.id, nama_termin: termin.nama_termin, deposit_awal: Number(termin.deposit_awal), tanggal: termin.tanggal } });
});

// PATCH /finance/adm-projek/:id/termins/:tid — update termin
router.patch("/adm-projek/:id/termins/:tid", async (req: Request, res: Response) => {
  const tid = BigInt(req.params.tid);
  const { nama_termin, deposit_awal, tanggal } = req.body;
  const data: any = {};
  if (nama_termin !== undefined) data.nama_termin = nama_termin;
  if (deposit_awal !== undefined) data.deposit_awal = Number(deposit_awal) || 0;
  if (tanggal !== undefined) data.tanggal = tanggal ? new Date(tanggal) : null;
  const termin = await prisma.admFinanceTermin.update({ where: { id: tid }, data });
  return res.json({ message: "Termin diperbarui", data: { id: termin.id, deposit_awal: Number(termin.deposit_awal), tanggal: termin.tanggal } });
});

// DELETE /finance/adm-projek/:id/termins/:tid
router.delete("/adm-projek/:id/termins/:tid", async (req: Request, res: Response) => {
  const tid = BigInt(req.params.tid);
  await prisma.admFinanceTermin.delete({ where: { id: tid } });
  return res.json({ message: "Termin dihapus" });
});

// POST /finance/adm-projek/:id/termins/:tid/sign-deposit — HF sign deposit awal
router.post("/adm-projek/:id/termins/:tid/sign-deposit", async (req: Request, res: Response) => {
  const tid = BigInt(req.params.tid);
  const user = (req as any).user;
  const { hf_signature } = req.body;
  const termin = await prisma.admFinanceTermin.update({
    where: { id: tid },
    data: { hf_signed_at: new Date(), hf_signed_by: user?.id ?? null, hf_name: user?.name ?? null, hf_signature: hf_signature || null },
  });
  return res.json({ message: "Deposit ditandatangani", data: { hf_signed_at: termin.hf_signed_at, hf_name: termin.hf_name } });
});

// POST /finance/adm-projek/:id/termins/:tid/extra-deposit — tambah deposit
router.post("/adm-projek/:id/termins/:tid/extra-deposit", async (req: Request, res: Response) => {
  const tid = BigInt(req.params.tid);
  const { jumlah, catatan } = req.body;
  if (!jumlah || Number(jumlah) <= 0) return res.status(400).json({ detail: "jumlah wajib diisi" });
  const dep = await prisma.projekTerminDeposit.create({
    data: { termin_id: tid, jumlah: Number(jumlah), catatan: catatan || null },
  });
  return res.json({ message: "Deposit tambahan ditambahkan", data: { id: dep.id, jumlah: Number(dep.jumlah), catatan: dep.catatan } });
});

// POST /finance/adm-projek/:id/termins/:tid/extra-deposit/:did/sign — HF sign extra deposit
router.post("/adm-projek/:id/termins/:tid/extra-deposit/:did/sign", async (req: Request, res: Response) => {
  const did = BigInt(req.params.did);
  const user = (req as any).user;
  const { hf_signature } = req.body;
  const dep = await prisma.projekTerminDeposit.update({
    where: { id: did },
    data: { hf_signed_at: new Date(), hf_signed_by: user?.id ?? null, hf_name: user?.name ?? null, hf_signature: hf_signature || null },
  });
  return res.json({ message: "Deposit tambahan ditandatangani", data: { hf_signed_at: dep.hf_signed_at, hf_name: dep.hf_name } });
});

// DELETE /finance/adm-projek/:id/termins/:tid/extra-deposit/:did
router.delete("/adm-projek/:id/termins/:tid/extra-deposit/:did", async (req: Request, res: Response) => {
  const did = BigInt(req.params.did);
  await prisma.projekTerminDeposit.delete({ where: { id: did } });
  return res.json({ message: "Deposit tambahan dihapus" });
});

// GET /finance/adm-projek/:id/termins/:tid/cashflow — cashflow items for termin
router.get("/adm-projek/:id/termins/:tid/cashflow", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const tid = BigInt(req.params.tid);
  const [termin, items] = await Promise.all([
    prisma.admFinanceTermin.findUnique({
      where: { id: tid },
      include: { deposits: true },
    }),
    prisma.projekCashflow.findMany({
      where: { adm_finance_project_id: pid, adm_finance_termin_id: tid },
      include: { pr: { include: { items: true } } },
      orderBy: [{ tanggal: "asc" }, { id: "asc" }],
    }),
  ]);
  if (!termin) return res.status(404).json({ detail: "Termin tidak ditemukan" });
  const depositAwalSigned = termin.hf_signed_at ? Number(termin.deposit_awal) : 0;
  const totalDepositTambahan = termin.deposits.filter(d => d.hf_signed_at !== null).reduce((s, d) => s + Number(d.jumlah), 0);
  const totalDeposit = depositAwalSigned + totalDepositTambahan;
  const totalDebit = items.reduce((s, c) => s + Number(c.debit), 0);
  return res.json({
    items: items.map((c) => ({ id: c.id, tanggal: c.tanggal, no_pr: c.no_pr, keterangan: c.keterangan, debit: Number(c.debit), projek_pr_id: c.projek_pr_id ? Number(c.projek_pr_id) : null, nota_image: c.nota_image || null })),
    summary: { total_deposit: totalDeposit, total_debit: totalDebit, sisa: totalDeposit - totalDebit },
  });
});

// POST /finance/adm-projek/:id/termins/:tid/cashflow — pull PR into termin cashflow
router.post("/adm-projek/:id/termins/:tid/cashflow", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const tid = BigInt(req.params.tid);
  const { projek_pr_id, tanggal, nota_image } = req.body;
  if (!projek_pr_id) return res.status(400).json({ detail: "projek_pr_id wajib diisi" });
  const prId = BigInt(projek_pr_id);
  const pr = await prisma.projekPR.findUnique({ where: { id: prId }, include: { items: true } });
  if (!pr) return res.status(404).json({ detail: "PR tidak ditemukan" });
  if (!pr.hf_signed_at) return res.status(400).json({ detail: "PR belum ditandatangani Head Finance" });
  const total = pr.items.reduce((s, it) => s + Number(it.qty) * Number(it.harga_perkiraan), 0);
  const item = await prisma.projekCashflow.create({
    data: {
      adm_finance_project_id: pid,
      adm_finance_termin_id: tid,
      projek_pr_id: prId,
      tanggal: tanggal ? new Date(tanggal) : new Date(),
      no_pr: pr.nomor_pr || null,
      keterangan: pr.nama_toko || pr.keperluan || null,
      debit: total,
      kredit: 0,
      nota_image: nota_image || null,
    },
  });
  return res.json({ message: "PR ditarik ke cashflow", data: { id: item.id, no_pr: item.no_pr, debit: Number(item.debit) } });
});

// DELETE /finance/adm-projek/:id/termins/:tid/cashflow/:cid
router.delete("/adm-projek/:id/termins/:tid/cashflow/:cid", async (req: Request, res: Response) => {
  const cid = BigInt(req.params.cid);
  await prisma.projekCashflow.delete({ where: { id: cid } });
  return res.json({ message: "Item cashflow dihapus" });
});

// ─── Gajian Cashflow ──────────────────────────────────────────────────────────

// GET /finance/adm-projek/:id/gajian/available — Gajian signed by both HF+AF, not yet in cashflow
router.get("/adm-projek/:id/gajian/available", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const gajians = await prisma.gajiTukang.findMany({
    where: { adm_finance_project_id: pid, hf_signed_at: { not: null }, af_signed_at: { not: null } },
    orderBy: { id: "desc" },
  });
  const pulledRecs = await prisma.projekCashflow.findMany({
    where: { adm_finance_project_id: pid, gaji_tukang_id: { not: null } },
    select: { gaji_tukang_id: true },
  });
  const pulledSet = new Set(pulledRecs.map(c => String(c.gaji_tukang_id)));
  const available = gajians.filter(g => !pulledSet.has(String(g.id)));
  return res.json(available.map(g => ({
    id: g.id, bulan: g.bulan, tahun: g.tahun,
    tanggal_mulai: g.tanggal_mulai, tanggal_selesai: g.tanggal_selesai,
    total_gaji: Number(g.total_gaji),
  })));
});

// POST /finance/adm-projek/:id/termins/:tid/cashflow/gajian — pull gajian to termin cashflow
router.post("/adm-projek/:id/termins/:tid/cashflow/gajian", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const tid = BigInt(req.params.tid);
  const { gaji_tukang_id, tanggal } = req.body;
  if (!gaji_tukang_id) return res.status(400).json({ detail: "gaji_tukang_id wajib diisi" });
  const gajiId = BigInt(gaji_tukang_id);
  const gaji = await prisma.gajiTukang.findUnique({ where: { id: gajiId } });
  if (!gaji) return res.status(404).json({ detail: "Gajian tidak ditemukan" });
  if (!gaji.hf_signed_at || !gaji.af_signed_at) return res.status(400).json({ detail: "Gajian belum ditandatangani kedua pihak" });
  const existing = await prisma.projekCashflow.findFirst({ where: { adm_finance_project_id: pid, gaji_tukang_id: gajiId } });
  if (existing) return res.status(400).json({ detail: "Gajian ini sudah ditarik ke cashflow" });
  const label = (gaji.bulan && gaji.tahun) ? `Gaji Tukang ${gaji.bulan}/${gaji.tahun}` : "Gaji Tukang";
  const item = await prisma.projekCashflow.create({
    data: {
      adm_finance_project_id: pid,
      adm_finance_termin_id: tid,
      gaji_tukang_id: gajiId,
      tanggal: tanggal ? new Date(tanggal) : new Date(),
      keterangan: label,
      debit: Number(gaji.total_gaji),
      kredit: 0,
    },
  });
  return res.json({ message: "Gajian ditarik ke cashflow", data: { id: item.id, keterangan: item.keterangan, debit: Number(item.debit) } });
});

// ─── PR Sign + Available ──────────────────────────────────────────────────────

// GET /finance/adm-projek/:id/pr/available — PRs that are Disetujui + HF signed
router.get("/adm-projek/:id/pr/available", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const prs = await prisma.projekPR.findMany({
    where: { adm_finance_project_id: id, status: "Disetujui", hf_signed_at: { not: null } },
    include: { items: true },
    orderBy: { id: "desc" },
  });
  return res.json(prs.map((pr) => ({
    id: pr.id, nomor_pr: pr.nomor_pr, tanggal: pr.tanggal, keperluan: pr.keperluan, nama_toko: pr.nama_toko,
    hf_signed_at: pr.hf_signed_at, hf_name: pr.hf_name,
    total: pr.items.reduce((s, it) => s + Number(it.qty) * Number(it.harga_perkiraan), 0),
  })));
});

// POST /finance/adm-projek/:id/pr/:pid/sign — HF sign PR
router.post("/adm-projek/:id/pr/:pid/sign", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.pid);
  const user = (req as any).user;
  const { hf_signature } = req.body;
  const pr = await prisma.projekPR.findUnique({ where: { id: pid } });
  if (!pr) return res.status(404).json({ detail: "PR tidak ditemukan" });
  if (pr.status !== "Disetujui") return res.status(400).json({ detail: "PR harus berstatus Disetujui terlebih dahulu" });
  const updated = await prisma.projekPR.update({
    where: { id: pid },
    data: { hf_signed_at: new Date(), hf_signed_by: user?.id ?? null, hf_name: user?.name ?? null, hf_signature: hf_signature || null },
    include: { items: true },
  });
  return res.json({ message: "PR ditandatangani", data: { hf_signed_at: updated.hf_signed_at, hf_name: updated.hf_name } });
});

// ─── PDF Data Routes ──────────────────────────────────────────────────────────

// GET /finance/adm-projek/:id/termins/:tid/pdf-data
router.get("/adm-projek/:id/termins/:tid/pdf-data", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const tid = BigInt(req.params.tid);
  const [project, termin, items] = await Promise.all([
    prisma.admFinanceProject.findUnique({ where: { id: pid } }),
    prisma.admFinanceTermin.findUnique({ where: { id: tid }, include: { deposits: true } }),
    prisma.projekCashflow.findMany({
      where: { adm_finance_project_id: pid, adm_finance_termin_id: tid },
      orderBy: [{ tanggal: "asc" }, { id: "asc" }],
    }),
  ]);
  if (!project || !termin) return res.status(404).json({ detail: "Data tidak ditemukan" });
  const depositAwalSigned = termin.hf_signed_at ? Number(termin.deposit_awal) : 0;
  const totalDepositTambahan = termin.deposits.filter(d => d.hf_signed_at !== null).reduce((s, d) => s + Number(d.jumlah), 0);
  const totalDeposit = depositAwalSigned + totalDepositTambahan;
  const totalDebit = items.reduce((s, c) => s + Number(c.debit), 0);
  return res.json({
    project: { id: project.id, nama_proyek: project.nama_proyek, klien: project.klien, jenis: project.jenis, lokasi: project.lokasi },
    termin: { id: termin.id, nama_termin: termin.nama_termin, tanggal: termin.tanggal, deposit_awal: Number(termin.deposit_awal), hf_signed_at: termin.hf_signed_at, hf_name: termin.hf_name, hf_signature: termin.hf_signature || null, deposits: termin.deposits.map((d) => ({ jumlah: Number(d.jumlah), catatan: d.catatan, hf_signed_at: d.hf_signed_at, hf_name: d.hf_name, hf_signature: d.hf_signature || null })) },
    items: items.map((c) => ({ id: c.id, tanggal: c.tanggal, no_pr: c.no_pr, keterangan: c.keterangan, debit: Number(c.debit), nota_image: c.nota_image || null })),
    summary: { total_deposit: totalDeposit, total_debit: totalDebit, sisa: totalDeposit - totalDebit },
  });
});

// GET /finance/adm-projek/:id/pr/:pid/pdf-data
router.get("/adm-projek/:id/pr/:pid/pdf-data", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const pid = BigInt(req.params.pid);
  const [project, pr] = await Promise.all([
    prisma.admFinanceProject.findUnique({ where: { id } }),
    prisma.projekPR.findUnique({ where: { id: pid }, include: { items: true } }),
  ]);
  if (!project || !pr) return res.status(404).json({ detail: "Data tidak ditemukan" });
  const total = pr.items.reduce((s, it) => s + Number(it.qty) * Number(it.harga_perkiraan), 0);
  return res.json({
    project: { nama_proyek: project.nama_proyek, klien: project.klien },
    pr: { nomor_pr: pr.nomor_pr, tanggal: pr.tanggal, keperluan: pr.keperluan, nama_toko: pr.nama_toko, status: pr.status, catatan: pr.catatan, hf_signed_at: pr.hf_signed_at, hf_name: pr.hf_name, hf_signature: pr.hf_signature || null },
    items: pr.items.map((it) => ({ nama_item: it.nama_item, satuan: it.satuan, qty: Number(it.qty), harga_perkiraan: Number(it.harga_perkiraan), subtotal: Number(it.qty) * Number(it.harga_perkiraan) })),
    total,
  });
});

// GET /finance/adm-projek/:id/list-material/pdf-data?toko=&bulan=&tahun=&tanggal_start=&tanggal_end=
router.get("/adm-projek/:id/list-material/pdf-data", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { toko, bulan, tahun, tanggal_start, tanggal_end } = req.query as Record<string, string>;
  const where: any = { adm_finance_project_id: id };
  if (toko) where.nama_toko = { contains: toko, mode: "insensitive" };
  if (bulan && tahun) {
    const m = parseInt(bulan), y = parseInt(tahun);
    where.tanggal = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  } else if (tahun) {
    const y = parseInt(tahun);
    where.tanggal = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
  } else if (tanggal_start || tanggal_end) {
    where.tanggal = {};
    if (tanggal_start) where.tanggal.gte = new Date(tanggal_start);
    if (tanggal_end) where.tanggal.lte = new Date(tanggal_end);
  }
  const [project, tokos] = await Promise.all([
    prisma.admFinanceProject.findUnique({ where: { id } }),
    prisma.projekListMaterial.findMany({
      where,
      include: { items: { orderBy: { id: "asc" } } },
      orderBy: [{ tanggal: "asc" }, { id: "asc" }],
    }),
  ]);
  if (!project) return res.status(404).json({ detail: "Project tidak ditemukan" });
  const grandTotal = tokos.reduce((s, t) => s + Number(t.total), 0);
  const filter = { toko: toko || null, bulan: bulan || null, tahun: tahun || null, tanggal_start: tanggal_start || null, tanggal_end: tanggal_end || null };
  return res.json({
    project: { nama_proyek: project.nama_proyek, klien: project.klien },
    tokos: tokos.map((t) => ({
      id: t.id, nama_toko: t.nama_toko, tanggal: t.tanggal, total: Number(t.total),
      items: t.items.map((it) => ({ nama_item: it.nama_item, qty: Number(it.qty), satuan: it.satuan, harga_satuan: Number(it.harga_satuan), jumlah: Number(it.jumlah) })),
    })),
    grand_total: grandTotal,
    filter,
  });
});

// GET /finance/adm-projek/:id/cashflow-overview/pdf-data — all termins overview
router.get("/adm-projek/:id/cashflow-overview/pdf-data", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const [project, termins] = await Promise.all([
    prisma.admFinanceProject.findUnique({ where: { id: pid } }),
    prisma.admFinanceTermin.findMany({
      where: { project_id: pid },
      include: { deposits: true, cashflow_items: { orderBy: [{ tanggal: "asc" }, { id: "asc" }] } },
      orderBy: { id: "asc" },
    }),
  ]);
  if (!project) return res.status(404).json({ detail: "Project tidak ditemukan" });
  const terminData = termins.map((t) => {
    const depositAwalSigned = t.hf_signed_at ? Number(t.deposit_awal) : 0;
    const totalDepositTambahan = t.deposits.filter(d => d.hf_signed_at !== null).reduce((s, d) => s + Number(d.jumlah), 0);
    const totalDeposit = depositAwalSigned + totalDepositTambahan;
    const totalDebit = t.cashflow_items.reduce((s, c) => s + Number(c.debit), 0);
    return {
      id: t.id, nama_termin: t.nama_termin, tanggal: t.tanggal,
      deposit_awal: Number(t.deposit_awal), hf_signed_at: t.hf_signed_at, hf_name: t.hf_name,
      deposits: t.deposits.map(d => ({ jumlah: Number(d.jumlah), catatan: d.catatan, hf_signed_at: d.hf_signed_at, hf_name: d.hf_name })),
      items: t.cashflow_items.map(c => ({ id: c.id, tanggal: c.tanggal, no_pr: c.no_pr, keterangan: c.keterangan, debit: Number(c.debit) })),
      summary: { total_deposit: totalDeposit, total_debit: totalDebit, sisa: totalDeposit - totalDebit },
    };
  });
  const grandDeposit = terminData.reduce((s, t) => s + t.summary.total_deposit, 0);
  const grandDebit = terminData.reduce((s, t) => s + t.summary.total_debit, 0);
  return res.json({
    project: { nama_proyek: project.nama_proyek, klien: project.klien, lokasi: project.lokasi },
    termins: terminData,
    grand_summary: { total_deposit: grandDeposit, total_debit: grandDebit, sisa: grandDeposit - grandDebit },
  });
});

// ── Project-Scoped Tukang Routes ──────────────────────────────────────────────

// GET /finance/adm-projek/:id/tukang/available-users
// Returns users with "Tukang" role; flags those already assigned to this project
router.get("/adm-projek/:id/tukang/available-users", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const users = await prisma.user.findMany({
    where: { roles: { some: { role: { name: "Tukang" } } } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  const registered = await prisma.tukangRegistry.findMany({
    where: { adm_finance_project_id: pid, user_id: { not: null } },
    select: { user_id: true },
  });
  const registeredIds = new Set(registered.map((r) => r.user_id!.toString()));
  return res.json(users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    already_assigned: registeredIds.has(u.id.toString()),
  })));
});

// GET /finance/adm-projek/:id/tukang/registry
router.get("/adm-projek/:id/tukang/registry", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const regs = await prisma.tukangRegistry.findMany({
    where: { adm_finance_project_id: pid },
    orderBy: { nama: "asc" },
  });
  return res.json(regs.map((r) => ({
    id: r.id, nama: r.nama, jabatan: r.jabatan,
    upah_harian: Number(r.upah_harian), is_active: r.is_active, user_id: r.user_id,
  })));
});

// POST /finance/adm-projek/:id/tukang/registry
router.post("/adm-projek/:id/tukang/registry", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const { nama, jabatan, upah_harian, user_id } = req.body;
  let resolvedNama = nama;
  if (!resolvedNama && user_id) {
    const u = await prisma.user.findUnique({ where: { id: BigInt(user_id) }, select: { name: true } });
    resolvedNama = u?.name ?? null;
  }
  if (!resolvedNama) return res.status(400).json({ detail: "Pilih user atau isi nama" });
  const r = await prisma.tukangRegistry.create({
    data: {
      adm_finance_project_id: pid,
      nama: resolvedNama, jabatan: jabatan ?? null,
      upah_harian: upah_harian ?? 0,
      user_id: user_id ? BigInt(user_id) : null,
    },
  });
  return res.status(201).json({ id: r.id });
});

// PATCH /finance/adm-projek/:id/tukang/registry/:tid
router.patch("/adm-projek/:id/tukang/registry/:tid", async (req: Request, res: Response) => {
  const tid = BigInt(req.params.tid);
  const existing = await prisma.tukangRegistry.findUnique({ where: { id: tid } });
  if (!existing) return res.status(404).json({ detail: "Tukang tidak ditemukan" });
  const { nama, jabatan, upah_harian, is_active, user_id } = req.body;
  const data: Record<string, unknown> = {};
  if (nama !== undefined) data.nama = nama;
  if (jabatan !== undefined) data.jabatan = jabatan;
  if (upah_harian !== undefined) data.upah_harian = upah_harian;
  if (is_active !== undefined) data.is_active = is_active;
  if (user_id !== undefined) data.user_id = user_id ? BigInt(user_id) : null;
  await prisma.tukangRegistry.update({ where: { id: tid }, data });
  return res.json({ message: "Tukang diupdate" });
});

// DELETE /finance/adm-projek/:id/tukang/registry/:tid
router.delete("/adm-projek/:id/tukang/registry/:tid", async (req: Request, res: Response) => {
  const tid = BigInt(req.params.tid);
  const existing = await prisma.tukangRegistry.findUnique({ where: { id: tid } });
  if (!existing) return res.status(404).json({ detail: "Tukang tidak ditemukan" });
  await prisma.tukangRegistry.delete({ where: { id: tid } });
  return res.json({ message: "Tukang dihapus" });
});

// GET /finance/adm-projek/:id/tukang/absen-foto — list all attendance photos for project
router.get("/adm-projek/:id/tukang/absen-foto", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const { status, tukang_id, tanggal } = req.query;
  const where: Record<string, unknown> = {
    tukang: { adm_finance_project_id: pid },
  };
  if (status) where.status = status;
  if (tukang_id) where.tukang_id = BigInt(tukang_id as string);
  if (tanggal) where.tanggal = new Date(tanggal as string);
  const photos = await prisma.tukangAbsenFoto.findMany({
    where, orderBy: [{ tanggal: "desc" }, { created_at: "desc" }],
    include: { tukang: { select: { nama: true, jabatan: true } }, approver: { select: { name: true } } },
  });
  return res.json(photos.map((p) => ({
    id: p.id, tukang_id: p.tukang_id, tukang_nama: p.tukang?.nama, tukang_jabatan: p.tukang?.jabatan,
    tanggal: p.tanggal, foto: p.foto, foto_timestamp: p.foto_timestamp,
    status: p.status, approved_by: p.approved_by, approved_at: p.approved_at,
    approver_name: p.approver?.name, catatan: p.catatan,
  })));
});

// POST /finance/adm-projek/:id/tukang/absen-foto — submit attendance photo (used by Admin from project page OR tukang from /absen page)
router.post("/adm-projek/:id/tukang/absen-foto", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const { tukang_id, tanggal, foto, foto_timestamp } = req.body;
  if (!tukang_id || !foto) return res.status(400).json({ detail: "tukang_id dan foto wajib diisi" });
  const tukang = await prisma.tukangRegistry.findFirst({ where: { id: BigInt(tukang_id), adm_finance_project_id: pid } });
  if (!tukang) return res.status(404).json({ detail: "Tukang tidak ditemukan untuk proyek ini" });
  const p = await prisma.tukangAbsenFoto.create({
    data: {
      tukang_id: BigInt(tukang_id),
      tanggal: new Date(tanggal),
      foto,
      foto_timestamp: foto_timestamp ? new Date(foto_timestamp) : new Date(),
      status: "Pending",
      created_by: req.user!.id,
    },
  });
  return res.status(201).json({ id: p.id });
});

// POST /finance/adm-projek/:id/tukang/absen-foto/:aid/approve
router.post("/adm-projek/:id/tukang/absen-foto/:aid/approve", async (req: Request, res: Response) => {
  const aid = BigInt(req.params.aid);
  const p = await prisma.tukangAbsenFoto.findUnique({ where: { id: aid } });
  if (!p) return res.status(404).json({ detail: "Data tidak ditemukan" });
  await prisma.tukangAbsenFoto.update({
    where: { id: aid },
    data: { status: "Disetujui", approved_by: req.user!.id, approved_at: new Date() },
  });
  return res.json({ message: "Absen disetujui" });
});

// POST /finance/adm-projek/:id/tukang/absen-foto/:aid/reject
router.post("/adm-projek/:id/tukang/absen-foto/:aid/reject", async (req: Request, res: Response) => {
  const aid = BigInt(req.params.aid);
  const { catatan } = req.body;
  const p = await prisma.tukangAbsenFoto.findUnique({ where: { id: aid } });
  if (!p) return res.status(404).json({ detail: "Data tidak ditemukan" });
  await prisma.tukangAbsenFoto.update({
    where: { id: aid },
    data: { status: "Ditolak", approved_by: req.user!.id, approved_at: new Date(), catatan: catatan ?? null },
  });
  return res.json({ message: "Absen ditolak" });
});

// POST /finance/adm-projek/:id/tukang/absen-checklist — admin/kepala tukang marks attendance directly (no photo, auto-approved)
router.post("/adm-projek/:id/tukang/absen-checklist", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const { tukang_id, tanggal } = req.body;
  if (!tukang_id || !tanggal) return res.status(400).json({ detail: "tukang_id dan tanggal wajib diisi" });
  const tukang = await prisma.tukangRegistry.findFirst({ where: { id: BigInt(tukang_id), adm_finance_project_id: pid } });
  if (!tukang) return res.status(404).json({ detail: "Tukang tidak ditemukan untuk proyek ini" });
  // Check if already exists for this date
  const existing = await prisma.tukangAbsenFoto.findFirst({
    where: { tukang_id: BigInt(tukang_id), tanggal: new Date(tanggal) },
  });
  if (existing) return res.status(409).json({ detail: "Absensi untuk tukang ini pada tanggal tersebut sudah ada" });
  const p = await prisma.tukangAbsenFoto.create({
    data: {
      tukang_id: BigInt(tukang_id),
      tanggal: new Date(tanggal),
      foto: null,
      foto_timestamp: new Date(),
      status: "Disetujui",
      approved_by: req.user!.id,
      approved_at: new Date(),
      catatan: "Diisi oleh admin",
      created_by: req.user!.id,
    },
  });
  return res.status(201).json({ id: String(p.id) });
});

// GET /finance/adm-projek/:id/tukang/kasbon — all kasbon for project
router.get("/adm-projek/:id/tukang/kasbon", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const kasbons = await prisma.tukangCashbound.findMany({
    where: { tukang: { adm_finance_project_id: pid } },
    orderBy: { tanggal: "desc" },
    include: { tukang: { select: { nama: true, jabatan: true } } },
  });
  return res.json(kasbons.map((k) => ({
    id: k.id, tukang_id: k.tukang_id, tukang_nama: k.tukang?.nama, tukang_jabatan: k.tukang?.jabatan,
    jumlah: Number(k.jumlah),
    jumlah_dipotong: Number((k as any).jumlah_dipotong ?? 0),
    sisa: Number(k.jumlah) - Number((k as any).jumlah_dipotong ?? 0),
    catatan: k.catatan, tanggal: k.tanggal, sudah_dipotong: k.sudah_dipotong,
  })));
});

// POST /finance/adm-projek/:id/tukang/:tid/kasbon — add kasbon for tukang
router.post("/adm-projek/:id/tukang/:tid/kasbon", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const tid = BigInt(req.params.tid);
  const { jumlah, catatan, tanggal } = req.body;
  if (!jumlah) return res.status(400).json({ detail: "Jumlah wajib diisi" });
  const tukang = await prisma.tukangRegistry.findFirst({ where: { id: tid, adm_finance_project_id: pid } });
  if (!tukang) return res.status(404).json({ detail: "Tukang tidak ditemukan" });
  const k = await prisma.tukangCashbound.create({
    data: {
      tukang_id: tid, jumlah,
      catatan: catatan ?? null,
      tanggal: tanggal ? new Date(tanggal) : new Date(),
    },
  });
  return res.status(201).json({ id: k.id });
});

// PATCH /finance/adm-projek/:id/tukang/kasbon/:cid — edit kasbon
router.patch("/adm-projek/:id/tukang/kasbon/:cid", async (req: Request, res: Response) => {
  const cid = BigInt(req.params.cid);
  const k = await prisma.tukangCashbound.findUnique({ where: { id: cid } });
  if (!k) return res.status(404).json({ detail: "Data tidak ditemukan" });
  if (Number((k as any).jumlah_dipotong ?? 0) > 0) return res.status(400).json({ detail: "Kasbon sudah ada cicilan pembayaran, tidak bisa diedit" });
  const { jumlah, catatan, tanggal } = req.body;
  const updates: any = {};
  if (jumlah !== undefined) updates.jumlah = jumlah;
  if (catatan !== undefined) updates.catatan = catatan;
  if (tanggal !== undefined) updates.tanggal = tanggal ? new Date(tanggal) : null;
  await prisma.tukangCashbound.update({ where: { id: cid }, data: updates });
  return res.json({ ok: true });
});

// DELETE /finance/adm-projek/:id/tukang/kasbon/:cid
router.delete("/adm-projek/:id/tukang/kasbon/:cid", async (req: Request, res: Response) => {
  const cid = BigInt(req.params.cid);
  const k = await prisma.tukangCashbound.findUnique({ where: { id: cid } });
  if (!k) return res.status(404).json({ detail: "Data tidak ditemukan" });
  if (Number((k as any).jumlah_dipotong ?? 0) > 0) return res.status(400).json({ detail: "Kasbon sudah ada cicilan pembayaran, tidak bisa dihapus" });
  await prisma.tukangCashbound.delete({ where: { id: cid } });
  return res.json({ message: "Kasbon dihapus" });
});

// GET /finance/adm-projek/:id/tukang/gajian — weekly payroll list
router.get("/adm-projek/:id/tukang/gajian", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const gajians = await prisma.gajiTukang.findMany({
    where: { adm_finance_project_id: pid },
    orderBy: { id: "desc" },
    include: {
      items: { include: { tukang_reg: { select: { nama: true } } } },
      kwitansis: { select: { id: true, tukang_name: true, jumlah_gaji: true, kasbon_dipotong: true, tanggal_pembayaran: true } },
    },
  });
  return res.json(gajians.map((g) => ({
    id: g.id, tanggal_mulai: g.tanggal_mulai, tanggal_selesai: g.tanggal_selesai,
    bulan: g.bulan, tahun: g.tahun,
    total_hari_kerja: g.total_hari_kerja, total_gaji: Number(g.total_gaji),
    kwitansi_dibuat: g.kwitansis.length > 0,
    af_signature: g.af_signature, af_signed_at: g.af_signed_at,
    hf_signature: g.hf_signature, hf_signed_at: g.hf_signed_at,
    is_fully_signed: !!(g.af_signature && g.hf_signature),
    items: g.items.map((i) => ({
      id: i.id, tukang_id: i.tukang_id, tukang_name: i.tukang_name,
      hari_kerja: i.hari_kerja, daily_rate: Number(i.daily_rate),
      kasbon_dipotong: Number(i.kasbon_dipotong), subtotal: Number(i.subtotal),
    })),
    kwitansis: g.kwitansis.map((k) => ({
      id: k.id, tukang_name: k.tukang_name,
      jumlah_gaji: Number(k.jumlah_gaji), kasbon_dipotong: Number(k.kasbon_dipotong),
      tanggal_pembayaran: k.tanggal_pembayaran,
      tanggal_mulai: g.tanggal_mulai, tanggal_selesai: g.tanggal_selesai,
    })),
  })));
});

// POST /finance/adm-projek/:id/tukang/gajian — create weekly payroll
router.post("/adm-projek/:id/tukang/gajian", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const { tanggal_mulai, tanggal_selesai, items = [] } = req.body;
  if (!tanggal_mulai || !tanggal_selesai) return res.status(400).json({ detail: "Periode wajib diisi" });

  const startDate = new Date(tanggal_mulai);
  const endDate = new Date(tanggal_selesai);

  let totalGaji = 0;
  let totalHariKerja = 0;
  const itemsData: Array<{
    tukang_id?: bigint; tukang_name?: string; hari_kerja: number;
    daily_rate: number; kasbon_dipotong: number; subtotal: number;
  }> = [];

  for (const item of (items as Array<{ tukang_id?: string; tukang_name?: string; hari_kerja?: number; daily_rate?: number; kasbon_dipotong?: number }>) ) {
    const hari = item.hari_kerja ?? 0;
    const rate = item.daily_rate ?? 0;
    const kasbon = item.kasbon_dipotong ?? 0;
    const sub = Math.max(0, hari * rate - kasbon);
    totalGaji += sub;
    totalHariKerja += hari;

    const entry: typeof itemsData[0] = {
      tukang_name: item.tukang_name ?? undefined,
      hari_kerja: hari, daily_rate: rate, kasbon_dipotong: kasbon, subtotal: sub,
    };
    if (item.tukang_id) entry.tukang_id = BigInt(item.tukang_id);
    itemsData.push(entry);

    // Cicil kasbon: distribusikan pembayaran ke kasbon tertua dulu (partial allowed)
    if (item.tukang_id && kasbon > 0) {
      const pendingKasbons = await prisma.tukangCashbound.findMany({
        where: { tukang_id: BigInt(item.tukang_id), sudah_dipotong: false },
        orderBy: { tanggal: "asc" },
      });
      let remaining = kasbon;
      for (const kb of pendingKasbons) {
        if (remaining <= 0) break;
        const kbSisa = Number(kb.jumlah) - Number((kb as any).jumlah_dipotong ?? 0);
        if (kbSisa <= 0) continue;
        const potong = Math.min(remaining, kbSisa);
        const newJumlahDipotong = Number((kb as any).jumlah_dipotong ?? 0) + potong;
        const isFullyPaid = newJumlahDipotong >= Number(kb.jumlah);
        await prisma.tukangCashbound.update({
          where: { id: kb.id },
          data: { jumlah_dipotong: newJumlahDipotong, sudah_dipotong: isFullyPaid } as any,
        });
        remaining -= potong;
      }
    }
  }

  const d = startDate;
  const bulan = d.getMonth() + 1;
  const tahun = d.getFullYear();

  const g = await prisma.gajiTukang.create({
    data: {
      adm_finance_project_id: pid,
      bulan, tahun,
      tanggal_mulai: startDate,
      tanggal_selesai: endDate,
      total_hari_kerja: totalHariKerja,
      total_gaji: totalGaji,
      created_by: req.user!.id,
      items: { create: itemsData },
    },
  });

  // Auto-create kwitansi per tukang
  for (const item of itemsData) {
    await prisma.kwitansiGajiTukang.create({
      data: {
        gaji_tukang_id: g.id,
        tukang_id: item.tukang_id ?? null,
        tukang_name: item.tukang_name ?? null,
        jumlah_gaji: item.subtotal,
        kasbon_dipotong: item.kasbon_dipotong,
        tanggal_pembayaran: endDate,
        penerima: item.tukang_name ?? null,
      },
    });
  }

  return res.status(201).json({ id: g.id });
});

// DELETE /finance/adm-projek/:id/tukang/gajian/:gid
router.delete("/adm-projek/:id/tukang/gajian/:gid", async (req: Request, res: Response) => {
  const gid = BigInt(req.params.gid);
  const g = await prisma.gajiTukang.findUnique({ where: { id: gid } });
  if (!g) return res.status(404).json({ detail: "Data tidak ditemukan" });
  await prisma.gajiTukang.delete({ where: { id: gid } });
  return res.json({ message: "Data dihapus" });
});

// POST /finance/adm-projek/:id/tukang/gajian/:gid/sign-af
router.post("/adm-projek/:id/tukang/gajian/:gid/sign-af", async (req: Request, res: Response) => {
  const gid = BigInt(req.params.gid);
  const { af_signature } = req.body;
  if (!af_signature) return res.status(400).json({ detail: "Tanda tangan wajib diisi" });
  const g = await prisma.gajiTukang.findUnique({ where: { id: gid } });
  if (!g) return res.status(404).json({ detail: "Data tidak ditemukan" });
  await prisma.gajiTukang.update({
    where: { id: gid },
    data: { af_signature, af_signed_by: req.user!.id, af_signed_at: new Date() },
  });
  return res.json({ ok: true });
});

// POST /finance/adm-projek/:id/tukang/gajian/:gid/sign-hf
router.post("/adm-projek/:id/tukang/gajian/:gid/sign-hf", async (req: Request, res: Response) => {
  const gid = BigInt(req.params.gid);
  const { hf_signature } = req.body;
  if (!hf_signature) return res.status(400).json({ detail: "Tanda tangan wajib diisi" });
  const g = await prisma.gajiTukang.findUnique({ where: { id: gid } });
  if (!g) return res.status(404).json({ detail: "Data tidak ditemukan" });
  await prisma.gajiTukang.update({
    where: { id: gid },
    data: { hf_signature, hf_signed_by: req.user!.id, hf_signed_at: new Date() },
  });
  return res.json({ ok: true });
});

// GET /finance/adm-projek/:id/tukang/kwitansi
router.get("/adm-projek/:id/tukang/kwitansi", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.id);
  const kwitansis = await prisma.kwitansiGajiTukang.findMany({
    where: { gaji_tukang: { adm_finance_project_id: pid } },
    orderBy: { tanggal_pembayaran: "desc" },
    include: { gaji_tukang: { select: { tanggal_mulai: true, tanggal_selesai: true } } },
  });
  return res.json(kwitansis.map((k) => ({
    id: k.id, tukang_id: k.tukang_id, tukang_name: k.tukang_name,
    jumlah_gaji: Number(k.jumlah_gaji), kasbon_dipotong: Number(k.kasbon_dipotong),
    tanggal_pembayaran: k.tanggal_pembayaran, penerima: k.penerima,
    tanggal_mulai: k.gaji_tukang?.tanggal_mulai, tanggal_selesai: k.gaji_tukang?.tanggal_selesai,
  })));
});

// ── Tukang self-submission routes (dedicated /absen page) ────────────────────

// GET /finance/tukang-absen/projects — list all active adm-finance projects
router.get("/tukang-absen/projects", async (_req: Request, res: Response) => {
  const projects = await prisma.admFinanceProject.findMany({
    where: { status: "aktif" },
    select: { id: true, nama_proyek: true, klien: true, lokasi: true },
    orderBy: { nama_proyek: "asc" },
  });
  return res.json(projects);
});

// GET /finance/tukang-absen/:project_id/my-tukang — find TukangRegistry for current user in project
router.get("/tukang-absen/:project_id/my-tukang", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.project_id);
  const userId = req.user!.id;
  const tukang = await prisma.tukangRegistry.findFirst({
    where: { adm_finance_project_id: pid, user_id: userId },
  });
  if (!tukang) return res.status(404).json({ detail: "Anda tidak terdaftar sebagai tukang di proyek ini" });
  return res.json({ id: tukang.id, nama: tukang.nama, jabatan: tukang.jabatan });
});

// GET /finance/tukang-absen/:project_id/my-absen — my attendance history
router.get("/tukang-absen/:project_id/my-absen", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.project_id);
  const userId = req.user!.id;
  const tukang = await prisma.tukangRegistry.findFirst({ where: { adm_finance_project_id: pid, user_id: userId } });
  if (!tukang) return res.status(404).json({ detail: "Tidak terdaftar" });
  const fotos = await prisma.tukangAbsenFoto.findMany({
    where: { tukang_id: tukang.id },
    orderBy: { tanggal: "desc" },
  });
  return res.json(fotos.map((f) => ({
    id: f.id, tanggal: f.tanggal, foto: f.foto,
    foto_timestamp: f.foto_timestamp, status: f.status, catatan: f.catatan,
  })));
});

// POST /finance/tukang-absen/:project_id/submit — tukang submits attendance photo
router.post("/tukang-absen/:project_id/submit", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.project_id);
  const userId = req.user!.id;
  const { foto, tanggal } = req.body;
  if (!foto) return res.status(400).json({ detail: "Foto wajib diisi" });
  const tukang = await prisma.tukangRegistry.findFirst({ where: { adm_finance_project_id: pid, user_id: userId } });
  if (!tukang) return res.status(403).json({ detail: "Anda tidak terdaftar sebagai tukang di proyek ini" });
  const absenDate = tanggal ? new Date(tanggal) : new Date();
  const p = await prisma.tukangAbsenFoto.create({
    data: {
      tukang_id: tukang.id,
      tanggal: absenDate,
      foto,
      foto_timestamp: new Date(),
      status: "Pending",
      created_by: userId,
    },
  });
  return res.status(201).json({ id: p.id });
});

export default router;
