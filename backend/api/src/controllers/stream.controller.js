import axios from "axios";
import providerManager from "../providers/index.js";

const STREAM_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Referer: "https://www.youtube.com/",
  Origin: "https://www.youtube.com",
  "Accept-Language": "en-US,en;q=0.9",
};

const SKIPPED_UPSTREAM_HEADERS = new Set([
  "access-control-allow-origin",
  "access-control-allow-credentials",
  "access-control-expose-headers",
  "connection",
  "transfer-encoding",
]);

export async function info(req, res) {
  try {
    const { provider, id } = req.params;

    const data = await providerManager.getStream(provider, id);

    res.json({
      provider,
      id,
      title: data.title,
      artist: data.artist,
      duration: data.duration,
      thumbnail: data.thumbnail,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
}

export async function play(req, res) {
  try {
    const { provider, id } = req.params;

    const data = await providerManager.getStream(provider, id);

    console.log(`[${provider}] Streaming: ${data.title}`);

    const headers = {
      ...STREAM_HEADERS,
    };

    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    const response = await axios({
      method: "GET",
      url: data.streamUrl,
      responseType: "stream",
      headers,
      validateStatus: () => true,
    });

    if (response.status !== 200 && response.status !== 206) {
      return res.status(response.status).send("Upstream rejected stream");
    }

    res.status(response.status);

    Object.entries(response.headers).forEach(([key, value]) => {
      if (
        value &&
        !SKIPPED_UPSTREAM_HEADERS.has(key.toLowerCase())
      ) {
        res.setHeader(key, value);
      }
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, max-age=300");

    response.data.pipe(res);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
}