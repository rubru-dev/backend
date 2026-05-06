import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { createInspection, deleteInspection, getInspection, listInspections, updateInspection } from "../controllers/inspection.controller";

const router = Router();

router.get("/", authenticate, listInspections);
router.post("/", authenticate, createInspection);
router.get("/:id", authenticate, getInspection);
router.put("/:id", authenticate, updateInspection);
router.delete("/:id", authenticate, requireRole("ADMIN", "QC_MANAGER"), deleteInspection);

export default router;
