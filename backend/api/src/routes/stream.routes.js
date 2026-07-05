import { Router } from "express";
import { info, play } from "../controllers/stream.controller.js";

const router = Router();

router.get("/info/:provider/:id", info);
router.get("/play/:provider/:id", play);

export default router;