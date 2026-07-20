"use client";

import AlbumCard from "@/components/shared/AlbumCard";
import type { Song } from "@/services/music/types";
import { useMusic } from "@/hooks/useMusic";

const fallbackSongs: Song[] = [];

type ContinueListeningProps = {
  query: string;
};

export default function ContinueListening({ query }: ContinueListeningProps) {
  const { data: songs = [], isLoading, isError } = useMusic(query);
  const hasLiveSongs = !isError && songs.length > 0;
  
  const displayedSongs = hasLiveSongs ? (songs as Song[]).slice(0, 4) : fallbackSongs;
  const title = query === "starboy" ? "Continue listening" : `Search results for "${query}"`;

  return (
      // ... keep your existing JSX return code here

  
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
