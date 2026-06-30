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
    // Map topViewImagePath → coverImagePath so frontend stays consistent
    const mappedReport = report ? { ...report, coverImagePath: report.topViewImagePath } : null;
    res.json({ data: mappedReport, survey });
  } catch (e) {
    next(e);
  }
});

router.post("/:surveyId", async (req, res, next) => {
  try {
    const { surveyId } = req.params;
    const raw = { ...req.body };

    // Ensure JSON fields are parsed objects (not strings)
    const jsonFields = ["generalNotes", "canvasDataEnv", "environmentalRisks", "canvasDataPest", "floorPlanCanvasData", "pestSections", "resumeRows"];
    for (const f of jsonFields) {
      if (typeof raw[f] === "string") {
        try { raw[f] = JSON.parse(raw[f]); } catch { /* keep as is */ }
      }
    }

    // Whitelist: only pass fields that exist in the Prisma schema
    // coverImagePath is stored in topViewImagePath until client regen after server restart
    const {
      clientName, clientAddress, coverImagePath,
      surveyorNames, surveyDate, generalNotes,
      topViewImagePath, frontViewImagePath, mapImagePath, canvasDataEnv, areaCondition, environmentalRisks,
      pestConcernImagePath, canvasDataPest, pestConcern, inspectionFocus,
      floorPlanImagePath, floorPlanCanvasData,
      pestSections, resumeRows, status,
    } = raw;

    const body: Record<string, any> = {
      clientName, clientAddress,
      surveyorNames, surveyDate, generalNotes,
      topViewImagePath: coverImagePath ?? topViewImagePath, // map coverImagePath → topViewImagePath
      frontViewImagePath, mapImagePath, canvasDataEnv, areaCondition, environmentalRisks,
      pestConcernImagePath, canvasDataPest, pestConcern, inspectionFocus,
      floorPlanImagePath, floorPlanCanvasData,
      pestSections, resumeRows, status,
    };

    // Strip undefined to avoid overwriting with null
    for (const k of Object.keys(body)) {
      if (body[k] === undefined) delete body[k];
    }

    const report = await prisma.b2BSurveyReport.upsert({
      where: { surveyId },
      update: body,
      create: { surveyId, ...body },
    });

    // Map back so frontend gets coverImagePath in response
    res.json({ data: { ...report, coverImagePath: report.topViewImagePath } });
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
