"use client";

import {
  Compass,
  Disc3,
  Eye,
  LoaderCircle,
  Music2,
  Play,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  ThumbsDown,
  Undo2,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { songToTrack } from "@/lib/songAdapter";
import { searchMusic } from "@/services/music";
import type { Song } from "@/services/music/types";
import TrackActions from "@/components/library/TrackActions";
import { useAuth } from "@/features/auth/AuthProvider";
import { getMusicLanguageSearchTerm } from "@/features/settings/musicPreferences";
import { recommendationTrackKey, useLibraryStore } from "@/store/library";
import { type Track, usePlayerStore } from "@/store/player";

const categories = [
  { label: "Trending", query: "trending songs 2026", color: "from-[#00796b]/25 to-[#00332d]/10" },
  { label: "Hindi hits", query: "popular Hindi songs", color: "from-[#00594f]/25 to-[#004d40]/10" },
  { label: "Punjabi", query: "popular Punjabi songs", color: "from-orange-500/25 to-yellow-400/10" },
  { label: "Chill", query: "chill lofi music", color: "from-cyan-500/25 to-blue-500/10" },
  { label: "Pop", query: "popular pop songs", color: "from-fuchsia-500/25 to-violet-500/10" },
  { label: "Hip-hop", query: "popular hip hop songs", color: "from-emerald-500/25 to-teal-500/10" },
  { label: "Indie", query: "indie new music", color: "from-sky-500/25 to-indigo-500/10" },
];

function isPlayable(track: Track) {
  return !track.isPreview && Boolean(track.audio || (track.source === "youtube" && track.videoId));
}

function normalizeTrackText(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/\b(feat\.?|ft\.?)\b.*$/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function uniquePlayableTracks(songs: Song[]) {
  const tracks = songs.map(songToTrack).filter(isPlayable);
  const seen = new Set<string>();
  return tracks.filter((track) => {
    // A song returned by multiple providers or related searches should appear once.
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

function interleave<T>(groups: T[][]) {
  const mixed: T[] = [];
  const longestGroup = Math.max(0, ...groups.map((group) => group.length));
  for (let index = 0; index < longestGroup; index += 1) {
    for (const group of groups) {
      if (group[index] !== undefined) mixed.push(group[index]);
    }
  }
  return mixed;
}

function artistSeeds(likedSongs: Track[], recentlyPlayed: Track[]) {
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

function rankForYouTracks(tracks: Track[], likedSongs: Track[], recentlyPlayed: Track[]) {
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

function recommendationsForYou(likedSongs: Track[], recentlyPlayed: Track[], searchHistory: string[], language: string) {
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

function artistDiscoveries(tracks: Track[]) {
  const artists = new Map<string, { name: string; image: string; count: number }>();
  for (const track of tracks) {
    const name = track.artist.trim();
    const key = normalizeTrackText(name);
    if (!key || ["youtube", "audiq", "unknown artist"].includes(key)) continue;
    const current = artists.get(key);
    artists.set(key, {
      name: current?.name ?? name,
      image: current?.image || track.albumArt,
      count: (current?.count ?? 0) + 1,
    });
  }
  return [...artists.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 8);
}

function albumDiscoveries(songs: Song[]) {
  const albums = new Map<string, { id: string; title: string; artist: string; image: string; trackKeys: Set<string> }>();
  for (const song of songs) {
    // Audius and YouTube currently return a genre/channel in their album field;
    // only show providers whose search response includes actual collection metadata.
    if (!["itunes", "jiosaavn"].includes(song.provider?.toLowerCase() ?? "")) continue;
    const title = song.album?.title?.trim();
    const artist = song.artists?.map(({ name }) => name).filter(Boolean).join(", ") || "Unknown artist";
    const albumId = song.album?.id?.trim();
    if (!title || !albumId || ["music", "itunes", "jiosaavn", "unknown"].includes(normalizeTrackText(title))) continue;
    const key = `${song.provider}:${albumId}:${normalizeTrackText(artist)}`;
    const trackKey = `${normalizeTrackText(song.title)}:${normalizeTrackText(artist)}`;
    const current = albums.get(key);
    if (current) {
      current.trackKeys.add(trackKey);
    } else {
      albums.set(key, {
        id: key,
        title,
        artist,
        image: song.artwork?.large || song.artwork?.medium || song.artwork?.small || "/brand/audiq-vinyl.svg",
        trackKeys: new Set([trackKey]),
      });
    }
  }
  return [...albums.values()]
    .map(({ trackKeys, ...album }) => ({ ...album, count: trackKeys.size }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, 8);
}

function TrackRow({ track, index, tracks, isHidden, onToggleHidden }: { track: Track; index: number; tracks: Track[]; isHidden: boolean; onToggleHidden: () => void }) {
  const playTrack = usePlayerStore((state) => state.playTrack);

  return (
    <article className="group grid grid-cols-[2rem_3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-2.5 transition hover:border-[#00796b]/30 hover:bg-white/[0.07] sm:grid-cols-[2.5rem_3.5rem_minmax(0,1fr)_auto]">
      <button
        type="button"
        onClick={() => playTrack(track, tracks)}
        aria-label={`Play ${track.title} by ${track.artist}`}
        className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-[#00796b] hover:text-white"
      >
        <span className="group-hover:hidden">{index + 1}</span>
        <Play aria-hidden="true" className="hidden h-4 w-4 fill-current group-hover:block" />
      </button>
      <span className="relative h-12 w-12 overflow-hidden rounded-lg bg-[#101412]">
        <Image src={track.albumArt || "/brand/audiq-vinyl.svg"} alt="" fill sizes="48px" unoptimized className="object-cover" />
      </span>
      <button type="button" onClick={() => playTrack(track, tracks)} className="min-w-0 text-left">
        <span className="block truncate text-sm font-semibold text-white">{track.title}</span>
        <span className="block truncate text-xs text-zinc-500">{track.artist}</span>
      </button>
      <div className="flex shrink-0 items-center gap-0.5">
        <button type="button" onClick={onToggleHidden}
          aria-label={isHidden ? `Show ${track.title} in For You` : `Hide ${track.title} from For You`}
          title={isHidden ? "Keep in For You" : "Hide from For You"}
          className={`grid h-8 w-8 place-items-center rounded-md transition ${isHidden ? "text-[#80cbc4]" : "text-zinc-500 hover:bg-white/10 hover:text-white"}`}>
          {isHidden ? <Eye aria-hidden="true" className="h-4 w-4" /> : <ThumbsDown aria-hidden="true" className="h-4 w-4" />}
        </button>
        <TrackActions track={track} showQueue compact />
      </div>
    </article>
  );
}

export default function ExploreDashboard() {
  const { profile } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const likedSongs = useLibraryStore((state) => state.likedSongs);
  const recentlyPlayed = useLibraryStore((state) => state.recentlyPlayed);
  const searchHistory = useLibraryStore((state) => state.searchHistory);
  const hiddenRecommendations = useLibraryStore((state) => state.hiddenRecommendations);
  const markNotInterested = useLibraryStore((state) => state.markRecommendationNotInterested);
  const restoreRecommendation = useLibraryStore((state) => state.restoreRecommendation);
  const preferredLanguage = profile?.preferred_music_language ?? "auto";
  const preferredArtists = useMemo(() => artistSeeds(likedSongs, recentlyPlayed), [likedSongs, recentlyPlayed]);
  const personalizedQueries = useMemo(
    () => recommendationsForYou(likedSongs, recentlyPlayed, searchHistory, preferredLanguage),
    [likedSongs, recentlyPlayed, searchHistory, preferredLanguage],
  );
  const personalizedQuery = personalizedQueries[0];
  const browseCategories = useMemo(() => [
    { label: "For You", query: personalizedQuery, color: "from-[#d6ff36]/20 to-[#00594f]/20" },
    ...categories,
  ], [personalizedQuery]);
  const [activeCategory, setActiveCategory] = useState("For You");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [catalogSongs, setCatalogSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadedQuery, setLoadedQuery] = useState(personalizedQuery);
  const [showHiddenRecommendations, setShowHiddenRecommendations] = useState(false);
  const requestId = useRef(0);
  const addSearch = useLibraryStore((state) => state.addSearch);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const hiddenTrackKeys = useMemo(() => new Set(hiddenRecommendations.map(recommendationTrackKey)), [hiddenRecommendations]);
  const personalizedTracks = useMemo(
    () => rankForYouTracks(tracks, likedSongs, recentlyPlayed),
    [tracks, likedSongs, recentlyPlayed],
  );
  const visibleTracks = activeCategory === "For You"
    ? personalizedTracks.filter((track) => !hiddenTrackKeys.has(recommendationTrackKey(track)))
    : tracks;
  const visibleCatalogSongs = activeCategory === "For You"
    ? catalogSongs.filter((song) => !hiddenTrackKeys.has(recommendationTrackKey(songToTrack(song))))
    : catalogSongs;
  const discoveredArtists = useMemo(() => artistDiscoveries(visibleTracks), [visibleTracks]);
  const discoveredAlbums = useMemo(() => albumDiscoveries(visibleCatalogSongs), [visibleCatalogSongs]);

  const loadQuery = useCallback(async (query: string, saveToHistory = false, relatedQueries: string[] = []) => {
    const normalized = query.trim();
    if (!normalized) return;
    const queries = [...new Set([normalized, ...relatedQueries].map((value) => value.trim()).filter(Boolean))].slice(0, 3);

    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    setLoadedQuery(normalized);
    if (saveToHistory) addSearch(normalized);

    try {
      const responses = await Promise.allSettled(queries.map((value) => searchMusic(value)));
      if (currentRequest !== requestId.current) return;
      const songGroups = responses.map((response) => response.status === "fulfilled" ? response.value : []);
      const mergedSongs = interleave(songGroups);
      setCatalogSongs(mergedSongs);
      const results = uniquePlayableTracks(mergedSongs);
      setTracks(results);
      if (results.length === 0) {
        const allFailed = responses.every((response) => response.status === "rejected");
        setError(allFailed
          ? "Audiq could not reach the music catalog. Check your connection and try again."
          : "No playable songs matched this search. Try another style or artist.");
      }
    } catch {
      if (currentRequest !== requestId.current) return;
      setTracks([]);
      setCatalogSongs([]);
      setError("Audiq could not reach the music catalog. Check your connection and try again.");
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [addSearch]);

  useEffect(() => {
    if (activeCategory === "For You") {
      void loadQuery(personalizedQueries[0], false, personalizedQueries.slice(1));
    }
  }, [activeCategory, loadQuery, personalizedQueries]);

  const selectCategory = (category: (typeof browseCategories)[number]) => {
    const isForYou = category.label === "For You";
    setActiveCategory(category.label);
    setSearchInput("");
    // Moving into For You triggers the effect below; clicking it again refreshes the mix.
    if (!isForYou || activeCategory === "For You") {
      const related = isForYou ? personalizedQueries.slice(1) : [];
      void loadQuery(category.query, false, related);
    }
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchInput.trim();
    if (!query) return;
    setActiveCategory("");
    void loadQuery(query, true);
  };

  const queueAll = () => {
    visibleTracks.forEach(addToQueue);
    setError(`${visibleTracks.length} songs added to your queue.`);
  };

  const exploreArtist = (artist: string) => {
    setActiveCategory("Artist");
    setSearchInput("");
    void loadQuery(`${artist} songs`, false, [`popular ${artist} songs`, `${artist} hits`]);
  };

  const exploreAlbum = (album: (typeof discoveredAlbums)[number]) => {
    setActiveCategory("Album");
    setSearchInput("");
    void loadQuery(`${album.title} ${album.artist}`, false, [`songs from ${album.title} by ${album.artist}`]);
  };

  return (
    <section className="space-y-6 pb-8">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(0,121,107,.25),rgba(0,121,107,.12),rgba(0,0,0,.2))] p-5 sm:p-7">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#80cbc4]">
          <Compass aria-hidden="true" className="h-4 w-4" /> Discover music
        </p>
        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-white sm:text-5xl">Find your next favorite.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Browse what listeners are searching for, explore a sound, and play or save tracks straight from the catalog.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <TrendingUp aria-hidden="true" className="h-4 w-4 text-[#4db6ac]" />
            <span>{visibleTracks.length} playable tracks</span>
          </div>
        </div>
      </header>

      <form onSubmit={submitSearch} className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.045] p-2">
        <label className="flex min-w-0 flex-1 items-center gap-3 px-2">
          <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-zinc-500" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search artists, songs, or a vibe"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-zinc-500"
          />
        </label>
        <button type="submit" disabled={!searchInput.trim() || loading} className="rounded-xl bg-[#00594f] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#00695c] disabled:opacity-50">
          Search
        </button>
      </form>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles aria-hidden="true" className="h-4 w-4 text-[#4db6ac]" />
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-300">Browse a sound</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {browseCategories.map((category) => (
            <button
              key={category.label}
              type="button"
              onClick={() => selectCategory(category)}
              aria-pressed={activeCategory === category.label}
              className={`min-h-20 rounded-2xl border bg-gradient-to-br p-4 text-left transition hover:-translate-y-0.5 hover:border-white/25 ${category.color} ${activeCategory === category.label ? "border-[#4db6ac]/70 ring-1 ring-[#4db6ac]/30" : "border-white/10"}`}
            >
              <span className="block text-base font-bold text-white">{category.label}</span>
              <span className="mt-1 block truncate text-xs text-zinc-300">
                {category.label === "For You"
                  ? preferredArtists.length ? `Based on ${preferredArtists.slice(0, 2).join(" & ")}` : searchHistory.length ? "Inspired by your recent searches" : "Popular Indian picks to get started"
                  : "Explore the catalog"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {!loading && discoveredArtists.length > 0 ? (
        <section aria-labelledby="explore-artists-heading" className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#80cbc4]">From this mix</p>
              <h2 id="explore-artists-heading" className="mt-1 text-lg font-bold text-white">Artists to explore</h2>
            </div>
            <span className="text-xs text-zinc-500">Tap an artist to find more</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
            {discoveredArtists.slice(0, 6).map((artist) => (
              <button key={normalizeTrackText(artist.name)} type="button" onClick={() => exploreArtist(artist.name)}
                aria-label={`Explore songs by ${artist.name}`}
                className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-[#4db6ac]/45 hover:bg-[#00796b]/10">
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#101412] ring-1 ring-white/10">
                  <Image src={artist.image || "/brand/audiq-vinyl.svg"} alt="" fill sizes="48px" unoptimized className="object-cover transition group-hover:scale-105" />
                </span>
                <span className="min-w-0"><span className="block truncate text-sm font-bold text-white">{artist.name}</span><span className="mt-0.5 block text-xs text-zinc-500">{artist.count} track{artist.count === 1 ? "" : "s"} in this mix</span></span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!loading && discoveredAlbums.length > 0 ? (
        <section aria-labelledby="explore-albums-heading" className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#80cbc4]">Catalog collections</p>
              <h2 id="explore-albums-heading" className="mt-1 text-lg font-bold text-white">Albums in the catalog</h2>
            </div>
            <span className="text-xs text-zinc-500">Search matching songs</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {discoveredAlbums.map((album) => (
              <button key={album.id} type="button" onClick={() => exploreAlbum(album)}
                aria-label={`Explore ${album.title} by ${album.artist}`}
                className="group min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#4db6ac]/45 hover:bg-white/[0.07]">
                <span className="relative mb-3 block aspect-square overflow-hidden rounded-xl bg-[#101412]">
                  <Image src={album.image} alt="" fill sizes="(min-width:1280px) 18vw, 45vw" unoptimized className="object-cover transition duration-300 group-hover:scale-105" />
                  <span className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-[#00796b] text-white opacity-0 shadow-lg transition group-hover:opacity-100"><Search aria-hidden="true" className="h-4 w-4" /></span>
                </span>
                <span className="block truncate text-sm font-bold text-white">{album.title}</span>
                <span className="mt-1 block truncate text-xs text-zinc-500">{album.artist} · {album.count} track{album.count === 1 ? "" : "s"} found</span>
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#80cbc4]"><Disc3 aria-hidden="true" className="h-3 w-3" /> Search album</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {hiddenRecommendations.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">Your For You feedback</h2>
              <p className="mt-1 text-xs text-zinc-500">{hiddenRecommendations.length} song{hiddenRecommendations.length === 1 ? "" : "s"} hidden from recommendations. Search and playback are unchanged.</p>
            </div>
            <button type="button" onClick={() => setShowHiddenRecommendations((open) => !open)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white">
              {showHiddenRecommendations ? "Hide list" : "Manage"}
            </button>
          </div>
          {showHiddenRecommendations ? (
            <div className="mt-3 space-y-2">
              {hiddenRecommendations.map((track) => (
                <div key={`${track.source}:${track.id}:${track.videoId ?? ""}`} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-black/15 px-3 py-2">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{track.title}</p><p className="truncate text-xs text-zinc-500">{track.artist}</p></div>
                  <button type="button" onClick={() => restoreRecommendation(track)} className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-[#80cbc4] hover:bg-[#00796b]/15">
                    <Undo2 aria-hidden="true" className="h-3.5 w-3.5" /> Restore
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{activeCategory || "Search results"}</p>
            <h2 className="mt-1 text-xl font-bold text-white">{loadedQuery}</h2>
          </div>
          {visibleTracks.length > 0 && (
            <div className="flex gap-2">
              <button type="button" onClick={() => playTrack(visibleTracks[0], visibleTracks)} className="inline-flex items-center gap-2 rounded-xl bg-[#00796b] px-3 py-2 text-sm font-bold text-white hover:bg-[#00695c]">
                <Play aria-hidden="true" className="h-4 w-4 fill-current" /> Play all
              </button>
              <button type="button" onClick={queueAll} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/10 hover:text-white">
                <Plus aria-hidden="true" className="h-4 w-4" /> Add all
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid min-h-48 place-items-center text-center text-sm text-zinc-400">
            <span><LoaderCircle aria-hidden="true" className="mx-auto mb-3 h-6 w-6 animate-spin text-[#4db6ac]" />Finding tracks for you…</span>
          </div>
        ) : visibleTracks.length > 0 ? (
          <div className="space-y-2">
            {visibleTracks.map((track, index) => (
              <TrackRow
                key={`${track.source}:${track.id}:${track.videoId ?? ""}`}
                track={track}
                index={index}
                tracks={visibleTracks}
                isHidden={hiddenTrackKeys.has(recommendationTrackKey(track))}
                onToggleHidden={() => hiddenTrackKeys.has(recommendationTrackKey(track))
                  ? restoreRecommendation(track)
                  : markNotInterested(track)}
              />
            ))}
          </div>
        ) : (
          <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-white/10 p-6 text-center">
            <div>
              <Music2 aria-hidden="true" className="mx-auto h-7 w-7 text-zinc-500" />
              <p className="mt-3 font-semibold text-zinc-300">{tracks.length > 0 && activeCategory === "For You" ? "You’ve hidden these picks from For You." : error || "Loading the music catalog…"}</p>
              {error && <button type="button" onClick={() => void loadQuery(loadedQuery)} className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/10">Try again</button>}
            </div>
          </div>
        )}
        {error && tracks.length > 0 && <p role="status" className="mt-3 text-sm text-zinc-400">{error}</p>}
      </section>
    </section>
  );
}
