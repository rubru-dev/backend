import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { createCapa, createNcr, getNcr, listNcr, updateCapa, updateNcr } from "../controllers/ncr.controller";

const router = Router();

router.get("/", authenticate, listNcr);
router.post("/", authenticate, createNcr);
router.get("/:id", authenticate, getNcr);
router.put("/:id", authenticate, updateNcr);
router.post("/:id/capa", authenticate, createCapa);
router.put("/capa/:id", authenticate, updateCapa);

export default router;
