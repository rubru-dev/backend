import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../prisma";
import { authenticate, AuthRequest, requireRole, requirePermission } from "../middleware/auth";
import { createUploader, publicUploadPath } from "../lib/upload";
import { encryptSecret, decryptSecret } from "../lib/secret";

const router = Router();
const page = (value: unknown) => Math.max(1, Number(value) || 1);
const limit = (value: unknown) => Math.min(100, Math.max(1, Number(value) || 10));
const code = (prefix: string) => `${prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}${Math.floor(Math.random() * 100).toString().padStart(2, "0")}`;
const inquiryNumber = async (date: Date, tx: { inquiry: { count: typeof prisma.inquiry.count } } = prisma) => { const stamp = date.toISOString().slice(0, 10).replaceAll("-", ""); const start = new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`); const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1); const count = await tx.inquiry.count({ where: { inquiryDate: { gte: start, lt: end } } }); return `INQ-${stamp}-${String(count + 1).padStart(3, "0")}`; };
const customerUpload = createUploader("customers", ["application/pdf", "image/jpeg", "image/png", "image/webp", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], 15);
const surveyEvidenceUpload = createUploader("survey-evidence", ["image/jpeg", "image/png", "image/webp"], 10);
const surveyB2cFindingUpload = createUploader("survey-b2c-findings", ["image/jpeg", "image/png", "image/webp"], 10);
const workPlanUpload = createUploader("work-plan", ["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], 20);
const quotationUpload = createUploader("quotation", ["image/jpeg", "image/png", "image/webp"], 15);
const progressOptions = ["New Inquiry", "Non Sales Inquiry", "Pricelist Sent", "Contacted", "Survey Scheduled", "Survey Completed", "Quotation Sent", "Waiting Agreement", "Won/Closing", "Lost/Not Interest"];
const resultOptions = ["On Going", "Won/Closing", "Lost"];
const segmentOptions = ["B2C", "B2B"];
const sourceOptions = ["Whatsapp", "Instagram", "Tiktok", "Referal"];
const serviceTypeOptions = ["PC", "RC", "PCRC", "Termite Control", "Other Pests"];
const cityOptions = ["Jakarta", "Bogor", "Depok", "Tangerang", "Bekasi", "Bandung", "Purwakarta", "Semarang", "Surabaya"];
const pestIssueOptions = ["Lalat", "Nyamuk", "Semut", "Kecoa", "Serangga lain", "Tikus", "Rayap", "Burung", "Kelelawar", "Tipe Hama lain"];
const vendorOptions = ["Pestigo", "Istapest", "Pascal", "PCO", "SPC", "Riztra"];
const defaultTerms = ["Vendor wajib melaksanakan pekerjaan sesuai jadwal yang telah ditentukan.", "Vendor wajib menggunakan APD dan mengikuti prosedur keselamatan kerja di lokasi customer.", "Vendor wajib mengirimkan dokumentasi pekerjaan berupa foto before-after.", "Vendor wajib menyerahkan laporan pekerjaan maksimal H+1 setelah pekerjaan selesai.", "Pembayaran dilakukan setelah pekerjaan selesai, laporan diterima, dan dokumen invoice lengkap.", "Setiap perubahan jadwal, area, atau metode kerja harus mendapatkan persetujuan PIC internal."];
const reverseGeocodeCache = new Map<string, string>();

function parseJsonField(value: any, fallback: any) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function dayRange(value: string) {
  const start = new Date(`${value}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function canViewAllWorkPlans(user: AuthRequest["user"]) {
  if (!user) return false;
  if (user.permissions.has("work_plans.view_all")) return true;
  return (user.roles ?? [user.role]).some(r => ["ADMIN", "MANAGER"].includes(r));
}

function workPlanInclude() {
  return {
    owner: { select: { id: true, name: true, role: true } },
    createdBy: { select: { id: true, name: true, role: true } },
    taggedUsers: { include: { user: { select: { id: true, name: true, role: true } } } },
    checkpoints: { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "desc" as const } },
  };
}

async function addWorkPlanLog(workPlanId: string, actorId: string | undefined, action: string, message: string, metadata?: any) {
  await prisma.workPlanAuditLog.create({ data: { workPlanId, actorId, action, message, metadata } });
}

function parseStringArray(value: any) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function decimalOrNull(value: any) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function orderSheetInclude() {
  return {
    customer: true,
    vendor: true,
  };
}

function customerSnapshot(customer: any) {
  return {
    name: customer.name || "",
    company: customer.company || "",
    picName: customer.picServiceName || customer.picScheduleName || customer.invoicePicName || customer.ownerName || customer.name || "",
    phone: customer.phone || customer.picServicePhone || customer.picSchedulePhone || customer.invoicePicPhone || "",
    email: customer.email || customer.picServiceEmail || customer.picScheduleEmail || customer.invoicePicEmail || "",
    address: customer.treatmentAddress || customer.address || customer.billingAddress || customer.city || "",
    customerType: customer.customerType || customer.segmentType || customer.segment || "",
    serviceArea: customer.serviceArea || "",
    areaSize: "",
    locationNotes: customer.notes || "",
  };
}

function complaintInclude() {
  return {
    customer: { select: { id: true, name: true, company: true, segmentType: true, segment: true, phone: true, city: true, treatmentAddress: true } },
    vendor: { select: { id: true, name: true, picName: true, phone: true } },
    orderSheet: { select: { id: true, number: true, jobTitle: true, orderDate: true } },
  };
}

function customerSegment(customer: any) {
  return String(customer.segmentType || customer.segment || customer.customerType || "Uncategorized");
}

async function ensurePendingMonthlyReportForCustomer(customerId: string) {
  const inquiry = await prisma.inquiry.findFirst({
    where: { customerId },
    orderBy: { inquiryDate: "desc" },
    select: { id: true, segmentType: true },
  });
  if (!inquiry) return null;

  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();

  const [complete, simple] = await Promise.all([
    prisma.pestMonthlyReport.findFirst({ where: { inquiryId: inquiry.id, bulan, tahun } }),
    prisma.simpleMonthlyReport.findFirst({ where: { inquiryId: inquiry.id, bulan, tahun } }),
  ]);
  if (complete) return { ...complete, _type: "complete" };
  if (simple) return { ...simple, _type: "simple" };

  const pending = await prisma.pestMonthlyReport.create({
    data: { inquiryId: inquiry.id, bulan, tahun, segment: inquiry.segmentType || "B2B", pagesData: { _pending: true } as any },
  });
  return { ...pending, _type: "pending" };
}

async function list(res: any, model: any, options: any, query: any) {
  const take = limit(query.limit), current = page(query.page), skip = (current - 1) * take;
  const [data, total] = await Promise.all([model.findMany({ ...options, take, skip }), model.count({ where: options.where })]);
  return res.json({ data, total, page: current, totalPages: Math.max(1, Math.ceil(total / take)) });
}

router.use(authenticate);

router.get("/reverse-geocode", async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ error: "Latitude dan longitude tidak valid" });

    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const cached = reverseGeocodeCache.get(key);
    if (cached) return res.json({ address: cached });

    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Fumakilla-QC/1.0 (local reverse geocode)",
        "Accept-Language": "id,en;q=0.8",
      },
    });
    if (!response.ok) return res.json({ address: "Alamat tidak tersedia" });

    const payload: any = await response.json();
    const a = payload.address || {};
    const parts = [
      a.road || a.neighbourhood || a.hamlet,
      a.village || a.suburb || a.city_district || a.town,
      a.county || a.city || a.state_district,
      a.state,
    ].filter(Boolean);
    const address = parts.length ? Array.from(new Set(parts)).join(", ") : (payload.display_name || "Alamat tidak tersedia");
    reverseGeocodeCache.set(key, address);
    res.json({ address });
  } catch (error) {
    next(error);
  }
});

router.get("/dashboard", async (_req, res, next) => {
  try {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [inquiryNew, quotationSent, surveyDone, productivityAgg, activities, recentInquiries, upcomingRenewals] = await Promise.all([
      prisma.inquiry.count({ where: { status: "NEW" } }),
      prisma.quotation.count({ where: { status: "SENT" } }),
      prisma.survey.count({ where: { status: "COMPLETED" } }),
      prisma.dailyReport.aggregate({ _avg: { productivity: true }, where: { reportDate: { gte: startOfMonth } } }),
      prisma.activityLog.findMany({ take: 6, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } }),
      prisma.inquiry.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { customer: true } }),
      prisma.renewal.findMany({ take: 5, orderBy: { expiryDate: "asc" }, include: { customer: true } }),
    ]);
    const productivity = Math.round(productivityAgg._avg.productivity || 0);
    res.json({ metrics: { inquiryNew, quotationSent, surveyDone, productivity }, activities, recentInquiries, upcomingRenewals });
  } catch (error) { next(error); }
});

router.get("/admin-dashboard", async (_req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      customerTotal, customerByStatus, customerBySegment,
      inquiryTotal, inquiryThisMonth, inquiryByProgress,
      quotationTotal, quotationApprovedAgg, quotationByStatus,
      osTotal, osCompleted, osByStatus,
      agreementTotal, agreementActive, agreementByStatus,
      agreementNilaiTotal, agreementNilaiAktif, agreementNilaiByJenis,
      completeReportCount, simpleReportCount, pendingReportCount,
      surveyTotal, surveyDone, surveyByStatus,
      wpThisMonth, wpCompletedThisMonth,
      recentCustomers, recentInquiries, recentQuotations,
      recentOs, recentAgreements, recentMr, recentSimpleMr, recentSurveys, recentWorkPlans,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.groupBy({ by: ["status"], _count: { status: true } }),
      prisma.customer.groupBy({ by: ["segmentType"], _count: { segmentType: true } }),

      prisma.inquiry.count(),
      prisma.inquiry.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.inquiry.groupBy({ by: ["progress"], _count: { progress: true } }),

      prisma.quotation.count(),
      prisma.quotation.aggregate({ _sum: { amount: true }, where: { status: "APPROVED" } }),
      prisma.quotation.groupBy({ by: ["status"], _count: { status: true } }),

      prisma.orderSheet.count(),
      prisma.orderSheet.count({ where: { status: "COMPLETED" } }),
      prisma.orderSheet.groupBy({ by: ["status"], _count: { status: true } }),

      prisma.agreement.count(),
      prisma.agreement.count({ where: { status: "ACTIVE" } }),
      prisma.agreement.groupBy({ by: ["status"], _count: { status: true } }),

      prisma.agreement.aggregate({ _sum: { nilaiKontrak: true } }),
      prisma.agreement.aggregate({ _sum: { nilaiKontrak: true }, where: { status: "ACTIVE" } }),
      prisma.agreement.groupBy({ by: ["jenisLayanan"], _sum: { nilaiKontrak: true } }),

      prisma.pestMonthlyReport.count({ where: { NOT: { pagesData: { path: ["_pending"], equals: true } } } }),
      prisma.simpleMonthlyReport.count(),
      prisma.pestMonthlyReport.count({ where: { pagesData: { path: ["_pending"], equals: true } } }),

      prisma.survey.count(),
      prisma.survey.count({ where: { status: "COMPLETED" } }),
      prisma.survey.groupBy({ by: ["status"], _count: { status: true } }),

      prisma.workPlan.count({ where: { workDate: { gte: startOfMonth } } }),
      prisma.workPlan.count({ where: { workDate: { gte: startOfMonth }, status: "COMPLETED" } }),

      prisma.customer.findMany({ take: 20, orderBy: { createdAt: "desc" }, select: { id: true, code: true, name: true, company: true, status: true, segmentType: true, createdAt: true } }),
      prisma.inquiry.findMany({ take: 20, orderBy: { createdAt: "desc" }, select: { id: true, number: true, customerName: true, companyName: true, segmentType: true, progress: true, result: true, inquiryDate: true } }),
      prisma.quotation.findMany({ take: 20, orderBy: { createdAt: "desc" }, select: { id: true, number: true, title: true, status: true, amount: true, createdAt: true, customer: { select: { name: true, company: true } } } }),
      prisma.orderSheet.findMany({ take: 20, orderBy: { createdAt: "desc" }, select: { id: true, number: true, status: true, grandTotal: true, orderDate: true, customer: { select: { name: true } }, vendor: { select: { name: true } } } }),
      prisma.agreement.findMany({ take: 20, orderBy: { createdAt: "desc" }, select: { id: true, number: true, status: true, jenisLayanan: true, nilaiKontrak: true, tanggalMulai: true, tanggalBerakhir: true, customer: { select: { name: true, company: true } } } }),
      prisma.pestMonthlyReport.findMany({ take: 20, orderBy: { createdAt: "desc" }, select: { id: true, bulan: true, tahun: true, segment: true, pagesData: true, createdAt: true, inquiry: { select: { customerName: true, companyName: true } } } }),
      prisma.simpleMonthlyReport.findMany({ take: 20, orderBy: { createdAt: "desc" }, select: { id: true, bulan: true, tahun: true, segment: true, createdAt: true, inquiry: { select: { customerName: true, companyName: true } } } }),
      prisma.survey.findMany({ take: 20, orderBy: { createdAt: "desc" }, select: { id: true, number: true, status: true, scheduledAt: true, customer: { select: { name: true, company: true } } } }),
      prisma.workPlan.findMany({ take: 20, orderBy: { workDate: "desc" }, select: { id: true, title: true, workDate: true, startTime: true, endTime: true, status: true, location: true, owner: { select: { name: true } }, checkpoints: { select: { type: true, createdAt: true } } } }),
    ]);

    const monthlyReports = [
      ...recentMr.map((r: any) => ({ ...r, _type: "complete", isPending: (r.pagesData as any)?._pending === true })),
      ...recentSimpleMr.map((r: any) => ({ ...r, _type: "simple", isPending: false })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);

    res.json({
      summary: {
        customers: { total: customerTotal, byStatus: customerByStatus, bySegment: customerBySegment },
        inquiries: { total: inquiryTotal, thisMonth: inquiryThisMonth, byProgress: inquiryByProgress },
        quotations: { total: quotationTotal, approvedValue: Number(quotationApprovedAgg._sum.amount || 0), byStatus: quotationByStatus },
        orderSheets: { total: osTotal, completed: osCompleted, byStatus: osByStatus },
        agreements: {
          total: agreementTotal, active: agreementActive, byStatus: agreementByStatus,
          nilaiKontrakTotal: Number(agreementNilaiTotal._sum.nilaiKontrak || 0),
          nilaiKontrakAktif: Number(agreementNilaiAktif._sum.nilaiKontrak || 0),
          nilaiByJenis: agreementNilaiByJenis,
        },
        monthlyReports: { total: completeReportCount + simpleReportCount + pendingReportCount, complete: completeReportCount, simple: simpleReportCount, pending: pendingReportCount },
        surveys: { total: surveyTotal, done: surveyDone, byStatus: surveyByStatus },
        workPlans: { thisMonth: wpThisMonth, completedThisMonth: wpCompletedThisMonth },
      },
      recent: { customers: recentCustomers, inquiries: recentInquiries, quotations: recentQuotations, orderSheets: recentOs, agreements: recentAgreements, monthlyReports, surveys: recentSurveys, workPlans: recentWorkPlans },
    });
  } catch (e) { next(e); }
});

