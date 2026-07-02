import { createAiDjPlan } from "../services/aiDj.service.js";

export async function aiDj(req, res) {
  try {
    const plan = await createAiDjPlan({
      mood: req.body?.mood,
      energy: Number(req.body?.energy ?? 70),
      seed: req.body?.seed,
      likedSongs: Array.isArray(req.body?.likedSongs) ? req.body.likedSongs : [],
      recentlyPlayed: Array.isArray(req.body?.recentlyPlayed) ? req.body.recentlyPlayed : [],
    });

    res.json(plan);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "AI DJ failed",
    });
  }
}
