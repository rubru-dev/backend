import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { getPagination, paginateResponse } from "../middleware/pagination";
import multer from "multer";
import path from "path";
import fs from "fs";
import { config } from "../config";

const kontrakLampiranDir = path.resolve(config.storagePath, "kontrak-lampiran");
if (!fs.existsSync(kontrakLampiranDir)) fs.mkdirSync(kontrakLampiranDir, { recursive: true });

const lampiranStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, kontrakLampiranDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_lampiran${ext}`);
  },
});
const lampiranUpload = multer({
  storage: lampiranStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf" || path.extname(file.originalname).toLowerCase() === ".pdf") {
      cb(null, true);
    } else {
      cb(new Error("Hanya file PDF yang diizinkan untuk lampiran"));
    }
  },
});

const router = Router();

// GET /proyek-berjalan
router.get("/proyek-berjalan", async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const [total, items] = await Promise.all([
    prisma.proyekBerjalan.count(),
    prisma.proyekBerjalan.findMany({
      include: { lead: true, pic: true },
      orderBy: { id: "desc" },
      skip,
      take: limit,
    }),
  ]);
  const mapped = items.map((p) => ({
    id: p.id,
    lokasi: p.lokasi,
    nilai_rab: parseFloat(String(p.nilai_rab ?? 0)),
    tanggal_mulai: p.tanggal_mulai,
    tanggal_selesai: p.tanggal_selesai,
    lead: p.lead ? { nama: p.lead.nama } : null,
    pic: p.pic ? { name: p.pic.name } : null,
  }));
  return res.json(paginateResponse(mapped, total, page, limit));
});

// POST /proyek-berjalan
router.post("/proyek-berjalan", async (req: Request, res: Response) => {
  const { lead_id, lokasi, nilai_rab, tanggal_mulai, tanggal_selesai, pic_user_id } = req.body;
  const p = await prisma.proyekBerjalan.create({
    data: {
      lead_id: lead_id ?? null,
      lokasi: lokasi ?? null,
      nilai_rab: nilai_rab ?? 0,
      tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null,
      tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null,
      created_by: pic_user_id ?? null,
    },
  });
  return res.status(201).json({ id: p.id });
});

// GET /proyek-berjalan/:id
router.get("/proyek-berjalan/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.proyekBerjalan.findUnique({
    where: { id },
    include: { lead: true, pic: true, termins: true },
  });
  if (!p) return res.status(404).json({ detail: "Proyek tidak ditemukan" });
  return res.json({
    id: p.id,
    lokasi: p.lokasi,
    nilai_rab: parseFloat(String(p.nilai_rab ?? 0)),
    tanggal_mulai: p.tanggal_mulai,
    tanggal_selesai: p.tanggal_selesai,
    lead: p.lead ? { id: p.lead.id, nama: p.lead.nama } : null,
    pic: p.pic ? { id: p.pic.id, name: p.pic.name } : null,
    termins: p.termins.map((t) => ({ id: t.id, urutan: t.urutan, nama: t.nama, tanggal_mulai: t.tanggal_mulai, tanggal_selesai: t.tanggal_selesai })),
  });
});

// PATCH /proyek-berjalan/:id
router.patch("/proyek-berjalan/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.proyekBerjalan.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ detail: "Proyek tidak ditemukan" });
  const { lead_id, lokasi, nilai_rab, tanggal_mulai, tanggal_selesai, pic_user_id } = req.body;
  const updates: Record<string, unknown> = {};
  if (lead_id !== undefined) updates.lead_id = lead_id;
  if (lokasi !== undefined) updates.lokasi = lokasi;
  if (nilai_rab !== undefined) updates.nilai_rab = nilai_rab;
  if (tanggal_mulai !== undefined) updates.tanggal_mulai = tanggal_mulai ? new Date(tanggal_mulai) : null;
  if (tanggal_selesai !== undefined) updates.tanggal_selesai = tanggal_selesai ? new Date(tanggal_selesai) : null;
  if (pic_user_id !== undefined) updates.created_by = pic_user_id;
  await prisma.proyekBerjalan.update({ where: { id }, data: updates });
  return res.json({ message: "Proyek diupdate" });
});

// DELETE /proyek-berjalan/:id
router.delete("/proyek-berjalan/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.proyekBerjalan.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ detail: "Proyek tidak ditemukan" });
  await prisma.proyekBerjalan.delete({ where: { id } });
  return res.json({ message: "Proyek dihapus" });
});

// ── SALES KANBAN ──────────────────────────────────────────────────────────────

function salesBoardCols(cols: Array<{ id: number; title: string; urutan: number; color: string | null; cards: Array<{ id: number; title: string; description: string | null; deadline: Date | null; projeksi_sales: unknown; urutan: number; color: string | null; tipe_pekerjaan: string | null; lead: { id: number; nama: string } | null; assigned_user: { id: number; name: string } | null; labels: Array<{ id: number; label_name: string; color: string }>; comments: unknown[]; created_at: Date | null }> }>) {
  return cols.map((col) => ({
    id: col.id,
    title: col.title,
    urutan: col.urutan,
    color: col.color ?? "#e2e8f0",
    cards: col.cards.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      deadline: c.deadline,
      projeksi_sales: c.projeksi_sales != null ? parseFloat(String(c.projeksi_sales)) : null,
      urutan: c.urutan,
      color: c.color,
      tipe_pekerjaan: c.tipe_pekerjaan,
      lead: c.lead ? { id: c.lead.id, nama: c.lead.nama } : null,
      assigned_user: c.assigned_user ? { id: c.assigned_user.id, name: c.assigned_user.name } : null,
      labels: c.labels.map((lb) => ({ id: lb.id, label_name: lb.label_name, color: lb.color })),
      comments_count: c.comments.length,
      created_at: c.created_at,
    })),
  }));
}

async function getSalesBoard() {
  return prisma.salesKanbanColumn.findMany({
    include: {
      cards: {
        include: {
          labels: true,
          assigned_user: true,
          lead: true,
          comments: true,
        },
      },
    },
    orderBy: { urutan: "asc" },
  });
}

const PERMANENT_COLUMNS = ["W1", "W2", "W3", "W4", "Closing", "Lost"];

const PERMANENT_COLUMN_COLORS: Record<string, string> = {
  "W1": "#dbeafe",
  "W2": "#dcfce7",
  "W3": "#fef9c3",
  "W4": "#ffedd5",
  "Closing": "#d1fae5",
  "Lost": "#fee2e2",
};

// GET /kanban — auto-ensures permanent columns exist on every load
router.get("/kanban", async (_req: Request, res: Response) => {
  const existingTitles = (await prisma.salesKanbanColumn.findMany({ select: { title: true, urutan: true } }));
  const titleSet = new Set(existingTitles.map((c) => c.title));
  const missing = PERMANENT_COLUMNS.filter((t) => !titleSet.has(t));
  if (missing.length > 0) {
    const maxCol = await prisma.salesKanbanColumn.findFirst({ orderBy: { urutan: "desc" } });
    const base = maxCol ? maxCol.urutan + 1 : 1;
    await prisma.salesKanbanColumn.createMany({
      data: missing.map((title, i) => ({
        title,
        urutan: base + i,
        color: PERMANENT_COLUMN_COLORS[title] ?? "#e2e8f0",
      })),
    });
  }
  const cols = await getSalesBoard();
  return res.json({ columns: salesBoardCols(cols as unknown as Parameters<typeof salesBoardCols>[0]) });
});

// POST /kanban/columns
router.post("/kanban/columns", async (req: Request, res: Response) => {
  const { title, urutan, color } = req.body;
  const col = await prisma.salesKanbanColumn.create({
    data: { title, urutan: urutan ?? 0, color: color ?? "#e2e8f0" },
  });
  return res.status(201).json({ id: col.id, message: "Kolom dibuat" });
});

// PATCH /kanban/columns/:id
router.patch("/kanban/columns/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const col = await prisma.salesKanbanColumn.findUnique({ where: { id } });
  if (!col) return res.status(404).json({ detail: "Kolom tidak ditemukan" });
  const { title, urutan, color } = req.body;
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (urutan !== undefined) updates.urutan = urutan;
  if (color !== undefined) updates.color = color;
  await prisma.salesKanbanColumn.update({ where: { id }, data: updates });
  return res.json({ message: "Kolom diupdate" });
});

// DELETE /kanban/columns/:id
router.delete("/kanban/columns/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const col = await prisma.salesKanbanColumn.findUnique({ where: { id } });
  if (!col) return res.status(404).json({ detail: "Kolom tidak ditemukan" });
  if (PERMANENT_COLUMNS.includes(col.title)) {
    return res.status(403).json({ detail: `Kolom "${col.title}" adalah kolom permanen dan tidak dapat dihapus` });
  }
  await prisma.salesKanbanColumn.delete({ where: { id } });
  return res.json({ message: "Kolom dihapus" });
});

// POST /kanban/columns/reorder — update urutan semua kolom sekaligus
router.post("/kanban/columns/reorder", async (req: Request, res: Response) => {
  const { column_ids } = req.body as { column_ids: number[] };
  if (!Array.isArray(column_ids)) return res.status(400).json({ detail: "column_ids harus array" });
  await Promise.all(
    column_ids.map((id, idx) =>
      prisma.salesKanbanColumn.update({ where: { id: BigInt(id) }, data: { urutan: idx } })
    )
  );
  return res.json({ message: "Urutan kolom diperbarui" });
});

// POST /kanban/carryover — carry permanent column cards from prev month into the requested month
router.post("/kanban/carryover", async (req: Request, res: Response) => {
  const { month, year } = req.body as { month: number; year: number };

  // Refuse to carry over into a future month
  const now = new Date();
  if (new Date(year, month - 1, 1) > now) return res.json({ copied: 0 });

  // Previous month bounds
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  const prevStart = new Date(prevYear, prevMonth - 1, 1);
  const prevEnd   = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);

  // Target month bounds
  const targetStart = new Date(year, month - 1, 1);
  const targetEnd   = new Date(year, month, 0, 23, 59, 59, 999);

  // Fetch all permanent columns at once
  const permCols = await prisma.salesKanbanColumn.findMany({
    where: { title: { in: PERMANENT_COLUMNS } },
  });
  if (permCols.length === 0) return res.json({ copied: 0 });

  let copied = 0;

  for (const col of permCols) {
    // Cards from previous month in this column
    const prevCards = await prisma.salesKanbanCard.findMany({
      where: { column_id: col.id, created_at: { gte: prevStart, lte: prevEnd } },
    });
    if (prevCards.length === 0) continue;

    // Titles already in target month — skip duplicates
    const existing = await prisma.salesKanbanCard.findMany({
      where: { column_id: col.id, created_at: { gte: targetStart, lte: targetEnd } },
      select: { title: true },
    });
    const existingTitles = new Set(existing.map((c) => c.title));

    for (const card of prevCards) {
      if (existingTitles.has(card.title)) continue;
      // Create then backdate created_at to 1st of target month
      const created = await prisma.salesKanbanCard.create({
        data: {
          column_id: col.id,
          title: card.title,
          description: card.description ?? null,
          color: card.color ?? null,
          projeksi_sales: card.projeksi_sales ?? undefined,
          urutan: card.urutan,
        },
      });
      await prisma.$executeRaw`
        UPDATE sales_kanban_cards
        SET created_at = ${targetStart}, updated_at = ${targetStart}
        WHERE id = ${created.id}
      `;
      copied++;
    }
  }

  return res.json({ copied });
});

// POST /kanban/cards
router.post("/kanban/cards", async (req: Request, res: Response) => {
  const { column_id, title, description, deadline, assigned_user_id, lead_id, tipe_pekerjaan, color, urutan, projeksi_sales } = req.body;
  const card = await prisma.salesKanbanCard.create({
    data: {
      column_id,
      title,
      description: description ?? null,
      deadline: deadline ? new Date(deadline) : null,
      assigned_user_id: assigned_user_id ?? null,
      lead_id: lead_id ?? null,
      tipe_pekerjaan: tipe_pekerjaan ?? null,
      projeksi_sales: projeksi_sales != null ? projeksi_sales : undefined,
      color: color ?? null,
      urutan: urutan ?? 0,
    },
  });
  return res.status(201).json({ id: card.id, message: "Card dibuat" });
});

// PATCH /kanban/cards/:id/move
router.patch("/kanban/cards/:id/move", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const card = await prisma.salesKanbanCard.findUnique({ where: { id } });
  if (!card) return res.status(404).json({ detail: "Card tidak ditemukan" });
  await prisma.salesKanbanCard.update({ where: { id }, data: { column_id: req.body.column_id, urutan: req.body.position ?? 0 } });
  return res.json({ message: "Card dipindah" });
});

// PATCH /kanban/cards/:id
router.patch("/kanban/cards/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const card = await prisma.salesKanbanCard.findUnique({ where: { id } });
  if (!card) return res.status(404).json({ detail: "Card tidak ditemukan" });
  const { column_id, title, description, deadline, assigned_user_id, tipe_pekerjaan, color, urutan, projeksi_sales } = req.body;
  const updates: Record<string, unknown> = {};
  if (column_id !== undefined) updates.column_id = column_id;
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (deadline !== undefined) updates.deadline = deadline ? new Date(deadline) : null;
  if (assigned_user_id !== undefined) updates.assigned_user_id = assigned_user_id;
  if (tipe_pekerjaan !== undefined) updates.tipe_pekerjaan = tipe_pekerjaan;
  if (projeksi_sales !== undefined) updates.projeksi_sales = projeksi_sales;
  if (color !== undefined) updates.color = color;
  if (urutan !== undefined) updates.urutan = urutan;
  await prisma.salesKanbanCard.update({ where: { id }, data: updates });
  return res.json({ message: "Card diupdate" });
});

// DELETE /kanban/cards/:id
router.delete("/kanban/cards/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const card = await prisma.salesKanbanCard.findUnique({ where: { id } });
  if (!card) return res.status(404).json({ detail: "Card tidak ditemukan" });
  await prisma.salesKanbanCard.delete({ where: { id } });
  return res.json({ message: "Card dihapus" });
});

// POST /kanban/cards/:id/comments
router.post("/kanban/cards/:id/comments", async (req: Request, res: Response) => {
  const cardId = BigInt(req.params.id);
  const comment = await prisma.salesKanbanComment.create({
    data: { card_id: cardId, comment: req.body.body, user_id: req.user!.id },
  });
  return res.status(201).json({ id: comment.id, message: "Komentar ditambahkan" });
});

// DELETE /kanban/comments/:id
router.delete("/kanban/comments/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const c = await prisma.salesKanbanComment.findUnique({ where: { id } });
  if (!c) return res.status(404).json({ detail: "Komentar tidak ditemukan" });
  await prisma.salesKanbanComment.delete({ where: { id } });
  return res.json({ message: "Komentar dihapus" });
});

// GET /kanban/leads — leads dropdown for card creation
router.get("/kanban/leads", async (_req: Request, res: Response) => {
  const leads = await prisma.lead.findMany({
    select: { id: true, nama: true },
    orderBy: { nama: "asc" },
  });
  return res.json(leads.map((l) => ({ id: Number(l.id), nama: l.nama })));
});

// GET /kanban/metrics
router.get("/kanban/metrics", async (req: Request, res: Response) => {
  const now = new Date();
  const year = parseInt(req.query.year as string) || now.getFullYear();
  const month = parseInt(req.query.month as string) || (now.getMonth() + 1);
  const cols = await getSalesBoard();

  const byColumn = cols.map((col) => ({
    column_id: col.id,
    title: col.title,
    color: col.color ?? "#e2e8f0",
    count: col.cards.length,
  }));
  const total = byColumn.reduce((s, c) => s + c.count, 0);

  const lastDay = new Date(year, month, 0).getDate();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month - 1, lastDay, 23, 59, 59);

  const monthlyCards = await prisma.salesKanbanCard.findMany({
    where: { created_at: { gte: start, lte: end } },
  });

  const daily: Record<number, number> = {};
  for (let d = 1; d <= lastDay; d++) daily[d] = 0;
  for (const card of monthlyCards) {
    const day = card.created_at ? new Date(card.created_at).getDate() : 0;
    if (day) daily[day] = (daily[day] ?? 0) + 1;
  }
  const timeline = Object.entries(daily).map(([d, c]) => ({ day: parseInt(d), count: c }));

  return res.json({
    summary: { total, this_month: monthlyCards.length },
    by_column: byColumn,
    timeline,
  });
});

// ── Addendum Kontrak ──────────────────────────────────────────────────────────

function mapAddendum(a: {
  id: bigint; lead_id: bigint | null; nomor_addendum: string | null; tanggal: Date | null;
  perihal: string | null; isi: string | null; nilai_kontrak_awal: unknown; nilai_addendum: unknown;
  status: string; ro_name: string | null; ro_signature: string | null; ro_signed_at: Date | null;
  client_name: string | null; client_signature: string | null; client_signed_at: Date | null;
  auto_pushed: boolean; created_by: bigint | null; created_at: Date;
  lead?: { nama: string } | null; creator?: { name: string } | null;
}) {
  return {
    id: a.id,
    lead_id: a.lead_id,
    nomor_addendum: a.nomor_addendum,
    tanggal: a.tanggal,
    perihal: a.perihal,
    isi: a.isi,
    nilai_kontrak_awal: parseFloat(String(a.nilai_kontrak_awal ?? 0)),
    nilai_addendum: parseFloat(String(a.nilai_addendum ?? 0)),
    status: a.status,
    ro_name: a.ro_name,
    ro_signature: a.ro_signature,
    ro_signed_at: a.ro_signed_at,
    client_name: a.client_name,
    client_signature: a.client_signature,
    client_signed_at: a.client_signed_at,
    auto_pushed: a.auto_pushed,
    created_by: a.created_by,
    created_at: a.created_at,
    lead: a.lead ?? null,
    creator: a.creator ?? null,
  };
}

// GET /sales/addendum
router.get("/addendum", async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const [total, items] = await Promise.all([
    prisma.addendumKontrak.count(),
    prisma.addendumKontrak.findMany({
      include: { lead: { select: { nama: true } }, creator: { select: { name: true } } },
      orderBy: { id: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return res.json(paginateResponse(items.map(mapAddendum), total, page, limit));
});

// POST /sales/addendum
router.post("/addendum", async (req: Request, res: Response) => {
  const { lead_id, nomor_addendum, tanggal, perihal, isi, nilai_kontrak_awal, nilai_addendum } = req.body;

  // Auto-generate nomor if not provided
  let nomorFinal = nomor_addendum ?? null;
  if (!nomorFinal) {
    const d = tanggal ? new Date(tanggal) : new Date();
    const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
    const bulan = ROMAN[d.getMonth()];
    const tahun = d.getFullYear();
    const count = await prisma.addendumKontrak.count({
      where: { tanggal: { gte: new Date(tahun, 0, 1), lt: new Date(tahun + 1, 0, 1) } },
    });
    nomorFinal = `ADD/${String(count + 1).padStart(3, "0")}/${bulan}/${tahun}`;
  }

  const a = await prisma.addendumKontrak.create({
    data: {
      lead_id: lead_id ? BigInt(lead_id) : null,
      nomor_addendum: nomorFinal,
      tanggal: tanggal ? new Date(tanggal) : null,
      perihal: perihal ?? null,
      isi: isi ?? null,
      nilai_kontrak_awal: nilai_kontrak_awal ?? 0,
      nilai_addendum: nilai_addendum ?? 0,
      created_by: req.user?.id ?? null,
    },
    include: { lead: { select: { nama: true } }, creator: { select: { name: true } } },
  });
  return res.status(201).json(mapAddendum(a));
});

// GET /sales/addendum/:id
router.get("/addendum/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const a = await prisma.addendumKontrak.findUnique({
    where: { id },
    include: { lead: { select: { nama: true } }, creator: { select: { name: true } } },
  });
  if (!a) return res.status(404).json({ detail: "Addendum tidak ditemukan" });
  return res.json(mapAddendum(a));
});

// PATCH /sales/addendum/:id
router.patch("/addendum/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const a = await prisma.addendumKontrak.findUnique({ where: { id } });
  if (!a) return res.status(404).json({ detail: "Addendum tidak ditemukan" });
  const { lead_id, nomor_addendum, tanggal, perihal, isi, nilai_kontrak_awal, nilai_addendum } = req.body;
  const updates: Record<string, unknown> = {};
  if (lead_id !== undefined) updates.lead_id = lead_id ? BigInt(lead_id) : null;
  if (nomor_addendum !== undefined) updates.nomor_addendum = nomor_addendum;
  if (tanggal !== undefined) updates.tanggal = tanggal ? new Date(tanggal) : null;
  if (perihal !== undefined) updates.perihal = perihal;
  if (isi !== undefined) updates.isi = isi;
  if (nilai_kontrak_awal !== undefined) updates.nilai_kontrak_awal = nilai_kontrak_awal;
  if (nilai_addendum !== undefined) updates.nilai_addendum = nilai_addendum;
  const updated = await prisma.addendumKontrak.update({
    where: { id },
    data: updates,
    include: { lead: { select: { nama: true } }, creator: { select: { name: true } } },
  });
  return res.json(mapAddendum(updated));
});

// DELETE /sales/addendum/:id
router.delete("/addendum/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const a = await prisma.addendumKontrak.findUnique({ where: { id } });
  if (!a) return res.status(404).json({ detail: "Addendum tidak ditemukan" });
  await prisma.addendumKontrak.delete({ where: { id } });
  return res.json({ message: "Addendum dihapus" });
});

// POST /sales/addendum/:id/sign-ro  — RO tanda tangan
router.post("/addendum/:id/sign-ro", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const a = await prisma.addendumKontrak.findUnique({ where: { id } });
  if (!a) return res.status(404).json({ detail: "Addendum tidak ditemukan" });
  const { ro_name, ro_signature } = req.body;
  if (!ro_signature) return res.status(400).json({ detail: "Tanda tangan RO diperlukan" });
  const updated = await prisma.addendumKontrak.update({
    where: { id },
    data: {
      ro_name: ro_name ?? a.ro_name,
      ro_signature,
      ro_signed_at: new Date(),
      status: a.client_signed_at ? "signed" : "signed_ro",
    },
    include: { lead: { select: { nama: true } }, creator: { select: { name: true } } },
  });
  if (updated.status === "signed" && !updated.auto_pushed) {
    await autoPushAddendum(updated);
  }
  return res.json(mapAddendum(updated));
});

// POST /sales/addendum/:id/sign-client  — Klien tanda tangan
router.post("/addendum/:id/sign-client", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const a = await prisma.addendumKontrak.findUnique({ where: { id } });
  if (!a) return res.status(404).json({ detail: "Addendum tidak ditemukan" });
  const { client_name, client_signature } = req.body;
  if (!client_signature) return res.status(400).json({ detail: "Tanda tangan klien diperlukan" });
  const updated = await prisma.addendumKontrak.update({
    where: { id },
    data: {
      client_name: client_name ?? a.client_name,
      client_signature,
      client_signed_at: new Date(),
      status: a.ro_signed_at ? "signed" : "signed_client",
    },
    include: { lead: { select: { nama: true } }, creator: { select: { name: true } } },
  });
  if (updated.status === "signed" && !updated.auto_pushed) {
    await autoPushAddendum(updated);
  }
  return res.json(mapAddendum(updated));
});

async function autoPushAddendum(a: {
  id: bigint; lead_id: bigint | null; nomor_addendum: string | null; tanggal: Date | null;
  perihal: string | null; isi: string | null; nilai_kontrak_awal: unknown; nilai_addendum: unknown;
  ro_name: string | null; ro_signature: string | null; ro_signed_at: Date | null;
  client_name: string | null; client_signature: string | null; client_signed_at: Date | null;
}) {
  if (!a.lead_id) return;

  const today = new Date();
  const namaFile = `Addendum Kontrak${a.nomor_addendum ? ` - ${a.nomor_addendum}` : ""}`;

  // Generate simple HTML for storage as file_data
  const htmlContent = `<html><body style="font-family:Arial,sans-serif;padding:32px">
