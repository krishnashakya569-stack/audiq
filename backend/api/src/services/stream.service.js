import { extractAudio } from "./stream/extractor.js";

const cache = new Map();

export async function getAudioStream(videoId) {

  const cached = cache.get(videoId);

  if (cached) {
    if (cached.expiresAt > Date.now()) {
      return cached;
    }

    cache.delete(videoId);
  }

  const fresh = await extractAudio(videoId);

  cache.set(videoId, fresh);

  return fresh;
}
