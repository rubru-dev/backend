import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

const PERMANENT_COLUMNS = ["W1", "W2", "W3", "W4", "Closing", "Lost"];
const PERMANENT_COLUMN_COLORS: Record<string, string> = {
  "W1": "#dbeafe", "W2": "#dcfce7", "W3": "#fef9c3",
  "W4": "#ffedd5", "Closing": "#d1fae5", "Lost": "#fee2e2",
};

async function getBoard() {
  return prisma.goldenKanbanSalesColumn.findMany({
    include: {
      cards: {
        include: { labels: true, assigned_user: true, lead: true, comments: true },
      },
    },
    orderBy: { urutan: "asc" },
  });
}

function boardCols(cols: Awaited<ReturnType<typeof getBoard>>) {
  return cols.map((col) => ({
    id: col.id, title: col.title, urutan: col.urutan, color: col.color ?? "#e2e8f0",
    cards: col.cards.map((c) => ({
      id: c.id, title: c.title, description: c.description, deadline: c.deadline,
      projeksi_sales: c.projeksi_sales != null ? parseFloat(String(c.projeksi_sales)) : null,
      urutan: c.urutan, color: c.color, tipe_pekerjaan: c.tipe_pekerjaan,
      lead: c.lead ? { id: c.lead.id, nama: c.lead.nama } : null,
      assigned_user: c.assigned_user ? { id: c.assigned_user.id, name: c.assigned_user.name } : null,
      labels: c.labels.map((lb) => ({ id: lb.id, label_name: lb.label_name, color: lb.color })),
      comments_count: c.comments.length,
      created_at: c.created_at,
    })),
  }));
}

// GET /kanban
router.get("/kanban", async (_req: Request, res: Response) => {
  const existingTitles = await prisma.goldenKanbanSalesColumn.findMany({ select: { title: true, urutan: true } });
  const titleSet = new Set(existingTitles.map((c) => c.title));
  const missing = PERMANENT_COLUMNS.filter((t) => !titleSet.has(t));
  if (missing.length > 0) {
    const maxCol = await prisma.goldenKanbanSalesColumn.findFirst({ orderBy: { urutan: "desc" } });
    const base = maxCol ? maxCol.urutan + 1 : 1;
    await prisma.goldenKanbanSalesColumn.createMany({
      data: missing.map((title, i) => ({ title, urutan: base + i, color: PERMANENT_COLUMN_COLORS[title] ?? "#e2e8f0" })),
    });
  }
  const cols = await getBoard();
  return res.json({ columns: boardCols(cols) });
});

// POST /kanban/columns
router.post("/kanban/columns", async (req: Request, res: Response) => {
  const { title, urutan, color } = req.body;
  const col = await prisma.goldenKanbanSalesColumn.create({
    data: { title, urutan: urutan ?? 0, color: color ?? "#e2e8f0" },
  });
  return res.status(201).json({ id: col.id, message: "Kolom dibuat" });
});

// PATCH /kanban/columns/:id
router.patch("/kanban/columns/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const col = await prisma.goldenKanbanSalesColumn.findUnique({ where: { id } });
  if (!col) return res.status(404).json({ detail: "Kolom tidak ditemukan" });
  const { title, urutan, color } = req.body;
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (urutan !== undefined) updates.urutan = urutan;
  if (color !== undefined) updates.color = color;
  await prisma.goldenKanbanSalesColumn.update({ where: { id }, data: updates });
  return res.json({ message: "Kolom diupdate" });
});

// DELETE /kanban/columns/:id
router.delete("/kanban/columns/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const col = await prisma.goldenKanbanSalesColumn.findUnique({ where: { id } });
  if (!col) return res.status(404).json({ detail: "Kolom tidak ditemukan" });
  if (PERMANENT_COLUMNS.includes(col.title)) {
    return res.status(403).json({ detail: `Kolom "${col.title}" adalah kolom permanen dan tidak dapat dihapus` });
  }
  await prisma.goldenKanbanSalesColumn.delete({ where: { id } });
  return res.json({ message: "Kolom dihapus" });
});

// POST /kanban/columns/reorder
router.post("/kanban/columns/reorder", async (req: Request, res: Response) => {
  const { column_ids } = req.body as { column_ids: number[] };
  if (!Array.isArray(column_ids)) return res.status(400).json({ detail: "column_ids harus array" });
  await Promise.all(
    column_ids.map((id, idx) =>
      prisma.goldenKanbanSalesColumn.update({ where: { id: BigInt(id) }, data: { urutan: idx } })
    )
  );
  return res.json({ message: "Urutan kolom diperbarui" });
});