router.get("/customers", async (req, res, next) => {
  try {
    const search = String(req.query.search || "");
    const equals = (key: string) => req.query[key] ? { [key]: req.query[key] } : {};
    const where = { ...equals("status"), ...equals("segment"), ...equals("segmentType"), ...equals("treatment"), ...equals("vendorName"), ...equals("agreementType"), ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { company: { contains: search, mode: "insensitive" as const } }, { code: { contains: search, mode: "insensitive" as const } }, { treatmentAddress: { contains: search, mode: "insensitive" as const } }] } : {}) };
    await list(res, prisma.customer, { where, orderBy: { createdAt: "desc" } }, req.query);
  } catch (error) { next(error); }
});
router.get("/customers/:id", async (req, res, next) => { try { const item = await prisma.customer.findUnique({ where: { id: req.params.id }, include: { inquiries: { orderBy: { createdAt: "desc" } }, quotations: { orderBy: { createdAt: "desc" } }, renewals: { orderBy: { expiryDate: "asc" } }, surveys: { orderBy: { scheduledAt: "desc" } }, files: { orderBy: { createdAt: "desc" } } } }); if (!item) return res.status(404).json({ error: "Customer tidak ditemukan" }); return res.json(item); } catch (error) { return next(error); } });
router.post("/customers", async (req, res, next) => { try { const body = req.body; const item = await prisma.customer.create({ data: { ...body, code: body.code || code("CUS"), agreementStart: body.agreementStart ? new Date(body.agreementStart) : null, agreementEnd: body.agreementEnd ? new Date(body.agreementEnd) : null, agreementValue: body.agreementValue ? Number(body.agreementValue) : null, paymentTerms: body.paymentTerms ? Number(body.paymentTerms) : null, agreementDurationMonths: body.agreementDurationMonths ? Number(body.agreementDurationMonths) : null, invoiceAcceptanceLimitDays: body.invoiceAcceptanceLimitDays ? Number(body.invoiceAcceptanceLimitDays) : null } }); res.status(201).json(item); } catch (error) { next(error); } });
router.patch("/customers/:id", async (req, res, next) => { try { const body = req.body; const item = await prisma.customer.update({ where: { id: req.params.id }, data: { ...body, agreementStart: body.agreementStart ? new Date(body.agreementStart) : undefined, agreementEnd: body.agreementEnd ? new Date(body.agreementEnd) : undefined, agreementValue: body.agreementValue ? Number(body.agreementValue) : undefined, paymentTerms: body.paymentTerms ? Number(body.paymentTerms) : undefined, agreementDurationMonths: body.agreementDurationMonths ? Number(body.agreementDurationMonths) : undefined, invoiceAcceptanceLimitDays: body.invoiceAcceptanceLimitDays ? Number(body.invoiceAcceptanceLimitDays) : undefined } }); res.json(item); } catch (error) { next(error); } });
router.delete("/customers/:id", requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id }, select: { id: true, name: true } });
    if (!customer) return res.status(404).json({ error: "Customer tidak ditemukan" });

    await prisma.$transaction(async (tx) => {
      await tx.complaint.updateMany({ where: { orderSheet: { customerId: customer.id } }, data: { orderSheetId: null } });
      await tx.orderSheet.deleteMany({ where: { customerId: customer.id } });
      await tx.customer.delete({ where: { id: customer.id } });
      await tx.activityLog.create({ data: { message: `${req.user!.name} menghapus customer ${customer.name}`, type: "CUSTOMER", userId: req.user!.id } });
    });

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});
router.post("/customers/:id/files", customerUpload.single("file"), async (req, res, next) => { try { if (!req.file) return res.status(400).json({ error: "File wajib dipilih" }); const customer = await prisma.customer.findUnique({ where: { id: req.params.id }, select: { id: true } }); if (!customer) return res.status(404).json({ error: "Customer tidak ditemukan" }); const file = await prisma.customerFile.create({ data: { customerId: customer.id, name: String(req.body.name || req.file.originalname), category: String(req.body.category || "OTHER"), description: req.body.description ? String(req.body.description) : null, filePath: publicUploadPath(req.file.path), mimeType: req.file.mimetype, size: req.file.size } }); return res.status(201).json(file); } catch (error) { return next(error); } });
router.delete("/customers/:customerId/files/:fileId", async (req, res, next) => { try { await prisma.customerFile.delete({ where: { id: req.params.fileId } }); return res.status(204).end(); } catch (error) { return next(error); } });

router.get("/inquiries", async (req, res, next) => {
  try {
    const search = String(req.query.search || "");
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    if (to && !Number.isNaN(to.getTime())) to.setHours(23, 59, 59, 999);
    const where = {
      ...(req.query.progress ? { progress: String(req.query.progress) } : {}),
      ...(req.query.result ? { result: String(req.query.result) } : {}),
      ...(req.query.contactMonth ? { contactMonth: String(req.query.contactMonth) } : {}),
      ...(req.query.picFiId ? { picFiId: String(req.query.picFiId) } : {}),
      ...(req.query.segmentType ? { segmentType: String(req.query.segmentType) } : {}),
      ...(req.query.source ? { source: String(req.query.source) } : {}),
      ...(req.query.serviceType ? { serviceType: String(req.query.serviceType) } : {}),
      ...(req.query.customerCity ? { customerCity: String(req.query.customerCity) } : {}),
      ...(from || to ? { inquiryDate: { ...(from && !Number.isNaN(from.getTime()) ? { gte: from } : {}), ...(to && !Number.isNaN(to.getTime()) ? { lte: to } : {}) } } : {}),
      ...(search ? { OR: [{ number: { contains: search, mode: "insensitive" as const } }, { customerName: { contains: search, mode: "insensitive" as const } }, { companyName: { contains: search, mode: "insensitive" as const } }, { phone: { contains: search, mode: "insensitive" as const } }, { picFiName: { contains: search, mode: "insensitive" as const } }] } : {}),
    };
    await list(res, prisma.inquiry, { where, include: { customer: true, owner: { select: { name: true } } }, orderBy: { inquiryDate: "desc" } }, req.query);
  } catch (error) { next(error); }
});
router.get("/inquiries/:id", async (req, res, next) => { try { const item = await prisma.inquiry.findUnique({ where: { id: req.params.id }, include: { customer: true, owner: { select: { name: true } }, quotations: true, surveys: { include: { pic: { select: { name: true, role: true } }, picAssignments: { include: { pic: { select: { name: true, role: true } } } } }, orderBy: { scheduledAt: "asc" } } } }); if (!item) return res.status(404).json({ error: "Inquiry tidak ditemukan" }); res.json(item); } catch (error) { next(error); } });
router.post("/inquiries", async (req: AuthRequest, res, next) => { try {
  const body = req.body;
  const errors: Record<string, string> = {};
  const required: Record<string, string> = {
    inquiryDate: "Tanggal kontak masuk",
    contactMonth: "Bulan kontak masuk",
    picFiId: "PIC FI",
    customerName: "Nama customer",
    segmentType: "Segmentasi",
    phone: "Nomor customer",
    source: "Source",
    serviceType: "Tipe service",
    customerCity: "Alamat customer",
  };
  Object.entries(required).forEach(([field, label]) => { if (!String(body[field] || "").trim()) errors[field] = `${label} wajib diisi.`; });
  if (body.segmentType === "B2B" && !String(body.companyName || "").trim()) errors.companyName = "Nama perusahaan wajib diisi untuk segmentasi B2B.";
  if (body.progress && !progressOptions.includes(String(body.progress))) errors.progress = "Progress tidak valid.";
  if (body.result && !resultOptions.includes(String(body.result))) errors.result = "Result tidak valid.";
  if (body.segmentType && !segmentOptions.includes(String(body.segmentType))) errors.segmentType = "Segmentasi tidak valid.";
  if (body.source && !sourceOptions.includes(String(body.source))) errors.source = "Source tidak valid.";
  if (body.serviceType && !serviceTypeOptions.includes(String(body.serviceType))) errors.serviceType = "Tipe service tidak valid.";
  if (body.customerCity && !cityOptions.includes(String(body.customerCity))) errors.customerCity = "Alamat customer tidak valid.";
  if (Object.keys(errors).length) return res.status(400).json({ error: "Periksa field yang ditandai.", errors });

  const inquiryDate = new Date(body.inquiryDate);
  const closingDate = body.closingDate ? new Date(body.closingDate) : null;
  if (Number.isNaN(inquiryDate.getTime())) return res.status(400).json({ error: "Tanggal kontak masuk tidak valid" });
  if (closingDate && Number.isNaN(closingDate.getTime())) return res.status(400).json({ error: "Tanggal closing tidak valid" });
  const picFi = await prisma.user.findFirst({ where: { id: String(body.picFiId), role: "QA", isActive: true }, select: { id: true, name: true } });
  if (!picFi) return res.status(400).json({ error: "PIC FI harus user aktif dengan role QA", errors: { picFiId: "Pilih PIC FI role QA yang aktif." } });

  const progress = String(body.progress || "New Inquiry");
  const result = String(body.result || "On Going");

  const item = await prisma.$transaction(async (tx) => {
    const customer = body.customerId
      ? await tx.customer.update({ where: { id: body.customerId }, data: {
          name: String(body.customerName).trim(),
          company: body.segmentType === "B2B" ? String(body.companyName || "").trim() : null,
          phone: String(body.phone).trim(),
          city: String(body.customerCity).trim(),
          segmentType: String(body.segmentType).trim(),
          leadSource: String(body.source).trim(),
          treatment: String(body.serviceType).trim(),
        } })
      : await tx.customer.create({ data: {
          code: code("CUS"),
          name: String(body.customerName).trim(),
          company: body.segmentType === "B2B" ? String(body.companyName || "").trim() : null,
          phone: String(body.phone).trim(),
          city: String(body.customerCity).trim(),
          address: String(body.customerCity).trim(),
          treatmentAddress: String(body.customerCity).trim(),
          segmentType: String(body.segmentType).trim(),
          leadSource: String(body.source).trim(),
          treatment: String(body.serviceType).trim(),
          status: "Non-Kontrak",
        } });
    return tx.inquiry.create({ data: {
      number: await inquiryNumber(inquiryDate, tx as any),
      inquiryDate,
      contactMonth: String(body.contactMonth).trim(),
      progress,
      result,
      picFiId: picFi.id,
      picFiName: picFi.name,
      segmentType: String(body.segmentType).trim(),
      areaSizeM2: body.areaSizeM2 ? Number(body.areaSizeM2) : null,
      serviceType: String(body.serviceType).trim(),
      customerCity: String(body.customerCity).trim(),
      closingDate,
      closingMonth: String(body.closingMonth || "").trim(),
      customerId: customer.id,
      customerName: customer.name,
      companyName: customer.company || "",
      picName: customer.picServiceName || customer.invoicePicName || customer.name,
      phone: customer.phone || "-",
      email: customer.email || null,
      address: customer.treatmentAddress || customer.address || customer.city || "-",
      service: String(body.serviceType).trim(),
      buildingType: String(body.segmentType).trim(),
      source: String(body.source).trim(),
      salesPic: picFi.name,
      notes: body.notes ? String(body.notes).trim() : null,
      status: result === "Won/Closing" ? "COMPLETED" : result === "Lost" ? "CANCELLED" : "NEW",
      ownerId: req.user!.id,
    }, include: { customer: true } });
  });
  await prisma.activityLog.create({ data: { message: `${req.user!.name} membuat inquiry ${item.number}`, type: "INQUIRY", userId: req.user!.id } });
  res.status(201).json(item);
} catch (error) { next(error); } });
router.patch("/inquiries/:id", async (req, res, next) => { try {
  const body = req.body;
  const data: any = {};
  const stringFields = ["progress", "result", "contactMonth", "picFiId", "picFiName", "customerName", "companyName", "phone", "source", "segmentType", "serviceType", "customerCity", "closingMonth", "notes"];
  stringFields.forEach((field) => { if (body[field] !== undefined) data[field] = body[field] === null ? null : String(body[field]).trim(); });
  if (body.inquiryDate !== undefined) data.inquiryDate = new Date(body.inquiryDate);
  if (body.closingDate !== undefined) data.closingDate = body.closingDate ? new Date(body.closingDate) : null;
  if (body.areaSizeM2 !== undefined) data.areaSizeM2 = body.areaSizeM2 === "" || body.areaSizeM2 === null ? null : Number(body.areaSizeM2);
  if (body.picFiId !== undefined) {
    const picFi = await prisma.user.findFirst({ where: { id: String(body.picFiId), role: "QA", isActive: true }, select: { id: true, name: true } });
    if (!picFi) return res.status(400).json({ error: "PIC FI harus user aktif dengan role QA" });
    data.picFiId = picFi.id;
    data.picFiName = picFi.name;
    data.salesPic = picFi.name;
  }
  if (data.serviceType !== undefined) data.service = data.serviceType;
  if (data.segmentType !== undefined) data.buildingType = data.segmentType;
  if (data.result !== undefined) data.status = data.result === "Won/Closing" ? "COMPLETED" : data.result === "Lost" ? "CANCELLED" : "NEW";
  const item = await prisma.inquiry.update({ where: { id: req.params.id }, data, include: { customer: true } });
  await prisma.customer.update({ where: { id: item.customerId }, data: {
    ...(data.customerName !== undefined ? { name: item.customerName } : {}),
    ...(data.companyName !== undefined || data.segmentType !== undefined ? { company: item.segmentType === "B2B" ? item.companyName || null : null } : {}),
    ...(data.phone !== undefined ? { phone: item.phone } : {}),
    ...(data.customerCity !== undefined ? { city: item.customerCity, address: item.customerCity, treatmentAddress: item.customerCity } : {}),
    ...(data.segmentType !== undefined ? { segmentType: item.segmentType } : {}),
    ...(data.source !== undefined ? { leadSource: item.source } : {}),
    ...(data.serviceType !== undefined ? { treatment: item.serviceType } : {}),
  } });
  res.json(item);
} catch (error) { next(error); } });
router.delete("/inquiries/:id", requireRole("ADMIN"), async (req: AuthRequest, res, next) => { try { const inquiry = await prisma.inquiry.findUnique({ where: { id: req.params.id }, select: { id: true, number: true } }); if (!inquiry) return res.status(404).json({ error: "Inquiry tidak ditemukan" }); await prisma.inquiry.delete({ where: { id: inquiry.id } }); await prisma.activityLog.create({ data: { message: `${req.user!.name} menghapus inquiry ${inquiry.number}`, type: "INQUIRY", userId: req.user!.id } }); return res.status(204).end(); } catch (error) { return next(error); } });
router.post("/inquiries/:id/survey-request", async (req: AuthRequest, res, next) => { try {
  const { picIds, scheduledAt, location, shareLocationUrl } = req.body;
  const surveyorIds: string[] = Array.isArray(picIds) ? picIds.map(String).filter(Boolean) : [];
  if (!surveyorIds.length || !scheduledAt || !String(location || "").trim() || !String(shareLocationUrl || "").trim()) return res.status(400).json({ error: "Pilih minimal satu surveyor, tanggal dan jam, alamat lengkap, serta tautan Google Maps wajib diisi" });
  const inquiry = await prisma.inquiry.findUnique({ where: { id: req.params.id } });
  if (!inquiry) return res.status(404).json({ error: "Inquiry tidak ditemukan" });
  // Survey hanya boleh dijadwalkan sekali — selama masih ada survey aktif (belum dibatalkan),
  // tolak pembuatan survey baru. Untuk ubah jadwal, pakai PATCH /surveys/:id/reschedule.
  const activeSurvey = await prisma.survey.findFirst({ where: { inquiryId: inquiry.id, status: { not: "CANCELLED" } }, select: { id: true } });
  if (activeSurvey) return res.status(400).json({ error: "Survey aktif sudah dijadwalkan. Batalkan survey yang ada dulu untuk menjadwalkan ulang." });
  const validPics = await prisma.user.findMany({ where: { id: { in: surveyorIds }, isActive: true, role: { in: ["SURVEYOR", "MANAGER", "ADMIN"] } }, select: { id: true } });
  if (validPics.length !== surveyorIds.length) return res.status(400).json({ error: "Satu atau lebih surveyor tidak valid" });
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return res.status(400).json({ error: "Tanggal dan jam survey tidak valid" });
  const survey = await prisma.survey.create({ data: { number: code("SRV"), inquiryId: inquiry.id, customerId: inquiry.customerId, picId: surveyorIds[0], scheduledAt: date, location: String(location).trim(), shareLocationUrl: String(shareLocationUrl).trim(), notes: `Dari ${inquiry.number}` } });
  await prisma.surveyPicAssignment.createMany({ data: surveyorIds.map((id) => ({ surveyId: survey.id, picId: id })) });
  await prisma.inquiry.update({ where: { id: inquiry.id }, data: { progress: "Survey Scheduled", status: "IN_PROGRESS" } });
  const full = await prisma.survey.findUnique({ where: { id: survey.id }, include: { customer: true, inquiry: true, pic: { select: { name: true, role: true } }, picAssignments: { include: { pic: { select: { name: true, role: true } } } } } });
  res.status(201).json({ data: [full] });
} catch (error) { next(error); } });

