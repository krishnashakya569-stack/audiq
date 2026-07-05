import { sortProviders } from "./providerPriority.js";
const REMOVE_PATTERNS = [
  /\(official video\)/gi,
  /\(official audio\)/gi,
  /\(official music video\)/gi,
  /\(lyrics\)/gi,
  /\(lyric video\)/gi,
  /\(audio\)/gi,
  /\(video\)/gi,
  /\(visualizer\)/gi,
  /\(live.*?\)/gi,
  /\(remix.*?\)/gi,
  /\(cover.*?\)/gi,
  /\(sped up.*?\)/gi,
  /\(slowed.*?\)/gi,
  /\(reverb.*?\)/gi,
  /\(8d.*?\)/gi,
  /\(bass boosted.*?\)/gi,

  /\[official video\]/gi,
  /\[official audio\]/gi,
  /\[lyrics\]/gi,
  /\[audio\]/gi,
  /\[video\]/gi,

  /official video/gi,
  /official audio/gi,
  /official music video/gi,
  /lyrics/gi,
  /lyric video/gi,
  /visualizer/gi,
  /audio/gi,
  /video/gi,
  /live/gi,
  /cover/gi,
  /remix/gi,
  /nightcore/gi,
  /sped up/gi,
  /speed up/gi,
  /slowed/gi,
  /reverb/gi,
  /8d/gi,
  /bass boosted/gi,

  /feat\..*/gi,
  /ft\..*/gi,
];

function normalize(text = "") {
  let value = text.toLowerCase();

  for (const pattern of REMOVE_PATTERNS) {
    value = value.replace(pattern, "");
  }

  value = value
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return value;
}

function makeKey(song) {
  const title = normalize(song.title);

  const artist = normalize(
    song.artists
      ?.map((a) => a.name)
      .join(" ") || ""
  );

  return `${title}|${artist}`;
}

function mergeSong(existing, incoming) {
  if (
    incoming.artwork?.large &&
    incoming.artwork.large.length >
      (existing.artwork?.large?.length || 0)
  ) {
    existing.artwork = incoming.artwork;
  }

  if (!existing.duration && incoming.duration) {
    existing.duration = incoming.duration;
  }

  if (!existing.streamUrl && incoming.streamUrl) {
    existing.streamUrl = incoming.streamUrl;
  }

  if (!existing.previewUrl && incoming.previewUrl) {
    existing.previewUrl = incoming.previewUrl;
  }

  if (
    !existing.language &&
    incoming.language
  ) {
    existing.language = incoming.language;
  }

  if (
    !existing.providers.some(
      (p) =>
        p.provider === incoming.provider &&
        p.id === incoming.id
    )
  ) {
    existing.providers.push({
      provider: incoming.provider,
      id: incoming.id,
      playable: incoming.playable,
    });
  }

  return existing;
}

export function deduplicateSongs(songs) {
  const map = new Map();

  for (const song of songs) {
    const key = makeKey(song);

    if (!map.has(key)) {
      map.set(key, {
        ...song,
        providers: [
          {
            provider: song.provider,
            id: song.id,
            playable: song.playable,
          },
        ],
      });

      continue;
    }

    mergeSong(map.get(key), song);
  }

  return [...map.values()].map((song) => ({
  ...song,
  providers: sortProviders(song.providers),
}));
}