<h2>ADDENDUM KONTRAK</h2>
<p><b>Nomor:</b> ${a.nomor_addendum ?? "-"}</p>
<p><b>Tanggal:</b> ${a.tanggal ? new Date(a.tanggal).toLocaleDateString("id-ID") : "-"}</p>
<p><b>Perihal:</b> ${a.perihal ?? "-"}</p>
<p><b>Nilai Kontrak Awal:</b> Rp ${parseFloat(String(a.nilai_kontrak_awal ?? 0)).toLocaleString("id-ID")}</p>
<p><b>Nilai Addendum:</b> Rp ${parseFloat(String(a.nilai_addendum ?? 0)).toLocaleString("id-ID")}</p>
<hr/><div style="white-space:pre-wrap">${a.isi ?? ""}</div>
<div style="display:flex;gap:80px;margin-top:40px">
  <div style="text-align:center">
    ${a.ro_signature ? `<img src="${a.ro_signature}" style="height:80px"/>` : "<div style='height:80px'></div>"}
    <p>${a.ro_name ?? "RO"}</p>
  </div>
  <div style="text-align:center">
    ${a.client_signature ? `<img src="${a.client_signature}" style="height:80px"/>` : "<div style='height:80px'></div>"}
    <p>${a.client_name ?? "Klien"}</p>
  </div>