// POST /kanban/carryover
router.post("/kanban/carryover", async (req: Request, res: Response) => {
  const { month, year } = req.body as { month: number; year: number };
  const now = new Date();
  if (new Date(year, month - 1, 1) > now) return res.json({ copied: 0 });

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  const prevStart = new Date(prevYear, prevMonth - 1, 1);
  const prevEnd   = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);
  const targetStart = new Date(year, month - 1, 1);
  const targetEnd   = new Date(year, month, 0, 23, 59, 59, 999);

  const permCols = await prisma.goldenKanbanSalesColumn.findMany({ where: { title: { in: PERMANENT_COLUMNS } } });
  if (permCols.length === 0) return res.json({ copied: 0 });

  let copied = 0;
  for (const col of permCols) {
    const prevCards = await prisma.goldenKanbanSalesCard.findMany({
      where: { column_id: col.id, created_at: { gte: prevStart, lte: prevEnd } },
    });
    if (prevCards.length === 0) continue;
    const existing = await prisma.goldenKanbanSalesCard.findMany({
      where: { column_id: col.id, created_at: { gte: targetStart, lte: targetEnd } },
      select: { title: true },
    });
    const existingTitles = new Set(existing.map((c) => c.title));
    for (const card of prevCards) {
      if (existingTitles.has(card.title)) continue;
      const created = await prisma.goldenKanbanSalesCard.create({
        data: {
          column_id: col.id, title: card.title, description: card.description ?? null,
          color: card.color ?? null, projeksi_sales: card.projeksi_sales ?? undefined, urutan: card.urutan,
        },
      });
      await prisma.$executeRaw`
        UPDATE golden_kanban_sales_cards
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
  const card = await prisma.goldenKanbanSalesCard.create({
    data: {
      column_id, title,
      description: description ?? null,
      deadline: deadline ? new Date(deadline) : null,
      assigned_user_id: assigned_user_id ?? null,
      lead_id: lead_id ?? null,
      tipe_pekerjaan: tipe_pekerjaan ?? null,
      projeksi_sales: projeksi_sales != null ? projeksi_sales : undefined,
      color: color ?? null,
      urutan: urutan ?? 0,
    },
    include: { assigned_user: true, lead: true, labels: true, comments: true },
  });
  return res.status(201).json(card);
});

// PATCH /kanban/cards/:id
router.patch("/kanban/cards/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const card = await prisma.goldenKanbanSalesCard.findUnique({ where: { id } });
  if (!card) return res.status(404).json({ detail: "Card tidak ditemukan" });
  const b = req.body;
  const updates: Record<string, unknown> = {};
  if (b.title !== undefined) updates.title = b.title;
  if (b.description !== undefined) updates.description = b.description;
  if (b.deadline !== undefined) updates.deadline = b.deadline ? new Date(b.deadline) : null;
  if (b.color !== undefined) updates.color = b.color;
  if (b.column_id !== undefined) updates.column_id = BigInt(b.column_id);
  if (b.urutan !== undefined) updates.urutan = b.urutan;
  if (b.assigned_user_id !== undefined) updates.assigned_user_id = b.assigned_user_id ?? null;
  if (b.lead_id !== undefined) updates.lead_id = b.lead_id ?? null;
  if (b.tipe_pekerjaan !== undefined) updates.tipe_pekerjaan = b.tipe_pekerjaan;
  if (b.projeksi_sales !== undefined) updates.projeksi_sales = b.projeksi_sales ?? null;
  await prisma.goldenKanbanSalesCard.update({ where: { id }, data: updates });
  return res.json({ message: "Card diupdate" });
});

// DELETE /kanban/cards/:id
router.delete("/kanban/cards/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const card = await prisma.goldenKanbanSalesCard.findUnique({ where: { id } });
  if (!card) return res.status(404).json({ detail: "Card tidak ditemukan" });
  await prisma.goldenKanbanSalesCard.delete({ where: { id } });
  return res.json({ message: "Card dihapus" });
});

// GET /kanban/leads
router.get("/kanban/leads", async (_req: Request, res: Response) => {
  const leads = await prisma.lead.findMany({
    where: { modul: "golden" },
    select: { id: true, nama: true },
    orderBy: { nama: "asc" },
  });
  return res.json(leads);
});

// GET /kanban/cards/:id/comments
router.get("/kanban/cards/:id/comments", async (req: Request, res: Response) => {
  const card_id = BigInt(req.params.id);
  const comments = await prisma.goldenKanbanSalesComment.findMany({
    where: { card_id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { created_at: "asc" },
  });
  return res.json(comments);
});

// POST /kanban/cards/:id/comments
router.post("/kanban/cards/:id/comments", async (req: Request, res: Response) => {
  const card_id = BigInt(req.params.id);
  const { comment } = req.body;
  const user_id = req.user?.id;
  const c = await prisma.goldenKanbanSalesComment.create({
    data: { card_id, user_id: user_id ?? null, comment },
    include: { user: { select: { id: true, name: true } } },
  });
  return res.status(201).json(c);
});

export default router;
