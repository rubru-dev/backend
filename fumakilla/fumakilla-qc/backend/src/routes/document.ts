import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { createDocument, createDocumentVersion, deleteDocument, getDocument, listDocuments } from "../controllers/document.controller";
import { createUploader } from "../lib/upload";

const router = Router();
const upload = createUploader("documents", [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
], 20);

router.get("/", authenticate, listDocuments);
router.post("/", authenticate, upload.single("file"), createDocument);
router.get("/:id", authenticate, getDocument);
router.post("/:id/version", authenticate, upload.single("file"), createDocumentVersion);
router.delete("/:id", authenticate, requireRole("ADMIN", "QC_MANAGER"), deleteDocument);

export default router;
