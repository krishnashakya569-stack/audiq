import { Router } from "express";
import { aiDj } from "../controllers/ai.controller.js";

const router = Router();

router.post("/dj", aiDj);

export default router;
