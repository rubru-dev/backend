import { Router } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

async function nextNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `AGR/FMK/${year}/`;
  const last = await prisma.agreement.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });
  const seq = last ? parseInt(last.number.slice(-3)) + 1 : 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

function toDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function toDecimal(v: any): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}

// List
router.get("/", async (req, res, next) => {
  try {
    const search = (req.query.search as string) || "";
    const pg = Math.max(1, Number(req.query.page) || 1);
    const lim = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const status = (req.query.status as string) || "";
    const where: any = {};
    if (search) {
      where.OR = [
        { number: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { company: { contains: search, mode: "insensitive" } } },
        { lokasiPekerjaan: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status;
    const [total, data] = await Promise.all([
      prisma.agreement.count({ where }),
      prisma.agreement.findMany({
        where,
        skip: (pg - 1) * lim,
        take: lim,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, name: true, company: true, code: true } },
          quotation: { select: { id: true, number: true, title: true } },
        },
      }),
    ]);
    res.json({ data, total, totalPages: Math.ceil(total / lim) });
  } catch (e) { next(e); }
});

// Customer dropdown
router.get("/dropdown/customers", async (_req, res, next) => {
  try {
    const data = await prisma.customer.findMany({
      select: { id: true, name: true, company: true, code: true },
      orderBy: { name: "asc" },
    });
    res.json({ data });
  } catch (e) { next(e); }
});

// Quotation dropdown by customer
router.get("/dropdown/quotations/:customerId", async (req, res, next) => {
  try {
    const data = await prisma.quotation.findMany({
      where: { customerId: req.params.customerId },
      select: { id: true, number: true, title: true, amount: true, status: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data });
  } catch (e) { next(e); }
});

// Get one
router.get("/:id", async (req, res, next) => {
  try {
    const ag = await prisma.agreement.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { id: true, name: true, company: true, code: true, address: true, treatmentAddress: true, picServiceName: true, picServicePhone: true } },
        quotation: { select: { id: true, number: true, title: true, amount: true } },
      },
    });
    if (!ag) return res.status(404).json({ error: "Agreement not found" });
    res.json(ag);
  } catch (e) { next(e); }
});

// Create
router.post("/", async (req, res, next) => {
  try {
    const number = await nextNumber();
    const b = req.body;
    const ag = await prisma.agreement.create({
      data: {
        number,
        tanggal: toDate(b.tanggal) ?? new Date(),
        customerId: b.customerId,
        quotationId: b.quotationId || null,
        jenisLayanan: b.jenisLayanan || "Pest Control",
        lokasiPekerjaan: b.lokasiPekerjaan || "",
        areaPekerjaan: b.areaPekerjaan || null,
        tanggalMulai: toDate(b.tanggalMulai) ?? new Date(),
        tanggalBerakhir: toDate(b.tanggalBerakhir) ?? new Date(),
        durasiKontrak: b.durasiKontrak ? Number(b.durasiKontrak) : null,
        serviceSchedule: b.serviceSchedule ?? [],
        nilaiKontrak: toDecimal(b.nilaiKontrak) ?? 0,
        ppn: toDecimal(b.ppn),
        grandTotal: toDecimal(b.grandTotal),
        metodePembayaran: b.metodePembayaran || null,
        terminPembayaran: b.terminPembayaran ?? [],
        rekening: b.rekening || null,
        garansi: b.garansi || null,
        status: b.status || "DRAFT",
        picFumakillaNama: b.picFumakillaNama || null,
        picFumakillaJabatan: b.picFumakillaJabatan || null,
        picFumakillaKontak: b.picFumakillaKontak || null,
        picKlienNama: b.picKlienNama || null,
        picKlienJabatan: b.picKlienJabatan || null,
        picKlienKontak: b.picKlienKontak || null,
        ttdFumakillaNama: b.ttdFumakillaNama || null,
        ttdFumakillaJabatan: b.ttdFumakillaJabatan || null,
        ttdFumakillaTanggal: toDate(b.ttdFumakillaTanggal),
        ttdKlienNama: b.ttdKlienNama || null,
        ttdKlienJabatan: b.ttdKlienJabatan || null,
        ttdKlienTanggal: toDate(b.ttdKlienTanggal),
        notes: b.notes || null,
      },
    });
    res.status(201).json(ag);
  } catch (e) { next(e); }
});

// Update
router.patch("/:id", async (req, res, next) => {
  try {
    const b = req.body;
    const data: any = {};

    const strFields = [
      "jenisLayanan", "lokasiPekerjaan", "areaPekerjaan", "metodePembayaran",
      "rekening", "garansi", "status", "notes",
      "picFumakillaNama", "picFumakillaJabatan", "picFumakillaKontak",
      "picKlienNama", "picKlienJabatan", "picKlienKontak",
      "ttdFumakillaNama", "ttdFumakillaJabatan", "ttdKlienNama", "ttdKlienJabatan",
    ];
    const dateFields = ["tanggal", "tanggalMulai", "tanggalBerakhir", "ttdFumakillaTanggal", "ttdKlienTanggal"];
    const numFields = ["durasiKontrak", "nilaiKontrak", "ppn", "grandTotal"];
    const jsonFields = ["serviceSchedule", "terminPembayaran"];
    const optionalRelFields = ["quotationId"];

    for (const f of strFields) {
      if (f in b) data[f] = b[f] || null;
    }
    for (const f of dateFields) {
      if (f in b) data[f] = toDate(b[f]);
    }
    for (const f of numFields) {
      if (f in b) data[f] = toDecimal(b[f]);
    }
    for (const f of jsonFields) {
      if (f in b) data[f] = b[f];
    }
    for (const f of optionalRelFields) {
      if (f in b) data[f] = b[f] || null;
    }
    if ("customerId" in b) data.customerId = b.customerId;

    const ag = await prisma.agreement.update({ where: { id: req.params.id }, data });
    res.json(ag);
  } catch (e) { next(e); }
});

// Delete
router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.agreement.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