// Reschedule survey yang sudah ada — update jadwal/lokasi/surveyor pada record & nomor yang sama,
// tanpa membatalkan atau membuat survey baru. Hanya untuk survey yang masih Scheduled/Postponed.
router.patch("/surveys/:id/reschedule", async (req: AuthRequest, res, next) => { try {
  const { picIds, scheduledAt, location, shareLocationUrl } = req.body;
  const surveyorIds: string[] = Array.isArray(picIds) ? picIds.map(String).filter(Boolean) : [];
  if (!surveyorIds.length || !scheduledAt || !String(location || "").trim() || !String(shareLocationUrl || "").trim()) return res.status(400).json({ error: "Pilih minimal satu surveyor, tanggal dan jam, alamat lengkap, serta tautan Google Maps wajib diisi" });
  const survey = await prisma.survey.findUnique({ where: { id: req.params.id }, include: { picAssignments: { include: { pic: { select: { name: true } } } } } });
  if (!survey) return res.status(404).json({ error: "Survey tidak ditemukan" });
  if (!["SCHEDULED", "POSTPONED"].includes(survey.status)) return res.status(400).json({ error: "Hanya survey berstatus Scheduled atau Postponed yang bisa dijadwalkan ulang" });
  const validPics = await prisma.user.findMany({ where: { id: { in: surveyorIds }, isActive: true, role: { in: ["SURVEYOR", "MANAGER", "ADMIN"] } }, select: { id: true } });
  if (validPics.length !== surveyorIds.length) return res.status(400).json({ error: "Satu atau lebih surveyor tidak valid" });
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return res.status(400).json({ error: "Tanggal dan jam survey tidak valid" });
  // Simpan jadwal lama ke riwayat sebelum ditimpa
  const prevHistory = Array.isArray(survey.rescheduleHistory) ? (survey.rescheduleHistory as any[]) : [];
  const history = [...prevHistory, {
    scheduledAt: survey.scheduledAt,
    location: survey.location,
    shareLocationUrl: survey.shareLocationUrl,
    picNames: survey.picAssignments.map((a) => a.pic?.name).filter(Boolean),
    rescheduledAt: new Date().toISOString(),
    rescheduledBy: req.user!.name,
  }];
  await prisma.survey.update({ where: { id: survey.id }, data: { status: "SCHEDULED", scheduledAt: date, location: String(location).trim(), shareLocationUrl: String(shareLocationUrl).trim(), picId: surveyorIds[0], rescheduleHistory: history } });
  await prisma.surveyPicAssignment.deleteMany({ where: { surveyId: survey.id } });
  await prisma.surveyPicAssignment.createMany({ data: surveyorIds.map((id) => ({ surveyId: survey.id, picId: id })) });
  await prisma.activityLog.create({ data: { message: `${req.user!.name} menjadwalkan ulang survey ${survey.number} ke ${date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}`, type: "SURVEY", userId: req.user!.id } });
  const full = await prisma.survey.findUnique({ where: { id: survey.id }, include: { customer: true, inquiry: true, pic: { select: { name: true, role: true } }, picAssignments: { include: { pic: { select: { name: true, role: true } } } } } });
  res.json({ data: [full] });
} catch (error) { next(error); } });

const romanMonths = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
async function quotationNumber(date: Date) {
  const y = date.getUTCFullYear(), m = date.getUTCMonth() + 1;
  const start = new Date(Date.UTC(y, m - 1, 1)), end = new Date(Date.UTC(y, m, 1));
  const count = await prisma.quotation.count({ where: { quotationDate: { gte: start, lt: end } } });
  return `FI/QP/${romanMonths[m - 1]}/${y}/${String(count + 1).padStart(2, "0")}`;
}

router.get("/quotations", async (req, res, next) => { try { const where: any = {}; if (req.query.status) where.status = req.query.status; if (req.query.segmentType) where.segmentType = req.query.segmentType; await list(res, prisma.quotation, { where, include: { customer: true, inquiry: { select: { id: true, number: true, companyName: true, customerName: true, address: true, segmentType: true } } }, orderBy: { quotationDate: "desc" } }, req.query); } catch (error) { next(error); } });
router.get("/quotations/:id", async (req, res, next) => { try { const item = await prisma.quotation.findUnique({ where: { id: req.params.id }, include: { customer: true, inquiry: true, owner: { select: { name: true } } } }); if (!item) return res.status(404).json({ error: "Quotation tidak ditemukan" }); return res.json(item); } catch (error) { return next(error); } });
router.post("/quotations", async (req: AuthRequest, res, next) => { try { const { customerId, inquiryId, title, amount, status, validUntil, hasilSurvey, priceData, quotationDate, segmentType } = req.body; if (!customerId || !title) return res.status(400).json({ error: "Customer dan judul wajib diisi" }); const qDate = quotationDate ? new Date(quotationDate) : new Date(); const num = await quotationNumber(qDate); const item = await prisma.quotation.create({ data: { number: num, customerId, inquiryId: inquiryId || null, title: String(title).trim(), amount: Number(amount) || 0, status: status || "DRAFT", validUntil: validUntil ? new Date(validUntil) : null, segmentType: segmentType === "B2C" ? "B2C" : "B2B", hasilSurvey: hasilSurvey || [], priceData: priceData || {}, quotationDate: qDate, ownerId: req.user!.id }, include: { customer: true, inquiry: true } }); res.status(201).json(item); } catch (error) { next(error); } });
router.patch("/quotations/:id", async (req, res, next) => { try { const { title, amount, status, validUntil, notes, hasilSurvey, priceData, quotationDate, number } = req.body; const data: any = {}; if (title !== undefined) data.title = String(title).trim(); if (amount !== undefined) data.amount = Number(amount); if (status !== undefined) data.status = status; if (validUntil !== undefined) data.validUntil = validUntil ? new Date(validUntil) : null; if (notes !== undefined) data.notes = notes ? String(notes).trim() : null; if (hasilSurvey !== undefined) data.hasilSurvey = hasilSurvey; if (priceData !== undefined) data.priceData = priceData; if (quotationDate !== undefined) data.quotationDate = quotationDate ? new Date(quotationDate) : null; if (number !== undefined) data.number = String(number).trim(); if (title !== undefined || amount !== undefined || hasilSurvey !== undefined || priceData !== undefined || quotationDate !== undefined || number !== undefined) { data.approvedAt = null; data.approvedByName = null; data.approvedSignature = null; } res.json(await prisma.quotation.update({ where: { id: req.params.id }, data })); } catch (error) { next(error); } });
router.post("/quotations/:id/approve", requireRole("ADMIN", "MANAGER"), async (req: AuthRequest, res, next) => { try { const signature = typeof req.body?.signature === "string" ? req.body.signature.trim() : ""; if (!signature) return res.status(400).json({ error: "Tanda tangan approval wajib diisi." }); const existing = await prisma.quotation.findUnique({ where: { id: req.params.id }, select: { id: true } }); if (!existing) return res.status(404).json({ error: "Quotation tidak ditemukan" }); const item = await prisma.quotation.update({ where: { id: req.params.id }, data: { approvedByName: req.user!.name, approvedAt: new Date(), approvedSignature: signature }, include: { customer: true, inquiry: true, owner: { select: { name: true } } } }); res.json(item); } catch (error) { next(error); } });
router.post("/quotations/:id/upload", quotationUpload.single("file"), async (req, res, next) => { try { if (!req.file) return res.status(400).json({ error: "File wajib dipilih" }); res.status(201).json({ data: { path: publicUploadPath(req.file.path), fileName: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size } }); } catch (error) { next(error); } });
router.delete("/quotations/:id", async (req, res, next) => { try { const q = await prisma.quotation.findUnique({ where: { id: req.params.id }, select: { id: true } }); if (!q) return res.status(404).json({ error: "Quotation tidak ditemukan" }); await prisma.quotation.delete({ where: { id: req.params.id } }); res.json({ success: true }); } catch (error) { next(error); } });
router.post("/quotations/:id/push-to-order-sheet", async (req: AuthRequest, res, next) => { try {
  const q = await prisma.quotation.findUnique({ where: { id: req.params.id }, include: { customer: true } });
  if (!q) return res.status(404).json({ error: "Quotation tidak ditemukan" });
  const pd = (q.priceData || {}) as any;
  const amount = Number(q.amount);
  const costItems = [{ description: pd.serviceType || q.title, qty: "1", unitPrice: String(amount), total: String(amount) }];
  const customer = q.customer;
  const customerSnap = { name: customer.name || "", picName: customer.picServiceName || customer.picScheduleName || customer.ownerName || customer.name || "", address: customer.treatmentAddress || customer.address || customer.billingAddress || "", phone: customer.phone || customer.picServicePhone || "", email: customer.email || customer.picServiceEmail || "", customerType: customer.customerType || "", serviceArea: customer.serviceArea || "", locationNotes: customer.notes || "" };

  // Create Order Sheet
  const os = await prisma.orderSheet.create({ data: {
    number: code("OS"),
    orderDate: new Date(),
    status: "DRAFT",
    createdByName: req.user!.name,
    customerId: q.customerId,
    customerSnapshot: customerSnap,
    quotationRef: q.number,
    jobTitle: q.title,
    serviceType: pd.serviceType || "",
    workMethod: pd.treatmentMethod || "",
    jobDescription: [pd.visitSchedule, pd.contractDuration, pd.pestCover].filter(Boolean).join(" | ") || "",
    specialInstruction: pd.notes || q.notes || "",
    costItems,
    subtotal: decimalOrNull(amount),
    ppnPercent: decimalOrNull(0),
    ppnAmount: decimalOrNull(0),
    grandTotal: decimalOrNull(amount),
    terms: defaultTerms,
    supportingDocuments: [{ name: "Hasil Survey", status: "Ada" }, { name: "Quotation", status: "Ada" }, { name: "Agreement Customer", status: "Ada" }],
    treatmentLocations: [], materials: [], vendorTechnicians: [],
  }, include: orderSheetInclude() });

  // Create Agreement
  const agrYear = new Date().getFullYear();
  const agrPrefix = `AGR/FMK/${agrYear}/`;
  const lastAgr = await prisma.agreement.findFirst({ where: { number: { startsWith: agrPrefix } }, orderBy: { number: "desc" } });
  const agrSeq = lastAgr ? (parseInt(lastAgr.number.slice(-3)) || 0) + 1 : 1;
  const agrNumber = `${agrPrefix}${String(agrSeq).padStart(3, "0")}`;
  const now = new Date();
  const oneYearLater = new Date(now); oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  const agr = await prisma.agreement.create({ data: {
    number: agrNumber,
    tanggal: now,
    customerId: q.customerId,
    quotationId: q.id,
    jenisLayanan: pd.serviceType || "Pest Control",
    lokasiPekerjaan: customer.treatmentAddress || customer.address || "",
    areaPekerjaan: pd.coverArea || null,
    tanggalMulai: now,
    tanggalBerakhir: oneYearLater,
    durasiKontrak: 12,
    nilaiKontrak: decimalOrNull(amount) ?? 0,
    ppn: decimalOrNull(0),
    grandTotal: decimalOrNull(amount) ?? 0,
    picKlienNama: customer.picServiceName || customer.ownerName || customer.name || null,
    picKlienKontak: customer.picServicePhone || customer.phone || null,
    status: "DRAFT",
  } });

  res.status(201).json({ orderSheet: os, agreement: agr });
} catch (error) { next(error); } });

