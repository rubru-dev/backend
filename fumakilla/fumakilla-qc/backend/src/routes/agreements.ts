import { Router } from "express";
import prisma from "../prisma";
import { authenticate, requirePermission, hasPermission } from "../middleware/auth";

const router = Router();
router.use(authenticate);

async function nextNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `AGR/FMK/${year}/`;
  const last = await prisma.agreement.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });
  const seq = last ? (parseInt(last.number.slice(-3)) || 0) + 1 : 1;
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

function nextOsNumber(): string {
  return `OS-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}${Math.floor(Math.random() * 100).toString().padStart(2, "0")}`;
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
    locationNotes: customer.notes || "",
  };
}

function serviceSpecText(serviceSpec: any) {
  if (!serviceSpec || typeof serviceSpec !== "object") return "";
  const lines = [
    serviceSpec.serviceType ? `Jenis layanan: ${serviceSpec.serviceType}` : "",
    serviceSpec.targetPests ? `Target hama: ${serviceSpec.targetPests}` : "",
    serviceSpec.treatmentMethod ? `Metode treatment: ${serviceSpec.treatmentMethod}` : "",
    serviceSpec.monitoringDevices ? `Monitoring device: ${serviceSpec.monitoringDevices}` : "",
    serviceSpec.visitFrequency ? `Frekuensi visit: ${serviceSpec.visitFrequency}` : "",
    serviceSpec.areaCoverage ? `Area coverage: ${serviceSpec.areaCoverage}` : "",
    serviceSpec.guarantee ? `Garansi: ${serviceSpec.guarantee}` : "",
    serviceSpec.notes ? `Catatan: ${serviceSpec.notes}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

function visitTypeFrom(value: any, segmentType?: string | null) {
  const raw = String(value || "").toUpperCase();
  if (raw === "MONTHLY_VISIT_B2C" || raw === "MONTHLY B2C") return "MONTHLY_VISIT_B2C";
  if (raw === "MONTHLY_VISIT_B2B" || raw === "MONTHLY B2B") return "MONTHLY_VISIT_B2B";
  if ((segmentType || "").toUpperCase() === "B2C" && raw.includes("MONTHLY")) return "MONTHLY_VISIT_B2C";
  if ((segmentType || "").toUpperCase() === "B2B" && raw.includes("MONTHLY")) return "MONTHLY_VISIT_B2B";
  return "QC_VISIT";
}

async function createVisitsFromAgreement(tx: any, ag: any, serviceContractId: string | null, actorId?: string) {
  const plan = Array.isArray(ag.visitPlan) ? ag.visitPlan : [];
  const created: any[] = [];
  for (const row of plan) {
    if (!row?.scheduledAt || !row?.picId) continue;
    const scheduledAt = toDate(row.scheduledAt);
    if (!scheduledAt) continue;
    const visitType = visitTypeFrom(row.visitType, ag.quotation?.segmentType);
    const segmentType = visitType === "MONTHLY_VISIT_B2C" ? "B2C" : "B2B";
    const item = await tx.serviceVisit.upsert({
      where: { agreementId_scheduledAt_visitType: { agreementId: ag.id, scheduledAt, visitType } },
      update: {
        serviceContractId,
        customerId: ag.customerId,
        picId: row.picId,
        segmentType,
        serviceType: ag.jenisLayanan,
        location: row.location || ag.lokasiPekerjaan || "",
        notes: row.notes || null,
      },
      create: {
        agreementId: ag.id,
        serviceContractId,
        customerId: ag.customerId,
        picId: row.picId,
        visitType,
        segmentType,
        serviceType: ag.jenisLayanan,
        scheduledAt,
        location: row.location || ag.lokasiPekerjaan || "",
        notes: row.notes || null,
      },
    });
    created.push(item);
  }
  if (created.length) {
    await tx.activityLog.create({
      data: {
        message: `${created.length} jadwal visit dibuat dari agreement ${ag.number}`,
        type: "SERVICE_VISIT",
        userId: actorId,
      },
    });
  }
  return created;
}

async function ensurePendingMonthlyReport(customerId: string, preferredInquiryId?: string | null, preferredSegment?: string | null) {
  const inquiry = preferredInquiryId
    ? await prisma.inquiry.findUnique({ where: { id: preferredInquiryId }, select: { id: true, segmentType: true } })
    : await prisma.inquiry.findFirst({ where: { customerId }, orderBy: { inquiryDate: "desc" }, select: { id: true, segmentType: true } });
  if (!inquiry) return null;

  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();
  const segment = preferredSegment || inquiry.segmentType || "B2B";

  const [complete, simple] = await Promise.all([
    prisma.pestMonthlyReport.findFirst({ where: { inquiryId: inquiry.id, bulan, tahun } }),
    prisma.simpleMonthlyReport.findFirst({ where: { inquiryId: inquiry.id, bulan, tahun } }),
  ]);
  if (complete) return { ...complete, _type: "complete" };
  if (simple) return { ...simple, _type: "simple" };

  const pending = await prisma.pestMonthlyReport.create({
    data: { inquiryId: inquiry.id, bulan, tahun, segment, pagesData: { _pending: true } as any },
  });
  return { ...pending, _type: "pending" };
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

// Active hub — enriched ACTIVE agreements for Service Contract Active page
router.get("/active-hub", async (_req, res, next) => {
  try {
    const agreements = await prisma.agreement.findMany({
      where: { status: "ACTIVE" },
      include: { customer: true, quotation: { select: { id: true, number: true, segmentType: true, amount: true, inquiryId: true } } },
      orderBy: { tanggalMulai: "desc" },
    });

    if (!agreements.length) return res.json({ data: [] });

    const customerIds = [...new Set(agreements.map(a => a.customerId))];
    const agreementIds = agreements.map(a => a.id);

    const [surveys, orderSheets, renewals, serviceContracts] = await Promise.all([
      prisma.survey.findMany({
        where: { customerId: { in: customerIds } },
        orderBy: { createdAt: "desc" },
        select: { id: true, number: true, customerId: true, status: true, b2bReport: { select: { id: true } } },
      }),
      prisma.orderSheet.findMany({
        where: { customerId: { in: customerIds } },
        orderBy: { createdAt: "desc" },
        select: { id: true, number: true, customerId: true, quotationRef: true, agreementRef: true, status: true, picInternal: true, vendor: { select: { name: true } } },
      }),
      prisma.renewal.findMany({
        where: { OR: [{ sourceAgreementId: { in: agreementIds } }, { customerId: { in: customerIds } }] },
        select: { id: true, customerId: true, sourceAgreementId: true, status: true, createdAgreementId: true },
      }),
      // SC now matched exactly by agreementId
      prisma.serviceContract.findMany({
        where: { agreementId: { in: agreementIds } },
        select: { id: true, number: true, agreementId: true },
      }),
    ]);

    const data = agreements.map(ag => {
      // Survey: latest per customer (B2B first, then any)
      const custSurveys = surveys.filter(s => s.customerId === ag.customerId);
      const latestSurvey = custSurveys.find(s => s.b2bReport) ?? custSurveys[0] ?? null;

      // OS: match by quotationRef or agreementRef — NO arbitrary [0] fallback
      const allOs = orderSheets.filter(os => os.customerId === ag.customerId);
      const matchedOs =
        allOs.find(os => ag.quotation && os.quotationRef === ag.quotation.number) ??
        allOs.find(os => os.agreementRef === ag.number) ??
        null;

      // Vendor name from OS vendor relation only (no JSON parsing)
      const vendorName = matchedOs?.vendor?.name ?? null;

      const renewal = renewals.find(r => r.sourceAgreementId === ag.id) ?? renewals.find(r => r.customerId === ag.customerId) ?? null;
      // SC matched exactly to this agreement
      const sc = serviceContracts.find(s => s.agreementId === ag.id) ?? null;

      return {
        ...ag,
        _links: {
          survey: latestSurvey ? { id: latestSurvey.id, number: latestSurvey.number, status: latestSurvey.status, hasB2bReport: !!latestSurvey.b2bReport } : null,
          orderSheet: matchedOs ? { id: matchedOs.id, number: matchedOs.number, status: matchedOs.status, picInternal: matchedOs.picInternal, vendorName } : null,
          serviceContract: sc ? { id: sc.id, number: sc.number } : null,
          renewal: renewal ? { id: renewal.id, status: renewal.status } : null,
        },
      };
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
router.post("/", requirePermission("agreements.create"), async (req, res, next) => {
  try {
    const number = await nextNumber();
    const b = req.body;
    const customer = await prisma.customer.findUnique({ where: { id: b.customerId } });
    if (!customer) return res.status(400).json({ error: "Customer tidak ditemukan" });

    const result = await prisma.$transaction(async (tx) => {
      const ag = await tx.agreement.create({
        data: {
          number,
          tanggal: toDate(b.tanggal) ?? new Date(),
          customerId: b.customerId,
          quotationId: b.quotationId || null,
          jenisLayanan: b.jenisLayanan || "Pest Control",
          lokasiPekerjaan: b.lokasiPekerjaan || customer.treatmentAddress || customer.address || "",
          areaPekerjaan: b.areaPekerjaan || null,
          tanggalMulai: toDate(b.tanggalMulai) ?? new Date(),
          tanggalBerakhir: toDate(b.tanggalBerakhir) ?? new Date(),
          durasiKontrak: b.durasiKontrak ? Number(b.durasiKontrak) : null,
          serviceSchedule: b.serviceSchedule ?? [],
          serviceSpec: b.serviceSpec ?? {},
          visitPlan: b.visitPlan ?? [],
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
          picKlienNama: b.picKlienNama || customer.picServiceName || null,
          picKlienJabatan: b.picKlienJabatan || null,
          picKlienKontak: b.picKlienKontak || customer.picServicePhone || customer.phone || null,
          ttdFumakillaNama: b.ttdFumakillaNama || null,
          ttdFumakillaJabatan: b.ttdFumakillaJabatan || null,
          ttdFumakillaTanggal: toDate(b.ttdFumakillaTanggal),
          ttdKlienNama: b.ttdKlienNama || null,
          ttdKlienJabatan: b.ttdKlienJabatan || null,
          ttdKlienTanggal: toDate(b.ttdKlienTanggal),
          notes: b.notes || null,
        },
        include: { quotation: { select: { number: true } } },
      });

      const orderSheet = await tx.orderSheet.create({
        data: {
          number: nextOsNumber(),
          orderDate: new Date(),
          status: "DRAFT",
          customerId: ag.customerId,
          customerSnapshot: customerSnapshot(customer),
          agreementRef: ag.number,
          quotationRef: ag.quotation?.number || null,
          jobTitle: ag.jenisLayanan || "Pest Control",
          serviceType: ag.jenisLayanan || null,
          workDate: ag.tanggalMulai,
          jobDescription: [`Order sheet otomatis dari Agreement ${ag.number}`, serviceSpecText(b.serviceSpec)].filter(Boolean).join("\n\n"),
          specialInstruction: ag.notes || null,
          treatmentLocations: ag.lokasiPekerjaan ? [{ area: ag.lokasiPekerjaan, treatmentType: ag.jenisLayanan || "", notes: [ag.areaPekerjaan || "", serviceSpecText(b.serviceSpec)].filter(Boolean).join("\n") }] : [],
          costItems: [{ description: ag.jenisLayanan || "Pest Control", qty: "1", unitPrice: String(ag.nilaiKontrak || 0), total: String(ag.nilaiKontrak || 0) }],
          subtotal: ag.nilaiKontrak,
          ppnAmount: ag.ppn || null,
          grandTotal: ag.grandTotal || ag.nilaiKontrak,
          supportingDocuments: [{ name: "Agreement Customer", status: "Ada", ref: ag.number }],
          materials: [],
          vendorTechnicians: [],
          isRenewal: Boolean(ag.isRenewal),
          renewalSourceId: ag.renewalSourceId || null,
        },
      });

      await tx.activityLog.create({
        data: {
          message: `${(req as any).user?.name || "System"} membuat agreement ${ag.number} dan order sheet ${orderSheet.number}`,
          type: "AGREEMENT",
          userId: (req as any).user?.id,
        },
      });

      return { agreement: ag, orderSheet };
    });
    res.status(201).json({ ...result.agreement, orderSheet: result.orderSheet });
  } catch (e) { next(e); }
});

// Update
router.patch("/:id", requirePermission("agreements.edit"), async (req: any, res, next) => {
  try {
    const b = req.body;
    const data: any = {};
    if ("status" in b) {
      const current = await prisma.agreement.findUnique({ where: { id: req.params.id }, select: { status: true, approvedAt: true } });
      if (!current) return res.status(404).json({ error: "Agreement tidak ditemukan" });
      if (b.status !== current.status) {
        if (!current.approvedAt) return res.status(400).json({ error: "Agreement harus di-approve dengan tanda tangan sebelum status bisa diganti." });
        const perm = `agreements.set_${String(b.status).toLowerCase()}`;
        if (!hasPermission(req.user, perm)) return res.status(403).json({ error: `Tidak ada izin mengubah status agreement ke ${b.status} (${perm}).` });
      }
    }

    const strFields = [
      "jenisLayanan", "lokasiPekerjaan", "areaPekerjaan", "metodePembayaran",
      "rekening", "garansi", "status", "notes",
      "picFumakillaNama", "picFumakillaJabatan", "picFumakillaKontak",
      "picKlienNama", "picKlienJabatan", "picKlienKontak",
      "ttdFumakillaNama", "ttdFumakillaJabatan", "ttdKlienNama", "ttdKlienJabatan",
    ];
    const dateFields = ["tanggal", "tanggalMulai", "tanggalBerakhir", "ttdFumakillaTanggal", "ttdKlienTanggal"];
    const numFields = ["durasiKontrak", "nilaiKontrak", "ppn", "grandTotal"];
    const jsonFields = ["serviceSchedule", "serviceSpec", "visitPlan", "terminPembayaran"];
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

    const ag = await prisma.agreement.update({
      where: { id: req.params.id },
      data,
      include: {
        quotation: { select: { segmentType: true } },
        serviceContract: { select: { id: true } },
      },
    });
    if ("visitPlan" in b && ag.approvedAt) {
      await prisma.$transaction(async (tx) => {
        await createVisitsFromAgreement(tx, ag, ag.serviceContract?.id || null, (req as any).user?.id);
      });
    }
    res.json(ag);
  } catch (e) { next(e); }
});

router.post("/:id/approve", requirePermission("agreements.set_signed"), async (req: any, res, next) => {
  try {
    const signature = typeof req.body?.signature === "string" ? req.body.signature.trim() : "";
    if (!signature) return res.status(400).json({ error: "Tanda tangan approval wajib diisi." });
    const existing = await prisma.agreement.findUnique({ where: { id: req.params.id }, select: { id: true, number: true } });
    if (!existing) return res.status(404).json({ error: "Agreement tidak ditemukan" });
    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.agreement.update({
        where: { id: existing.id },
        data: {
          approvedAt: new Date(),
          approvedByName: req.user?.name || "Approver",
          approvedSignature: signature,
        },
        include: {
          customer: { select: { id: true, name: true, company: true, code: true } },
          quotation: { select: { id: true, number: true, title: true, segmentType: true } },
          serviceContract: { select: { id: true } },
        },
      });
      await createVisitsFromAgreement(tx, updated, updated.serviceContract?.id || null, req.user?.id);
      await tx.activityLog.create({
        data: { message: `${req.user?.name || "System"} approve agreement ${existing.number}`, type: "AGREEMENT", userId: req.user?.id },
      });
      return updated;
    });
    res.json(item);
  } catch (e) { next(e); }
});

// Activate agreement → create ServiceContract
router.post("/:id/activate", requirePermission("agreements.set_active"), async (req, res, next) => {
  try {
    const ag = await prisma.agreement.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        quotation: { select: { inquiryId: true, segmentType: true } },
      },
    });
    if (!ag) return res.status(404).json({ error: "Agreement tidak ditemukan" });
    if (ag.status === "ACTIVE") return res.status(400).json({ error: "Agreement sudah aktif" });
    if (!ag.approvedAt) return res.status(400).json({ error: "Agreement harus di-approve dengan tanda tangan sebelum status bisa diganti." });

    // Enforce: satu active agreement per customer — kecuali ini adalah renewal
    if (!ag.isRenewal) {
      const existingActive = await prisma.agreement.findFirst({
        where: { customerId: ag.customerId, status: "ACTIVE", id: { not: ag.id } },
        select: { number: true },
      });
      if (existingActive) {
        return res.status(400).json({
          error: `Customer ini sudah memiliki agreement aktif (${existingActive.number}). Selesaikan atau batalkan terlebih dahulu.`,
        });
      }
    }

    // Generate SC number
    const year = new Date().getFullYear();
    const scPrefix = `SC/FMK/${year}/`;
    const lastSc = await prisma.serviceContract.findFirst({
      where: { number: { startsWith: scPrefix } },
      orderBy: { number: "desc" },
    });
    const lastScSeq = lastSc ? (parseInt(lastSc.number.slice(-3)) || 0) : 0;
    const scNumber = `${scPrefix}${String(lastScSeq + 1).padStart(3, "0")}`;

    const result = await prisma.$transaction(async (tx) => {
      const updatedAg = await tx.agreement.update({
        where: { id: ag.id },
        data: { status: "ACTIVE" },
      });

      const sc = await tx.serviceContract.create({
        data: {
          customerId: ag.customerId,
          agreementId: ag.id,
          number: scNumber,
          service: ag.jenisLayanan,
          startDate: ag.tanggalMulai,
          endDate: ag.tanggalBerakhir,
          status: "ACTIVE",
        },
        include: { customer: true },
      });

      await tx.customer.update({
        where: { id: ag.customerId },
        data: {
          status: "Kontrak",
          agreementNumber: ag.number,
          agreementStart: ag.tanggalMulai,
          agreementEnd: ag.tanggalBerakhir,
          agreementValue: ag.grandTotal ?? ag.nilaiKontrak,
        },
      });

      const serviceSpec = ag.serviceSpec as any;
      const specText = serviceSpecText(serviceSpec);
      await tx.orderSheet.updateMany({
        where: { customerId: ag.customerId, agreementRef: ag.number },
        data: {
          serviceType: ag.jenisLayanan,
          jobTitle: ag.jenisLayanan || "Pest Control",
          jobDescription: [`Order sheet otomatis dari Agreement ${ag.number}`, specText].filter(Boolean).join("\n\n"),
          treatmentLocations: ag.lokasiPekerjaan ? [{ area: ag.lokasiPekerjaan, treatmentType: ag.jenisLayanan || "", notes: [ag.areaPekerjaan || "", specText].filter(Boolean).join("\n") }] : [],
        },
      });

      const visits = await createVisitsFromAgreement(tx, ag, sc.id, (req as any).user?.id);
      return { updatedAg, sc, visits };
    });

    // Auto-create monthly report "pending" jika ada inquiryId (dari quotation)
    // pagesData: { _pending: true } → user pilih jenis (Complete/Simple) dari menu Monthly Report
    const monthlyReport = await ensurePendingMonthlyReport(ag.customerId, ag.quotation?.inquiryId, ag.quotation?.segmentType);

    res.json({ agreement: result.updatedAg, serviceContract: result.sc, monthlyReport, visits: result.visits });
  } catch (e) { next(e); }
});

// Delete
router.post("/bulk-delete", requirePermission("agreements.delete"), async (req: any, res, next) => {
  try {
    const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids.map((x: any) => String(x)).filter(Boolean) : [];
    if (!ids.length) return res.status(400).json({ error: "Tidak ada item dipilih." });
    let deleted = 0; const failed: { id: string; reason: string }[] = [];
    for (const id of ids) {
      try {
        const item = await prisma.agreement.findUnique({ where: { id }, select: { id: true } });
        if (!item) { failed.push({ id, reason: "Tidak ditemukan" }); continue; }
        await prisma.agreement.delete({ where: { id } });
        deleted++;
      } catch (e: any) { failed.push({ id, reason: e?.message || "Gagal dihapus" }); }
    }
    res.json({ deleted, failed, total: ids.length });
  } catch (e) { next(e); }
});

router.delete("/:id", requirePermission("agreements.delete"), async (req, res, next) => {
  try {
    await prisma.agreement.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
