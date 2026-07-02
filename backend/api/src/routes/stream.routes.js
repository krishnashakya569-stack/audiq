import { Router } from "express";

import { info, play } from "../controllers/stream.controller.js";

const router = Router();

router.get("/info/:videoId", info);

router.get("/play/:videoId", play);

export default router;