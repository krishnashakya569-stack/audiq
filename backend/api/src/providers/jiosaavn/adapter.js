import BaseAdapter from "../base/BaseAdapter.js";

export default class JioSaavnAdapter extends BaseAdapter {
  constructor() {
    super(
      process.env.JIOSAAVN_API_BASE_URL,
      process.env.JIOSAAVN_API_KEY
    );
  }

  buildSearchUrl(query) {
    const normalized = this.baseUrl.replace(/\/$/, "");

    if (normalized.includes("saavn.dev")) {
      return `${normalized}/api/search/songs?query=${encodeURIComponent(query)}`;
    }

    return `${normalized}/search?q=${encodeURIComponent(query)}`;
  }

  async search(query) {
    if (!this.enabled) {
      return [];
    }

    return this.request(this.buildSearchUrl(query));
  }
}