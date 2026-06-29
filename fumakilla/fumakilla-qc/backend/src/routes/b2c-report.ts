import { Router } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/auth";
import { createUploader, publicUploadPath } from "../lib/upload";

const router = Router();
router.use(authenticate);

const imgUpload = createUploader("b2c-reports", ["image/jpeg", "image/png", "image/webp"], 15);

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

router.post("/:surveyId", async (req, res, next) => {
  try {
    await (prisma.survey as any).update({
      where: { id: req.params.surveyId },
      data: { b2cReportData: req.body },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/:surveyId/upload", imgUpload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const filePath = publicUploadPath(req.file.path);
    res.json({ data: { path: filePath } });
  } catch (e) {
    next(e);
  }
});

export default router;