router.get("/renewals", async (req, res, next) => {
  try {
    const items = await prisma.renewal.findMany({
      include: { customer: true },
      orderBy: { expiryDate: "asc" },
    });
    const agreementIds = items.map(r => r.sourceAgreementId).filter(Boolean) as string[];
    const createdAgreementIds = items.map(r => r.createdAgreementId).filter(Boolean) as string[];
    const createdOsIds = items.map(r => r.createdOrderSheetId).filter(Boolean) as string[];
    const [sourceAgreements, createdAgreements, createdOs] = await Promise.all([
      agreementIds.length ? prisma.agreement.findMany({ where: { id: { in: agreementIds } }, select: { id: true, number: true, tanggalBerakhir: true, jenisLayanan: true, nilaiKontrak: true } }) : [],
      createdAgreementIds.length ? prisma.agreement.findMany({ where: { id: { in: createdAgreementIds } }, select: { id: true, number: true, status: true } }) : [],
      createdOsIds.length ? prisma.orderSheet.findMany({ where: { id: { in: createdOsIds } }, select: { id: true, number: true, status: true } }) : [],
    ]);
    const data = items.map(r => ({
      ...r,
      _sourceAgreement: sourceAgreements.find(a => a.id === r.sourceAgreementId) ?? null,
      _createdAgreement: createdAgreements.find(a => a.id === r.createdAgreementId) ?? null,
      _createdOrderSheet: createdOs.find(o => o.id === r.createdOrderSheetId) ?? null,
    }));
    res.json({ data, total: data.length });
  } catch (error) { next(error); }
});
router.post("/renewals", async (req, res, next) => { try { const item = await prisma.renewal.create({ data: { ...req.body, number: code("RNW"), expiryDate: new Date(req.body.expiryDate), progress: Number(req.body.progress || 0) }, include: { customer: true } }); res.status(201).json(item); } catch (error) { next(error); } });
router.patch("/renewals/:id", async (req, res, next) => { try { const { service, expiryDate, status, progress, notes, notificationStatus, draftAgreementStatus, draftOrderSheetStatus, agreementSignedStatus, finalizeOrderSheetStatus, sentToVendorStatus } = req.body; const data: any = {}; if (service !== undefined) data.service = String(service).trim(); if (expiryDate !== undefined) data.expiryDate = new Date(expiryDate); if (status !== undefined) data.status = status; if (progress !== undefined) data.progress = Number(progress); if (notes !== undefined) data.notes = notes ? String(notes).trim() : null; if (notificationStatus !== undefined) data.notificationStatus = notificationStatus; if (draftAgreementStatus !== undefined) data.draftAgreementStatus = draftAgreementStatus; if (draftOrderSheetStatus !== undefined) data.draftOrderSheetStatus = draftOrderSheetStatus; if (agreementSignedStatus !== undefined) data.agreementSignedStatus = agreementSignedStatus; if (finalizeOrderSheetStatus !== undefined) data.finalizeOrderSheetStatus = finalizeOrderSheetStatus; if (sentToVendorStatus !== undefined) data.sentToVendorStatus = sentToVendorStatus; res.json(await prisma.renewal.update({ where: { id: req.params.id }, data })); } catch (error) { next(error); } });
router.get("/renewals/agreements", async (_req, res, next) => { try { res.json({ data: await prisma.customer.findMany({ where: { agreementNumber: { not: null } }, orderBy: { agreementEnd: "asc" } }) }); } catch (error) { next(error); } });
router.get("/renewals/outstanding", async (_req, res, next) => { try { res.json({ data: await prisma.outstandingInvoice.findMany({ where: { isPaid: false }, include: { customer: true }, orderBy: { dueDate: "asc" } }) }); } catch (error) { next(error); } });
router.get("/renewals/notifications", async (_req, res) => res.json({ data: [] }));
router.get("/renewals/workflow/:step", async (req, res, next) => { try { const field = `${req.params.step}Status`; const validFields = ["notificationStatus", "draftAgreementStatus", "draftOrderSheetStatus", "agreementSignedStatus", "finalizeOrderSheetStatus", "sentToVendorStatus"]; if (!validFields.includes(field)) return res.status(400).json({ error: "Tahap renewal tidak valid" }); res.json({ data: await prisma.renewal.findMany({ where: { [field]: "PENDING" }, include: { customer: true }, orderBy: { expiryDate: "asc" } }) }); } catch (error) { next(error); } });
router.patch("/renewals/:id/workflow", async (req, res, next) => { try { const { step, status } = req.body; const field = `${step}Status`; if (!["notificationStatus", "draftAgreementStatus", "draftOrderSheetStatus", "agreementSignedStatus", "finalizeOrderSheetStatus", "sentToVendorStatus"].includes(field) || !["PENDING", "COMPLETED"].includes(status)) return res.status(400).json({ error: "Tahap atau status tidak valid" }); res.json(await prisma.renewal.update({ where: { id: req.params.id }, data: { [field]: status } })); } catch (error) { next(error); } });

// ── Renewal dari Agreement aktif ──────────────────────────────────────────────
router.post("/renewals/from-agreement/:agreementId", async (req: AuthRequest, res, next) => {
  try {
    const ag = await prisma.agreement.findUnique({
      where: { id: req.params.agreementId },
      include: { customer: true },
    });
    if (!ag) return res.status(404).json({ error: "Agreement tidak ditemukan" });
    if (ag.status !== "ACTIVE") return res.status(400).json({ error: "Agreement harus berstatus ACTIVE" });

    const existing = await prisma.renewal.findFirst({ where: { sourceAgreementId: ag.id } });
    if (existing) return res.status(409).json({ error: "Renewal untuk agreement ini sudah ada", renewalId: existing.id });

    const thresholdDays = Number(req.body?.thresholdDays || 90);
    const renewal = await prisma.renewal.create({
      data: {
        number: code("RNW"),
        customerId: ag.customerId,
        service: ag.jenisLayanan,
        expiryDate: ag.tanggalBerakhir,
        status: "UPCOMING",
        sourceAgreementId: ag.id,
        thresholdDays,
        notes: req.body?.notes ? String(req.body.notes) : null,
      },
      include: { customer: true },
    });
    return res.status(201).json(renewal);
  } catch (error) { return next(error); }
});

// ── Approve renewal → buat Agreement + OrderSheet baru ────────────────────────
router.post("/renewals/:id/approve", async (req: AuthRequest, res, next) => {
  try {
    const renewal = await prisma.renewal.findUnique({ where: { id: req.params.id } });
    if (!renewal) return res.status(404).json({ error: "Renewal tidak ditemukan" });
    if (renewal.status === "RENEWED") return res.status(400).json({ error: "Renewal sudah disetujui sebelumnya" });

    const sourceAg = renewal.sourceAgreementId
      ? await prisma.agreement.findUnique({ where: { id: renewal.sourceAgreementId }, include: { customer: true } })
      : null;
    const customer = sourceAg?.customer ?? await prisma.customer.findUnique({ where: { id: renewal.customerId } });
    if (!customer) return res.status(404).json({ error: "Customer tidak ditemukan" });

    const mulai = sourceAg?.tanggalBerakhir ?? new Date();
    const durasi = sourceAg?.durasiKontrak ?? 12;
    const berakhir = new Date(mulai);
    berakhir.setMonth(berakhir.getMonth() + durasi);

    const [newAg, newOs] = await prisma.$transaction(async tx => {
      const ag = await tx.agreement.create({
        data: {
          number: code("AGR"),
          customerId: customer.id,
          jenisLayanan: sourceAg?.jenisLayanan ?? renewal.service,
          lokasiPekerjaan: sourceAg?.lokasiPekerjaan ?? "",
          tanggalMulai: mulai,
          tanggalBerakhir: berakhir,
          durasiKontrak: durasi,
          nilaiKontrak: sourceAg?.nilaiKontrak ?? 0,
          ppn: sourceAg?.ppn ?? undefined,
          metodePembayaran: sourceAg?.metodePembayaran ?? undefined,
          picFumakillaNama: sourceAg?.picFumakillaNama ?? undefined,
          picKlienNama: sourceAg?.picKlienNama ?? customer.picServiceName ?? undefined,
          picKlienKontak: sourceAg?.picKlienKontak ?? customer.picServicePhone ?? undefined,
          notes: `Renewal dari ${sourceAg?.number ?? renewal.number}`,
          isRenewal: true,
          renewalSourceId: renewal.id,
          status: "DRAFT",
        },
      });
      const os = await tx.orderSheet.create({
        data: {
          number: code("OS"),
          customerId: customer.id,
          jobTitle: `Renewal ${sourceAg?.jenisLayanan ?? renewal.service} — ${customer.company || customer.name}`,
          agreementRef: ag.number,
          customerSnapshot: { name: customer.name, company: customer.company, phone: customer.phone, address: customer.address },
          isRenewal: true,
          renewalSourceId: renewal.id,
          status: "DRAFT",
        },
      });
      await tx.renewal.update({
        where: { id: renewal.id },
        data: {
          status: "RENEWED",
          createdAgreementId: ag.id,
          createdOrderSheetId: os.id,
          approvedByName: req.user?.name ?? "System",
          approvedAt: new Date(),
          draftAgreementStatus: "COMPLETED",
          draftOrderSheetStatus: "COMPLETED",
        },
      });
      return [ag, os];
    });

    return res.json({ agreement: newAg, orderSheet: newOs });
  } catch (error) { return next(error); }
});

// ── Reject renewal ────────────────────────────────────────────────────────────
router.post("/renewals/:id/reject", async (req: AuthRequest, res, next) => {
  try {
    const renewal = await prisma.renewal.findUnique({ where: { id: req.params.id } });
    if (!renewal) return res.status(404).json({ error: "Renewal tidak ditemukan" });
    const updated = await prisma.renewal.update({
      where: { id: renewal.id },
      data: { status: "EXPIRED", notes: req.body?.reason ? String(req.body.reason) : renewal.notes },
    });
    return res.json(updated);
  } catch (error) { return next(error); }
});

router.get("/service-contracts", async (_req, res, next) => { try { res.json({ data: await prisma.serviceContract.findMany({ include: { customer: true }, orderBy: { endDate: "asc" } }) }); } catch (error) { next(error); } });
router.post("/service-contracts", async (req, res, next) => { try { const { customerId, service, startDate, endDate } = req.body; if (!customerId || !service || !startDate || !endDate) return res.status(400).json({ error: "Customer, layanan, tanggal mulai, dan tanggal berakhir wajib diisi" }); const item = await prisma.serviceContract.create({ data: { customerId, service, startDate: new Date(startDate), endDate: new Date(endDate), number: code("SC") }, include: { customer: true } }); const monthlyReport = await ensurePendingMonthlyReportForCustomer(customerId); res.status(201).json({ ...item, monthlyReport }); } catch (error) { next(error); } });
router.get("/service-contracts/monthly-reports", async (_req, res, next) => { try { res.json({ data: await prisma.monthlyReport.findMany({ include: { contract: { include: { customer: true } } }, orderBy: { reportDate: "desc" } }) }); } catch (error) { next(error); } });
router.post("/service-contracts/monthly-reports", async (req, res, next) => { try { const item = await prisma.monthlyReport.create({ data: { contractId: req.body.contractId, reportDate: new Date(req.body.reportDate), notes: req.body.notes || null } }); res.status(201).json(item); } catch (error) { next(error); } });
router.patch("/service-contracts/monthly-reports/:id", async (req, res, next) => { try { res.json(await prisma.monthlyReport.update({ where: { id: req.params.id }, data: { status: req.body.status, notes: req.body.notes } })); } catch (error) { next(error); } });
router.get("/service-contracts/qc-visits", async (_req, res, next) => { try { res.json({ data: await prisma.qcVisit.findMany({ include: { contract: { include: { customer: true } } }, orderBy: { scheduledAt: "asc" } }) }); } catch (error) { next(error); } });
router.post("/service-contracts/qc-visits", async (req, res, next) => { try { res.status(201).json(await prisma.qcVisit.create({ data: { contractId: req.body.contractId, scheduledAt: new Date(req.body.scheduledAt), notes: req.body.notes || null } })); } catch (error) { next(error); } });
router.patch("/service-contracts/qc-visits/:id", async (req, res, next) => { try { res.json(await prisma.qcVisit.update({ where: { id: req.params.id }, data: { status: req.body.status, notes: req.body.notes } })); } catch (error) { next(error); } });
router.get("/service-contracts/vendor-treatments", async (_req, res, next) => { try { res.json({ data: await prisma.vendorTreatment.findMany({ include: { contract: { include: { customer: true } } }, orderBy: { scheduledAt: "asc" } }) }); } catch (error) { next(error); } });
router.post("/service-contracts/vendor-treatments", async (req, res, next) => { try { res.status(201).json(await prisma.vendorTreatment.create({ data: { contractId: req.body.contractId, vendorName: req.body.vendorName, scheduledAt: new Date(req.body.scheduledAt), notes: req.body.notes || null } })); } catch (error) { next(error); } });
router.patch("/service-contracts/vendor-treatments/:id", async (req, res, next) => { try { res.json(await prisma.vendorTreatment.update({ where: { id: req.params.id }, data: { status: req.body.status, notes: req.body.notes } })); } catch (error) { next(error); } });

router.get("/vendors", async (req, res, next) => { try {
  const search = String(req.query.search || "").trim();
  const where: any = {
    ...(req.query.status ? { status: String(req.query.status) } : {}),
    ...(req.query.vendorType ? { vendorType: String(req.query.vendorType) } : {}),
    ...(search ? { OR: [
      { code: { contains: search, mode: "insensitive" as const } },
      { name: { contains: search, mode: "insensitive" as const } },
      { picName: { contains: search, mode: "insensitive" as const } },
      { coverageArea: { contains: search, mode: "insensitive" as const } },
    ] } : {}),
  };
  await list(res, prisma.vendor, { where, orderBy: { createdAt: "desc" } }, req.query);
} catch (error) { next(error); } });
router.post("/vendors", async (req: AuthRequest, res, next) => { try {
  const body = req.body;
  if (!String(body.name || "").trim()) return res.status(400).json({ error: "Nama vendor wajib diisi" });
  const item = await prisma.vendor.create({ data: {
    code: body.code ? String(body.code).trim() : code("VND"),
    name: String(body.name).trim(),
    vendorType: String(body.vendorType || "Pest Control").trim(),
    serviceCategories: parseStringArray(body.serviceCategories),
    picName: body.picName ? String(body.picName).trim() : null,
    phone: body.phone ? String(body.phone).trim() : null,
    email: body.email ? String(body.email).trim() : null,
    address: body.address ? String(body.address).trim() : null,
    coverageArea: body.coverageArea ? String(body.coverageArea).trim() : null,
    npwpNumber: body.npwpNumber ? String(body.npwpNumber).trim() : null,
    bankName: body.bankName ? String(body.bankName).trim() : null,
    bankAccountName: body.bankAccountName ? String(body.bankAccountName).trim() : null,
    bankAccountNo: body.bankAccountNo ? String(body.bankAccountNo).trim() : null,
    rating: body.rating ? Number(body.rating) : null,
    status: ["ACTIVE", "INACTIVE", "BLACKLISTED"].includes(String(body.status)) ? String(body.status) as any : "ACTIVE",
    notes: body.notes ? String(body.notes).trim() : null,
  } });
  await prisma.activityLog.create({ data: { message: `${req.user!.name} membuat vendor ${item.name}`, type: "VENDOR", userId: req.user!.id } });
  res.status(201).json(item);
} catch (error) { next(error); } });
router.patch("/vendors/:id", async (req: AuthRequest, res, next) => { try {
  const body = req.body;
  const data: any = {};
  ["code", "name", "vendorType", "picName", "phone", "email", "address", "coverageArea", "npwpNumber", "bankName", "bankAccountName", "bankAccountNo", "notes"].forEach((field) => {
    if (body[field] !== undefined) data[field] = body[field] ? String(body[field]).trim() : null;
  });
  if (body.serviceCategories !== undefined) data.serviceCategories = parseStringArray(body.serviceCategories);
  if (body.rating !== undefined) data.rating = body.rating ? Number(body.rating) : null;
  if (body.status !== undefined && ["ACTIVE", "INACTIVE", "BLACKLISTED"].includes(String(body.status))) data.status = String(body.status);
  const item = await prisma.vendor.update({ where: { id: req.params.id }, data });
  await prisma.activityLog.create({ data: { message: `${req.user!.name} mengubah vendor ${item.name}`, type: "VENDOR", userId: req.user!.id } });
  res.json(item);
} catch (error) { next(error); } });
router.delete("/vendors/:id", requireRole("ADMIN"), async (req: AuthRequest, res, next) => { try {
  const item = await prisma.vendor.findUnique({ where: { id: req.params.id }, select: { id: true, name: true } });
  if (!item) return res.status(404).json({ error: "Vendor tidak ditemukan" });
  await prisma.vendor.delete({ where: { id: item.id } });
  await prisma.activityLog.create({ data: { message: `${req.user!.name} menghapus vendor ${item.name}`, type: "VENDOR", userId: req.user!.id } });
  res.status(204).end();
} catch (error) { next(error); } });

