import { songToTrack } from "@/lib/songAdapter";
import type { Song } from "@/services/music/types";
import { getMusicLanguageSearchTerm } from "@/features/settings/musicPreferences";
import type { Track } from "@/store/player";

export function isPlayable(track: Track) {
  return !track.isPreview && Boolean(track.audio || (track.source === "youtube" && track.videoId));
}

export function normalizeTrackText(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/\b(feat\.?|ft\.?)\b.*$/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function uniquePlayableTracks(songs: Song[]) {
  const tracks = songs.map(songToTrack).filter(isPlayable);
  const seen = new Set<string>();
  return tracks.filter((track) => {
    const title = normalizeTrackText(track.title);
    const artist = normalizeTrackText(track.artist);
    const key = title && artist
      ? `${title}:${artist}`
      : `${track.source ?? "unknown"}:${track.id}:${track.videoId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function interleave<T>(groups: T[][]) {
  const mixed: T[] = [];
  const longestGroup = Math.max(0, ...groups.map((group) => group.length));
  for (let index = 0; index < longestGroup; index += 1) {
    for (const group of groups) {
      if (group[index] !== undefined) mixed.push(group[index]);
    }
  }
  return mixed;
}

export function artistSeeds(likedSongs: Track[], recentlyPlayed: Track[]) {
  const scores = new Map<string, { label: string; score: number }>();
  for (const track of likedSongs) {
    const label = track.artist.trim();
    const key = normalizeTrackText(label);
    if (!key || key === "youtube" || key === "audiq") continue;
    const current = scores.get(key);
    scores.set(key, { label: current?.label ?? label, score: (current?.score ?? 0) + 3 });
  }
  for (const track of recentlyPlayed) {
    const label = track.artist.trim();
    const key = normalizeTrackText(label);
    if (!key || key === "youtube" || key === "audiq") continue;
    const current = scores.get(key);
    scores.set(key, { label: current?.label ?? label, score: (current?.score ?? 0) + 1 });
  }
  return [...scores.values()].sort((a, b) => b.score - a.score).map(({ label }) => label);
}

export function rankForYouTracks(tracks: Track[], likedSongs: Track[], recentlyPlayed: Track[]) {
  const artistAffinity = new Map<string, number>();
  const likedTitles = new Set<string>();
  const recentTitles = new Set<string>();
  const addAffinity = (track: Track, points: number) => {
    const artistKey = normalizeTrackText(track.artist);
    if (artistKey) artistAffinity.set(artistKey, (artistAffinity.get(artistKey) ?? 0) + points);
  };

  likedSongs.forEach((track) => {
    addAffinity(track, 3);
    likedTitles.add(normalizeTrackText(track.title));
  });
  recentlyPlayed.forEach((track, index) => {
    addAffinity(track, Math.max(0.5, 1.75 - index * 0.12));
    recentTitles.add(normalizeTrackText(track.title));
  });

  return tracks
    .map((track, index) => {
      const artistKey = normalizeTrackText(track.artist);
      const titleKey = normalizeTrackText(track.title);
      const noveltyBoost = (likedTitles.has(titleKey) ? -0.65 : 0) + (recentTitles.has(titleKey) ? -0.35 : 0);
      return { track, index, score: (artistAffinity.get(artistKey) ?? 0) + noveltyBoost };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ track }) => track);
}

export function recommendationsForYou(
  likedSongs: Track[],
  recentlyPlayed: Track[],
  searchHistory: string[],
  language: string,
) {
  const artists = artistSeeds(likedSongs, recentlyPlayed);
  const recentSearch = searchHistory.find((query) => query.trim().length > 1)?.trim();
  const regionalQuery = `popular ${getMusicLanguageSearchTerm(language)} songs`;
  const trendingRegionalQuery = `trending ${getMusicLanguageSearchTerm(language)} songs`;
  const queries = artists.length
    ? [
        `${artists[0]} similar songs`,
        artists[1] ? `${artists[1]} popular songs` : recentSearch ? `${recentSearch} similar songs` : regionalQuery,
        recentSearch && normalizeTrackText(recentSearch) !== normalizeTrackText(artists[0])
          ? `${recentSearch} similar songs`
          : artists[2] ? `${artists[2]} similar songs` : trendingRegionalQuery,
      ]
    : recentSearch
      ? [`${recentSearch} similar songs`, regionalQuery, "trending Indian indie songs"]
      : language === "auto"
        ? [regionalQuery, "trending Indian indie songs", "popular Punjabi songs"]
        : [regionalQuery, "trending Indian indie songs", trendingRegionalQuery];

  const seen = new Set<string>();
  return queries.filter((query) => {
    const key = normalizeTrackText(query);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
