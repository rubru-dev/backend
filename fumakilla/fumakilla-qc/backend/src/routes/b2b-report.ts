import { Router } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/auth";
import { createUploader, publicUploadPath, deleteFileIfExists } from "../lib/upload";

const router = Router();
router.use(authenticate);

const imgUpload = createUploader("b2b-reports", ["image/jpeg", "image/png", "image/webp"], 15);

router.get("/:surveyId", async (req, res, next) => {
  try {
    const report = await prisma.b2BSurveyReport.findUnique({
      where: { surveyId: req.params.surveyId },
    });
    const survey = await prisma.survey.findUnique({
      where: { id: req.params.surveyId },
      include: {
        customer: { select: { name: true, company: true, treatmentAddress: true, address: true } },
        picAssignments: { include: { pic: { select: { name: true } } } },
        pic: { select: { name: true } },
      },
    });
    res.json({ data: report, survey });
  } catch (e) {
    next(e);
  }
});

router.post("/:surveyId", async (req, res, next) => {
  try {
    const { surveyId } = req.params;
    const body = { ...req.body };
    // Ensure JSON fields are objects (not strings) when upserted
    const jsonFields = ["generalNotes", "canvasDataEnv", "environmentalRisks", "canvasDataPest", "floorPlanCanvasData", "pestSections", "resumeRows"];
    for (const f of jsonFields) {
      if (typeof body[f] === "string") {
        try { body[f] = JSON.parse(body[f]); } catch { /* keep as is */ }
      }
    }
    const report = await prisma.b2BSurveyReport.upsert({
      where: { surveyId },
      update: body,
      create: { surveyId, ...body },
    });
    res.json({ data: report });
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
