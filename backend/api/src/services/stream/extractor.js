import youtubedl from "yt-dlp-exec";

/**
 * Extract the best available audio stream from YouTube.
 */
export async function extractAudio(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const info = await youtubedl(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    preferFreeFormats: true,
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