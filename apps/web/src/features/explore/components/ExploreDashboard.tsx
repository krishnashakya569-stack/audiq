"use client";

import {
  Compass,
  Heart,
  LoaderCircle,
  Music2,
  Play,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { songToTrack } from "@/lib/songAdapter";
import { searchMusic } from "@/services/music";
import type { Song } from "@/services/music/types";
import { useLibraryStore } from "@/store/library";
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

function uniquePlayableTracks(songs: Song[]) {
  const tracks = songs.map(songToTrack).filter(isPlayable);
  const seen = new Set<string>();
  return tracks.filter((track) => {
    const key = `${track.source ?? "unknown"}:${track.id}:${track.videoId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function TrackRow({ track, index, tracks }: { track: Track; index: number; tracks: Track[] }) {
  const playTrack = usePlayerStore((state) => state.playTrack);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const likeSong = useLibraryStore((state) => state.likeSong);
  const unlikeSong = useLibraryStore((state) => state.unlikeSong);
  const isLiked = useLibraryStore((state) => state.likedSongs.some((song) => song.id === track.id));

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
      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => (isLiked ? unlikeSong(track.id) : likeSong(track))}
          aria-label={isLiked ? `Unlike ${track.title}` : `Like ${track.title}`}
          aria-pressed={isLiked}
          className={`grid h-9 w-9 place-items-center rounded-lg transition ${isLiked ? "text-[#4db6ac]" : "text-zinc-500 hover:text-[#4db6ac]"}`}
        >
          <Heart aria-hidden="true" className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
        </button>
        <button
          type="button"
          onClick={() => addToQueue(track)}
          aria-label={`Add ${track.title} to queue`}
          className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/10 hover:text-white"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
        </button>
      </span>
    </article>
  );
}

export default function ExploreDashboard() {
  const [searchInput, setSearchInput] = useState("");
  const [activeCategory, setActiveCategory] = useState("Trending");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadedQuery, setLoadedQuery] = useState(categories[0].query);
  const requestId = useRef(0);
  const addSearch = useLibraryStore((state) => state.addSearch);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const addToQueue = usePlayerStore((state) => state.addToQueue);

  const loadQuery = useCallback(async (query: string, saveToHistory = false) => {
    const normalized = query.trim();
    if (!normalized) return;

    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    setLoadedQuery(normalized);
    if (saveToHistory) addSearch(normalized);

    try {
      const songs = await searchMusic(normalized);
      if (currentRequest !== requestId.current) return;
      const results = uniquePlayableTracks(songs);
      setTracks(results);
      if (results.length === 0) setError("No playable songs matched this search. Try another style or artist.");
    } catch {
      if (currentRequest !== requestId.current) return;
      setTracks([]);
      setError("Audiq could not reach the music catalog. Check your connection and try again.");
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [addSearch]);

  useEffect(() => {
    const initialRequest = ++requestId.current;
    void searchMusic(categories[0].query)
      .then((songs) => {
        if (initialRequest !== requestId.current) return;
        const results = uniquePlayableTracks(songs);
        setTracks(results);
        if (results.length === 0) setError("No playable songs matched this search. Try another style or artist.");
      })
      .catch(() => {
        if (initialRequest !== requestId.current) return;
        setTracks([]);
        setError("Audiq could not reach the music catalog. Check your connection and try again.");
      })
      .finally(() => {
        if (initialRequest === requestId.current) setLoading(false);
      });
    return () => {
      requestId.current += 1;
    };
  }, []);

  const selectCategory = (category: (typeof categories)[number]) => {
    setActiveCategory(category.label);
    setSearchInput("");
    void loadQuery(category.query);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchInput.trim();
    if (!query) return;
    setActiveCategory("");
    void loadQuery(query, true);
  };

  const queueAll = () => {
    tracks.forEach(addToQueue);
    setError(`${tracks.length} songs added to your queue.`);
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
            <span>{tracks.length} playable tracks</span>
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
          {categories.map((category) => (
            <button
              key={category.label}
              type="button"
              onClick={() => selectCategory(category)}
              aria-pressed={activeCategory === category.label}
              className={`min-h-20 rounded-2xl border bg-gradient-to-br p-4 text-left transition hover:-translate-y-0.5 hover:border-white/25 ${category.color} ${activeCategory === category.label ? "border-[#4db6ac]/70 ring-1 ring-[#4db6ac]/30" : "border-white/10"}`}
            >
              <span className="block text-base font-bold text-white">{category.label}</span>
              <span className="mt-1 block text-xs text-zinc-300">Explore the catalog</span>
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{activeCategory || "Search results"}</p>
            <h2 className="mt-1 text-xl font-bold text-white">{loadedQuery}</h2>
          </div>
          {tracks.length > 0 && (
            <div className="flex gap-2">
              <button type="button" onClick={() => playTrack(tracks[0], tracks)} className="inline-flex items-center gap-2 rounded-xl bg-[#00796b] px-3 py-2 text-sm font-bold text-white hover:bg-[#00695c]">
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
        ) : tracks.length > 0 ? (
          <div className="space-y-2">
            {tracks.map((track, index) => <TrackRow key={`${track.source}:${track.id}:${track.videoId ?? ""}`} track={track} index={index} tracks={tracks} />)}
          </div>
        ) : (
          <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-white/10 p-6 text-center">
            <div>
              <Music2 aria-hidden="true" className="mx-auto h-7 w-7 text-zinc-500" />
              <p className="mt-3 font-semibold text-zinc-300">{error || "Loading the music catalog…"}</p>
              {error && <button type="button" onClick={() => void loadQuery(loadedQuery)} className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/10">Try again</button>}
            </div>
          </div>
        )}
        {error && tracks.length > 0 && <p role="status" className="mt-3 text-sm text-zinc-400">{error}</p>}
      </section>
    </section>
  );
}