router.get("/order-sheets", async (req, res, next) => { try {
  const search = String(req.query.search || "").trim();
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  if (to && !Number.isNaN(to.getTime())) to.setHours(23, 59, 59, 999);
  const where: any = {
    ...(req.query.status ? { status: String(req.query.status) } : {}),
    ...(req.query.customerId ? { customerId: String(req.query.customerId) } : {}),
    ...(req.query.vendorId ? { vendorId: String(req.query.vendorId) } : {}),
    ...(from || to ? { orderDate: { ...(from && !Number.isNaN(from.getTime()) ? { gte: from } : {}), ...(to && !Number.isNaN(to.getTime()) ? { lte: to } : {}) } } : {}),
    ...(search ? { OR: [
      { number: { contains: search, mode: "insensitive" as const } },
      { jobTitle: { contains: search, mode: "insensitive" as const } },
      { picInternal: { contains: search, mode: "insensitive" as const } },
      { customer: { name: { contains: search, mode: "insensitive" as const } } },
      { vendor: { name: { contains: search, mode: "insensitive" as const } } },
    ] } : {}),
  };
  await list(res, prisma.orderSheet, { where, include: orderSheetInclude(), orderBy: { orderDate: "desc" } }, req.query);
} catch (error) { next(error); } });
router.get("/order-sheets/:id", async (req, res, next) => { try {
  const item = await prisma.orderSheet.findUnique({ where: { id: req.params.id }, include: orderSheetInclude() });
  if (!item) return res.status(404).json({ error: "Order sheet tidak ditemukan" });
  res.json(item);
} catch (error) { next(error); } });
router.post("/order-sheets", async (req: AuthRequest, res, next) => { try {
  const body = req.body;
  if (!body.customerId || !String(body.jobTitle || "").trim()) return res.status(400).json({ error: "Customer dan jenis pekerjaan wajib diisi" });
  const customer = await prisma.customer.findUnique({ where: { id: String(body.customerId) } });
  if (!customer) return res.status(400).json({ error: "Customer tidak ditemukan" });
  if (body.vendorId) {
    const vendor = await prisma.vendor.findUnique({ where: { id: String(body.vendorId) }, select: { id: true } });
    if (!vendor) return res.status(400).json({ error: "Vendor tidak ditemukan" });
  }
  const subtotal = decimalOrNull(body.subtotal);
  const ppnPercent = decimalOrNull(body.ppnPercent);
  const ppnAmount = decimalOrNull(body.ppnAmount);
  const grandTotal = decimalOrNull(body.grandTotal);
  const item = await prisma.orderSheet.create({ data: {
    number: body.number ? String(body.number).trim() : code("OS"),
    orderDate: body.orderDate ? new Date(String(body.orderDate)) : new Date(),
    status: ["DRAFT", "FINAL", "SENT", "COMPLETED", "CANCELLED"].includes(String(body.status)) ? String(body.status) as any : "DRAFT",
    createdByName: body.createdByName ? String(body.createdByName).trim() : req.user!.name,
    picInternal: body.picInternal ? String(body.picInternal).trim() : null,
    agreementRef: body.agreementRef ? String(body.agreementRef).trim() : null,
    quotationRef: body.quotationRef ? String(body.quotationRef).trim() : null,
    customerId: customer.id,
    vendorId: body.vendorId ? String(body.vendorId) : null,
    customerSnapshot: customerSnapshot(customer),
    jobTitle: String(body.jobTitle).trim(),
    serviceType: body.serviceType ? String(body.serviceType).trim() : null,
    workMethod: body.workMethod ? String(body.workMethod).trim() : null,
    priority: body.priority ? String(body.priority).trim() : null,
    workDate: body.workDate ? new Date(String(body.workDate)) : null,
    workTime: body.workTime ? String(body.workTime).trim() : null,
    estimatedDuration: body.estimatedDuration ? String(body.estimatedDuration).trim() : null,
    technicianCount: body.technicianCount ? String(body.technicianCount).trim() : null,
    specialInstruction: body.specialInstruction ? String(body.specialInstruction).trim() : null,
    jobDescription: body.jobDescription ? String(body.jobDescription).trim() : null,
    treatmentLocations: parseJsonField(body.treatmentLocations, []),
    materials: parseJsonField(body.materials, []),
    vendorTechnicians: parseJsonField(body.vendorTechnicians, []),
    costItems: parseJsonField(body.costItems, []),
    subtotal,
    ppnPercent,
    ppnAmount,
    grandTotal,
    terms: parseStringArray(body.terms),
    supportingDocuments: parseJsonField(body.supportingDocuments, []),
    preparedByName: body.preparedByName ? String(body.preparedByName).trim() : null,
    approvedByName: body.approvedByName ? String(body.approvedByName).trim() : null,
    receivedByName: body.receivedByName ? String(body.receivedByName).trim() : null,
    preparedAt: body.preparedAt ? new Date(String(body.preparedAt)) : null,
    approvedAt: body.approvedAt ? new Date(String(body.approvedAt)) : null,
    receivedAt: body.receivedAt ? new Date(String(body.receivedAt)) : null,
    notes: body.notes ? String(body.notes).trim() : null,
  }, include: orderSheetInclude() });
  await prisma.activityLog.create({ data: { message: `${req.user!.name} membuat order sheet ${item.number}`, type: "ORDER_SHEET", userId: req.user!.id } });
  res.status(201).json(item);
} catch (error) { next(error); } });
router.patch("/order-sheets/:id", async (req: AuthRequest, res, next) => { try {
  const current = await prisma.orderSheet.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ error: "Order sheet tidak ditemukan" });
  const body = req.body;
  const data: any = {};
  const stringFields = ["number", "createdByName", "picInternal", "agreementRef", "quotationRef", "jobTitle", "serviceType", "workMethod", "priority", "workTime", "estimatedDuration", "technicianCount", "specialInstruction", "jobDescription", "preparedByName", "approvedByName", "receivedByName", "notes"];
  stringFields.forEach((field) => { if (body[field] !== undefined) data[field] = body[field] ? String(body[field]).trim() : null; });
  if (body.customerId !== undefined && body.customerId !== current.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: String(body.customerId) } });
    if (!customer) return res.status(400).json({ error: "Customer tidak ditemukan" });
    data.customerId = customer.id;
    data.customerSnapshot = customerSnapshot(customer);
  }
  if (body.vendorId !== undefined) data.vendorId = body.vendorId ? String(body.vendorId) : null;
  if (body.orderDate !== undefined) data.orderDate = new Date(String(body.orderDate));
  if (body.workDate !== undefined) data.workDate = body.workDate ? new Date(String(body.workDate)) : null;
  if (body.preparedAt !== undefined) data.preparedAt = body.preparedAt ? new Date(String(body.preparedAt)) : null;
  if (body.approvedAt !== undefined) data.approvedAt = body.approvedAt ? new Date(String(body.approvedAt)) : null;
  if (body.receivedAt !== undefined) data.receivedAt = body.receivedAt ? new Date(String(body.receivedAt)) : null;
  if (body.status !== undefined && ["DRAFT", "FINAL", "SENT", "COMPLETED", "CANCELLED"].includes(String(body.status))) data.status = String(body.status);
  ["treatmentLocations", "materials", "vendorTechnicians", "costItems", "supportingDocuments"].forEach((field) => { if (body[field] !== undefined) data[field] = parseJsonField(body[field], []); });
  if (body.terms !== undefined) data.terms = parseStringArray(body.terms);
  ["subtotal", "ppnPercent", "ppnAmount", "grandTotal"].forEach((field) => { if (body[field] !== undefined) data[field] = decimalOrNull(body[field]); });
  const item = await prisma.orderSheet.update({ where: { id: current.id }, data, include: orderSheetInclude() });
  await prisma.activityLog.create({ data: { message: `${req.user!.name} mengubah order sheet ${item.number}`, type: "ORDER_SHEET", userId: req.user!.id } });
  res.json(item);
} catch (error) { next(error); } });
router.delete("/order-sheets/:id", requireRole("ADMIN"), async (req: AuthRequest, res, next) => { try {
  const item = await prisma.orderSheet.findUnique({ where: { id: req.params.id }, select: { id: true, number: true } });
  if (!item) return res.status(404).json({ error: "Order sheet tidak ditemukan" });
  await prisma.$transaction(async (tx) => {
    await tx.complaint.updateMany({ where: { orderSheetId: item.id }, data: { orderSheetId: null } });
    await tx.orderSheet.delete({ where: { id: item.id } });
    await tx.activityLog.create({ data: { message: `${req.user!.name} menghapus order sheet ${item.number}`, type: "ORDER_SHEET", userId: req.user!.id } });
  });
  res.status(204).end();
} catch (error) { next(error); } });

router.get("/complaints", async (req, res, next) => { try {
  const search = String(req.query.search || "").trim();
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  if (to && !Number.isNaN(to.getTime())) to.setHours(23, 59, 59, 999);
  const where: any = {
    ...(req.query.status ? { status: String(req.query.status) } : {}),
    ...(req.query.source ? { source: String(req.query.source) } : {}),
    ...(req.query.priority ? { priority: String(req.query.priority) } : {}),
    ...(req.query.segmentType ? { segmentType: String(req.query.segmentType) } : {}),
    ...(req.query.customerId ? { customerId: String(req.query.customerId) } : {}),
    ...(req.query.vendorId ? { vendorId: String(req.query.vendorId) } : {}),
    ...(req.query.complaintType ? { complaintType: String(req.query.complaintType) } : {}),
    ...(from || to ? { complaintDate: { ...(from && !Number.isNaN(from.getTime()) ? { gte: from } : {}), ...(to && !Number.isNaN(to.getTime()) ? { lte: to } : {}) } } : {}),
    ...(search ? { OR: [
      { number: { contains: search, mode: "insensitive" as const } },
      { subject: { contains: search, mode: "insensitive" as const } },
      { description: { contains: search, mode: "insensitive" as const } },
      { reportedByName: { contains: search, mode: "insensitive" as const } },
      { picInternal: { contains: search, mode: "insensitive" as const } },
      { customer: { name: { contains: search, mode: "insensitive" as const } } },
      { vendor: { name: { contains: search, mode: "insensitive" as const } } },
    ] } : {}),
  };
  await list(res, prisma.complaint, { where, include: complaintInclude(), orderBy: [{ complaintDate: "desc" }, { createdAt: "desc" }] }, req.query);
} catch (error) { next(error); } });

router.get("/complaints/:id", async (req, res, next) => { try {
  const item = await prisma.complaint.findUnique({ where: { id: req.params.id }, include: complaintInclude() });
  if (!item) return res.status(404).json({ error: "Complaint tidak ditemukan" });
  res.json(item);
} catch (error) { next(error); } });

router.post("/complaints", async (req: AuthRequest, res, next) => { try {
  const body = req.body;
  if (!body.customerId || !String(body.subject || "").trim() || !String(body.description || "").trim() || !String(body.complaintType || "").trim()) return res.status(400).json({ error: "Customer, bentuk complaint, subject, dan deskripsi wajib diisi" });
  const customer = await prisma.customer.findUnique({ where: { id: String(body.customerId) } });
  if (!customer) return res.status(400).json({ error: "Customer tidak ditemukan" });
  if (body.vendorId) {
    const vendor = await prisma.vendor.findUnique({ where: { id: String(body.vendorId), }, select: { id: true } });
    if (!vendor) return res.status(400).json({ error: "Vendor tidak ditemukan" });
  }
  if (body.orderSheetId) {
    const orderSheet = await prisma.orderSheet.findUnique({ where: { id: String(body.orderSheetId) }, select: { id: true } });
    if (!orderSheet) return res.status(400).json({ error: "Order sheet tidak ditemukan" });
  }
  const source = ["CUSTOMER", "INTERNAL", "VENDOR"].includes(String(body.source)) ? String(body.source) as any : "CUSTOMER";
  const status = ["OPEN", "IN_PROGRESS", "WAITING_VENDOR", "WAITING_CUSTOMER", "RESOLVED", "CLOSED", "CANCELLED"].includes(String(body.status)) ? String(body.status) as any : "OPEN";
  const priority = ["LOW", "NORMAL", "HIGH", "URGENT"].includes(String(body.priority)) ? String(body.priority) as any : "NORMAL";
  const item = await prisma.complaint.create({ data: {
    number: body.number ? String(body.number).trim() : code("CMP"),
    complaintDate: body.complaintDate ? new Date(String(body.complaintDate)) : new Date(),
    customerId: customer.id,
    vendorId: body.vendorId ? String(body.vendorId) : null,
    orderSheetId: body.orderSheetId ? String(body.orderSheetId) : null,
    segmentType: customerSegment(customer),
    source,
    internalTeam: body.internalTeam ? String(body.internalTeam).trim() : null,
    complaintType: String(body.complaintType).trim(),
    priority,
    status,
    subject: String(body.subject).trim(),
    description: String(body.description).trim(),
    location: body.location ? String(body.location).trim() : null,
    reportedByName: body.reportedByName ? String(body.reportedByName).trim() : null,
    reportedByPhone: body.reportedByPhone ? String(body.reportedByPhone).trim() : null,
    picInternal: body.picInternal ? String(body.picInternal).trim() : req.user!.name,
    dueDate: body.dueDate ? new Date(String(body.dueDate)) : null,
    rootCause: body.rootCause ? String(body.rootCause).trim() : null,
    correctiveAction: body.correctiveAction ? String(body.correctiveAction).trim() : null,
    resolutionNotes: body.resolutionNotes ? String(body.resolutionNotes).trim() : null,
    resolvedAt: status === "RESOLVED" ? new Date() : null,
    closedAt: status === "CLOSED" ? new Date() : null,
    followUps: Array.isArray(body.followUps) ? body.followUps : [],
  }, include: complaintInclude() });
  await prisma.activityLog.create({ data: { message: `${req.user!.name} membuat complaint ${item.number}`, type: "COMPLAINT", userId: req.user!.id } });
  res.status(201).json(item);
} catch (error) { next(error); } });

