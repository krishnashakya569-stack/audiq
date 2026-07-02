import { Router } from "express";
import { search, streamAudius } from "../controllers/music.controller.js";

const router = Router();

router.get("/search", search);
router.get("/stream/audius/:id", streamAudius);

export default router;
