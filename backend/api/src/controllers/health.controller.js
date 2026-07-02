import { streamEngine } from "../services/stream/streamEngine.js";

export function health(req, res) {

  res.json({

    status: "ok",

    uptime: process.uptime(),

    memory: process.memoryUsage(),

    cache: streamEngine.stats(),

    timestamp: new Date(),

  });

}