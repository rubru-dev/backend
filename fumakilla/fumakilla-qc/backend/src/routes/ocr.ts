import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { createOcr, deleteOcr, getOcr, listOcr, processOcr, updateOcr } from "../controllers/ocr.controller";
import { createUploader } from "../lib/upload";

const router = Router();
const upload = createUploader("ocr", ["image/png", "image/jpeg", "image/webp", "image/tiff"], 8);

router.post("/process", authenticate, upload.single("image"), processOcr);
router.post("/", authenticate, createOcr);
router.get("/", authenticate, listOcr);
router.get("/:id", authenticate, getOcr);
router.put("/:id", authenticate, updateOcr);
router.delete("/:id", authenticate, deleteOcr);

export default router;
