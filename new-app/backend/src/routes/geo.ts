import { Router, Request, Response } from "express";
import { reverseGeocode, numOrNull } from "../lib/reverseGeocode";

const router = Router();

// GET /api/v1/geo/reverse?lat=&lng= — nama lokasi dari koordinat (untuk cap foto clock in/out di frontend)
router.get("/reverse", async (req: Request, res: Response) => {
  const lat = numOrNull(req.query.lat);
  const lng = numOrNull(req.query.lng);
  if (lat == null || lng == null) return res.json({ location: null });
  const location = await reverseGeocode(lat, lng);
  return res.json({ location });
});

export default router;
