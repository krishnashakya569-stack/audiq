import type { Track } from "@/store/player";

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

function resolve(url?: string | null) {
  if (!url) return "";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  // Ensure we don't accidentally double-slash if API already has a trailing slash
  const cleanApi = API.endsWith("/") ? API.slice(0, -1) : API;
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  
  return `${cleanApi}${cleanUrl}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function songToTrack(song: any): Track {
  const provider =
    song.providers?.[0]?.provider ??
    song.provider ??
    song.source ??
    "local";

  const rawId =
    song.providers?.[0]?.id ??
    song.id;

  const id = String(rawId);

  const realId = id.includes(":")
    ? id.split(":")[1]
    : id;

  let audio = "";

  // The NEXT_PUBLIC_API_URL already contains the /api suffix, 
  // so we just append the rest of the route here!
  if (provider === "youtube") {
    const cleanApi = API.endsWith("/") ? API.slice(0, -1) : API;
    audio = `${cleanApi}/stream/play/youtube/${realId}`;
  } else {
    audio = resolve(
      song.streamUrl ??
      song.previewUrl ??
      song.preview ??
      ""
    );
  }

  const artist =
    song.artists?.[0]?.name ??
    song.artist?.name ??
    song.artist ??
    "Unknown Artist";

  const artwork =
    song.artwork?.large ??
    song.artwork?.medium ??
    song.artwork?.small ??
    song.album?.cover_xl ??
    song.album?.cover_big ??
    song.album?.cover_medium ??
    song.albumArt ??
    "/covers/default.png";

  return {
    id: song.id,

    title: song.title,

    artist,

    albumArt: resolve(artwork),

    audio,

    duration: song.duration,

    isPreview:
      song.isPreview ??
      !song.streamUrl,

    source: provider,

    videoId:
      provider === "youtube"
        ? realId
        : undefined,

    externalUrl:
      song.externalUrl ??
      song.previewUrl ??
      undefined,
  };
}