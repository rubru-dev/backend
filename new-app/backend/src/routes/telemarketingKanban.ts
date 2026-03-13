import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

const PERMANENT_COLUMNS = [
  { title: "From Sales Admin",      color: "#6366f1", urutan: 0 },
  { title: "W1",                    color: "#3b82f6", urutan: 1 },
  { title: "W2",                    color: "#8b5cf6", urutan: 2 },
  { title: "W3",                    color: "#f59e0b", urutan: 3 },
  { title: "W4",                    color: "#10b981", urutan: 4 },
  { title: "Closing Survey",        color: "#22c55e", urutan: 5 },
  { title: "Move To Cold Database", color: "#ef4444", urutan: 6 },
];

// GET /kanban?bulan=&tahun=
router.get("/kanban", async (req: Request, res: Response) => {
  const bulan = req.query.bulan ? parseInt(req.query.bulan as string) : new Date().getMonth() + 1;
  const tahun = req.query.tahun ? parseInt(req.query.tahun as string) : new Date().getFullYear();

  // Auto-create permanent columns if missing for this month
  for (const col of PERMANENT_COLUMNS) {
    const exists = await prisma.telemarketingKanbanColumn.findFirst({
      where: { title: col.title, bulan, tahun },
    });
    if (!exists) {
      await prisma.telemarketingKanbanColumn.create({
        data: { ...col, bulan, tahun },
      });
    }
  }

  const columns = await prisma.telemarketingKanbanColumn.findMany({
    where: { bulan, tahun },
    orderBy: { urutan: "asc" },
    include: {
      cards: {
        orderBy: { urutan: "asc" },
        include: {
          lead: { select: { id: true, nama: true, created_at: true, tanggal_masuk: true } },
          assigned_user: { select: { id: true, name: true } },
          labels: true,
          comments: { include: { user: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  return res.json(columns);
});

// GET /kanban/leads — leads dropdown (telemarketing modul)
router.get("/kanban/leads", async (_req: Request, res: Response) => {
  const leads = await prisma.lead.findMany({
    where: { modul: "telemarketing" },
    select: { id: true, nama: true, nomor_telepon: true },
    orderBy: { nama: "asc" },
  });
  return res.json(leads);
});

// POST /kanban/carryover
router.post("/kanban/carryover", async (req: Request, res: Response) => {
  const { from_bulan, from_tahun, to_bulan, to_tahun } = req.body;

  const fromCols = await prisma.telemarketingKanbanColumn.findMany({
    where: { bulan: from_bulan, tahun: from_tahun },
    include: { cards: true },
  });

  const excluded = ["Move To Cold Database", "From Sales Admin"];

  for (const fromCol of fromCols) {
    if (excluded.includes(fromCol.title)) continue;
    let toCol = await prisma.telemarketingKanbanColumn.findFirst({
      where: { title: fromCol.title, bulan: to_bulan, tahun: to_tahun },
    });
    if (!toCol) {
      toCol = await prisma.telemarketingKanbanColumn.create({
        data: {
          title: fromCol.title,
          color: fromCol.color,
          urutan: fromCol.urutan,
          bulan: to_bulan,
          tahun: to_tahun,
        },
      });
    }
    for (const card of fromCol.cards) {
      await prisma.telemarketingKanbanCard.create({
        data: {
          column_id: toCol.id,
          title: card.title,
          description: card.description,
          lead_id: card.lead_id,
          assigned_user_id: card.assigned_user_id,
          deadline: card.deadline,
          tanggal_survey: card.tanggal_survey,
          color: card.color,
          urutan: card.urutan,
        },
      });
    }
  }

  return res.json({ message: "Carryover selesai" });
});

// POST /kanban/columns
router.post("/kanban/columns", async (req: Request, res: Response) => {
  const { title, color, urutan, bulan, tahun } = req.body;
  const col = await prisma.telemarketingKanbanColumn.create({
    data: { title, color: color ?? "#e2e8f0", urutan: urutan ?? 99, bulan, tahun },
  });
  return res.status(201).json(col);
});

// PATCH /kanban/columns/:id
router.patch("/kanban/columns/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { title, color, urutan } = req.body;
  const col = await prisma.telemarketingKanbanColumn.update({
    where: { id },
    data: { title, color, urutan },
  });
  return res.json(col);
});

// DELETE /kanban/columns/:id
router.delete("/kanban/columns/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const col = await prisma.telemarketingKanbanColumn.findUnique({ where: { id } });
  if (!col) return res.status(404).json({ detail: "Column tidak ditemukan" });
  if (PERMANENT_COLUMNS.some((p) => p.title === col.title)) {
    return res.status(403).json({ detail: "Kolom permanen tidak bisa dihapus" });
  }
  await prisma.telemarketingKanbanColumn.delete({ where: { id } });
  return res.json({ message: "Column dihapus" });
});

// POST /kanban/columns/:id/cards
router.post("/kanban/columns/:id/cards", async (req: Request, res: Response) => {
  const column_id = BigInt(req.params.id);
  const { title, description, lead_id, assigned_user_id, deadline, tanggal_survey, color } = req.body;

  const card = await prisma.telemarketingKanbanCard.create({
    data: {
      column_id,
      title,
      description: description ?? null,
      lead_id: lead_id ? BigInt(lead_id) : null,
      assigned_user_id: assigned_user_id ? BigInt(assigned_user_id) : null,
      deadline: deadline ? new Date(deadline) : null,
      tanggal_survey: tanggal_survey ? new Date(tanggal_survey) : null,
      color: color ?? null,
    },
    include: {
      lead: { select: { id: true, nama: true, tanggal_masuk: true } },
      assigned_user: { select: { id: true, name: true } },
      labels: true,
    },
  });
  return res.status(201).json(card);
});

// PATCH /kanban/cards/:id
router.patch("/kanban/cards/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { title, description, assigned_user_id, deadline, tanggal_survey, color, column_id, urutan } = req.body;

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null;
  if (tanggal_survey !== undefined) data.tanggal_survey = tanggal_survey ? new Date(tanggal_survey) : null;
  if (color !== undefined) data.color = color;
  if (column_id !== undefined) data.column_id = BigInt(column_id);
  if (urutan !== undefined) data.urutan = urutan;
  if (assigned_user_id !== undefined)
    data.assigned_user_id = assigned_user_id ? BigInt(assigned_user_id) : null;

  const card = await prisma.telemarketingKanbanCard.update({ where: { id }, data });
  return res.json(card);
});

// DELETE /kanban/cards/:id
router.delete("/kanban/cards/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  await prisma.telemarketingKanbanCard.delete({ where: { id } });
  return res.json({ message: "Card dihapus" });
});

// POST /kanban/cards/:id/move — drag-copy to another column
// If target is "Move To Cold Database", set lead.status = "Low"
// If target is "Closing Survey", update lead.tanggal_survey
router.post("/kanban/cards/:id/move", async (req: Request, res: Response) => {
  const sourceId = BigInt(req.params.id);
  const { target_column_id, bulan, tahun } = req.body;

  const source = await prisma.telemarketingKanbanCard.findUnique({
    where: { id: sourceId },
    include: { labels: true },
  });
  if (!source) return res.status(404).json({ detail: "Card tidak ditemukan" });

  const targetCol = await prisma.telemarketingKanbanColumn.findUnique({
    where: { id: BigInt(target_column_id) },
  });
  if (!targetCol) return res.status(404).json({ detail: "Kolom tujuan tidak ditemukan" });

  // Create new card in target column (drag = copy)
  const newCard = await prisma.telemarketingKanbanCard.create({
    data: {
      column_id: BigInt(target_column_id),
      title: source.title,
      description: source.description,
      lead_id: source.lead_id,
      assigned_user_id: source.assigned_user_id,
      deadline: source.deadline,
      tanggal_survey: source.tanggal_survey,
      color: source.color,
      urutan: source.urutan,
    },
  });

  // If moved to "Move To Cold Database", set lead.status = "Low"
  if (targetCol.title === "Move To Cold Database" && source.lead_id) {
    await prisma.lead.update({
      where: { id: source.lead_id },
      data: { status: "Low" },
    });
  }

  // If moved to "Closing Survey", update lead.tanggal_survey if set
  if (targetCol.title === "Closing Survey" && source.lead_id && source.tanggal_survey) {
    await prisma.lead.update({
      where: { id: source.lead_id },
      data: { tanggal_survey: source.tanggal_survey, rencana_survey: "Ya" },
    });
  }

  return res.status(201).json(newCard);
});

// PATCH /kanban/cards/:id/survey — set tanggal_survey and update lead
router.patch("/kanban/cards/:id/survey", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { tanggal_survey } = req.body;

  const card = await prisma.telemarketingKanbanCard.update({
    where: { id },
    data: { tanggal_survey: tanggal_survey ? new Date(tanggal_survey) : null },
  });

  if (card.lead_id && tanggal_survey) {
    await prisma.lead.update({
      where: { id: card.lead_id },
      data: { tanggal_survey: new Date(tanggal_survey), rencana_survey: "Ya" },
    });
  }

  return res.json(card);
});

// GET /kanban/cards/:id/comments
router.get("/kanban/cards/:id/comments", async (req: Request, res: Response) => {
  const card_id = BigInt(req.params.id);
  const comments = await prisma.telemarketingKanbanComment.findMany({
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

  const c = await prisma.telemarketingKanbanComment.create({
    data: { card_id, user_id: user_id ?? null, comment },
    include: { user: { select: { id: true, name: true } } },
  });
  return res.status(201).json(c);
});

export default router;
