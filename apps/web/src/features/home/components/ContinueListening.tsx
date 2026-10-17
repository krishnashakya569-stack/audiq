"use client";

import Image from "next/image";
import { Check, Clock3, Music2, Play } from "lucide-react";
import { useMemo } from "react";
import AlbumCard from "@/components/shared/AlbumCard";
import type { Song } from "@/services/music/types";
import { useMusic } from "@/hooks/useMusic";
import { songToTrack } from "@/lib/songAdapter";
import { usePlayerStore } from "@/store/player";

const fallbackSongs: Song[] = [];

type ContinueListeningProps = {
  query: string;
};

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "--:--";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return minutes + ":" + remainingSeconds;
}

export default function ContinueListening({ query }: ContinueListeningProps) {
  const { data: songs = [], isLoading, isError } = useMusic(query);
  const hasLiveSongs = !isError && songs.length > 0;
  const isSearch = query.trim().toLowerCase() !== "starboy";
  const displayedSongs = hasLiveSongs ? songs.slice(0, 4) : fallbackSongs;
  const title = isSearch ? "Search results for " + query : "Continue listening";
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const playableQueue = useMemo(
    () =>
      songs
        .map(songToTrack)
        .filter((track) => !!track.audio || (track.source === "youtube" && !!track.videoId)),
    [songs]
  );

  if (isSearch) {
    return (
      <section className="mb-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Music search</p>
            <h2 className="mt-1 truncate text-xl font-black sm:text-2xl">{title}</h2>
          </div>
          <span className="shrink-0 pb-1 text-xs text-zinc-500 sm:text-sm">
            {isLoading && songs.length === 0 ? "Searching…" : songs.length + " songs"}
          </span>
        </div>

        {isLoading && songs.length === 0 ? (
          <p className="mb-3 text-sm text-zinc-500">Searching the live catalog…</p>
        ) : null}

        {isError ? (
          <div className="rounded-lg border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
            Music search is not reachable right now. Try another search.
          </div>
        ) : songs.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="grid grid-cols-[28px_40px_minmax(0,1fr)_48px] items-center gap-2 border-b border-white/10 px-2 py-2 text-xs font-semibold text-zinc-500 sm:grid-cols-[36px_48px_minmax(0,1fr)_64px] sm:gap-3 sm:px-4">
              <span>#</span>
              <span className="col-span-2">Title</span>
              <span className="flex justify-end pr-1"><Clock3 className="h-4 w-4" aria-label="Duration" /></span>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {songs.map((song, index) => {
                const track = songToTrack(song);
                const artistNames = song.artists?.map((artist) => artist.name).filter(Boolean).join(", ") || "Unknown artist";
                const albumName =
                  song.album?.title && song.album.title.toLowerCase() !== song.provider.toLowerCase()
                    ? song.album.title
                    : null;
                const previewLabel = song.isPreview || song.provider === "itunes" ? "30s preview" : null;
                const byline = [artistNames, albumName, previewLabel].filter(Boolean).join(" · ");
                const artwork = song.artwork?.small || song.artwork?.medium || song.artwork?.large;
                const canPlay = !!track.audio || (track.source === "youtube" && !!track.videoId);
                const isCurrentTrack = currentTrack?.id === track.id;

                return (
                  <button
                    key={song.id}
                    type="button"
                    disabled={!canPlay}
                    aria-label={(isCurrentTrack && isPlaying ? "Pause " : "Play ") + song.title + " by " + artistNames}
                    onClick={() => {
                      if (!canPlay) return;
                      if (isCurrentTrack) {
                        togglePlay();
                      } else {
                        playTrack(track, playableQueue);
                      }
                    }}
                    className={
                      "group grid w-full grid-cols-[28px_40px_minmax(0,1fr)_48px] items-center gap-2 px-2 py-2 text-left transition-colors sm:grid-cols-[36px_48px_minmax(0,1fr)_64px] sm:gap-3 sm:px-4 " +
                      (isCurrentTrack
                        ? "bg-[#b01340]/20"
                        : "hover:bg-white/[0.07] focus-visible:bg-white/[0.07]") +
                      (canPlay ? " cursor-pointer" : " cursor-default opacity-55")
                    }
                  >
                    <span className="flex h-8 items-center justify-center text-sm text-zinc-500">
                      {isCurrentTrack ? (
                        <Check className="h-4 w-4 text-[#ff5c8a]" />
                      ) : (
                        <>
                          <span className="group-hover:hidden">{index + 1}</span>
                          <Play className="hidden h-4 w-4 fill-current text-white group-hover:block" />
                        </>
                      )}
                    </span>

                    <span className="relative h-10 w-10 overflow-hidden rounded-md bg-white/[0.07] sm:h-12 sm:w-12">
                      {artwork ? (
                        <Image src={artwork} alt="" fill sizes="48px" unoptimized className="object-cover" />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-zinc-500">
                          <Music2 className="h-4 w-4" />
                        </span>
                      )}
                    </span>

                    <span className="min-w-0 py-0.5">
                      <span className={"block truncate text-sm font-medium sm:text-base " + (isCurrentTrack ? "text-[#ff8ead]" : "text-zinc-100")}>
                        {song.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-zinc-400 sm:text-sm">{byline}</span>
                    </span>

                    <span className="text-right text-xs tabular-nums text-zinc-400 sm:text-sm">
                      {formatDuration(song.duration)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : !isLoading ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-zinc-500">
            No songs found for this search.
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Made for you</p>
          <h2 className="mt-1 text-2xl font-black">{title}</h2>
        </div>
        <button className="text-sm font-semibold text-[#f5c2ce]">
          {isLoading ? "Searching..." : "Refresh mix"}
        </button>
      </div>

      {isLoading && !hasLiveSongs ? (
        <p className="mb-3 text-sm text-zinc-500">
          Searching the live catalog. Showing Audiq picks until results arrive.
        </p>
      ) : null}

      {isError ? (
        <div className="rounded-lg border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
          Music search is not reachable right now. Try refreshing the page.
        </div>
      ) : displayedSongs.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {displayedSongs.map((song) => (
            <AlbumCard key={song.id} song={song} queue={displayedSongs} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-zinc-500">
          No playable songs found for this search.
        </div>
      )}
    </section>
  );
}
