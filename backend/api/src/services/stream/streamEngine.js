import { logger } from "../../config/logger.js";
import { streamCache } from "./cache.js";
import { extractAudio } from "./extractor.js";

class StreamEngine {

  async get(videoId) {

    const start = Date.now();

    const cached = streamCache.get(videoId);

    if (cached) {

      logger.info({
        event: "STREAM_CACHE_HIT",
        videoId,
        duration: Date.now() - start,
      });

      return cached;
    }

    logger.info({
      event: "STREAM_CACHE_MISS",
      videoId,
    });

    const data = await extractAudio(videoId);

    streamCache.set(videoId, data);

    logger.info({
      event: "STREAM_EXTRACT_SUCCESS",
      videoId,
      title: data.title,
      artist: data.artist,
      extractionTime: Date.now() - start,
    });

    return data;
  }

  invalidate(videoId) {

    streamCache.delete(videoId);

    logger.info({
      event: "CACHE_INVALIDATED",
      videoId,
    });

  }

  stats() {

    return streamCache.getStats();

  }

}

export const streamEngine = new StreamEngine();