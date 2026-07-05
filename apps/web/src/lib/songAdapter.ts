import type { Song } from "@/services/music/types";
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

  return `${API}${url}`;
}

export function songToTrack(song: any): Track {
  const provider =
    song.providers?.[0]?.provider ??
    song.provider ??
    song.source ??
    "youtube";

  const rawId =
    song.providers?.[0]?.id ??
    song.id ??
    "";

  const id = String(rawId);

  const realId = id.includes(":")
    ? id.split(":")[1]
    : id;

  let audio = "";

  if (provider === "youtube") {
    audio = `${API}/api/stream/play/youtube/${realId}`;
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
    "Unknown Artist";

  const artwork =
    song.artwork?.large ??
    song.artwork?.medium ??
    song.artwork?.small ??
    song.album?.cover_xl ??
    song.album?.cover_big ??
    song.album?.cover_medium ??
    song.album?.cover ??
    "/media/audiq-logo.png";

  return {
    id,

    title:
      song.title ??
      "Unknown",

    artist,

    albumArt: resolve(artwork),

    audio,

    duration:
      Number(song.duration) || 0,

    isPreview:
      song.isPreview ??
      false,

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