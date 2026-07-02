"use client";

import {
  Heart,
 FastForward,
  Pause,
  Play,
  Plus,
  Repeat2,
  Rewind,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import AddToPlaylistModal from "@/components/library/AddToPlaylistModal";
import { usePlayerStore } from "@/store/player";
import { useLibraryStore } from "@/store/library";
import { buildApiUrl, resolveMediaUrl } from "@/services/api";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

export default function MusicPlayer() {
  const {
    currentTrack,
    isPlaying,
    isShuffling,
    nextTrack,
    previousTrack,
    repeatMode,
    setPlaying,
    togglePlay,
    toggleRepeat,
    toggleShuffle,
    
  } = usePlayerStore();
  const{
    likedSongs,
    likeSong,
    unlikeSong,
    addRecentlyPlayed,
  } = useLibraryStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const lastTrackKey = useRef<string | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.72);
  const [isMuted, setMuted] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  const cover =
    currentTrack?.albumArt ||
    "/brand/audiq-logo.png";

  const progress =
    duration > 0
      ? (currentTime / duration) * 100
      : 0;

  const isLiked =
    currentTrack != null &&
    likedSongs.some(
      (song) => song.id === currentTrack.id
    );

  const sourceLabel = useMemo(() => {
    if (!currentTrack) return "No Track";

    switch (currentTrack.source) {
      case "youtube":
        return "YouTube";

      case "jiosaavn":
        return "JioSaavn";

      case "audius":
        return "Audius";

      case "itunes":
        return "iTunes";

      default:
        return currentTrack.isPreview
          ? "Preview"
          : "Full Track";
    }
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !currentTrack) return;

    const trackKey = [
      currentTrack.source,
      currentTrack.id,
      currentTrack.videoId,
      currentTrack.audio,
    ].join(":");

    if (lastTrackKey.current !== trackKey) {
      lastTrackKey.current = trackKey;
      addRecentlyPlayed(currentTrack);

      const src =
        currentTrack.source === "youtube" &&
        currentTrack.videoId
          ? buildApiUrl(
              `/stream/play/${encodeURIComponent(currentTrack.videoId)}`
            )
          : resolveMediaUrl(currentTrack.audio);

      audio.src = src;

      audio.load();

      setCurrentTime(0);
    }

    if (isPlaying) {
      audio
        .play()
        .catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [
    currentTrack,
    currentTrack?.id,
    isPlaying,
    setPlaying,
    addRecentlyPlayed,
  ]);

  const seekTo = (value: string) => {
    const audio = audioRef.current;

    if (!audio) return;

    const time = Number(value);

    audio.currentTime = time;

    setCurrentTime(time);
  };

  const jumpBy = (seconds: number) => {
    const audio = audioRef.current;

    if (!audio) return;

    const next = Math.min(
      Math.max(audio.currentTime + seconds, 0),
      audio.duration || duration
    );

    audio.currentTime = next;

    setCurrentTime(next);
  };

  return (
    <footer className="mx-3 mb-3 grid min-h-28 grid-cols-1 items-center gap-4 rounded-lg border border-white/10 bg-[#0d0d10]/95 px-4 py-4 shadow-2xl shadow-black/40 backdrop-blur-xl md:mx-5 md:grid-cols-[1fr_1.5fr_1fr] md:px-6">

      <audio
        ref={audioRef}
        preload="metadata"

        onError={(e) => {
          console.log("Audio Error");
          console.log(e.currentTarget.error);
        }}

        onLoadedMetadata={(e) => {
          setDuration(
            e.currentTarget.duration || 0
          );
        }}

        onDurationChange={(e) => {
          setDuration(
            e.currentTarget.duration || 0
          );
        }}

        onCanPlay={() => {
          console.log("Can Play");
        }}

        onPlay={() => {
          setPlaying(true);
        }}

        onPause={() => {
          setPlaying(false);
        }}

        onWaiting={() => {
          console.log("Buffering");
        }}

        onTimeUpdate={(e) => {
          setCurrentTime(
            e.currentTarget.currentTime
          );
        }}

        onEnded={nextTrack}
      />

      <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-[#b01340] via-[#5c0921] to-black">
          <Image
            src={cover}
            alt=""
            fill
            sizes="64px"
            unoptimized
            className="object-cover"
          />
        </div>

        <div className="min-w-0">
          <h3 className="truncate font-semibold text-white">
            {currentTrack?.title || "Choose a track"}
          </h3>

          <p className="truncate text-sm text-zinc-400">
            {currentTrack?.artist || "Search and press play"}
          </p>

          <p className="mt-1 text-xs text-[#f5c2ce]">
            {sourceLabel}
          </p>
        </div>
      </div>

      <div className="min-w-0">

        <div className="flex items-center justify-center gap-4 text-zinc-300">

          <button
            onClick={toggleShuffle}
            className={`rounded-md p-2 transition hover:bg-white/10 ${
              isShuffling ? "text-[#ff5c8a]" : ""
            }`}
          >
            <Shuffle className="h-4 w-4" />
          </button>

          <button
            onClick={previousTrack}
            disabled={!currentTrack}
            className="rounded-md p-2 hover:bg-white/10 disabled:opacity-40"
          >
            <SkipBack className="h-5 w-5" />
          </button>

          <button
            onClick={() => jumpBy(-10)}
            disabled={!currentTrack}
            className="rounded-md p-2 hover:bg-white/10 disabled:opacity-40"
          >
            <Rewind className="h-4 w-4" />
          </button>

          <button
            onClick={togglePlay}
            disabled={!currentTrack}
            className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-[#ff2d67] to-[#b01340] text-white shadow-lg"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 fill-white" />
            )}
          </button>

          <button
            onClick={() => jumpBy(10)}
            disabled={!currentTrack}
            className="rounded-md p-2 hover:bg-white/10 disabled:opacity-40"
          >
            <FastForward className="h-4 w-4" />
          </button>

          <button
            onClick={nextTrack}
            disabled={!currentTrack}
            className="rounded-md p-2 hover:bg-white/10 disabled:opacity-40"
          >
            <SkipForward className="h-5 w-5" />
          </button>

          <button
            onClick={toggleRepeat}
            className={`relative rounded-md p-2 hover:bg-white/10 ${
              repeatMode !== "off"
                ? "text-[#ff5c8a]"
                : ""
            }`}
          >
            <Repeat2 className="h-4 w-4" />

            {repeatMode === "one" && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#ff5c8a] text-[10px] font-bold text-white">
                1
              </span>
            )}
          </button>

        </div>

        <div className="mt-3 grid grid-cols-[3rem_1fr_4rem] items-center gap-3 text-xs text-zinc-500">

          <span>{formatTime(currentTime)}</span>

          <input
            type="range"
            min={0}
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration)}
            onChange={(e) =>
              seekTo(e.target.value)
            }
            disabled={!currentTrack}
            className="h-1 w-full cursor-pointer accent-[#ff2d67]"
            style={{
              background: `linear-gradient(to right,#ff2d67 ${progress}%,rgb(255 255 255 / 0.12) ${progress}%)`,
            }}
          />

          <span className="text-right">
            {duration
              ? formatTime(duration)
              : "--:--"}
          </span>

        </div>

      </div>
            <div className="hidden items-center justify-end gap-4 text-zinc-400 md:flex">

        <button
          disabled={!currentTrack}
          onClick={() => {
            if (!currentTrack) return;

            if (isLiked) {
              unlikeSong(currentTrack.id);
            } else {
              likeSong(currentTrack);
            }
          }}
          className={`grid h-10 w-10 place-items-center rounded-md border transition ${
            isLiked
              ? "border-[#ff2d67] bg-[#ff2d67]/20 text-[#ff2d67]"
              : "border-white/10 bg-white/[0.06] text-zinc-300 hover:text-white"
          }`}
          title={
            isLiked
              ? "Remove from Liked Songs"
              : "Add to Liked Songs"
          }
        >
          <Heart
            className="h-5 w-5"
            fill={isLiked ? "currentColor" : "none"}
          />
        </button>

        <button
          disabled={!currentTrack}
          onClick={() => setShowPlaylistModal(true)}
          className="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-white/[0.06] text-zinc-300 transition hover:border-[#ff2d67]/50 hover:text-white disabled:opacity-40"
          title="Add to playlist"
        >
          <Plus className="h-5 w-5" />
        </button>

        <button
          onClick={() => setMuted(!isMuted)}
          className="rounded-md p-2 hover:bg-white/10"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVolume(v);
            setMuted(v === 0);
          }}
          className="h-1 w-28 cursor-pointer accent-[#ff2d67]"
        />

      </div>

      {currentTrack ? (
        <AddToPlaylistModal
          open={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          track={currentTrack}
        />
      ) : null}

    </footer>
  );
}
