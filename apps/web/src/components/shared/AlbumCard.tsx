"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Heart,
  ExternalLink,
  MessageCircle,
  Play,
  Plus,
} from "lucide-react";

import AddToPlaylistModal from "@/components/library/AddToPlaylistModal";

import { usePlayerStore } from "@/store/player";
import { useLibraryStore } from "@/store/library";

import type { Song } from "@/services/music/types";
import { songToTrack } from "@/lib/songAdapter";

type AlbumCardProps = {
  song: Song;
  queue?: Song[];
};

export default function AlbumCard({
  song,
  queue = [song],
}: AlbumCardProps) {
  const { playTrack } = usePlayerStore();

  const {
    likedSongs,
    likeSong,
    unlikeSong,
  } = useLibraryStore();

  const [showPlaylistModal, setShowPlaylistModal] =
    useState(false);

  const track = songToTrack(song);

  const isLiked = likedSongs.some(
    (item) => item.id === track.id
  );

  const canPlay =
    !!track.audio ||
    song.provider === "youtube";

  const canOpenExternal =
    !!track.externalUrl && !canPlay;

  const handlePlay = () => {
    if (!canPlay) return;

    const playableQueue = queue
      .map(songToTrack)
      .filter((item) => !!item.audio);

    playTrack(track, playableQueue);
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
          src={track.albumArt || "/media/audiq-logo.png"}
          alt={song.title}
          fill
          sizes="(min-width:1280px) 25vw, 50vw"
          unoptimized
          className="object-cover transition duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />

        <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/65 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/85 backdrop-blur">
          {song.provider === "youtube"
            ? "Full"
            : song.playable
            ? "Playable"
            : "Preview"}
        </span>

        {canOpenExternal ? (
          <a
            href={track.externalUrl}
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
          {song.artists?.[0]?.name ?? "Unknown Artist"}
        </p>

        <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" />

            {song.provider === "youtube"
              ? "YouTube"
              : song.provider === "jiosaavn"
              ? "JioSaavn"
              : song.provider === "audius"
              ? "Audius"
              : "Music"}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLike}
              className={`grid h-8 w-8 place-items-center rounded-md border transition ${
                isLiked
                  ? "border-[#ff2d67] bg-[#ff2d67]/20 text-[#ff2d67]"
                  : "border-white/10 bg-white/[0.06] text-zinc-300 hover:text-white"
              }`}
            >
              <Heart
                className="h-4 w-4"
                fill={isLiked ? "currentColor" : "none"}
              />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPlaylistModal(true);
              }}
              className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/[0.06] text-zinc-300 transition hover:border-[#ff2d67] hover:text-[#ff2d67]"
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