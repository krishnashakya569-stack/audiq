import { getBestProvider } from "../services/music/providerPriority.js";
import { deduplicateSongs } from "../services/music/deduplicator.js";
import { rankSongs } from "../services/music/ranking.js";
import { filterSearch } from "../services/music/searchEngine.js";
class ProviderManager {
  constructor() {
    this.providers = new Map();
  }

  register(provider) {
    this.providers.set(provider.getName(), provider);
  }

  get(name) {
    return this.providers.get(name);
  }

  getAll() {
    return [...this.providers.values()];
  }

  async search(query) {
    const results = await Promise.allSettled(
      this.getAll().map((provider) => provider.search(query))
    );

    const merged = results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value);
    
    const filtered = filterSearch(
      query,
      merged
    );  

    const deduplicated = deduplicateSongs(merged);

    const ranked = rankSongs(query, deduplicated);

    return ranked.map((song) => ({
  ...song,
  preferredProvider: getBestProvider(song),
}));
  }

  async getStream(providerName, id) {
    const provider = this.get(providerName);

    if (!provider) {
      throw new Error(`Unknown provider: ${providerName}`);
    }

    return provider.getStream(id);
  }
}

export default new ProviderManager();  