router.patch("/complaints/:id", async (req: AuthRequest, res, next) => { try {
  const current = await prisma.complaint.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ error: "Complaint tidak ditemukan" });
  const body = req.body;
  const data: any = {};
  const stringFields = ["number", "internalTeam", "complaintType", "subject", "description", "location", "reportedByName", "reportedByPhone", "picInternal", "rootCause", "correctiveAction", "resolutionNotes"];
  stringFields.forEach((field) => { if (body[field] !== undefined) data[field] = body[field] ? String(body[field]).trim() : null; });
  if (body.customerId !== undefined && body.customerId !== current.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: String(body.customerId) } });
    if (!customer) return res.status(400).json({ error: "Customer tidak ditemukan" });
    data.customerId = customer.id;
    data.segmentType = customerSegment(customer);
  }
  if (body.vendorId !== undefined) data.vendorId = body.vendorId ? String(body.vendorId) : null;
  if (body.orderSheetId !== undefined) data.orderSheetId = body.orderSheetId ? String(body.orderSheetId) : null;
  if (body.complaintDate !== undefined) data.complaintDate = new Date(String(body.complaintDate));
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(String(body.dueDate)) : null;
  if (body.source !== undefined && ["CUSTOMER", "INTERNAL", "VENDOR"].includes(String(body.source))) data.source = String(body.source);
  if (body.priority !== undefined && ["LOW", "NORMAL", "HIGH", "URGENT"].includes(String(body.priority))) data.priority = String(body.priority);
  if (body.status !== undefined && ["OPEN", "IN_PROGRESS", "WAITING_VENDOR", "WAITING_CUSTOMER", "RESOLVED", "CLOSED", "CANCELLED"].includes(String(body.status))) {
    data.status = String(body.status);
    if (data.status === "RESOLVED" && current.status !== "RESOLVED") data.resolvedAt = new Date();
    if (data.status === "CLOSED" && current.status !== "CLOSED") data.closedAt = new Date();
  }
  if (body.followUps !== undefined) data.followUps = Array.isArray(body.followUps) ? body.followUps : [];
  const item = await prisma.complaint.update({ where: { id: current.id }, data, include: complaintInclude() });
  await prisma.activityLog.create({ data: { message: `${req.user!.name} mengubah complaint ${item.number}`, type: "COMPLAINT", userId: req.user!.id } });
  res.json(item);
} catch (error) { next(error); } });

router.post("/complaints/:id/follow-ups", async (req: AuthRequest, res, next) => { try {
  const current = await prisma.complaint.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ error: "Complaint tidak ditemukan" });
  const note = String(req.body.note || "").trim();
  if (!note) return res.status(400).json({ error: "Catatan follow up wajib diisi" });
  const followUps = Array.isArray(current.followUps) ? current.followUps as any[] : [];
  const nextFollowUps = [{ id: `${Date.now()}`, at: new Date().toISOString(), by: req.user!.name, status: req.body.status || current.status, note }, ...followUps];
  const data: any = { followUps: nextFollowUps };
  if (req.body.status && ["OPEN", "IN_PROGRESS", "WAITING_VENDOR", "WAITING_CUSTOMER", "RESOLVED", "CLOSED", "CANCELLED"].includes(String(req.body.status))) {
    data.status = String(req.body.status);
    if (data.status === "RESOLVED" && current.status !== "RESOLVED") data.resolvedAt = new Date();
    if (data.status === "CLOSED" && current.status !== "CLOSED") data.closedAt = new Date();
  }
  const item = await prisma.complaint.update({ where: { id: current.id }, data, include: complaintInclude() });
  await prisma.activityLog.create({ data: { message: `${req.user!.name} follow up complaint ${item.number}`, type: "COMPLAINT", userId: req.user!.id } });
  res.status(201).json(item);
} catch (error) { next(error); } });

router.delete("/complaints/:id", requireRole("ADMIN"), async (req: AuthRequest, res, next) => { try {
  const item = await prisma.complaint.findUnique({ where: { id: req.params.id }, select: { id: true, number: true } });
  if (!item) return res.status(404).json({ error: "Complaint tidak ditemukan" });
  await prisma.complaint.delete({ where: { id: item.id } });
  await prisma.activityLog.create({ data: { message: `${req.user!.name} menghapus complaint ${item.number}`, type: "COMPLAINT", userId: req.user!.id } });
  res.status(204).end();
} catch (error) { next(error); } });

// ─── Admin: Users ────────────────────────────────────────────────────────────
router.get("/admin/users", requirePermission("admin.users"), async (_req, res, next) => {
  try {
    const data = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
        userRoles: { include: { role: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: data.map(u => ({ ...u, assignedRoles: u.userRoles.map(ur => ur.role) })) });
  } catch (error) { next(error); }
});

router.post("/admin/users", requirePermission("admin.users"), async (req, res, next) => {
  try {
    const { name, email, password, roleIds } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Nama, email, password wajib diisi" });
    const hashedPw = await bcrypt.hash(password, 12);
    const item = await prisma.user.create({
      data: {
        name, email: String(email).toLowerCase(), password: hashedPw, role: "SALES",
        userRoles: Array.isArray(roleIds) && roleIds.length > 0
          ? { create: roleIds.map((rid: string) => ({ roleId: rid })) }
          : undefined,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
        userRoles: { include: { role: { select: { id: true, name: true } } } } },
    });
    res.status(201).json({ ...item, assignedRoles: item.userRoles.map(ur => ur.role) });
  } catch (error) { next(error); }
});

router.patch("/admin/users/:id", requirePermission("admin.users"), async (req: AuthRequest, res, next) => {
  try {
    const { name, email, password, isActive, roleIds } = req.body;
    if (req.params.id === req.user!.id && isActive === false)
      return res.status(400).json({ error: "Akun sendiri tidak dapat dinonaktifkan" });
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = String(email).toLowerCase();
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (password) data.password = await bcrypt.hash(password, 12);
    if (Array.isArray(roleIds)) {
      data.userRoles = {
        deleteMany: {},
        create: roleIds.map((rid: string) => ({ roleId: rid })),
      };
    }
    const item = await prisma.user.update({
      where: { id: req.params.id }, data,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
        userRoles: { include: { role: { select: { id: true, name: true } } } } },
    });
    res.json({ ...item, assignedRoles: item.userRoles.map(ur => ur.role) });
  } catch (error) { next(error); }
});

router.delete("/admin/users/:id", requirePermission("admin.users"), async (req: AuthRequest, res, next) => {
  try {
    if (req.params.id === req.user!.id) return res.status(400).json({ error: "Tidak dapat menghapus akun sendiri" });
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) { next(error); }
});

router.post("/admin/users/:id/reset-password", requirePermission("admin.users"), async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { password: await bcrypt.hash("password", 12) } });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

// ─── Admin: AppRoles ─────────────────────────────────────────────────────────
router.get("/admin/roles", requirePermission("admin.roles"), async (_req, res, next) => {
  try {
    const roles = await prisma.appRole.findMany({
      include: { _count: { select: { userRoles: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json({ data: roles.map(r => ({ ...r, userCount: r._count.userRoles })) });
  } catch (error) { next(error); }
});

router.post("/admin/roles", requirePermission("admin.roles"), async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Nama role wajib diisi" });
    const role = await prisma.appRole.create({ data: { name: name.trim(), permissions: [] } });
    res.status(201).json(role);
  } catch (error: any) {
    if (error.code === "P2002") return res.status(400).json({ error: "Nama role sudah digunakan" });
    next(error);
  }
});

router.patch("/admin/roles/:id", requirePermission("admin.roles"), async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Nama role wajib diisi" });
    const role = await prisma.appRole.update({ where: { id: req.params.id }, data: { name: name.trim() } });
    res.json(role);
  } catch (error: any) {
    if (error.code === "P2002") return res.status(400).json({ error: "Nama role sudah digunakan" });
    next(error);
  }
});

router.delete("/admin/roles/:id", requirePermission("admin.roles"), async (req, res, next) => {
  try {
    await prisma.appRole.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) { next(error); }
});

router.put("/admin/roles/:id/permissions", requirePermission("admin.roles"), async (req, res, next) => {
  try {
    if (!Array.isArray(req.body.permissions)) return res.status(400).json({ error: "permissions harus array" });
    const role = await prisma.appRole.update({
      where: { id: req.params.id },
      data: { permissions: req.body.permissions.map(String) },
    });
    res.json(role);
  } catch (error) { next(error); }
});

// ─── Admin: Reminders ─────────────────────────────────────────────────────────
router.get("/admin/reminders", requirePermission("admin.settings"), async (_req, res, next) => {
  try {
    const rows = await prisma.reminderSetting.findMany();
    res.json({ data: rows.map(({ secretEncrypted, ...row }) => ({ ...row, hasSecret: Boolean(secretEncrypted) })) });
  } catch (error) { next(error); }
});

router.put("/admin/reminders/:key", requirePermission("admin.settings"), async (req, res, next) => {
  try {
    const key = req.params.key;
    if (!["fontee", "gmail"].includes(key)) return res.status(400).json({ error: "Provider tidak valid" });
    const { enabled, config, secret } = req.body;
    const item = await prisma.reminderSetting.upsert({
      where: { key },
      create: { key, enabled: Boolean(enabled), config: config || {}, ...(secret ? { secretEncrypted: encryptSecret(String(secret)) } : {}) },
      update: { enabled: Boolean(enabled), config: config || {}, ...(secret ? { secretEncrypted: encryptSecret(String(secret)) } : {}) },
    });
    const { secretEncrypted, ...safe } = item;
    res.json({ ...safe, hasSecret: Boolean(secretEncrypted) });
  } catch (error) { next(error); }
});

router.post("/admin/reminders/fontee/test", requirePermission("admin.settings"), async (req, res, next) => {
  try {
    const { target, message } = req.body;
    if (!target || !message) return res.status(400).json({ error: "target dan message wajib diisi" });
    const setting = await prisma.reminderSetting.findUnique({ where: { key: "fontee" } });
    if (!setting?.enabled || !setting.secretEncrypted) return res.status(400).json({ error: "Fontee belum dikonfigurasi atau dinonaktifkan" });
    const token = decryptSecret(setting.secretEncrypted);
    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST", headers: { Authorization: token, "Content-Type": "application/json" },
      body: JSON.stringify({ target, message }),
    });
    const result = await response.json() as any;
    if (!result.status) return res.status(400).json({ error: result.reason || "Gagal kirim pesan" });
    res.json({ ok: true, message: "Pesan test berhasil dikirim" });
  } catch (error) { next(error); }
});

router.get("/users", async (_req, res, next) => { try { const data = await prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, role: true, email: true }, orderBy: { name: "asc" } }); res.json({ data }); } catch (error) { next(error); } });

