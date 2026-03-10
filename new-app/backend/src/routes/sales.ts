import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { getPagination, paginateResponse } from "../middleware/pagination";

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

const PERMANENT_COLUMNS = ["Follow Up Admin", "Follow Up Telemarketing", "Closing", "Lost"];

const PERMANENT_COLUMN_COLORS: Record<string, string> = {
  "Follow Up Admin": "#dbeafe",
  "Follow Up Telemarketing": "#dcfce7",
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

export default router;
