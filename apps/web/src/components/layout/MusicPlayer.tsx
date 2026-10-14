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
import { resolveMediaUrl } from "@/services/api";
import YouTubeEmbedPlayer, {
  type YouTubeEmbedControls,
} from "./YouTubeEmbedPlayer";

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
  const youtubePlayerRef = useRef<YouTubeEmbedControls | null>(null);
  const lastTrackKey = useRef<string | null>(null);
  const fallbackKey = useRef<string | null>(null);
  const ignoreAudioPause = useRef(false);

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
        return "iTunes Preview";

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

    const trackChanged = lastTrackKey.current !== trackKey;

    if (trackChanged) {
      lastTrackKey.current = trackKey;
      fallbackKey.current = null;
      addRecentlyPlayed(currentTrack);
      setCurrentTime(0);
      setDuration(
        currentTrack.source === "youtube"
          ? currentTrack.duration || 0
          : 0
      );
    }

    if (currentTrack.source === "youtube" && currentTrack.videoId) {
      if (!audio.paused) {
        ignoreAudioPause.current = true;
        audio.pause();
      }

      audio.removeAttribute("src");
      audio.load();
      return;
    }

    if (trackChanged) {
      let src = resolveMediaUrl(currentTrack.audio);

      if (!src) {
        if (!audio.paused) ignoreAudioPause.current = true;
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        setPlaying(false);
        return;
      }

      if (!audio.paused) ignoreAudioPause.current = true;
      audio.src = src;
      audio.load();
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
    const time = Number(value);

    if (currentTrack?.source === "youtube") {
      youtubePlayerRef.current?.seekTo(time);
    } else {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = time;
    }

    setCurrentTime(time);
  };

  const jumpBy = (seconds: number) => {
    const audio = audioRef.current;
    if (currentTrack?.source !== "youtube" && !audio) return;

    const playbackTime =
      currentTrack?.source === "youtube"
        ? currentTime
        : audio?.currentTime || 0;
    const next = Math.min(
      Math.max(playbackTime + seconds, 0),
      duration || audio?.duration || playbackTime + seconds
    );

    if (currentTrack?.source === "youtube") {
      youtubePlayerRef.current?.seekTo(next);
    } else if (audio) {
      audio.currentTime = next;
    }

    setCurrentTime(next);
  };

  const handleTogglePlay = () => {
    if (currentTrack?.source === "youtube") {
      if (isPlaying) {
        youtubePlayerRef.current?.pause();
      } else {
        youtubePlayerRef.current?.play();
      }
    }

    togglePlay();
  };

  const isYouTubeTrack =
    currentTrack?.source === "youtube" && !!currentTrack.videoId;

  return (
    <>
    {isYouTubeTrack && currentTrack?.videoId ? (
      <section className="mx-2 mb-2 flex shrink-0 justify-center md:mx-5 md:justify-end">
        <div className="w-full max-w-[480px] rounded-lg border border-white/10 bg-[#0d0d10]/95 p-2 shadow-2xl shadow-black/40">
          <p className="mb-2 px-1 text-xs text-zinc-300">
            Now playing on YouTube
          </p>
          <YouTubeEmbedPlayer
            ref={youtubePlayerRef}
            videoId={currentTrack.videoId}
            isPlaying={isPlaying}
            volume={volume}
            isMuted={isMuted}
            onPlayingChange={setPlaying}
            onTimeUpdate={setCurrentTime}
            onDurationChange={setDuration}
            onEnded={nextTrack}
          />
        </div>
      </section>
    ) : null}
    <footer className="mx-2 mb-2 grid grid-cols-1 items-center gap-2 rounded-lg border border-white/10 bg-[#0d0d10]/95 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/40 backdrop-blur-xl md:mx-5 md:mb-3 md:min-h-28 md:grid-cols-[1fr_1.5fr_1fr] md:gap-4 md:px-6 md:py-4">

      <audio
        ref={audioRef}
        preload="metadata"

        onError={(e) => {
          if (currentTrack?.source === "youtube") return;

          const audio = e.currentTarget;
          const fallback = resolveMediaUrl(currentTrack?.fallbackAudio);
          const key = currentTrack
            ? [
                currentTrack.source,
                currentTrack.id,
                currentTrack.videoId,
                "fallback",
              ].join(":")
            : null;

          if (
            fallback &&
            key &&
            fallbackKey.current !== key &&
            audio.src !== fallback
          ) {
            fallbackKey.current = key;
            audio.src = fallback;
            audio.load();

            if (isPlaying) {
              audio.play().catch(() => setPlaying(false));
            }

            return;
          }

          setPlaying(false);
        }}

        onLoadedMetadata={(e) => {
          if (currentTrack?.source === "youtube") return;
          setDuration(
            e.currentTarget.duration || 0
          );
        }}

        onDurationChange={(e) => {
          if (currentTrack?.source === "youtube") return;
          setDuration(
            e.currentTarget.duration || 0
          );
        }}

        onCanPlay={() => {
          console.log("Can Play");
        }}

        onPlay={() => {
          if (currentTrack?.source !== "youtube") setPlaying(true);
        }}

        onPause={() => {
          if (ignoreAudioPause.current) {
            ignoreAudioPause.current = false;
            return;
          }
          if (currentTrack?.source !== "youtube") setPlaying(false);
        }}

        onWaiting={() => {
          console.log("Buffering");
        }}

        onTimeUpdate={(e) => {
          if (currentTrack?.source === "youtube") return;
          setCurrentTime(
            e.currentTarget.currentTime
          );
        }}

        onEnded={() => {
          if (currentTrack?.source !== "youtube") nextTrack();
        }}
      />

      <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-[#b01340] via-[#5c0921] to-black sm:h-12 sm:w-12 md:h-16 md:w-16">
          <Image
            src={cover}
            alt=""
            fill
            sizes="(min-width:768px) 64px, (min-width:640px) 48px, 40px"
            unoptimized
            className="object-cover"
          />
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white md:text-base">
            {currentTrack?.title || "Choose a track"}
          </h3>

          <p className="truncate text-xs text-zinc-400 md:text-sm">
            {currentTrack?.artist || "Search and press play"}
          </p>

          <p className="text-[11px] text-[#f5c2ce] md:mt-1 md:text-xs">
            {sourceLabel}
          </p>
        </div>
      </div>

      <div className="min-w-0">

        <div className="flex items-center justify-center gap-1.5 text-zinc-300 sm:gap-3 md:gap-4">

          <button
            onClick={toggleShuffle}
            className={`hidden rounded-md p-2 transition hover:bg-white/10 sm:block ${
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
            className="hidden rounded-md p-2 hover:bg-white/10 disabled:opacity-40 sm:block"
          >
            <Rewind className="h-4 w-4" />
          </button>

          <button
            onClick={handleTogglePlay}
            disabled={!currentTrack}
            className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#ff2d67] to-[#b01340] text-white shadow-lg md:h-12 md:w-12"
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
            className="hidden rounded-md p-2 hover:bg-white/10 disabled:opacity-40 sm:block"
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
            className={`relative hidden rounded-md p-2 hover:bg-white/10 sm:block ${
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

        <div className="mt-1 grid grid-cols-[2.5rem_1fr_3.5rem] items-center gap-2 text-[11px] text-zinc-500 md:mt-3 md:grid-cols-[3rem_1fr_4rem] md:gap-3 md:text-xs">

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
            className="h-2 w-full cursor-pointer accent-[#ff2d67] md:h-1"
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
    </>
  );
}
