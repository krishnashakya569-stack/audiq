import youtubedl from "yt-dlp-exec";

const cache = new Map();

async function extract(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const info = await youtubedl(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    preferFreeFormats: true,
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
    throw new Error("No audio stream found");
  }

  return {
    title: info.title,
    artist: info.uploader,
    duration: info.duration,
    thumbnail: info.thumbnail,
    streamUrl: audio.url,
    expires: Date.now() + 1000 * 60 * 60,
  };
}

export async function getAudioStream(videoId) {

  const cached = cache.get(videoId);

  if (cached && cached.expires > Date.now()) {
    return cached;
  }

  const fresh = await extract(videoId);

  cache.set(videoId, fresh);

  return fresh;
}