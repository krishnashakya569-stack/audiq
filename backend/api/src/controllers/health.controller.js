export function health(req, res) {
  res.json({
    status: "ok",

    uptime: process.uptime(),

    memory: process.memoryUsage(),

    providers: {
      youtube: "enabled",
      jiosaavn: "coming-soon",
      audius: "coming-soon",
      spotify: "metadata-only",
    },

    timestamp: new Date(),
  });
}