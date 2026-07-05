export default class BaseAdapter {
  constructor(baseUrl = "", apiKey = null) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  get enabled() {
    return Boolean(this.baseUrl);
  }

  buildHeaders(extra = {}) {
    return {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      ...(this.apiKey
        ? {
            Authorization: `Bearer ${this.apiKey}`,
          }
        : {}),
      ...extra,
    };
  }

  async request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: this.buildHeaders(options.headers),
    });

    if (!response.ok) {
      throw new Error(
        `${this.constructor.name}: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }
}