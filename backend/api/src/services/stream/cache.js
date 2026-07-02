const DEFAULT_TTL = 1000 * 60 * 60; // 1 hour

class StreamCache {
  constructor() {
    this.cache = new Map();

    this.stats = {
      hits: 0,
      misses: 0,
      writes: 0,
      deletes: 0,
    };

    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  get(videoId) {
    const item = this.cache.get(videoId);

    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (item.expiresAt < Date.now()) {
      this.cache.delete(videoId);
      this.stats.deletes++;
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;

    return item;
  }

  set(videoId, data, ttl = DEFAULT_TTL) {
    this.cache.set(videoId, {
      ...data,
      expiresAt: Date.now() + ttl,
    });

    this.stats.writes++;
  }

  delete(videoId) {
    this.cache.delete(videoId);
    this.stats.deletes++;
  }

  cleanup() {
    const now = Date.now();

    for (const [id, item] of this.cache.entries()) {
      if (item.expiresAt < now) {
        this.cache.delete(id);
        this.stats.deletes++;
      }
    }
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;

    return {
      ...this.stats,
      size: this.cache.size,
      hitRate:
        total === 0
          ? 0
          : ((this.stats.hits / total) * 100).toFixed(2) + "%",
    };
  }
}

export const streamCache = new StreamCache();