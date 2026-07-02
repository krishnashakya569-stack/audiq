import axios from "axios";
import { getAudioStream } from "../services/stream.service.js";

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
    const data = await getAudioStream(req.params.videoId);

    res.json({
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
    const data = await getAudioStream(req.params.videoId);

    console.log("Streaming:", {
      videoId: req.params.videoId,
      title: data.title,
    });

    const requestHeaders = {
      ...STREAM_HEADERS,
    };

    if (req.headers.range) {
      requestHeaders.Range = req.headers.range;
    }

    const response = await axios({
      method: "GET",
      url: data.streamUrl,
      responseType: "stream",
      headers: requestHeaders,
      validateStatus: () => true,
    });

    console.log("STATUS:", response.status);
    console.log("TYPE:", response.headers["content-type"]);

    if (response.status !== 200 && response.status !== 206) {
      console.log(response.headers);
      return res.status(response.status).send("YouTube rejected stream");
    }

    res.status(response.status);

    Object.entries(response.headers).forEach(([key, value]) => {
      if (value && !SKIPPED_UPSTREAM_HEADERS.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, max-age=300");

    response.data.pipe(res);
  } catch (err) {
    console.error("STREAM ERROR");
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
}
