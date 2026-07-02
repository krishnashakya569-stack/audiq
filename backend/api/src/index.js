import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import aiRoutes from "./routes/ai.routes.js";
import musicRoutes from "./routes/music.routes.js";
import streamRoutes from "./routes/stream.routes.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use("/media", express.static(path.resolve(__dirname, "../media")));

app.get("/", (req, res) => {
  res.json({
    app: "Audiq API",
    status: "Running 🚀",
  });
});

app.use("/api/music", musicRoutes);
app.use("/api/stream", streamRoutes);
app.use("/api/ai", aiRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Audiq API running on http://localhost:${PORT}`);
});

import { errorHandler } from "./middleware/errorHandler.js";
app.use(errorHandler);
import healthRoutes from "./routes/health.routes.js";

app.use("/health", healthRoutes);
