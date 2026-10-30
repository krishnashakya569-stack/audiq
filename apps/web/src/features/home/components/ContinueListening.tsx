"use client";

import Image from "next/image";
import { Check, Clock3, Music2, Play } from "lucide-react";
import { useMemo } from "react";
import AlbumCard from "@/components/shared/AlbumCard";
import TrackActions from "@/components/library/TrackActions";
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

function SearchResultRow({
  song,
  track,
  index,
  queue,
  artistNames,
  byline,
  artwork,
  canPlay,
}: {
  song: Song;
  track: ReturnType<typeof songToTrack>;
  index: number;
  queue: ReturnType<typeof songToTrack>[];
  artistNames: string;
  byline: string;
  artwork?: string;
  canPlay: boolean;
}) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const isCurrentTrack = currentTrack?.id === track.id;

  return (
    <article className={
      "group grid w-full grid-cols-[24px_40px_minmax(0,1fr)_40px_72px] items-center gap-1 px-2 py-2 text-left transition-colors sm:grid-cols-[36px_48px_minmax(0,1fr)_64px_80px] sm:gap-3 sm:px-4 " +
      (isCurrentTrack ? "bg-[#00796b]/20" : "hover:bg-white/[0.07]") +
      (canPlay ? "" : "opacity-60")
    }>
      <button
        type="button"
        disabled={!canPlay}
        aria-label={(isCurrentTrack && isPlaying ? "Pause " : "Play ") + song.title + " by " + artistNames}
        onClick={() => {
          if (!canPlay) return;
          if (isCurrentTrack) togglePlay();
          else playTrack(track, queue);
        }}
        className="flex h-8 items-center justify-center text-sm text-zinc-500 disabled:cursor-default"
      >
        {isCurrentTrack ? <Check className="h-4 w-4 text-[#d6ff36]" /> : (
          <>
            <span className="group-hover:hidden">{index + 1}</span>
            <Play aria-hidden="true" className="hidden h-4 w-4 fill-current text-white group-hover:block" />
          </>
        )}
      </button>
      <span className="relative h-10 w-10 overflow-hidden rounded-md bg-white/[0.07] sm:h-12 sm:w-12">
        {artwork ? <Image src={artwork} alt="" fill sizes="48px" unoptimized className="object-cover" /> : (
          <span className="grid h-full w-full place-items-center text-zinc-500"><Music2 className="h-4 w-4" /></span>
        )}
      </span>
      <button
        type="button"
        disabled={!canPlay}
        onClick={() => {
          if (!canPlay) return;
          if (isCurrentTrack) togglePlay();
          else playTrack(track, queue);
        }}
        className="min-w-0 py-0.5 text-left disabled:cursor-default"
      >
        <span className={"block truncate text-sm font-semibold sm:text-base " + (isCurrentTrack ? "text-[#d6ff36]" : "text-zinc-100")}>
          {song.title}
        </span>
        <span className="mt-0.5 block truncate text-xs text-zinc-400 sm:text-sm">{byline}</span>
      </button>
      <span className="text-right text-xs tabular-nums text-zinc-400 sm:text-sm">{formatDuration(song.duration)}</span>
      <TrackActions track={track} compact />
    </article>
  );
}

export default function ContinueListening({ query }: ContinueListeningProps) {
  const { data: songs = [], isLoading, isError } = useMusic(query);
  const hasLiveSongs = !isError && songs.length > 0;
  const isSearch = query.trim().length > 0;
  const displayedSongs = hasLiveSongs ? songs.slice(0, 4) : fallbackSongs;
  const title = isSearch ? "Search results for " + query : "On repeat for you";
  const playableQueue = useMemo(
    () =>
      songs
        .map(songToTrack)
        .filter((track) => !!track.audio || (track.source === "youtube" && !!track.videoId)),
    [songs]
  );

  if (isSearch) {
    return (
      <section className="mb-10">
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
          <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025] shadow-2xl shadow-black/20">
            <div className="grid grid-cols-[24px_40px_minmax(0,1fr)_40px_72px] items-center gap-1 border-b border-white/10 px-2 py-2 text-xs font-semibold text-zinc-500 sm:grid-cols-[36px_48px_minmax(0,1fr)_64px_80px] sm:gap-3 sm:px-4">
              <span>#</span>
              <span className="col-span-2">Title</span>
              <span className="flex justify-end pr-1"><Clock3 className="h-4 w-4" aria-label="Duration" /></span>
              <span className="sr-only">Track actions</span>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {songs.map((song, index) => {
                const track = songToTrack(song);
                const artistNames = song.artists?.map((artist) => artist.name).filter(Boolean).join(", ") || "Unknown artist";
                const albumName =
                  song.album?.title && song.album.title.toLowerCase() !== song.provider.toLowerCase()
                    ? song.album.title
                    : null;
                const previewLabel = song.provider === "youtube" ? "YouTube · Full video" : song.isPreview || song.provider === "itunes" ? "30s preview" : null;
                const byline = [artistNames, albumName, previewLabel].filter(Boolean).join(" · ");
                const artwork = song.artwork?.small || song.artwork?.medium || song.artwork?.large;
                const canPlay = !!track.audio || (track.source === "youtube" && !!track.videoId);
                return (
                  <SearchResultRow
                    key={song.id}
                    song={song}
                    track={track}
                    index={index}
                    queue={playableQueue}
                    artistNames={artistNames}
                    byline={byline}
                    artwork={artwork ?? undefined}
                    canPlay={canPlay}
                  />
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
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#80cbc4]">Your current rotation</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h2>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#d6ff36]/20 bg-[#d6ff36]/[0.07] px-3 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-[#d6ff36]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d6ff36]" />
          {isLoading ? "Finding a vibe" : "Fresh picks"}
        </span>
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

