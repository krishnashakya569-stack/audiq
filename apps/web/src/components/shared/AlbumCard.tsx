"use client";
import AddToPlaylistModal from "@/components/library/AddToPlaylistModal";
import {
  Heart,
  ExternalLink,
  MessageCircle,
  Play,
  Plus,
} from "lucide-react";
import { useState } from "react";
import Image from "next/image";

import {
  type Track,
  usePlayerStore,
} from "@/store/player";

import { useLibraryStore } from "@/store/library";
import { resolveMediaUrl } from "@/services/api";

export type DeezerSong = {
  id: number | string;
  title: string;
  preview: string;
  duration?: number;
  isPreview?: boolean;
  rank?: number;
  source?:
    | "audius"
    | "itunes"
    | "jiosaavn"
    | "local"
    | "youtube";
  videoId?: string;
  externalUrl?: string;

  artist: {
    name: string;
  };

  album: {
    cover_medium: string;
  };
};

type AlbumCardProps = {
  song: DeezerSong;
  queue?: DeezerSong[];
};

function toTrack(
  song: DeezerSong
): Track {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist.name,
    albumArt:
      resolveMediaUrl(song.album.cover_medium),
    audio: resolveMediaUrl(song.preview),
    duration: song.duration,
    isPreview:
      song.isPreview ?? true,
    source: song.source,
    videoId: song.videoId,
    externalUrl:
      song.externalUrl,
  };
}

export default function AlbumCard({
  song,
  queue = [song],
}: AlbumCardProps) {
  const {
    playTrack,
  } = usePlayerStore();

  const {
    likedSongs,
    likeSong,
    unlikeSong,
  } = useLibraryStore();

  const track = toTrack(song);
  const [showPlaylistModal, setShowPlaylistModal] =useState(false);

  const isLiked =
    likedSongs.some(
      (item) =>
        item.id === track.id
    );

  const canPlay = Boolean(
    song.preview ||
      song.source === "youtube"
  );

  const canOpenExternal =
    Boolean(
      song.externalUrl &&
        !canPlay
    );

  const handlePlay = () => {
    if (!canPlay) return;

    const playableQueue =
      queue
        .filter(
          (item) =>
            item.preview ||
            item.source ===
              "youtube"
        )
        .map(toTrack);

    playTrack(
      track,
      playableQueue
    );
  };

  const handleLike = () => {
    if (isLiked) {
      unlikeSong(track.id);
    } else {
      likeSong(track);
    }
  };
  return (
        <article className="group cursor-pointer overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] transition-all duration-300 hover:-translate-y-1 hover:border-[#ff2d67]/50 hover:bg-white/[0.07] hover:shadow-xl hover:shadow-[#b01340]/20">

      <div className="relative aspect-square overflow-hidden">

        <Image
          src={resolveMediaUrl(song.album.cover_medium)}
          alt={song.title}
          fill
          sizes="(min-width:1280px) 25vw, 50vw"
          unoptimized
          className="object-cover transition duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />

        <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/65 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/85 backdrop-blur">

          {song.source === "youtube"
            ? "Full"
            : song.isPreview === false
            ? "Full"
            : canOpenExternal
            ? "Open"
            : "Preview"}

        </span>

        {canOpenExternal ? (

          <a
            href={song.externalUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#ff2d67] to-[#b01340] text-white shadow-lg shadow-[#b01340]/40 transition hover:scale-105"
          >
            <ExternalLink size={17} />
          </a>

        ) : (

          <button
            onClick={handlePlay}
            disabled={!canPlay}
            className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#ff2d67] to-[#b01340] text-white shadow-lg shadow-[#b01340]/40 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play
              size={17}
              fill="white"
            />
          </button>

        )}

      </div>

      <div className="p-4">

        <h3 className="truncate text-base font-bold text-white">
          {song.title}
        </h3>

        <p className="mt-1 truncate text-sm text-zinc-400">
          {song.artist.name}
        </p>

        <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">

          <span className="flex items-center gap-1.5">

            <MessageCircle className="h-3.5 w-3.5" />

            {song.source === "local"
              ? "Local Library"
              : song.source === "jiosaavn"
              ? "JioSaavn"
              : song.source === "audius"
              ? "Audius"
              : song.source === "youtube"
              ? "YouTube"
              : `${Math.floor(
                  (song.rank || 1000) / 1000
                )}k talking`}

          </span>

          <div className="flex items-center gap-2">

            <button
              onClick={handleLike}
              className={`grid h-8 w-8 place-items-center rounded-md border transition ${
                isLiked
                  ? "border-[#ff2d67] bg-[#ff2d67]/20 text-[#ff2d67]"
                  : "border-white/10 bg-white/[0.06] text-zinc-300 hover:text-white"
              }`}
              title={
                isLiked
                  ? "Unlike"
                  : "Like"
              }
            >
              <Heart
                className="h-4 w-4"
                fill={
                  isLiked
                    ? "currentColor"
                    : "none"
                }
              />
            </button>

            <button
              onClick={(event) => {
                event.stopPropagation();
                setShowPlaylistModal(true);
              }}
              className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/[0.06] text-zinc-300 transition hover:border-[#ff2d67] hover:text-[#ff2d67]"
              title="Add to playlist"
            >
              <Plus className="h-4 w-4" />
            </button>

          </div>

        </div>

      </div>
      <AddToPlaylistModal
          open={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          track={track}
    />

    </article>
  );
}
