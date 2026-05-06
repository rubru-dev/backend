import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { createBatch, getBatch, listBatches, updateBatchStatus } from "../controllers/batch.controller";

const router = Router();

router.get("/", authenticate, listBatches);
router.post("/", authenticate, createBatch);
router.get("/:id", authenticate, getBatch);
router.put("/:id/status", authenticate, requireRole("ADMIN", "QC_MANAGER"), updateBatchStatus);

export default router;
