import { Router } from "express";
import prisma from "../prisma";
import { authenticate, requireRole, requirePermission, type AuthRequest } from "../middleware/auth";
import { createUploader, publicUploadPath } from "../lib/upload";

const router = Router();
router.use(authenticate);

const imgUpload = createUploader("b2c-reports", ["image/jpeg", "image/png", "image/webp"], 15);

// Report hanya boleh dibuat/diapprove kalau survey sudah check in DAN check out.
async function ensureCheckedInOut(surveyId: string): Promise<string | null> {
  const survey = await prisma.survey.findUnique({ where: { id: surveyId }, select: { evidenceImagePath: true, checkoutImagePath: true } });
  if (!survey) return "Survey tidak ditemukan";
  if (!survey.evidenceImagePath || !survey.checkoutImagePath) return "Report hanya bisa dibuat setelah check in dan check out survey selesai.";
  return null;
}

router.get("/:surveyId", async (req, res, next) => {
  try {
    const survey = await prisma.survey.findUnique({
      where: { id: req.params.surveyId },
      include: {
        customer: { select: { name: true, company: true, treatmentAddress: true, address: true } },
        picAssignments: { include: { pic: { select: { name: true } } } },
        pic: { select: { name: true } },
        inquiry: { select: { segmentType: true } },
      },
    });
    if (!survey) return res.status(404).json({ error: "Survey not found" });
    res.json({ survey, data: (survey as any).b2cReportData || null });
  } catch (e) {
    next(e);
  }
});

router.post("/:surveyId", requirePermission("surveys.b2c_report"), async (req, res, next) => {
  try {
    const ciCoError = await ensureCheckedInOut(req.params.surveyId);
    if (ciCoError) return res.status(400).json({ error: ciCoError });
    await (prisma.survey as any).update({
      where: { id: req.params.surveyId },
      data: { b2cReportData: req.body },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/:surveyId/approve", requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
  try {
    const signature = typeof req.body?.signature === "string" ? req.body.signature.trim() : "";
    if (!signature) return res.status(400).json({ error: "Tanda tangan approval wajib diisi." });
    const ciCoError = await ensureCheckedInOut(req.params.surveyId);
    if (ciCoError) return res.status(400).json({ error: ciCoError.replace("dibuat", "diapprove") });
    const survey = await prisma.survey.findUnique({ where: { id: req.params.surveyId }, select: { b2cReportData: true } });
    if (!survey) return res.status(404).json({ error: "Survey not found" });
    const current = survey.b2cReportData && typeof survey.b2cReportData === "object" && !Array.isArray(survey.b2cReportData)
      ? survey.b2cReportData as Record<string, any>
      : {};
    if (!Object.keys(current).length) return res.status(400).json({ error: "Report belum diisi. Isi report terlebih dahulu sebelum approve." });
    const nextData = {
      ...current,
      status: "approved",
      approvedByName: req.user!.name,
      approvedAt: new Date().toISOString(),
      approvedSignature: signature,
    };
    await (prisma.survey as any).update({
      where: { id: req.params.surveyId },
      data: { b2cReportData: nextData },
    });
    res.json({ data: nextData });
  } catch (e) {
    next(e);
  }
});

router.post("/:surveyId/upload", requirePermission("surveys.b2c_report"), imgUpload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const filePath = publicUploadPath(req.file.path);
    res.json({ data: { path: filePath } });
  } catch (e) {
    next(e);
  }
});

export default router;
