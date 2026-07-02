import { musicEngine } from "../services/music/engine.js";
import { audiusStreamUrl } from "../services/audius.service.js";

export async function search(req, res) {
  try {
    const q = req.query.q;

    if (!q) {
      return res.status(400).json({
        message: "Missing search query",
      });
    }

    const songs = await musicEngine.search(q);

    res.json(songs);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Search failed",
    });
  }
}

export function streamAudius(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      message: "Missing Audius track id",
    });
  }

  res.redirect(audiusStreamUrl(id));
}
