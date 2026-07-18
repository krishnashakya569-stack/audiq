import youtubedl from "yt-dlp-exec";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { isYouTubeStreamingEnabled } from "./availability.js";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const cache = new Map();

function getOptions() {
  const options = {
    dumpSingleJson: true,
    noWarnings: true,
    noPlaylist: true,
    forceIpv4: true,
    noCheckCertificates: true,
    extractorRetries: 5,
    retries: 10,
    fragmentRetries: 10,
    socketTimeout: 30,
    format: "bestaudio/best",
    userAgent: USER_AGENT,
    referer: "https://www.youtube.com/",
    addHeader: [
      `User-Agent: ${USER_AGENT}`,
      "Referer: https://www.youtube.com/",
      "Origin: https://www.youtube.com",
      "Accept-Language: en-US,en;q=0.9",
    ],
  };

  const cookiesPath = process.env.YTDLP_COOKIES_PATH;

  if (cookiesPath && fs.existsSync(cookiesPath)) {
    const temp = path.join(os.tmpdir(), "cookies.txt");
    fs.copyFileSync(cookiesPath, temp);
    options.cookies = temp;
  }

  if (process.env.YTDLP_PROXY_URL) {
    options.proxy = process.env.YTDLP_PROXY_URL;
  }

  return options;
}

export async function getYouTubeStream(videoId) {
  if (!isYouTubeStreamingEnabled()) {
    throw new Error(
      "YouTube streaming is disabled until YTDLP_COOKIES_PATH, YTDLP_PROXY_URL, or YTDLP_ALLOW_UNAUTHENTICATED=true is configured."
    );
  }

  const cached = cache.get(videoId);

  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const info = await youtubedl(url, getOptions(), {
    timeout: 30000,
  });

  const audio = info.formats
    ?.filter(
      (f) =>
        f.vcodec === "none" &&
        f.acodec !== "none" &&
        f.url
    )
    .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];

  if (!audio) {
    throw new Error("No audio stream found.");
  }

  const result = {
    videoId,
    title: info.title,
    artist: info.uploader,
    duration: info.duration,
    thumbnail: info.thumbnail,
    streamUrl: audio.url,
    expiresAt: Date.now() + 60 * 60 * 1000,
  };

  cache.set(videoId, result);

  return result;
}