router.get("/work-plans", async (req: AuthRequest, res, next) => { try {
  const search = String(req.query.search || "").trim();
  const where: any = {};
  if (!canViewAllWorkPlans(req.user)) where.OR = [{ ownerId: req.user!.id }, { taggedUsers: { some: { userId: req.user!.id } } }];
  if (req.query.ownerId) where.ownerId = String(req.query.ownerId);
  if (req.query.status) where.status = String(req.query.status);
  if (req.query.date) {
    const { start, end } = dayRange(String(req.query.date));
    where.workDate = { gte: start, lt: end };
  } else if (req.query.month || req.query.year || req.query.from || req.query.to) {
    const from = req.query.from ? new Date(String(req.query.from)) : req.query.year ? new Date(Date.UTC(Number(req.query.year), Number(req.query.month || 1) - 1, 1)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : req.query.year ? new Date(Date.UTC(Number(req.query.year), Number(req.query.month || 12), 1)) : undefined;
    where.workDate = { ...(from && !Number.isNaN(from.getTime()) ? { gte: from } : {}), ...(to && !Number.isNaN(to.getTime()) ? { lt: to } : {}) };
  }
  if (req.query.startTime) where.startTime = { gte: String(req.query.startTime) };
  if (req.query.endTime) where.endTime = { lte: String(req.query.endTime) };
  if (search) where.AND = [{ OR: [{ title: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }, { location: { contains: search, mode: "insensitive" } }] }];
  const data = await prisma.workPlan.findMany({ where, include: workPlanInclude(), orderBy: [{ workDate: "asc" }, { startTime: "asc" }] });
  res.json({ data });
} catch (error) { next(error); } });

router.post("/work-plans", async (req: AuthRequest, res, next) => { try {
  const body = req.body;
  const title = String(body.title || "").trim();
  const workDate = body.workDate ? new Date(String(body.workDate)) : null;
  const startTime = String(body.startTime || "").trim();
  const ownerId = body.ownerId && canViewAllWorkPlans(req.user) ? String(body.ownerId) : req.user!.id;
  const taggedUserIds: string[] = Array.from(new Set<string>((Array.isArray(body.taggedUserIds) ? body.taggedUserIds : []).map(String).filter(Boolean).filter((id: string) => id !== ownerId)));
  if (!title || !workDate || Number.isNaN(workDate.getTime()) || !startTime) return res.status(400).json({ error: "Judul, tanggal, dan jam mulai wajib diisi" });
  const owner = await prisma.user.findFirst({ where: { id: ownerId, isActive: true }, select: { id: true, name: true } });
  if (!owner) return res.status(400).json({ error: "Owner work plan tidak valid" });
  const users = taggedUserIds.length ? await prisma.user.findMany({ where: { id: { in: taggedUserIds }, isActive: true }, select: { id: true } }) : [];
  if (users.length !== taggedUserIds.length) return res.status(400).json({ error: "Ada user tag yang tidak valid atau tidak aktif" });
  const item = await prisma.workPlan.create({ data: {
    title,
    description: body.description ? String(body.description).trim() : null,
    workDate,
    startTime,
    endTime: body.endTime ? String(body.endTime).trim() : null,
    location: body.location ? String(body.location).trim() : null,
    ownerId,
    createdById: req.user!.id,
    taggedUsers: { create: taggedUserIds.map((userId) => ({ user: { connect: { id: userId } } })) },
  }, include: workPlanInclude() });
  await addWorkPlanLog(item.id, req.user!.id, "CREATE", `${req.user!.name} membuat work plan ${item.title}`, { taggedUserIds });
  await prisma.activityLog.create({ data: { message: `${req.user!.name} membuat work plan ${item.title}`, type: "WORK_PLAN", userId: req.user!.id } });
  res.status(201).json(item);
} catch (error) { next(error); } });

router.get("/work-plans/logs", requireRole("ADMIN"), async (req, res, next) => { try {
  const where: any = {};
  if (req.query.workPlanId) where.workPlanId = String(req.query.workPlanId);
  if (req.query.action) where.action = String(req.query.action);
  if (req.query.from || req.query.to) where.createdAt = { ...(req.query.from ? { gte: new Date(String(req.query.from)) } : {}), ...(req.query.to ? { lte: new Date(String(req.query.to)) } : {}) };
  const data = await prisma.workPlanAuditLog.findMany({ where, include: { actor: { select: { id: true, name: true, role: true } }, workPlan: { select: { id: true, title: true, workDate: true, startTime: true, owner: { select: { name: true } } } } }, orderBy: { createdAt: "desc" }, take: 200 });
  res.json({ data });
} catch (error) { next(error); } });

router.patch("/work-plans/:id", async (req: AuthRequest, res, next) => { try {
  const current = await prisma.workPlan.findUnique({ where: { id: req.params.id }, include: { taggedUsers: { select: { userId: true } } } });
  if (!current) return res.status(404).json({ error: "Work plan tidak ditemukan" });
  if (current.ownerId !== req.user!.id && !canViewAllWorkPlans(req.user)) return res.status(403).json({ error: "Hanya owner, admin, atau manager yang dapat mengubah work plan" });
  const body = req.body;
  const data: any = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null;
  if (body.workDate !== undefined) data.workDate = new Date(String(body.workDate));
  if (body.startTime !== undefined) data.startTime = String(body.startTime).trim();
  if (body.endTime !== undefined) data.endTime = body.endTime ? String(body.endTime).trim() : null;
  if (body.location !== undefined) data.location = body.location ? String(body.location).trim() : null;
  if (body.status !== undefined && ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(String(body.status))) data.status = String(body.status);
  if (body.ownerId !== undefined && canViewAllWorkPlans(req.user)) data.ownerId = String(body.ownerId);
  const taggedUserIds: string[] | null = body.taggedUserIds !== undefined ? Array.from(new Set<string>((Array.isArray(body.taggedUserIds) ? body.taggedUserIds : []).map(String).filter(Boolean).filter((id: string) => id !== (data.ownerId || current.ownerId)))) : null;
  if (taggedUserIds) {
    const users = taggedUserIds.length ? await prisma.user.findMany({ where: { id: { in: taggedUserIds }, isActive: true }, select: { id: true } }) : [];
    if (users.length !== taggedUserIds.length) return res.status(400).json({ error: "Ada user tag yang tidak valid atau tidak aktif" });
  }
  const item = await prisma.$transaction(async (tx) => {
    if (taggedUserIds) {
      await tx.workPlanTaggedUser.deleteMany({ where: { workPlanId: current.id } });
      if (taggedUserIds.length) await tx.workPlanTaggedUser.createMany({ data: taggedUserIds.map((userId) => ({ workPlanId: current.id, userId })) });
    }
    return tx.workPlan.update({ where: { id: current.id }, data, include: workPlanInclude() as any });
  });
  await addWorkPlanLog(item.id, req.user!.id, "UPDATE", `${req.user!.name} mengubah work plan ${item.title}`, { changedFields: Object.keys(data), taggedUserIds });
  res.json(item);
} catch (error) { next(error); } });

router.delete("/work-plans/:id", async (req: AuthRequest, res, next) => { try {
  const current = await prisma.workPlan.findUnique({ where: { id: req.params.id }, select: { id: true, title: true, ownerId: true } });
  if (!current) return res.status(404).json({ error: "Work plan tidak ditemukan" });
  if (current.ownerId !== req.user!.id && req.user!.role !== "ADMIN") return res.status(403).json({ error: "Hanya owner atau admin yang dapat menghapus work plan" });
  await prisma.workPlan.delete({ where: { id: current.id } });
  await prisma.activityLog.create({ data: { message: `${req.user!.name} menghapus work plan ${current.title}`, type: "WORK_PLAN", userId: req.user!.id } });
  res.status(204).end();
} catch (error) { next(error); } });

router.post("/work-plans/:id/checkpoints", workPlanUpload.single("file"), async (req: AuthRequest, res, next) => { try {
  const type = String(req.body.type || "CHECK_IN");
  if (!["CHECK_IN", "CHECK_OUT"].includes(type)) return res.status(400).json({ error: "Tipe checkpoint tidak valid" });
  const current = await prisma.workPlan.findUnique({ where: { id: req.params.id }, include: { taggedUsers: { select: { userId: true } }, checkpoints: { select: { userId: true, type: true } } } });
  if (!current) return res.status(404).json({ error: "Work plan tidak ditemukan" });
  const involved = current.ownerId === req.user!.id || current.taggedUsers.some((item) => item.userId === req.user!.id);
  if (!involved && !canViewAllWorkPlans(req.user)) return res.status(403).json({ error: "Hanya owner, user yang ditag, admin, atau manager yang dapat checkpoint" });
  const userId = canViewAllWorkPlans(req.user) && req.body.userId ? String(req.body.userId) : req.user!.id;
  const checkInDone = current.checkpoints.some((item) => item.userId === userId && item.type === "CHECK_IN");
  if (type === "CHECK_OUT" && !checkInDone) return res.status(400).json({ error: "Check in wajib dilakukan sebelum check out" });
  const fileData = req.file ? { filePath: publicUploadPath(req.file.path), fileName: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size } : {};
  const latitude = req.body.latitude !== undefined && req.body.latitude !== "" ? Number(req.body.latitude) : null;
  const longitude = req.body.longitude !== undefined && req.body.longitude !== "" ? Number(req.body.longitude) : null;
  const accuracy = req.body.accuracy !== undefined && req.body.accuracy !== "" ? Number(req.body.accuracy) : null;
  const item = await prisma.workPlanCheckpoint.create({ data: {
    workPlanId: current.id,
    userId,
    type: type as any,
    note: req.body.note ? String(req.body.note).trim() : null,
    ...fileData,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
  }, include: { user: { select: { id: true, name: true, role: true } } } });
  const nextStatus = type === "CHECK_IN" ? "IN_PROGRESS" : "COMPLETED";
  await prisma.workPlan.update({ where: { id: current.id }, data: { status: nextStatus as any } });
  await addWorkPlanLog(current.id, req.user!.id, type, `${req.user!.name} melakukan ${type === "CHECK_IN" ? "check in" : "check out"} work plan ${current.title}`, { checkpointId: item.id, userId, hasFile: Boolean(req.file) });
  await prisma.activityLog.create({ data: { message: `${req.user!.name} ${type === "CHECK_IN" ? "check in" : "check out"} work plan ${current.title}`, type: "WORK_PLAN", userId: req.user!.id } });
  res.status(201).json(item);
} catch (error: any) {
  if (error?.code === "P2002") return res.status(400).json({ error: "Checkpoint ini sudah pernah dikirim" });
  next(error);
} });

router.get("/qa-users", async (_req, res, next) => { try { const data = await prisma.user.findMany({ where: { isActive: true, role: "QA" }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }); res.json({ data }); } catch (error) { next(error); } });
router.get("/vendor-options", async (_req, res, next) => { try { const [customerVendors, treatmentVendors] = await Promise.all([prisma.customer.findMany({ where: { vendorName: { not: null } }, select: { vendorName: true }, distinct: ["vendorName"] }), prisma.vendorTreatment.findMany({ select: { vendorName: true }, distinct: ["vendorName"] })]); const names = Array.from(new Set([...vendorOptions, ...customerVendors.map((item) => item.vendorName).filter(Boolean), ...treatmentVendors.map((item) => item.vendorName).filter(Boolean)].map(String))).sort((a, b) => a.localeCompare(b)); res.json({ data: names }); } catch (error) { next(error); } });
router.get("/survey-pics", async (_req, res, next) => { try { const data = await prisma.user.findMany({ where: { isActive: true, role: { in: ["SURVEYOR", "MANAGER", "ADMIN"] } }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }); res.json({ data }); } catch (error) { next(error); } });
router.get("/surveys", async (req, res, next) => { try { const from = req.query.from ? new Date(String(req.query.from)) : undefined; const to = req.query.to ? new Date(String(req.query.to)) : undefined; const data = await prisma.survey.findMany({ where: from || to ? { scheduledAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}, include: { customer: true, inquiry: true, pic: { select: { name: true, role: true } }, picAssignments: { include: { pic: { select: { name: true, role: true } } } }, afterSurvey: true, b2bReport: true }, orderBy: { scheduledAt: "asc" } }); res.json({ data }); } catch (error) { next(error); } });
router.post("/surveys", async (req: AuthRequest, res, next) => { try { const { customerId, picId, scheduledAt, location, shareLocationUrl, notes } = req.body; if (!customerId || !picId || !scheduledAt || !location || !shareLocationUrl) return res.status(400).json({ error: "Customer, PIC, tanggal dan jam, alamat, serta tautan Google Maps wajib diisi" }); const item = await prisma.survey.create({ data: { customerId, number: code("SRV"), scheduledAt: new Date(scheduledAt), picId, location, shareLocationUrl, notes: notes || null }, include: { customer: true, pic: { select: { name: true, role: true } } } }); res.status(201).json(item); } catch (error) { next(error); } });
router.patch("/surveys/:id", async (req, res, next) => { try { const { scheduledAt, location, shareLocationUrl, status, notes, picId } = req.body; const data: any = {}; if (scheduledAt !== undefined) data.scheduledAt = new Date(scheduledAt); if (location !== undefined) data.location = String(location).trim(); if (shareLocationUrl !== undefined) data.shareLocationUrl = shareLocationUrl ? String(shareLocationUrl).trim() : null; if (status !== undefined) data.status = status; if (notes !== undefined) data.notes = notes ? String(notes).trim() : null; if (picId !== undefined) data.picId = String(picId); res.json(await prisma.survey.update({ where: { id: req.params.id }, data })); } catch (error) { next(error); } });
router.post("/surveys/:id/cancel", async (req: AuthRequest, res, next) => { try {
  const survey = await prisma.survey.findUnique({ where: { id: req.params.id }, include: { inquiry: true } });
  if (!survey) return res.status(404).json({ error: "Survey tidak ditemukan" });
  if (!["SCHEDULED", "POSTPONED"].includes(survey.status)) return res.status(400).json({ error: "Hanya survey berstatus Scheduled atau Postponed yang bisa dibatalkan" });
  const reason = req.body.reason ? String(req.body.reason).trim() : null;
  if (!reason) return res.status(400).json({ error: "Alasan pembatalan wajib diisi" });

  const updated = await prisma.survey.update({
    where: { id: survey.id },
    data: { status: "CANCELLED", cancelledReason: reason, cancelledAt: new Date(), cancelledBy: req.user!.name },
    include: { customer: true, inquiry: true, pic: { select: { name: true } }, picAssignments: { include: { pic: { select: { name: true } } } } },
  });

  await prisma.activityLog.create({ data: { message: `${req.user!.name} membatalkan survey ${survey.number}: "${reason}"`, type: "SURVEY", userId: req.user!.id } });

  // Kembalikan progress inquiry ke "Contacted" jika semua survey untuk inquiry ini sudah cancelled
  if (survey.inquiryId) {
    const remaining = await prisma.survey.count({ where: { inquiryId: survey.inquiryId, status: { in: ["SCHEDULED", "POSTPONED"] } } });
    if (remaining === 0) {
      await prisma.inquiry.update({ where: { id: survey.inquiryId }, data: { progress: "Contacted" } });
    }
  }

  return res.json(updated);
} catch (error) { return next(error); } });

router.post("/surveys/:id/b2c", surveyB2cFindingUpload.array("photos", 20), async (req: AuthRequest, res, next) => { try {
  const survey = await prisma.survey.findUnique({ where: { id: req.params.id }, include: { customer: true, inquiry: true } });
  if (!survey) return res.status(404).json({ error: "Survey tidak ditemukan" });
  const segment = survey.inquiry?.segmentType || survey.customer.segmentType;
  if (segment !== "B2C") return res.status(400).json({ error: "Form B2C hanya untuk customer segmentasi B2C" });
  const floors = parseJsonField(req.body.floors, []);
  const issues = parseJsonField(req.body.issues, []);
  const pestFindings = parseJsonField(req.body.pestFindings, []);
  const treatments = parseJsonField(req.body.treatments, []);
  const notes = parseJsonField(req.body.pointNotes, []);
  if (!Array.isArray(floors) || !floors.length) return res.status(400).json({ error: "Minimal deskripsi area lantai 1 wajib diisi" });
  if (!Array.isArray(issues) || !issues.length) return res.status(400).json({ error: "Minimal satu issue hama wajib dipilih" });
  const files = ((req.files || []) as Express.Multer.File[]).map((file, index) => ({ filePath: publicUploadPath(file.path), description: String(req.body[`photoDescription_${index}`] || "").trim() }));
  const mergedFindings = Array.isArray(pestFindings) ? pestFindings.map((finding: any, index: number) => ({ ...finding, ...(files[index] ? { filePath: files[index].filePath, description: files[index].description || finding.description || "" } : {}) })) : files;
  const item = await prisma.survey.update({ where: { id: survey.id }, data: {
    b2cFloorDescriptions: floors,
    b2cIssues: issues,
    b2cPestFindings: mergedFindings,
    b2cUnitName: req.body.unitName ? String(req.body.unitName).trim() : null,
    b2cQuantity: req.body.quantity ? Number(req.body.quantity) : null,
    b2cTreatments: Array.isArray(treatments) ? treatments.map(String).filter(Boolean) : [],
    b2cVisitQty: req.body.visitQty ? Number(req.body.visitQty) : null,
    b2cVisitPerMonth: req.body.visitPerMonth ? Number(req.body.visitPerMonth) : null,
    b2cTotalCost: req.body.totalCost ? Number(req.body.totalCost) : null,
    b2cVendorName: req.body.vendorName ? String(req.body.vendorName).trim() : null,
    b2cExistingPestControl: req.body.existingPestControl ? String(req.body.existingPestControl).trim() : null,
    b2cPointNotes: Array.isArray(notes) ? notes.map(String).filter(Boolean) : [],
  }, include: { customer: true, inquiry: true, pic: { select: { name: true, role: true } }, afterSurvey: true } });
  await prisma.activityLog.create({ data: { message: `${req.user!.name} menyimpan data survey B2C ${item.number}`, type: "SURVEY", userId: req.user!.id } });
  return res.json(item);
} catch (error) { return next(error); } });
router.post("/surveys/:id/attendance", surveyEvidenceUpload.single("photo"), async (req: AuthRequest, res, next) => { try {
  if (!req.file) return res.status(400).json({ error: "Foto live dari kamera wajib diambil" });
  const type = String(req.body.type || "checkin");
  if (!["checkin", "checkout"].includes(type)) return res.status(400).json({ error: "Tipe attendance tidak valid" });
  const survey = await prisma.survey.findUnique({ where: { id: req.params.id }, select: { id: true, number: true, picId: true, evidenceImagePath: true, checkoutImagePath: true } });
  if (!survey) return res.status(404).json({ error: "Survey tidak ditemukan" });
  if (survey.picId !== req.user!.id && !["ADMIN", "MANAGER"].includes(req.user!.role)) return res.status(403).json({ error: "Hanya PIC survey yang dapat mengirim bukti" });
  if (type === "checkin" && survey.evidenceImagePath) return res.status(400).json({ error: "Check in sudah pernah dikirim" });
  if (type === "checkout" && survey.checkoutImagePath) return res.status(400).json({ error: "Check out sudah pernah dikirim" });
  if (type === "checkout" && !survey.evidenceImagePath) return res.status(400).json({ error: "Check in wajib dikirim sebelum check out" });
  const latitude = Number(req.body.latitude), longitude = Number(req.body.longitude), accuracy = Number(req.body.accuracy);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracy)) return res.status(400).json({ error: "Live location tidak valid" });
  const capturedAt = new Date();
  const data = type === "checkin"
    ? { evidenceImagePath: publicUploadPath(req.file.path), evidenceCapturedAt: capturedAt, evidenceLatitude: latitude, evidenceLongitude: longitude, evidenceAccuracy: accuracy }
    : { checkoutImagePath: publicUploadPath(req.file.path), checkoutCapturedAt: capturedAt, checkoutLatitude: latitude, checkoutLongitude: longitude, checkoutAccuracy: accuracy, status: "COMPLETED" as const };
  const item = await prisma.survey.update({ where: { id: survey.id }, data, include: { customer: true, inquiry: true, pic: { select: { name: true, role: true } }, afterSurvey: true } });
  if (type === "checkout") await prisma.afterSurvey.upsert({ where: { surveyId: survey.id }, create: { surveyId: survey.id, status: "PENDING", reportDue: new Date(capturedAt.getTime() + 24 * 60 * 60 * 1000) }, update: { status: "PENDING", reportDue: new Date(capturedAt.getTime() + 24 * 60 * 60 * 1000) } });
  await prisma.activityLog.create({ data: { message: `${req.user!.name} mengirim ${type === "checkin" ? "check in" : "check out"} survey ${survey.number}`, type: "SURVEY", userId: req.user!.id } });
  return res.json(item);
} catch (error) { return next(error); } });

