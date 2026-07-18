import type { Track } from "@/store/player";
import { buildApiUrl, resolveMediaUrl } from "@/services/api";

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

  const directAudio = resolveMediaUrl(
    song.streamUrl ??
    song.previewUrl ??
    song.preview ??
    ""
  );

  let audio = directAudio;
  let fallbackAudio = "";

  if (provider === "youtube") {
    audio = buildApiUrl(
      `/stream/play/youtube/${encodeURIComponent(realId)}`
    );
    fallbackAudio = directAudio;
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

    albumArt: resolveMediaUrl(artwork),

    audio,
    fallbackAudio,

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
