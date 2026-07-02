import youtubedl from "yt-dlp-exec";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function getExtractorOptions() {
  const options = {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    noPlaylist: true,
    preferFreeFormats: true,
    geoBypass: true,
    forceIpv4: true,
    format: "bestaudio[ext=m4a]/bestaudio[acodec!=none]/bestaudio/best",
    userAgent: USER_AGENT,
    referer: "https://www.youtube.com/",
    addHeader: [
      `User-Agent: ${USER_AGENT}`,
      "Referer: https://www.youtube.com/",
      "Origin: https://www.youtube.com",
      "Accept-Language: en-US,en;q=0.9",
    ],
  };

  if (process.env.YTDLP_COOKIES_PATH) {
    options.cookies = process.env.YTDLP_COOKIES_PATH;
  }

  if (process.env.YTDLP_PROXY_URL) {
    options.proxy = process.env.YTDLP_PROXY_URL;
  }

  return options;
}

/**
 * Extract the best available audio stream from YouTube.
 */
export async function extractAudio(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const info = await youtubedl(url, getExtractorOptions(), {
    timeout: 30000,
  });

  const audio =
    info.formats
      ?.filter(
        (format) =>
          format.vcodec === "none" &&
          format.acodec !== "none" &&
          format.url
      )
      .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];

  if (!audio) {
    throw new Error("No playable audio stream found.");
  }

  return {
    videoId,
    title: info.title,
    artist: info.uploader,
    duration: info.duration,
    thumbnail: info.thumbnail,
    streamUrl: audio.url,
    extractedAt: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 60,
  };
}