</div>
</body></html>`;

  try {
    // Push ke Finance AdmFinanceProject dokumen (kategori: Kontrak)
    const admProject = await prisma.admFinanceProject.findFirst({ where: { lead_id: a.lead_id } });
    if (admProject) {
      await prisma.projekDokumen.create({
        data: {
          adm_finance_project_id: admProject.id,
          kategori: "Kontrak",
          nama_file: namaFile,
          file_data: htmlContent,
          file_type: "html",
          tanggal_upload: today,
        },
      });
    }

    // Push ke Client Portal dokumen (kategori: Kontrak)
    const cpProject = await prisma.clientPortalProject.findFirst({ where: { lead_id: a.lead_id } });
    if (cpProject) {
      await prisma.clientPortalDokumen.create({
        data: {
          project_id: cpProject.id,
          nama_file: namaFile,
          kategori: "Kontrak",
          file_data: htmlContent,
          file_type: "html",
          tanggal_upload: today,
        },
      });
    }

    await prisma.addendumKontrak.update({ where: { id: a.id }, data: { auto_pushed: true } });
  } catch (_e) {
    // non-fatal: push failure shouldn't block the signature response
  }
}

// ── Kontrak Template ──────────────────────────────────────────────────────────

function mapKontrakTemplate(t: {
  id: bigint; judul: string; pihak_satu: string | null; pihak_dua: string | null; pembuka: string | null; penutup: string | null;
  status: string; created_by: bigint | null; created_at: Date; updated_at: Date;
  creator?: { name: string } | null;
  pasals?: { id: bigint; urutan: number; judul_pasal: string | null; isi_pasal: string | null }[];
}) {
  return {
    id: Number(t.id),
    judul: t.judul,
    pihak_satu: t.pihak_satu,
    pihak_dua: t.pihak_dua,
    pembuka: t.pembuka,
    penutup: t.penutup,
    status: t.status,
    created_by: t.created_by ? Number(t.created_by) : null,
    created_at: t.created_at,
    updated_at: t.updated_at,
    creator: t.creator ?? null,
    pasals: (t.pasals ?? []).map((p) => ({
      id: Number(p.id),
      urutan: p.urutan,
      judul_pasal: p.judul_pasal,
      isi_pasal: p.isi_pasal,
    })),
  };
}

function mapKontrakDokumen(d: {
  id: bigint; template_id: bigint | null; lead_id: bigint | null;
  nomor_kontrak: string | null; jenis_pekerjaan: string | null; tanggal: Date | null;
  nama_client: string | null; telepon_client: string | null; alamat_client: string | null;
  status: string;
  ro_name: string | null; ro_signature: string | null; ro_signed_at: Date | null;
  management_name: string | null; management_signature: string | null; management_signed_at: Date | null;
  client_name: string | null; client_signature: string | null; client_signed_at: Date | null;
  created_by: bigint | null; created_at: Date;
  template?: { id: bigint; judul: string; pihak_satu: string | null; pihak_dua: string | null; pembuka: string | null; penutup: string | null; pasals: { id: bigint; urutan: number; judul_pasal: string | null; isi_pasal: string | null }[] } | null;
  lead?: { nama: string; nomor_telepon: string | null; alamat: string | null } | null;
  creator?: { name: string } | null;
  lampirans?: { id: bigint; urutan: number; judul: string; file_url: string | null }[];
}) {
  return {
    id: Number(d.id),
    template_id: d.template_id ? Number(d.template_id) : null,
    lead_id: d.lead_id ? Number(d.lead_id) : null,
    nomor_kontrak: d.nomor_kontrak,
    jenis_pekerjaan: d.jenis_pekerjaan,
    tanggal: d.tanggal,
    nama_client: d.nama_client,
    telepon_client: d.telepon_client,
    alamat_client: d.alamat_client,
    status: d.status,
    ro_name: d.ro_name,
    ro_signature: d.ro_signature,
    ro_signed_at: d.ro_signed_at,
    management_name: d.management_name,
    management_signature: d.management_signature,
    management_signed_at: d.management_signed_at,
    client_name: d.client_name,
    client_signature: d.client_signature,
    client_signed_at: d.client_signed_at,
    created_by: d.created_by ? Number(d.created_by) : null,
    created_at: d.created_at,
    template: d.template ? {
      id: Number(d.template.id),
      judul: d.template.judul,
      pihak_satu: d.template.pihak_satu,
      pihak_dua: d.template.pihak_dua,
      pembuka: d.template.pembuka,
      penutup: d.template.penutup,
      pasals: d.template.pasals.map((p) => ({ id: Number(p.id), urutan: p.urutan, judul_pasal: p.judul_pasal, isi_pasal: p.isi_pasal })),
    } : null,
    lead: d.lead ?? null,
    creator: d.creator ?? null,
    lampirans: (d.lampirans ?? []).map((l) => ({ id: Number(l.id), urutan: l.urutan, judul: l.judul, file_url: l.file_url })),
  };
}

// GET /sales/kontrak-template
router.get("/kontrak-template", async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const [total, items] = await Promise.all([
    prisma.kontrakTemplate.count(),
    prisma.kontrakTemplate.findMany({
      include: { creator: { select: { name: true } }, pasals: { orderBy: { urutan: "asc" } } },
      orderBy: { id: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return res.json(paginateResponse(items.map(mapKontrakTemplate), total, page, limit));
});

// POST /sales/kontrak-template
router.post("/kontrak-template", async (req: Request, res: Response) => {
  const { judul, pihak_satu, pihak_dua, pembuka, penutup } = req.body;
  if (!judul) return res.status(400).json({ detail: "Judul wajib diisi" });
  const t = await prisma.kontrakTemplate.create({
    data: { judul, pihak_satu: pihak_satu ?? null, pihak_dua: pihak_dua ?? null, pembuka: pembuka ?? null, penutup: penutup ?? null, created_by: req.user?.id ?? null },
    include: { creator: { select: { name: true } }, pasals: { orderBy: { urutan: "asc" } } },
  });
  return res.status(201).json(mapKontrakTemplate(t));
});

// GET /sales/kontrak-template/:id
router.get("/kontrak-template/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.kontrakTemplate.findUnique({
    where: { id },
    include: { creator: { select: { name: true } }, pasals: { orderBy: { urutan: "asc" } } },
  });
  if (!t) return res.status(404).json({ detail: "Template tidak ditemukan" });
  return res.json(mapKontrakTemplate(t));
});

// PATCH /sales/kontrak-template/:id
router.patch("/kontrak-template/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.kontrakTemplate.findUnique({ where: { id } });
  if (!t) return res.status(404).json({ detail: "Template tidak ditemukan" });
  const { judul, pihak_satu, pihak_dua, pembuka, penutup } = req.body;
  const updates: Record<string, unknown> = { updated_at: new Date() };
  if (judul !== undefined) updates.judul = judul;
  if (pihak_satu !== undefined) updates.pihak_satu = pihak_satu;
  if (pihak_dua !== undefined) updates.pihak_dua = pihak_dua;
  if (pembuka !== undefined) updates.pembuka = pembuka;
  if (penutup !== undefined) updates.penutup = penutup;
  const updated = await prisma.kontrakTemplate.update({
    where: { id },
    data: updates,
    include: { creator: { select: { name: true } }, pasals: { orderBy: { urutan: "asc" } } },
  });
  return res.json(mapKontrakTemplate(updated));
});

// POST /sales/kontrak-template/:id/publish
router.post("/kontrak-template/:id/publish", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.kontrakTemplate.findUnique({ where: { id } });
  if (!t) return res.status(404).json({ detail: "Template tidak ditemukan" });
  const updated = await prisma.kontrakTemplate.update({
    where: { id },
    data: { status: t.status === "aktif" ? "draft" : "aktif", updated_at: new Date() },
    include: { creator: { select: { name: true } }, pasals: { orderBy: { urutan: "asc" } } },
  });
  return res.json(mapKontrakTemplate(updated));
});

// DELETE /sales/kontrak-template/:id
router.delete("/kontrak-template/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.kontrakTemplate.findUnique({ where: { id } });
  if (!t) return res.status(404).json({ detail: "Template tidak ditemukan" });
  await prisma.kontrakTemplate.delete({ where: { id } });
  return res.json({ message: "Template dihapus" });
});

// POST /sales/kontrak-template/:id/pasal
router.post("/kontrak-template/:id/pasal", async (req: Request, res: Response) => {
  const template_id = BigInt(req.params.id);
  const t = await prisma.kontrakTemplate.findUnique({ where: { id: template_id } });
  if (!t) return res.status(404).json({ detail: "Template tidak ditemukan" });
  const { judul_pasal, isi_pasal, urutan } = req.body;
  const maxUrutan = await prisma.kontrakTemplatePasal.aggregate({ where: { template_id }, _max: { urutan: true } });
  const nextUrutan = urutan ?? (maxUrutan._max.urutan ?? 0) + 1;
  const pasal = await prisma.kontrakTemplatePasal.create({
    data: { template_id, judul_pasal: judul_pasal ?? null, isi_pasal: isi_pasal ?? null, urutan: nextUrutan },
  });
  await prisma.kontrakTemplate.update({ where: { id: template_id }, data: { updated_at: new Date() } });
  return res.status(201).json({ id: Number(pasal.id), urutan: pasal.urutan, judul_pasal: pasal.judul_pasal, isi_pasal: pasal.isi_pasal });
});

// PATCH /sales/kontrak-template/:id/pasal/:pasalId
router.patch("/kontrak-template/:id/pasal/:pasalId", async (req: Request, res: Response) => {
  const id = BigInt(req.params.pasalId);
  const pasal = await prisma.kontrakTemplatePasal.findUnique({ where: { id } });
  if (!pasal) return res.status(404).json({ detail: "Pasal tidak ditemukan" });
  const { judul_pasal, isi_pasal, urutan } = req.body;
  const updates: Record<string, unknown> = {};
  if (judul_pasal !== undefined) updates.judul_pasal = judul_pasal;
  if (isi_pasal !== undefined) updates.isi_pasal = isi_pasal;
  if (urutan !== undefined) updates.urutan = urutan;
  const updated = await prisma.kontrakTemplatePasal.update({ where: { id }, data: updates });
  await prisma.kontrakTemplate.update({ where: { id: pasal.template_id }, data: { updated_at: new Date() } });
  return res.json({ id: Number(updated.id), urutan: updated.urutan, judul_pasal: updated.judul_pasal, isi_pasal: updated.isi_pasal });
});

// DELETE /sales/kontrak-template/:id/pasal/:pasalId
router.delete("/kontrak-template/:id/pasal/:pasalId", async (req: Request, res: Response) => {
  const id = BigInt(req.params.pasalId);
  const pasal = await prisma.kontrakTemplatePasal.findUnique({ where: { id } });
  if (!pasal) return res.status(404).json({ detail: "Pasal tidak ditemukan" });
  await prisma.kontrakTemplatePasal.delete({ where: { id } });
  await prisma.kontrakTemplate.update({ where: { id: pasal.template_id }, data: { updated_at: new Date() } });
  return res.json({ message: "Pasal dihapus" });
});

// ── Kontrak Dokumen ───────────────────────────────────────────────────────────

// GET /sales/kontrak-dokumen
router.get("/kontrak-dokumen", async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const [total, items] = await Promise.all([
    prisma.kontrakDokumen.count(),
    prisma.kontrakDokumen.findMany({
      include: {
        template: { select: { id: true, judul: true, pihak_satu: true, pihak_dua: true, pembuka: true, penutup: true, pasals: { orderBy: { urutan: "asc" } } } },
        lead: { select: { nama: true, nomor_telepon: true, alamat: true } },
        creator: { select: { name: true } },
        lampirans: { orderBy: { urutan: "asc" } },
      },
      orderBy: { id: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return res.json(paginateResponse(items.map(mapKontrakDokumen), total, page, limit));
});

// POST /sales/kontrak-dokumen
router.post("/kontrak-dokumen", async (req: Request, res: Response) => {
  const { template_id, lead_id, tanggal, jenis_pekerjaan } = req.body;
  if (!template_id) return res.status(400).json({ detail: "Template wajib dipilih" });

  const template = await prisma.kontrakTemplate.findUnique({ where: { id: BigInt(template_id) } });
  if (!template) return res.status(404).json({ detail: "Template tidak ditemukan" });

  let lead: { nama: string; nomor_telepon: string | null; alamat: string | null } | null = null;
  if (lead_id) {
    lead = await prisma.lead.findUnique({ where: { id: BigInt(lead_id) }, select: { nama: true, nomor_telepon: true, alamat: true } });
  }

  // Auto-generate nomor
  const d = tanggal ? new Date(tanggal) : new Date();
  const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
  const tahun = d.getFullYear();
  const count = await prisma.kontrakDokumen.count({ where: { created_at: { gte: new Date(tahun, 0, 1), lt: new Date(tahun + 1, 0, 1) } } });
  const nomor_kontrak = `KTR/${String(count + 1).padStart(3, "0")}/${ROMAN[d.getMonth()]}/${tahun}`;

  const dok = await prisma.kontrakDokumen.create({
    data: {
      template_id: BigInt(template_id),
      lead_id: lead_id ? BigInt(lead_id) : null,
      nomor_kontrak,
      jenis_pekerjaan: jenis_pekerjaan ?? null,
      tanggal: tanggal ? new Date(tanggal) : new Date(),
      nama_client: lead?.nama ?? null,
      telepon_client: lead?.nomor_telepon ?? null,
      alamat_client: lead?.alamat ?? null,
      created_by: req.user?.id ?? null,
    },
    include: {
      template: { select: { id: true, judul: true, pihak_satu: true, pihak_dua: true, pembuka: true, penutup: true, pasals: { orderBy: { urutan: "asc" } } } },
      lead: { select: { nama: true, nomor_telepon: true, alamat: true } },
      creator: { select: { name: true } },
      lampirans: { orderBy: { urutan: "asc" } },
    },
  });
  return res.status(201).json(mapKontrakDokumen(dok));
});

// GET /sales/kontrak-dokumen/:id
router.get("/kontrak-dokumen/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const d = await prisma.kontrakDokumen.findUnique({
    where: { id },
    include: {
      template: { select: { id: true, judul: true, pihak_satu: true, pihak_dua: true, pembuka: true, penutup: true, pasals: { orderBy: { urutan: "asc" } } } },
      lead: { select: { nama: true, nomor_telepon: true, alamat: true } },
      creator: { select: { name: true } },
      lampirans: { orderBy: { urutan: "asc" } },
    },
  });
  if (!d) return res.status(404).json({ detail: "Kontrak tidak ditemukan" });
  return res.json(mapKontrakDokumen(d));
});

// DELETE /sales/kontrak-dokumen/:id
router.delete("/kontrak-dokumen/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const d = await prisma.kontrakDokumen.findUnique({ where: { id } });
  if (!d) return res.status(404).json({ detail: "Kontrak tidak ditemukan" });
  await prisma.kontrakDokumen.delete({ where: { id } });
  return res.json({ message: "Kontrak dihapus" });
});

// POST /sales/kontrak-dokumen/:id/sign-ro
router.post("/kontrak-dokumen/:id/sign-ro", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const d = await prisma.kontrakDokumen.findUnique({ where: { id } });
  if (!d) return res.status(404).json({ detail: "Kontrak tidak ditemukan" });
  const { ro_name, ro_signature } = req.body;
  if (!ro_signature) return res.status(400).json({ detail: "Tanda tangan RO diperlukan" });
  const updated = await prisma.kontrakDokumen.update({
    where: { id },
    data: {
      ro_name: ro_name ?? d.ro_name,
      ro_signature,
      ro_signed_at: new Date(),
      status: d.client_signed_at ? "signed" : "signed_ro",
      updated_at: new Date(),
    },
    include: {
      template: { select: { id: true, judul: true, pihak_satu: true, pihak_dua: true, pembuka: true, penutup: true, pasals: { orderBy: { urutan: "asc" } } } },
      lead: { select: { nama: true, nomor_telepon: true, alamat: true } },
      creator: { select: { name: true } },
      lampirans: { orderBy: { urutan: "asc" } },
    },
  });
  return res.json(mapKontrakDokumen(updated));
});

// POST /sales/kontrak-dokumen/:id/sign-management
router.post("/kontrak-dokumen/:id/sign-management", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const d = await prisma.kontrakDokumen.findUnique({ where: { id } });
  if (!d) return res.status(404).json({ detail: "Kontrak tidak ditemukan" });
  const { management_name, management_signature } = req.body;
  if (!management_signature) return res.status(400).json({ detail: "Tanda tangan Management diperlukan" });
  const allSigned = !!d.ro_signed_at && !!d.client_signed_at;
  const updated = await prisma.kontrakDokumen.update({
    where: { id },
    data: {
      management_name: management_name ?? d.management_name,
      management_signature,
      management_signed_at: new Date(),
      status: allSigned ? "signed" : d.status === "draft" ? "signed_ro" : d.status,
      updated_at: new Date(),
    },
    include: {
      template: { select: { id: true, judul: true, pihak_satu: true, pihak_dua: true, pembuka: true, penutup: true, pasals: { orderBy: { urutan: "asc" } } } },
      lead: { select: { nama: true, nomor_telepon: true, alamat: true } },
      creator: { select: { name: true } },
      lampirans: { orderBy: { urutan: "asc" } },
    },
  });
  return res.json(mapKontrakDokumen(updated));
});

// POST /sales/kontrak-dokumen/:id/sign-client
router.post("/kontrak-dokumen/:id/sign-client", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const d = await prisma.kontrakDokumen.findUnique({ where: { id } });
  if (!d) return res.status(404).json({ detail: "Kontrak tidak ditemukan" });
  const { client_name, client_signature } = req.body;
  if (!client_signature) return res.status(400).json({ detail: "Tanda tangan klien diperlukan" });
  const bothP1Signed = !!d.ro_signed_at && !!d.management_signed_at;
  const updated = await prisma.kontrakDokumen.update({
    where: { id },
    data: {
      client_name: client_name ?? d.client_name ?? d.nama_client,
      client_signature,
      client_signed_at: new Date(),
      status: bothP1Signed ? "signed" : "signed_client",
      updated_at: new Date(),
    },
    include: {
      template: { select: { id: true, judul: true, pihak_satu: true, pihak_dua: true, pembuka: true, penutup: true, pasals: { orderBy: { urutan: "asc" } } } },
      lead: { select: { nama: true, nomor_telepon: true, alamat: true } },
      creator: { select: { name: true } },
      lampirans: { orderBy: { urutan: "asc" } },
    },
  });
  return res.json(mapKontrakDokumen(updated));
});

// ── Lampiran per kontrak (multi) ──────────────────────────────────────────────

// GET /sales/kontrak-dokumen/:id/lampirans
router.get("/kontrak-dokumen/:id/lampirans", async (req: Request, res: Response) => {
  const dokumen_id = BigInt(req.params.id);
  const items = await prisma.kontrakDokumenLampiran.findMany({ where: { dokumen_id }, orderBy: { urutan: "asc" } });
  return res.json(items.map((l) => ({ id: Number(l.id), urutan: l.urutan, judul: l.judul, file_url: l.file_url })));
});

// POST /sales/kontrak-dokumen/:id/lampirans
router.post("/kontrak-dokumen/:id/lampirans", async (req: Request, res: Response) => {
  const dokumen_id = BigInt(req.params.id);
  const d = await prisma.kontrakDokumen.findUnique({ where: { id: dokumen_id } });
  if (!d) return res.status(404).json({ detail: "Kontrak tidak ditemukan" });
  const { judul } = req.body;
  if (!judul) return res.status(400).json({ detail: "Judul lampiran wajib diisi" });
  const maxUrutan = await prisma.kontrakDokumenLampiran.aggregate({ where: { dokumen_id }, _max: { urutan: true } });
  const urutan = (maxUrutan._max.urutan ?? 0) + 1;
  const lamp = await prisma.kontrakDokumenLampiran.create({ data: { dokumen_id, judul, urutan } });
  return res.status(201).json({ id: Number(lamp.id), urutan: lamp.urutan, judul: lamp.judul, file_url: lamp.file_url });
});

// PATCH /sales/kontrak-dokumen/:id/lampirans/:lampId
router.patch("/kontrak-dokumen/:id/lampirans/:lampId", async (req: Request, res: Response) => {
  const id = BigInt(req.params.lampId);
  const lamp = await prisma.kontrakDokumenLampiran.findUnique({ where: { id } });
  if (!lamp) return res.status(404).json({ detail: "Lampiran tidak ditemukan" });
  const { judul } = req.body;
  const updated = await prisma.kontrakDokumenLampiran.update({ where: { id }, data: { judul: judul ?? lamp.judul } });
  return res.json({ id: Number(updated.id), urutan: updated.urutan, judul: updated.judul, file_url: updated.file_url });
});

// DELETE /sales/kontrak-dokumen/:id/lampirans/:lampId
router.delete("/kontrak-dokumen/:id/lampirans/:lampId", async (req: Request, res: Response) => {
  const id = BigInt(req.params.lampId);
  const lamp = await prisma.kontrakDokumenLampiran.findUnique({ where: { id } });
  if (!lamp) return res.status(404).json({ detail: "Lampiran tidak ditemukan" });
  if (lamp.file_url) {
    const filePath = path.resolve(config.storagePath, lamp.file_url.replace(/^\/storage\//, ""));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await prisma.kontrakDokumenLampiran.delete({ where: { id } });
  return res.json({ message: "Lampiran dihapus" });
});

// POST /sales/kontrak-dokumen/:id/lampirans/:lampId/upload
router.post("/kontrak-dokumen/:id/lampirans/:lampId/upload", lampiranUpload.single("file"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.lampId);
  const lamp = await prisma.kontrakDokumenLampiran.findUnique({ where: { id } });
  if (!lamp) return res.status(404).json({ detail: "Lampiran tidak ditemukan" });
  if (!req.file) return res.status(400).json({ detail: "File PDF diperlukan" });
  if (lamp.file_url) {
    const oldPath = path.resolve(config.storagePath, lamp.file_url.replace(/^\/storage\//, ""));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  const fileUrl = `/storage/kontrak-lampiran/${req.file.filename}`;
  const updated = await prisma.kontrakDokumenLampiran.update({ where: { id }, data: { file_url: fileUrl } });
  return res.json({ id: Number(updated.id), urutan: updated.urutan, judul: updated.judul, file_url: updated.file_url });
});

// DELETE /sales/kontrak-dokumen/:id/lampirans/:lampId/file
router.delete("/kontrak-dokumen/:id/lampirans/:lampId/file", async (req: Request, res: Response) => {
  const id = BigInt(req.params.lampId);
  const lamp = await prisma.kontrakDokumenLampiran.findUnique({ where: { id } });
  if (!lamp) return res.status(404).json({ detail: "Lampiran tidak ditemukan" });
  if (lamp.file_url) {
    const filePath = path.resolve(config.storagePath, lamp.file_url.replace(/^\/storage\//, ""));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  const updated = await prisma.kontrakDokumenLampiran.update({ where: { id }, data: { file_url: null } });
  return res.json({ id: Number(updated.id), urutan: updated.urutan, judul: updated.judul, file_url: updated.file_url });
});

export default router;
