"use client";

import { useState } from "react";
import { Heart, ListPlus, Plus } from "lucide-react";
import AddToPlaylistModal from "@/components/library/AddToPlaylistModal";
import { useLibraryStore } from "@/store/library";
import type { Track } from "@/store/player";
import { usePlayerStore } from "@/store/player";

type TrackActionsProps = {
  track: Track;
  showQueue?: boolean;
  compact?: boolean;
};

export default function TrackActions({ track, showQueue = false, compact = false }: TrackActionsProps) {
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const liked = useLibraryStore((state) => state.likedSongs.some((song) => String(song.id) === String(track.id)));
  const likeSong = useLibraryStore((state) => state.likeSong);
  const unlikeSong = useLibraryStore((state) => state.unlikeSong);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const buttonSize = compact ? "h-8 w-8" : "h-9 w-9";
  const iconSize = compact ? "h-4 w-4" : "h-[18px] w-[18px]";

  return (
    <>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => (liked ? unlikeSong(track.id) : likeSong(track))}
          aria-label={liked ? `Unlike ${track.title}` : `Like ${track.title}`}
          aria-pressed={liked}
          title={liked ? "Remove from Liked Songs" : "Add to Liked Songs"}
          className={`${buttonSize} grid place-items-center rounded-md transition ${liked ? "text-[#80cbc4]" : "text-zinc-500 hover:bg-white/10 hover:text-[#80cbc4]"}`}
        >
          <Heart aria-hidden="true" className={`${iconSize} ${liked ? "fill-current" : ""}`} />
        </button>
        <button
          type="button"
          onClick={() => setShowPlaylistModal(true)}
          aria-label={`Add ${track.title} to a playlist`}
          title="Add to playlist"
          className={`${buttonSize} grid place-items-center rounded-md text-zinc-500 transition hover:bg-white/10 hover:text-white`}
        >
          <ListPlus aria-hidden="true" className={iconSize} />
        </button>
        {showQueue ? (
          <button
            type="button"
            onClick={() => addToQueue(track)}
            aria-label={`Add ${track.title} to queue`}
            title="Add to queue"
            className={`${buttonSize} grid place-items-center rounded-md text-zinc-500 transition hover:bg-white/10 hover:text-white`}
          >
            <Plus aria-hidden="true" className={iconSize} />
          </button>
        ) : null}
      </div>
      {showPlaylistModal ? (
        <AddToPlaylistModal open onClose={() => setShowPlaylistModal(false)} track={track} />
      ) : null}
    </>
  );
}
