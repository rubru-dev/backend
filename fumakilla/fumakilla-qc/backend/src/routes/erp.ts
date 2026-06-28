import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../prisma";
import { authenticate, AuthRequest, requireRole } from "../middleware/auth";
import { createUploader, publicUploadPath } from "../lib/upload";
import { encryptSecret } from "../lib/secret";

const router = Router();
const page = (value: unknown) => Math.max(1, Number(value) || 1);
const limit = (value: unknown) => Math.min(100, Math.max(1, Number(value) || 10));
const code = (prefix: string) => `${prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}${Math.floor(Math.random() * 100).toString().padStart(2, "0")}`;
const inquiryNumber = async (date: Date, tx: { inquiry: { count: typeof prisma.inquiry.count } } = prisma) => { const stamp = date.toISOString().slice(0, 10).replaceAll("-", ""); const start = new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`); const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1); const count = await tx.inquiry.count({ where: { inquiryDate: { gte: start, lt: end } } }); return `INQ-${stamp}-${String(count + 1).padStart(3, "0")}`; };
const customerUpload = createUploader("customers", ["application/pdf", "image/jpeg", "image/png", "image/webp", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], 15);
const surveyEvidenceUpload = createUploader("survey-evidence", ["image/jpeg", "image/png", "image/webp"], 10);
const surveyB2cFindingUpload = createUploader("survey-b2c-findings", ["image/jpeg", "image/png", "image/webp"], 10);
const progressOptions = ["New Inquiry", "Non Sales Inquiry", "Pricelist Sent", "Contacted", "Survey Scheduled", "Survey Completed", "Quotation Sent", "Waiting Agreement", "Won/Closing", "Lost/Not Interest"];
const resultOptions = ["On Going", "Won/Closing", "Lost"];
const segmentOptions = ["B2C", "B2B"];
const sourceOptions = ["Whatsapp", "Instagram", "Tiktok", "Referal"];
const serviceTypeOptions = ["PC", "RC", "PCRC", "Termite Control", "Other Control"];
const cityOptions = ["Jakarta", "Bogor", "Depok", "Tangerang", "Bekasi", "Bandung", "Purwakarta", "Semarang", "Surabaya"];
const pestIssueOptions = ["Lalat", "Nyamuk", "Semut", "Kecoa", "Serangga lain", "Tikus", "Rayap", "Burung", "Kelelawar", "Tipe Hama lain"];
const vendorOptions = ["Pestigo", "Istapest", "Pascal", "PCO", "SPC", "Riztra"];

function parseJsonField(value: any, fallback: any) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

async function list(res: any, model: any, options: any, query: any) {
  const take = limit(query.limit), current = page(query.page), skip = (current - 1) * take;
  const [data, total] = await Promise.all([model.findMany({ ...options, take, skip }), model.count({ where: options.where })]);
  return res.json({ data, total, page: current, totalPages: Math.max(1, Math.ceil(total / take)) });
}

router.use(authenticate);

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
router.delete("/customers/:id", requireRole("ADMIN"), async (req: AuthRequest, res, next) => { try { const customer = await prisma.customer.findUnique({ where: { id: req.params.id }, select: { id: true, name: true } }); if (!customer) return res.status(404).json({ error: "Customer tidak ditemukan" }); await prisma.customer.delete({ where: { id: customer.id } }); await prisma.activityLog.create({ data: { message: `${req.user!.name} menghapus customer ${customer.name}`, type: "CUSTOMER", userId: req.user!.id } }); return res.status(204).end(); } catch (error) { return next(error); } });
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

router.get("/quotations", async (req, res, next) => { try { const status = req.query.status as any; await list(res, prisma.quotation, { where: status ? { status } : {}, include: { customer: true }, orderBy: { createdAt: "desc" } }, req.query); } catch (error) { next(error); } });
router.post("/quotations", async (req: AuthRequest, res, next) => { try { const { customerId, inquiryId, title, amount, status, validUntil } = req.body; if (!customerId || !title || amount === undefined) return res.status(400).json({ error: "Customer, judul, dan nilai penawaran wajib diisi" }); const item = await prisma.quotation.create({ data: { number: code("QUO"), customerId, inquiryId: inquiryId || null, title: String(title).trim(), amount: Number(amount), status: status || "DRAFT", validUntil: validUntil ? new Date(validUntil) : null, ownerId: req.user!.id }, include: { customer: true } }); res.status(201).json(item); } catch (error) { next(error); } });
router.patch("/quotations/:id", async (req, res, next) => { try { const { title, amount, status, validUntil, notes } = req.body; const data: any = {}; if (title !== undefined) data.title = String(title).trim(); if (amount !== undefined) data.amount = Number(amount); if (status !== undefined) data.status = status; if (validUntil !== undefined) data.validUntil = validUntil ? new Date(validUntil) : null; if (notes !== undefined) data.notes = notes ? String(notes).trim() : null; res.json(await prisma.quotation.update({ where: { id: req.params.id }, data })); } catch (error) { next(error); } });

router.get("/renewals", async (req, res, next) => { try { await list(res, prisma.renewal, { include: { customer: true }, orderBy: { expiryDate: "asc" } }, req.query); } catch (error) { next(error); } });
router.post("/renewals", async (req, res, next) => { try { const item = await prisma.renewal.create({ data: { ...req.body, number: code("AGR"), expiryDate: new Date(req.body.expiryDate), progress: Number(req.body.progress || 0) }, include: { customer: true } }); res.status(201).json(item); } catch (error) { next(error); } });
router.patch("/renewals/:id", async (req, res, next) => { try { const { service, expiryDate, status, progress, notes, notificationStatus, draftAgreementStatus, draftOrderSheetStatus, agreementSignedStatus, finalizeOrderSheetStatus, sentToVendorStatus } = req.body; const data: any = {}; if (service !== undefined) data.service = String(service).trim(); if (expiryDate !== undefined) data.expiryDate = new Date(expiryDate); if (status !== undefined) data.status = status; if (progress !== undefined) data.progress = Number(progress); if (notes !== undefined) data.notes = notes ? String(notes).trim() : null; if (notificationStatus !== undefined) data.notificationStatus = notificationStatus; if (draftAgreementStatus !== undefined) data.draftAgreementStatus = draftAgreementStatus; if (draftOrderSheetStatus !== undefined) data.draftOrderSheetStatus = draftOrderSheetStatus; if (agreementSignedStatus !== undefined) data.agreementSignedStatus = agreementSignedStatus; if (finalizeOrderSheetStatus !== undefined) data.finalizeOrderSheetStatus = finalizeOrderSheetStatus; if (sentToVendorStatus !== undefined) data.sentToVendorStatus = sentToVendorStatus; res.json(await prisma.renewal.update({ where: { id: req.params.id }, data })); } catch (error) { next(error); } });
router.get("/renewals/agreements", async (_req, res, next) => { try { res.json({ data: await prisma.customer.findMany({ where: { agreementNumber: { not: null } }, orderBy: { agreementEnd: "asc" } }) }); } catch (error) { next(error); } });
router.get("/renewals/outstanding", async (_req, res, next) => { try { res.json({ data: await prisma.outstandingInvoice.findMany({ where: { isPaid: false }, include: { customer: true }, orderBy: { dueDate: "asc" } }) }); } catch (error) { next(error); } });
router.get("/renewals/notifications", async (_req, res) => res.json({ data: [] }));
router.get("/renewals/workflow/:step", async (req, res, next) => { try { const field = `${req.params.step}Status`; const validFields = ["notificationStatus", "draftAgreementStatus", "draftOrderSheetStatus", "agreementSignedStatus", "finalizeOrderSheetStatus", "sentToVendorStatus"]; if (!validFields.includes(field)) return res.status(400).json({ error: "Tahap renewal tidak valid" }); res.json({ data: await prisma.renewal.findMany({ where: { [field]: "PENDING" }, include: { customer: true }, orderBy: { expiryDate: "asc" } }) }); } catch (error) { next(error); } });
router.patch("/renewals/:id/workflow", async (req, res, next) => { try { const { step, status } = req.body; const field = `${step}Status`; if (!["notificationStatus", "draftAgreementStatus", "draftOrderSheetStatus", "agreementSignedStatus", "finalizeOrderSheetStatus", "sentToVendorStatus"].includes(field) || !["PENDING", "COMPLETED"].includes(status)) return res.status(400).json({ error: "Tahap atau status tidak valid" }); res.json(await prisma.renewal.update({ where: { id: req.params.id }, data: { [field]: status } })); } catch (error) { next(error); } });

router.get("/service-contracts", async (_req, res, next) => { try { res.json({ data: await prisma.serviceContract.findMany({ include: { customer: true }, orderBy: { endDate: "asc" } }) }); } catch (error) { next(error); } });
router.post("/service-contracts", async (req, res, next) => { try { const { customerId, service, startDate, endDate } = req.body; if (!customerId || !service || !startDate || !endDate) return res.status(400).json({ error: "Customer, layanan, tanggal mulai, dan tanggal berakhir wajib diisi" }); const item = await prisma.serviceContract.create({ data: { customerId, service, startDate: new Date(startDate), endDate: new Date(endDate), number: code("SC") }, include: { customer: true } }); res.status(201).json(item); } catch (error) { next(error); } });
router.get("/service-contracts/monthly-reports", async (_req, res, next) => { try { res.json({ data: await prisma.monthlyReport.findMany({ include: { contract: { include: { customer: true } } }, orderBy: { reportDate: "desc" } }) }); } catch (error) { next(error); } });
router.post("/service-contracts/monthly-reports", async (req, res, next) => { try { const item = await prisma.monthlyReport.create({ data: { contractId: req.body.contractId, reportDate: new Date(req.body.reportDate), notes: req.body.notes || null } }); res.status(201).json(item); } catch (error) { next(error); } });
router.patch("/service-contracts/monthly-reports/:id", async (req, res, next) => { try { res.json(await prisma.monthlyReport.update({ where: { id: req.params.id }, data: { status: req.body.status, notes: req.body.notes } })); } catch (error) { next(error); } });
router.get("/service-contracts/qc-visits", async (_req, res, next) => { try { res.json({ data: await prisma.qcVisit.findMany({ include: { contract: { include: { customer: true } } }, orderBy: { scheduledAt: "asc" } }) }); } catch (error) { next(error); } });
router.post("/service-contracts/qc-visits", async (req, res, next) => { try { res.status(201).json(await prisma.qcVisit.create({ data: { contractId: req.body.contractId, scheduledAt: new Date(req.body.scheduledAt), notes: req.body.notes || null } })); } catch (error) { next(error); } });
router.patch("/service-contracts/qc-visits/:id", async (req, res, next) => { try { res.json(await prisma.qcVisit.update({ where: { id: req.params.id }, data: { status: req.body.status, notes: req.body.notes } })); } catch (error) { next(error); } });
router.get("/service-contracts/vendor-treatments", async (_req, res, next) => { try { res.json({ data: await prisma.vendorTreatment.findMany({ include: { contract: { include: { customer: true } } }, orderBy: { scheduledAt: "asc" } }) }); } catch (error) { next(error); } });
router.post("/service-contracts/vendor-treatments", async (req, res, next) => { try { res.status(201).json(await prisma.vendorTreatment.create({ data: { contractId: req.body.contractId, vendorName: req.body.vendorName, scheduledAt: new Date(req.body.scheduledAt), notes: req.body.notes || null } })); } catch (error) { next(error); } });
router.patch("/service-contracts/vendor-treatments/:id", async (req, res, next) => { try { res.json(await prisma.vendorTreatment.update({ where: { id: req.params.id }, data: { status: req.body.status, notes: req.body.notes } })); } catch (error) { next(error); } });

const roles = ["ADMIN", "MANAGER", "SALES", "SURVEYOR", "QA"];
const defaultPermissions: Record<string, string[]> = {
  ADMIN: ["customers.read", "customers.write", "inquiries.write", "quotations.write", "renewals.write", "reports.write", "admin.manage"],
  MANAGER: ["customers.read", "customers.write", "inquiries.write", "quotations.write", "renewals.write", "reports.write"],
  SALES: ["customers.read", "customers.write", "inquiries.write", "quotations.write", "renewals.read"],
  SURVEYOR: ["customers.read", "surveys.write", "after-surveys.write"],
  QA: ["customers.read", "inquiries.write", "surveys.write", "after-surveys.write"],
};
router.get("/admin/users", requireRole("ADMIN"), async (_req, res, next) => { try { res.json({ data: await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }, orderBy: { createdAt: "desc" } }) }); } catch (error) { next(error); } });
router.post("/admin/users", requireRole("ADMIN"), async (req, res, next) => { try { const { name, email, password, role } = req.body; if (!name || !email || !password || !roles.includes(role)) return res.status(400).json({ error: "Nama, email, password, dan role valid wajib diisi" }); const item = await prisma.user.create({ data: { name, email: String(email).toLowerCase(), password: await bcrypt.hash(password, 12), role }, select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } }); res.status(201).json(item); } catch (error) { next(error); } });
router.patch("/admin/users/:id", requireRole("ADMIN"), async (req: AuthRequest, res, next) => { try { const { name, email, password, role, isActive } = req.body; if (role && !roles.includes(role)) return res.status(400).json({ error: "Role tidak valid" }); if (req.params.id === req.user!.id && isActive === false) return res.status(400).json({ error: "Akun sendiri tidak dapat dinonaktifkan" }); const data: any = { ...(name !== undefined ? { name } : {}), ...(email !== undefined ? { email: String(email).toLowerCase() } : {}), ...(role ? { role } : {}), ...(typeof isActive === "boolean" ? { isActive } : {}), ...(password ? { password: await bcrypt.hash(password, 12) } : {}) }; const item = await prisma.user.update({ where: { id: req.params.id }, data, select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } }); res.json(item); } catch (error) { next(error); } });
router.get("/admin/permissions", requireRole("ADMIN"), async (_req, res, next) => { try { const saved = await prisma.rolePermission.findMany(); res.json({ roles: roles.map((role) => ({ role, permissions: saved.find((item) => item.role === role)?.permissions || defaultPermissions[role] })) }); } catch (error) { next(error); } });
router.put("/admin/permissions/:role", requireRole("ADMIN"), async (req, res, next) => { try { const role = req.params.role; if (!roles.includes(role) || !Array.isArray(req.body.permissions)) return res.status(400).json({ error: "Role atau permission tidak valid" }); res.json(await prisma.rolePermission.upsert({ where: { role: role as any }, create: { role: role as any, permissions: req.body.permissions.map(String) }, update: { permissions: req.body.permissions.map(String) } })); } catch (error) { next(error); } });
router.get("/admin/reminders", requireRole("ADMIN"), async (_req, res, next) => { try { const rows = await prisma.reminderSetting.findMany(); res.json({ data: rows.map(({ secretEncrypted, ...row }) => ({ ...row, hasSecret: Boolean(secretEncrypted) })) }); } catch (error) { next(error); } });
router.put("/admin/reminders/:key", requireRole("ADMIN"), async (req, res, next) => { try { const key = req.params.key; if (!["fontee", "gmail"].includes(key)) return res.status(400).json({ error: "Provider reminder tidak valid" }); const { enabled, config, secret } = req.body; const item = await prisma.reminderSetting.upsert({ where: { key }, create: { key, enabled: Boolean(enabled), config: config || {}, ...(secret ? { secretEncrypted: encryptSecret(String(secret)) } : {}) }, update: { enabled: Boolean(enabled), config: config || {}, ...(secret ? { secretEncrypted: encryptSecret(String(secret)) } : {}) } }); const { secretEncrypted, ...safe } = item; res.json({ ...safe, hasSecret: Boolean(secretEncrypted) }); } catch (error) { next(error); } });

router.get("/qa-users", async (_req, res, next) => { try { const data = await prisma.user.findMany({ where: { isActive: true, role: "QA" }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }); res.json({ data }); } catch (error) { next(error); } });
router.get("/vendor-options", async (_req, res, next) => { try { const [customerVendors, treatmentVendors] = await Promise.all([prisma.customer.findMany({ where: { vendorName: { not: null } }, select: { vendorName: true }, distinct: ["vendorName"] }), prisma.vendorTreatment.findMany({ select: { vendorName: true }, distinct: ["vendorName"] })]); const names = Array.from(new Set([...vendorOptions, ...customerVendors.map((item) => item.vendorName).filter(Boolean), ...treatmentVendors.map((item) => item.vendorName).filter(Boolean)].map(String))).sort((a, b) => a.localeCompare(b)); res.json({ data: names }); } catch (error) { next(error); } });
router.get("/survey-pics", async (_req, res, next) => { try { const data = await prisma.user.findMany({ where: { isActive: true, role: { in: ["SURVEYOR", "MANAGER", "ADMIN"] } }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }); res.json({ data }); } catch (error) { next(error); } });
router.get("/surveys", async (req, res, next) => { try { const from = req.query.from ? new Date(String(req.query.from)) : undefined; const to = req.query.to ? new Date(String(req.query.to)) : undefined; const data = await prisma.survey.findMany({ where: from || to ? { scheduledAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}, include: { customer: true, inquiry: true, pic: { select: { name: true, role: true } }, picAssignments: { include: { pic: { select: { name: true, role: true } } } }, afterSurvey: true }, orderBy: { scheduledAt: "asc" } }); res.json({ data }); } catch (error) { next(error); } });
router.post("/surveys", async (req: AuthRequest, res, next) => { try { const { customerId, picId, scheduledAt, location, shareLocationUrl, notes } = req.body; if (!customerId || !picId || !scheduledAt || !location || !shareLocationUrl) return res.status(400).json({ error: "Customer, PIC, tanggal dan jam, alamat, serta tautan Google Maps wajib diisi" }); const item = await prisma.survey.create({ data: { customerId, number: code("SRV"), scheduledAt: new Date(scheduledAt), picId, location, shareLocationUrl, notes: notes || null }, include: { customer: true, pic: { select: { name: true, role: true } } } }); res.status(201).json(item); } catch (error) { next(error); } });
router.patch("/surveys/:id", async (req, res, next) => { try { const { scheduledAt, location, shareLocationUrl, status, notes, picId } = req.body; const data: any = {}; if (scheduledAt !== undefined) data.scheduledAt = new Date(scheduledAt); if (location !== undefined) data.location = String(location).trim(); if (shareLocationUrl !== undefined) data.shareLocationUrl = shareLocationUrl ? String(shareLocationUrl).trim() : null; if (status !== undefined) data.status = status; if (notes !== undefined) data.notes = notes ? String(notes).trim() : null; if (picId !== undefined) data.picId = String(picId); res.json(await prisma.survey.update({ where: { id: req.params.id }, data })); } catch (error) { next(error); } });
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

router.get("/reports/daily", async (_req, res, next) => { try { const reports = await prisma.dailyReport.findMany({ take: 7, orderBy: { reportDate: "desc" }, include: { author: { select: { name: true } } } }); const activities = await prisma.activityLog.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } }); res.json({ reports, activities }); } catch (error) { next(error); } });
router.post("/reports/daily", requireRole("ADMIN", "MANAGER"), async (req: AuthRequest, res, next) => { try { const item = await prisma.dailyReport.upsert({ where: { reportDate: new Date(req.body.reportDate) }, update: req.body, create: { ...req.body, reportDate: new Date(req.body.reportDate), authorId: req.user!.id } }); res.status(201).json(item); } catch (error) { next(error); } });

export default router;
