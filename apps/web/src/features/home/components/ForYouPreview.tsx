"use client";

import Image from "next/image";
import { ArrowRight, LoaderCircle, Music2, Play, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import TrackActions from "@/components/library/TrackActions";
import { useAuth } from "@/features/auth/AuthProvider";
import { getMusicLanguageLabel } from "@/features/settings/musicPreferences";
import { searchMusic } from "@/services/music";
import {
  artistSeeds,
  interleave,
  rankForYouTracks,
  recommendationsForYou,
  uniquePlayableTracks,
} from "@/features/explore/recommendations";
import { recommendationTrackKey, useLibraryStore } from "@/store/library";
import type { Track } from "@/store/player";
import { usePlayerStore } from "@/store/player";

type ForYouPreviewProps = {
  onExplore: () => void;
};

const EMPTY_TRACKS: Track[] = [];

export default function ForYouPreview({ onExplore }: ForYouPreviewProps) {
  const { profile } = useAuth();
  const likedSongs = useLibraryStore((state) => state.likedSongs);
  const recentlyPlayed = useLibraryStore((state) => state.recentlyPlayed);
  const searchHistory = useLibraryStore((state) => state.searchHistory);
  const hiddenRecommendations = useLibraryStore((state) => state.hiddenRecommendations);
  const preferredLanguage = profile?.preferred_music_language ?? "auto";
  const queries = useMemo(
    () => recommendationsForYou(likedSongs, recentlyPlayed, searchHistory, preferredLanguage),
    [likedSongs, recentlyPlayed, searchHistory, preferredLanguage],
  );
  const preferredArtists = useMemo(() => artistSeeds(likedSongs, recentlyPlayed), [likedSongs, recentlyPlayed]);
  const hiddenTrackKeys = useMemo(
    () => new Set(hiddenRecommendations.map(recommendationTrackKey)),
    [hiddenRecommendations],
  );
  const [tracks, setTracks] = useState<Track[]>(EMPTY_TRACKS);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const playTrack = usePlayerStore((state) => state.playTrack);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setMessage("");
      try {
        const responses = await Promise.allSettled(queries.map((query) => searchMusic(query)));
        if (!active) return;
        const songs = interleave(responses.map((response) => response.status === "fulfilled" ? response.value : []));
        const nextTracks = uniquePlayableTracks(songs);
        setTracks(nextTracks);
        if (nextTracks.length === 0) {
          const allFailed = responses.every((response) => response.status === "rejected");
          setMessage(allFailed
            ? "Your mix couldn’t load just now. Try again in a moment."
            : "No playable picks came back this time. Explore the catalog for more.");
        }
      } catch {
        if (!active) return;
        setTracks([]);
        setMessage("Your mix couldn’t load just now. Try again in a moment.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
  }, [queries, refreshKey]);

  const forYouTracks = useMemo(
    () => rankForYouTracks(tracks, likedSongs, recentlyPlayed)
      .filter((track) => !hiddenTrackKeys.has(recommendationTrackKey(track)))
      .slice(0, 6),
    [tracks, likedSongs, recentlyPlayed, hiddenTrackKeys],
  );
  const context = preferredArtists[0]
    ? `Because you listen to ${preferredArtists[0]}`
    : searchHistory[0]
      ? `Inspired by your search for ${searchHistory[0]}`
      : `A ${getMusicLanguageLabel(preferredLanguage)} mix to get you started`;

  return (
    <section aria-labelledby="home-for-you-heading" className="mb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#d6ff36] sm:text-[11px]">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> Made for your rotation
          </p>
          <h2 id="home-for-you-heading" className="mt-1.5 text-xl font-black tracking-tight text-white sm:mt-2 sm:text-3xl">
            For you.
          </h2>
          <p className="mt-1 text-xs text-zinc-400 sm:text-sm">{context}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={loading}
            aria-label="Refresh your recommendations"
            title="Refresh mix"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:border-[#d6ff36]/40 hover:text-[#d6ff36] disabled:opacity-50"
          >
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={onExplore}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-200 transition hover:border-[#d6ff36]/40 hover:text-[#d6ff36] sm:px-4 sm:text-sm"
          >
            More for you <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading && tracks.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.025] p-2.5">
              <div className="aspect-square rounded-xl bg-white/[0.07]" />
              <div className="mt-3 h-3 w-4/5 rounded bg-white/[0.07]" />
              <div className="mt-2 h-3 w-1/2 rounded bg-white/[0.05]" />
            </div>
          ))}
        </div>
      ) : forYouTracks.length > 0 ? (
        <>
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => playTrack(forYouTracks[0], forYouTracks)}
              className="inline-flex items-center gap-2 rounded-full bg-[#d6ff36] px-4 py-2 text-xs font-black text-black transition hover:brightness-105 sm:text-sm"
            >
              <Play aria-hidden="true" className="h-3.5 w-3.5 fill-current" /> Play mix
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {forYouTracks.map((track) => (
              <article key={recommendationTrackKey(track)} className="group min-w-0 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-2.5 transition hover:border-[#4db6ac]/40 hover:bg-white/[0.05] sm:p-3">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-[#101412]">
                  <Image
                    src={track.albumArt || "/brand/audiq-vinyl.svg"}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 45vw, (max-width: 1280px) 28vw, 16vw"
                    unoptimized
                    className="object-cover transition duration-300 group-hover:scale-105"
                  />
                  <button
                    type="button"
                    onClick={() => playTrack(track, forYouTracks)}
                    aria-label={`Play ${track.title} by ${track.artist}`}
                    className="absolute bottom-2 right-2 grid h-10 w-10 place-items-center rounded-full bg-[#d6ff36] text-black opacity-100 shadow-xl transition hover:scale-105 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Play aria-hidden="true" className="ml-0.5 h-4 w-4 fill-current" />
                  </button>
                </div>
                <h3 className="mt-3 truncate text-sm font-bold text-white" title={track.title}>{track.title}</h3>
                <p className="mt-0.5 truncate text-xs text-zinc-400" title={track.artist}>{track.artist}</p>
                <div className="mt-2 flex items-center justify-between gap-1 border-t border-white/[0.06] pt-1.5">
                  <span className="flex min-w-0 items-center gap-1 truncate text-[10px] font-semibold uppercase tracking-wide text-[#80cbc4]">
                    <Music2 aria-hidden="true" className="h-3 w-3 shrink-0" /> {track.source || "Audiq"}
                  </span>
                  <TrackActions track={track} compact />
                </div>
              </article>
            ))}
          </div>
          {loading ? <p role="status" className="mt-3 text-center text-xs text-zinc-500"><LoaderCircle aria-hidden="true" className="mr-1 inline h-3.5 w-3.5 animate-spin" />Refreshing your mix…</p> : null}
        </>
      ) : (
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:p-5">
          <p role="status" className="text-sm text-zinc-400">{hiddenTrackKeys.size > 0 && tracks.length > 0 ? "You’ve hidden these picks. Refresh or explore to find something new." : message || "Your mix is getting ready."}</p>
          <div className="flex shrink-0 gap-2">
            {message ? <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-white/10">Try again</button> : null}
            <button type="button" onClick={onExplore} className="rounded-full bg-[#00594f] px-3 py-2 text-xs font-bold text-white hover:bg-[#00695c]">Explore catalog</button>
          </div>
        </div>
      )}
    </section>
  );
}
