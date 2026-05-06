import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { defectTrend, overview, passRate } from "../controllers/analytics.controller";

const router = Router();

router.get("/overview", authenticate, overview);
router.get("/pass-rate", authenticate, passRate);
router.get("/defect-trend", authenticate, defectTrend);

export default router;