router.get("/after-surveys", async (_req, res, next) => { try { const data = await prisma.afterSurvey.findMany({ include: { survey: { include: { customer: true, pic: { select: { name: true } } } } }, orderBy: { updatedAt: "desc" } }); res.json({ data }); } catch (error) { next(error); } });
router.get("/after-surveys/:id", async (req, res, next) => { try { const item = await prisma.afterSurvey.findUnique({ where: { id: req.params.id }, include: { survey: { include: { customer: true, pic: { select: { id: true, name: true, role: true } }, inquiry: true } } } }); if (!item) return res.status(404).json({ error: "Laporan after survey tidak ditemukan" }); return res.json(item); } catch (error) { return next(error); } });
router.post("/after-surveys/:id/report", async (req: AuthRequest, res, next) => { try { const { fieldFindings, pestFindings, treatmentRecommendations, materials, surveyedAreas, notes } = req.body; if (!Array.isArray(fieldFindings) || !fieldFindings.length || !Array.isArray(pestFindings) || !Array.isArray(treatmentRecommendations) || !treatmentRecommendations.filter(Boolean).length || !Array.isArray(materials) || !materials.filter(Boolean).length || !Array.isArray(surveyedAreas) || !surveyedAreas.length) return res.status(400).json({ error: "Lengkapi temuan lapangan, jenis hama, rekomendasi, alat/material, dan area yang disurvey" }); const item = await prisma.afterSurvey.findUnique({ where: { id: req.params.id }, include: { survey: true } }); if (!item) return res.status(404).json({ error: "Laporan after survey tidak ditemukan" }); if (item.survey.picId !== req.user!.id && !["ADMIN", "MANAGER"].includes(req.user!.role)) return res.status(403).json({ error: "Hanya PIC survey yang dapat mengirim laporan" }); const updated = await prisma.afterSurvey.update({ where: { id: item.id }, data: { fieldFindings, pestFindings, treatmentRecommendations: treatmentRecommendations.map(String).filter(Boolean), materials: materials.map(String).filter(Boolean), surveyedAreas, findings: fieldFindings.map((row: any) => `${row.area || "Area"}: ${row.condition || "-"}`).join("\n"), recommendation: treatmentRecommendations.map(String).filter(Boolean).join("\n"), nextAction: surveyedAreas.map((row: any) => `${row.area || "Area"}: ${row.status || "-"}`).join("\n"), notes: notes ? String(notes).trim() : null, authorizedByName: req.user!.name, submittedAt: new Date(), status: "REVIEW" }, include: { survey: { include: { customer: true, pic: { select: { name: true } } } } } }); return res.json(updated); } catch (error) { return next(error); } });
router.post("/after-surveys/:id/approve", requireRole("ADMIN", "MANAGER"), async (req: AuthRequest, res, next) => { try { const item = await prisma.afterSurvey.update({ where: { id: req.params.id }, data: { status: "DONE", reviewedAt: new Date(), reviewedByName: req.user!.name, qcNotes: req.body.qcNotes ? String(req.body.qcNotes).trim() : null }, include: { survey: { include: { customer: true, pic: { select: { name: true } } } } } }); await prisma.activityLog.create({ data: { message: `${req.user!.name} menyetujui laporan survey ${item.survey.number}`, type: "AFTER_SURVEY", userId: req.user!.id } }); return res.json(item); } catch (error) { return next(error); } });

/* ── Pest Monthly Reports ──────────────────────────────────── */
const pestReportPhotoUpload = createUploader("pest-report", ["image/jpeg", "image/png", "image/webp"], 10);

const inquirySelect = { id: true, number: true, companyName: true, customerName: true, address: true, segmentType: true, status: true };

router.get("/pest-reports", authenticate, async (req, res, next) => { try {
  const { segment, search, inquiryId } = req.query;
  const p = page(req.query.page), l = limit(req.query.limit);
  const where: any = {};
  if (segment) where.segment = String(segment);
  if (inquiryId) where.inquiryId = String(inquiryId);
  if (search) where.inquiry = { OR: [{ companyName: { contains: String(search), mode: "insensitive" } }, { customerName: { contains: String(search), mode: "insensitive" } }] };
  const [data, total] = await Promise.all([
    prisma.pestMonthlyReport.findMany({ where, skip: (p - 1) * l, take: l, include: { inquiry: { select: inquirySelect } }, orderBy: [{ tahun: "desc" }, { bulan: "desc" }, { createdAt: "desc" }] }),
    prisma.pestMonthlyReport.count({ where }),
  ]);
  return res.json({ data, total, page: p, limit: l, totalPages: Math.ceil(total / l) });
} catch (e) { return next(e); } });

router.post("/pest-reports", authenticate, async (req, res, next) => { try {
  const { inquiryId, bulan, tahun, segment } = req.body;
  if (!inquiryId || !bulan || !tahun || !segment) return res.status(400).json({ error: "inquiryId, bulan, tahun, segment wajib diisi" });
  const item = await prisma.pestMonthlyReport.create({ data: { inquiryId, bulan: Number(bulan), tahun: Number(tahun), segment }, include: { inquiry: { select: inquirySelect } } });
  return res.status(201).json(item);
} catch (e) { return next(e); } });

router.get("/pest-reports/:id", authenticate, async (req, res, next) => { try {
  const item = await prisma.pestMonthlyReport.findUnique({ where: { id: req.params.id }, include: { inquiry: { select: { ...inquirySelect, address: true } } } });
  if (!item) return res.status(404).json({ error: "Pest Monthly Report tidak ditemukan" });
  return res.json(item);
} catch (e) { return next(e); } });

router.patch("/pest-reports/:id", authenticate, async (req, res, next) => { try {
  const { pagesData, rekData } = req.body;
  const item = await prisma.pestMonthlyReport.update({ where: { id: req.params.id }, data: { ...(pagesData !== undefined && { pagesData }), ...(rekData !== undefined && { rekData }) }, include: { inquiry: { select: inquirySelect } } });
  return res.json(item);
} catch (e) { return next(e); } });

router.delete("/pest-reports/:id", authenticate, async (req, res, next) => { try {
  await prisma.pestMonthlyReport.delete({ where: { id: req.params.id } });
  return res.json({ ok: true });
} catch (e) { return next(e); } });

router.post("/pest-reports/upload-photo", authenticate, pestReportPhotoUpload.single("photo"), async (req, res, next) => { try {
  if (!req.file) return res.status(400).json({ error: "Tidak ada file yang diunggah" });
  return res.json({ url: publicUploadPath(req.file.path) });
} catch (e) { return next(e); } });

router.get("/pest-reports-inquiries", authenticate, async (req, res, next) => { try {
  const { segment } = req.query;
  const where: any = {};
  if (segment) where.segmentType = String(segment);
  const data = await prisma.inquiry.findMany({ where, select: inquirySelect, orderBy: [{ companyName: "asc" }, { customerName: "asc" }], take: 500 });
  return res.json({ data });
} catch (e) { return next(e); } });

// Simple Monthly Reports
const simpleReportPhotoUpload = createUploader("simple-report", ["image/jpeg", "image/png", "image/webp"], 10);

router.get("/simple-reports", authenticate, async (req, res, next) => { try {
  const { segment, search, inquiryId, page: p, limit: l } = req.query;
  const pg = Math.max(1, Number(p) || 1); const lm = Math.min(50, Math.max(1, Number(l) || 20));
  const where: any = {};
  if (segment) where.segment = String(segment);
  if (inquiryId) where.inquiryId = String(inquiryId);
  if (search) where.inquiry = { OR: [{ companyName: { contains: String(search), mode: "insensitive" } }, { customerName: { contains: String(search), mode: "insensitive" } }] };
  const [data, total] = await Promise.all([
    prisma.simpleMonthlyReport.findMany({ where, include: { inquiry: { select: inquirySelect } }, orderBy: [{ tahun: "desc" }, { bulan: "desc" }], skip: (pg - 1) * lm, take: lm }),
    prisma.simpleMonthlyReport.count({ where }),
  ]);
  return res.json({ data, total, totalPages: Math.ceil(total / lm) });
} catch (e) { return next(e); } });

router.post("/simple-reports", authenticate, async (req, res, next) => { try {
  const { inquiryId, bulan, tahun, segment, reportData } = req.body;
  if (!inquiryId || !bulan || !tahun) return res.status(400).json({ error: "inquiryId, bulan, dan tahun wajib diisi" });
  const item = await prisma.simpleMonthlyReport.create({
    data: { inquiryId, bulan: Number(bulan), tahun: Number(tahun), segment: segment || "B2B", reportData: reportData || {} },
    include: { inquiry: { select: inquirySelect } },
  });
  return res.status(201).json(item);
} catch (e) { return next(e); } });

router.get("/simple-reports/:id", authenticate, async (req, res, next) => { try {
  const item = await prisma.simpleMonthlyReport.findUnique({ where: { id: req.params.id }, include: { inquiry: { select: inquirySelect } } });
  if (!item) return res.status(404).json({ error: "Laporan tidak ditemukan" });
  return res.json(item);
} catch (e) { return next(e); } });

router.patch("/simple-reports/:id", authenticate, async (req, res, next) => { try {
  const { bulan, tahun, segment, reportData } = req.body;
  const data: any = {};
  if (bulan !== undefined) data.bulan = Number(bulan);
  if (tahun !== undefined) data.tahun = Number(tahun);
  if (segment !== undefined) data.segment = segment;
  if (reportData !== undefined) data.reportData = reportData;
  const item = await prisma.simpleMonthlyReport.update({ where: { id: req.params.id }, data, include: { inquiry: { select: inquirySelect } } });
  return res.json(item);
} catch (e) { return next(e); } });

router.delete("/simple-reports/:id", authenticate, async (req, res, next) => { try {
  await prisma.simpleMonthlyReport.delete({ where: { id: req.params.id } });
  return res.json({ ok: true });
} catch (e) { return next(e); } });

router.post("/simple-reports/upload-photo", authenticate, simpleReportPhotoUpload.single("photo"), async (req, res, next) => { try {
  if (!req.file) return res.status(400).json({ error: "File tidak ditemukan" });
  return res.json({ url: `/uploads/simple-report/${req.file.filename}` });
} catch (e) { return next(e); } });

// Agreement Reports
const agreementReportPhotoUpload = createUploader("agreement-report", ["image/jpeg", "image/png", "image/webp"], 10);
const customerSelect = { id: true, name: true, company: true, code: true, address: true, segmentType: true, agreementNumber: true, agreementType: true, agreementStart: true, agreementEnd: true };

router.get("/agreement-reports", authenticate, async (req, res, next) => { try {
  const { search, page: p, limit: l } = req.query;
  const pg = Math.max(1, Number(p) || 1); const lm = Math.min(50, Math.max(1, Number(l) || 20));
  const where: any = search ? { customer: { OR: [{ name: { contains: String(search), mode: "insensitive" } }, { company: { contains: String(search), mode: "insensitive" } }, { code: { contains: String(search), mode: "insensitive" } }] } } : {};
  const [data, total] = await Promise.all([
    prisma.agreementReport.findMany({ where, include: { customer: { select: customerSelect } }, orderBy: { createdAt: "desc" }, skip: (pg - 1) * lm, take: lm }),
    prisma.agreementReport.count({ where })
  ]);
  return res.json({ data, total, totalPages: Math.ceil(total / lm), page: pg });
} catch (e) { return next(e); } });

router.post("/agreement-reports", authenticate, async (req, res, next) => { try {
  const { customerId, bulan, tahun } = req.body;
  if (!customerId || !bulan || !tahun) return res.status(400).json({ error: "customerId, bulan, tahun wajib diisi" });
  const item = await prisma.agreementReport.create({ data: { customerId: String(customerId), bulan: Number(bulan), tahun: Number(tahun) }, include: { customer: { select: customerSelect } } });
  return res.status(201).json(item);
} catch (e) { return next(e); } });

router.get("/agreement-reports/:id", authenticate, async (req, res, next) => { try {
  const item = await prisma.agreementReport.findUnique({ where: { id: req.params.id }, include: { customer: { select: customerSelect } } });
  if (!item) return res.status(404).json({ error: "Tidak ditemukan" });
  return res.json(item);
} catch (e) { return next(e); } });

router.patch("/agreement-reports/:id", authenticate, async (req, res, next) => { try {
  const { pagesData, rekData } = req.body;
  const data: any = {};
  if (pagesData !== undefined) data.pagesData = pagesData;
  if (rekData !== undefined) data.rekData = rekData;
  const item = await prisma.agreementReport.update({ where: { id: req.params.id }, data, include: { customer: { select: customerSelect } } });
  return res.json(item);
} catch (e) { return next(e); } });

router.delete("/agreement-reports/:id", authenticate, async (req, res, next) => { try {
  await prisma.agreementReport.delete({ where: { id: req.params.id } });
  return res.json({ ok: true });
} catch (e) { return next(e); } });

router.post("/agreement-reports/upload-photo", authenticate, agreementReportPhotoUpload.single("photo"), async (req, res, next) => { try {
  if (!req.file) return res.status(400).json({ error: "File tidak ditemukan" });
  return res.json({ url: publicUploadPath(req.file.path) });
} catch (e) { return next(e); } });

router.get("/agreement-reports-customers", authenticate, async (req, res, next) => { try {
  const { search } = req.query;
  const where: any = search ? { OR: [{ name: { contains: String(search), mode: "insensitive" } }, { company: { contains: String(search), mode: "insensitive" } }] } : {};
  const data = await prisma.customer.findMany({ where, select: customerSelect, orderBy: [{ company: "asc" }, { name: "asc" }], take: 500 });
  return res.json({ data });
} catch (e) { return next(e); } });

router.get("/reports/daily", async (_req, res, next) => { try { const reports = await prisma.dailyReport.findMany({ take: 7, orderBy: { reportDate: "desc" }, include: { author: { select: { name: true } } } }); const activities = await prisma.activityLog.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } }); res.json({ reports, activities }); } catch (error) { next(error); } });
router.post("/reports/daily", requireRole("ADMIN", "MANAGER"), async (req: AuthRequest, res, next) => { try { const item = await prisma.dailyReport.upsert({ where: { reportDate: new Date(req.body.reportDate) }, update: req.body, create: { ...req.body, reportDate: new Date(req.body.reportDate), authorId: req.user!.id } }); res.status(201).json(item); } catch (error) { next(error); } });

export default router;
