"use client";

import {
  ChevronDown,
  Heart,
  FastForward,
  ListMusic,
  Moon,
  Radio,
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
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import AddToPlaylistModal from "@/components/library/AddToPlaylistModal";
import QueuePanel from "@/components/layout/QueuePanel";
import { usePlayerStore } from "@/store/player";
import { useLibraryStore } from "@/store/library";
import { resolveMediaUrl } from "@/services/api";
import { searchMusic } from "@/services/music";
import { songToTrack } from "@/lib/songAdapter";
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

const AUTOPLAY_PREFERENCE_KEY = "audiq-autoplay-radio";
const AUTOPLAY_PREFERENCE_EVENT = "audiq-autoplay-radio-change";
let fallbackAutoplayPreference = false;

function subscribeAutoplayPreference(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(AUTOPLAY_PREFERENCE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(AUTOPLAY_PREFERENCE_EVENT, onChange);
  };
}

function getAutoplayPreferenceSnapshot() {
  try {
    return window.localStorage.getItem(AUTOPLAY_PREFERENCE_KEY) === "true";
  } catch {
    return fallbackAutoplayPreference;
  }
}

function getAutoplayPreferenceServerSnapshot() {
  return false;
}

function saveAutoplayPreference(enabled: boolean) {
  fallbackAutoplayPreference = enabled;
  try {
    window.localStorage.setItem(AUTOPLAY_PREFERENCE_KEY, String(enabled));
  } catch {
    // Keep the preference for the current session if browser storage is unavailable.
  }
  window.dispatchEvent(new Event(AUTOPLAY_PREFERENCE_EVENT));
}

type MusicPlayerProps = {
  compact?: boolean;
};

export default function MusicPlayer({ compact = false }: MusicPlayerProps) {
  const {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    isShuffling,
    seekRequest,
    nextTrack,
    previousTrack,
    repeatMode,
    setPlaying,
    setPlaybackPosition,
    requestSeek,
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
  const pendingSeek = useRef<{ trackKey: string; position: number; source: "audio" | "youtube" } | null>(null);
  const ignoreAudioPause = useRef(false);
  const radioRequestFor = useRef<string | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.72);
  const [isMuted, setMuted] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [queueMenuOpen, setQueueMenuOpen] = useState(false);
  const [sleepMenuOpen, setSleepMenuOpen] = useState(false);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepAtTrackEnd, setSleepAtTrackEnd] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const autoplayEnabled = useSyncExternalStore(
    subscribeAutoplayPreference,
    getAutoplayPreferenceSnapshot,
    getAutoplayPreferenceServerSnapshot,
  );

  useEffect(() => {
    if (!isExpanded) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsExpanded(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExpanded]);

  const cover =
    currentTrack?.albumArt ||
    "/brand/audiq-vinyl.svg";

  const progress =
    duration > 0
      ? (currentTime / duration) * 100
      : 0;
  const upcomingCount = Math.max(0, queue.length - currentIndex - 1);

  const activeTrackKey = currentTrack
    ? [currentTrack.source, currentTrack.id, currentTrack.videoId, currentTrack.audio].join(":")
    : "";

  const applyPendingSeek = useCallback((source: "audio" | "youtube") => {
    const pending = pendingSeek.current;
    if (!pending || pending.source !== source || pending.trackKey !== activeTrackKey) return;

    if (source === "youtube") {
      if (!youtubePlayerRef.current?.isReady()) return;
      youtubePlayerRef.current.seekTo(pending.position);
    } else {
      const audio = audioRef.current;
      if (!audio || audio.readyState < 1) return;
      const position = Number.isFinite(audio.duration)
        ? Math.min(pending.position, audio.duration)
        : pending.position;
      audio.currentTime = position;
      setCurrentTime(position);
      setPlaybackPosition(position);
    }
    pendingSeek.current = null;
  }, [activeTrackKey, setPlaybackPosition]);

  const isLiked =
    currentTrack != null &&
    likedSongs.some(
      (song) => song.id === currentTrack.id
    );

  const sourceLabel = useMemo(() => {
    if (!currentTrack) return "Ready for a new sound";

    switch (currentTrack.source) {
      case "youtube":
        return "YouTube · keep screen on";

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
    if (sleepTimerMinutes === null) return;
    const timer = window.setTimeout(() => {
      audioRef.current?.pause();
      youtubePlayerRef.current?.pause();
      setPlaying(false);
      setSleepTimerMinutes(null);
      setSleepAtTrackEnd(false);
    }, sleepTimerMinutes * 60_000);
    return () => window.clearTimeout(timer);
  }, [sleepTimerMinutes, setPlaying]);

  useEffect(() => {
    const session = navigator.mediaSession;

    if (!session) return;

    const directAudioTrack =
      currentTrack &&
      currentTrack.source !== "youtube" &&
      Boolean(currentTrack.audio);

    if (!directAudioTrack || !currentTrack) {
      session.metadata = null;
      session.playbackState = "none";
      return;
    }

    if (typeof MediaMetadata !== "undefined") {
      const artworkUrl = currentTrack.albumArt
        ? new URL(currentTrack.albumArt, window.location.origin).toString()
        : undefined;

      session.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.source || "Audiq",
        artwork: artworkUrl
          ? [
              { src: artworkUrl, sizes: "96x96", type: "image/jpeg" },
              { src: artworkUrl, sizes: "256x256", type: "image/jpeg" },
              { src: artworkUrl, sizes: "512x512", type: "image/jpeg" },
            ]
          : [],
      });
    }

    const setHandler = (
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null
    ) => {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Browsers may not support every media action.
      }
    };

    setHandler("play", () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    });
    setHandler("pause", () => audioRef.current?.pause());
    setHandler("previoustrack", previousTrack);
    setHandler("nexttrack", nextTrack);
    setHandler("seekbackward", (details) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = Math.max(
        audio.currentTime - (details.seekOffset || 10),
        0
      );
    });
    setHandler("seekforward", (details) => {
      const audio = audioRef.current;
      if (!audio) return;
      const end = Number.isFinite(audio.duration)
        ? audio.duration
        : audio.currentTime + (details.seekOffset || 10);
      audio.currentTime = Math.min(
        audio.currentTime + (details.seekOffset || 10),
        end
      );
    });
    setHandler("seekto", (details) => {
      const audio = audioRef.current;
      if (audio && currentTrack && details.seekTime !== undefined) {
        requestSeek(details.seekTime, currentTrack);
      }
    });

    return () => {
      for (const action of [
        "play",
        "pause",
        "previoustrack",
        "nexttrack",
        "seekbackward",
        "seekforward",
        "seekto",
      ] as const) {
        setHandler(action, null);
      }
      session.metadata = null;
      session.playbackState = "none";
    };
  }, [currentTrack, nextTrack, previousTrack, requestSeek, setPlaying]);

  useEffect(() => {
    if (!navigator.mediaSession || !currentTrack) return;
    if (currentTrack.source === "youtube" || !currentTrack.audio) return;

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [currentTrack, isPlaying]);

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
      if (pendingSeek.current && pendingSeek.current.trackKey !== trackKey) pendingSeek.current = null;
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
      const src = resolveMediaUrl(currentTrack.audio);

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

  useEffect(() => {
    if (!currentTrack || !seekRequest) return;
    const trackKey = [currentTrack.source, currentTrack.id, currentTrack.videoId, currentTrack.audio].join(":");
    if (seekRequest.trackKey !== trackKey) return;
    pendingSeek.current = {
      trackKey,
      position: Math.max(0, seekRequest.position),
      source: currentTrack.source === "youtube" ? "youtube" : "audio",
    };
    applyPendingSeek(currentTrack.source === "youtube" ? "youtube" : "audio");
  }, [applyPendingSeek, currentTrack, seekRequest]);

  const seekTo = (value: string) => {
    const time = Number(value);
    if (!currentTrack) return;
    if (currentTrack.source === "youtube") {
      youtubePlayerRef.current?.seekTo(time);
    } else if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setPlaybackPosition(time);
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

    if (!currentTrack) return;
    requestSeek(next, currentTrack);
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

  const handleTrackEnded = () => {
    if (sleepAtTrackEnd) {
      setPlaying(false);
      setSleepAtTrackEnd(false);
      return;
    }
    const state = usePlayerStore.getState();
    const track = state.currentTrack;
    const isAtQueueEnd = state.currentIndex >= state.queue.length - 1;
    if (
      autoplayEnabled &&
      track &&
      isAtQueueEnd &&
      state.repeatMode === "off"
    ) {
      const requestKey = `${track.source ?? ""}:${track.id}:${track.videoId ?? ""}`;
      if (radioRequestFor.current === requestKey) return;
      radioRequestFor.current = requestKey;
      setPlaying(false);
      void searchMusic(`${track.artist} similar songs`)
        .then((songs) => {
          const latestTrack = usePlayerStore.getState().currentTrack;
          const latestKey = latestTrack ? `${latestTrack.source ?? ""}:${latestTrack.id}:${latestTrack.videoId ?? ""}` : "";
          if (latestKey !== requestKey) return;

          const latestState = usePlayerStore.getState();
          const known = new Set(latestState.queue.map((item) => `${item.source ?? ""}:${item.id}:${item.videoId ?? ""}`));
          known.add(requestKey);
          const recommendations = songs
            .map(songToTrack)
            .filter((item) => !item.isPreview && Boolean(item.audio || (item.source === "youtube" && item.videoId)))
            .filter((item) => {
              const key = `${item.source ?? ""}:${item.id}:${item.videoId ?? ""}`;
              if (known.has(key)) return false;
              known.add(key);
              return true;
            })
            .slice(0, 12);

          recommendations.forEach((item) => usePlayerStore.getState().addToQueue(item));
          if (recommendations.length) usePlayerStore.getState().nextTrack();
          else usePlayerStore.getState().setPlaying(false);
        })
        .catch(() => usePlayerStore.getState().setPlaying(false))
        .finally(() => { radioRequestFor.current = null; });
      return;
    }
    nextTrack();
  };

  const isYouTubeTrack =
    currentTrack?.source === "youtube" && !!currentTrack.videoId;

  // Keep YouTube embeds at their required minimum size; compact direct-audio playback only.
  const useCompactLayout = compact && !isYouTubeTrack;
  const layoutClasses = useCompactLayout
    ? "mx-2 grid-cols-[minmax(0,1fr)_auto] gap-2 px-2 sm:mx-3 sm:px-4 md:mx-5 md:min-h-16 md:grid-cols-[minmax(0,1fr)_1.5fr] md:gap-4 md:px-4"
    : isYouTubeTrack
      ? "mx-1 grid-cols-[minmax(0,1fr)_200px] grid-rows-2 gap-1 px-2 md:mx-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:grid-rows-none md:gap-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(250px,1.4fr)_minmax(200px,0.9fr)_minmax(180px,1fr)]"
      : "mx-2 grid-cols-1 gap-2 px-3 md:mx-5 md:grid-cols-[1fr_1.5fr_1fr] md:gap-4 md:px-6";


  return (
    <>
    <footer className={`audiq-player relative mb-2 grid items-center rounded-[20px] border border-white/10 border-t-2 border-t-[#d6ff36]/75 bg-[#080b09]/95 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/40 backdrop-blur-xl md:mb-3 md:min-h-28 md:py-4 ${layoutClasses}`}>

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
          applyPendingSeek("audio");
        }}

        onDurationChange={(e) => {
          if (currentTrack?.source === "youtube") return;
          setDuration(
            e.currentTarget.duration || 0
          );
          applyPendingSeek("audio");
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
          const time = e.currentTarget.currentTime;
          setCurrentTime(time);
          setPlaybackPosition(time);
        }}

        onEnded={() => {
          if (currentTrack?.source !== "youtube") handleTrackEnded();
        }}
      />

    <button
      type="button"
      onClick={() => currentTrack && setIsExpanded(true)}
      disabled={!currentTrack}
      aria-label={currentTrack ? "Open full screen player for " + currentTrack.title : "No track is playing"}
      title={currentTrack ? "Open Now Playing" : undefined}
      className="flex min-w-0 items-center gap-2 rounded-xl text-left transition hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d6ff36] disabled:cursor-default md:gap-3"
    >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-[#00594f] via-[#00332d] to-black sm:h-12 sm:w-12 md:h-16 md:w-16">
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
            {currentTrack?.title || "Pick your next obsession"}
          </h3>

          <p className="truncate text-xs text-zinc-400 md:text-sm">
            {currentTrack?.artist || "Search a song and hit play"}
          </p>

          <p className="text-[11px] text-[#80cbc4] md:mt-1 md:text-xs">
            {sourceLabel}
          </p>
        </div>
    </button>

      <div className={`min-w-0 ${isYouTubeTrack ? "col-start-1 row-start-2 md:col-auto md:row-auto" : ""}`}>

        <div className={`flex items-center justify-center text-zinc-300 ${isYouTubeTrack ? "gap-0 sm:gap-1 md:gap-4" : "gap-1 sm:gap-2 md:gap-4"}`}>

          <button
            onClick={toggleShuffle}
            className={`hidden rounded-md p-2 transition hover:bg-white/10 sm:block ${
              isShuffling ? "text-[#4db6ac]" : ""
            }`}
          >
            <Shuffle className="h-4 w-4" />
          </button>

          <button
            onClick={previousTrack}
            disabled={!currentTrack}
            aria-label="Previous track"
            className="grid h-11 w-11 place-items-center rounded-full transition hover:bg-white/10 disabled:opacity-40"
          >
            <SkipBack className="h-5 w-5" />
          </button>

          <button
            onClick={() => jumpBy(-10)}
            disabled={!currentTrack}
            aria-label="Seek backward 10 seconds"
            className="hidden h-11 w-11 place-items-center rounded-full transition hover:bg-white/10 disabled:opacity-40 sm:grid"
          >
            <Rewind className="h-4 w-4" />
          </button>

          <button
            onClick={handleTogglePlay}
            disabled={!currentTrack}
            aria-label={isPlaying ? "Pause" : "Play"}
            className={`grid place-items-center rounded-full bg-[#d6ff36] text-[#07100d] shadow-[0_0_26px_rgba(214,255,54,0.18)] transition hover:scale-105 disabled:opacity-45 ${isYouTubeTrack ? "h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12" : "h-11 w-11 md:h-12 md:w-12"}`}
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
            aria-label="Seek forward 10 seconds"
            className="hidden h-11 w-11 place-items-center rounded-full transition hover:bg-white/10 disabled:opacity-40 sm:grid"
          >
            <FastForward className="h-4 w-4" />
          </button>

          <button
            onClick={nextTrack}
            disabled={!currentTrack}
            aria-label="Next track"
            className="grid h-11 w-11 place-items-center rounded-full transition hover:bg-white/10 disabled:opacity-40"
          >
            <SkipForward className="h-5 w-5" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setQueueMenuOpen((open) => !open)}
              aria-label={`Open playback queue, ${upcomingCount} upcoming`}
              aria-expanded={queueMenuOpen}
              title={`Queue · ${upcomingCount} upcoming`}
              className={`relative hidden h-8 w-8 place-items-center rounded-md transition hover:bg-white/10 sm:grid sm:h-9 sm:w-9 ${queueMenuOpen ? "text-[#d6ff36]" : "text-zinc-400 hover:text-white"}`}
            >
              <ListMusic aria-hidden="true" className="h-4 w-4" />
              {upcomingCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-[#d6ff36] px-1 text-[9px] font-black leading-4 text-[#07100d]">
                  {upcomingCount > 99 ? "99+" : upcomingCount}
                </span>
              ) : null}
            </button>
            {queueMenuOpen ? (
              <div className="absolute bottom-full right-0 z-[120] mb-3 max-h-[min(60vh,34rem)] w-[min(92vw,28rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#080b09] p-2 shadow-2xl shadow-black/60 sm:p-3">
                <QueuePanel />
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => saveAutoplayPreference(!autoplayEnabled)}
            aria-label={autoplayEnabled ? "Turn off autoplay radio" : "Turn on autoplay radio"}
            aria-pressed={autoplayEnabled}
            title={autoplayEnabled ? "Autoplay radio on" : "Autoplay radio off"}
            className={`hidden h-8 w-8 place-items-center rounded-md transition hover:bg-white/10 sm:grid sm:h-9 sm:w-9 ${autoplayEnabled ? "text-[#d6ff36]" : "text-zinc-400 hover:text-white"}`}
          >
            <Radio aria-hidden="true" className="h-4 w-4" />
          </button>

          <button
            onClick={toggleRepeat}
            className={`relative hidden rounded-md p-2 hover:bg-white/10 sm:block ${
              repeatMode !== "off"
                ? "text-[#4db6ac]"
                : ""
            }`}
          >
            <Repeat2 className="h-4 w-4" />

            {repeatMode === "one" && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#4db6ac] text-[10px] font-bold text-white">
                1
              </span>
            )}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setSleepMenuOpen((open) => !open)}
              disabled={!currentTrack && sleepTimerMinutes === null && !sleepAtTrackEnd}
              aria-label="Sleep timer options"
              aria-expanded={sleepMenuOpen}
              title={sleepTimerMinutes !== null ? `Sleep timer: ${sleepTimerMinutes} minutes` : sleepAtTrackEnd ? "Sleep when this track ends" : "Sleep timer"}
              className={`hidden h-8 w-8 place-items-center rounded-md transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 sm:grid sm:h-9 sm:w-9 ${sleepTimerMinutes !== null || sleepAtTrackEnd ? "text-[#d6ff36]" : "text-zinc-400 hover:text-white"}`}
            >
              <Moon aria-hidden="true" className="h-4 w-4" />
            </button>
            {sleepMenuOpen ? (
              <div className="absolute bottom-full right-0 z-[110] mb-2 w-48 rounded-xl border border-white/10 bg-[#111513] p-2 text-left shadow-2xl">
                <p className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Sleep timer</p>
                {[15, 30, 45, 60].map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => {
                      setSleepTimerMinutes(minutes);
                      setSleepAtTrackEnd(false);
                      setSleepMenuOpen(false);
                    }}
                    className="block w-full rounded-lg px-2 py-2 text-left text-sm text-zinc-200 hover:bg-white/10"
                  >
                    {minutes} minutes
                  </button>
                ))}
                <button
                  type="button"
                  disabled={!currentTrack}
                  onClick={() => {
                    setSleepTimerMinutes(null);
                    setSleepAtTrackEnd(true);
                    setSleepMenuOpen(false);
                  }}
                  className="block w-full rounded-lg px-2 py-2 text-left text-sm text-zinc-200 hover:bg-white/10 disabled:opacity-40"
                >
                  At end of this track
                </button>
                {sleepTimerMinutes !== null || sleepAtTrackEnd ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSleepTimerMinutes(null);
                      setSleepAtTrackEnd(false);
                      setSleepMenuOpen(false);
                    }}
                    className="mt-1 block w-full rounded-lg border-t border-white/10 px-2 py-2 text-left text-sm text-[#80cbc4] hover:bg-white/5"
                  >
                    Turn timer off
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

        </div>

        <div className={`${useCompactLayout ? "hidden md:grid" : "grid"} mt-1 items-center gap-2 text-[11px] text-zinc-500 md:mt-3 md:gap-3 md:text-xs ${isYouTubeTrack ? "grid-cols-1 md:grid-cols-[3rem_1fr_4rem]" : "grid-cols-[2.5rem_1fr_3.5rem] md:grid-cols-[3rem_1fr_4rem]"}`}>

          <span className={isYouTubeTrack ? "hidden md:inline" : ""}>{formatTime(currentTime)}</span>

          <input
            type="range"
            min={0}
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration)}
            onChange={(e) =>
              seekTo(e.target.value)
            }
            onPointerUp={() => {
              if (currentTrack) requestSeek(currentTime, currentTrack);
            }}
            onKeyUp={() => {
              if (currentTrack) requestSeek(currentTime, currentTrack);
            }}
            disabled={!currentTrack}
            className="h-2 w-full cursor-pointer accent-[#d6ff36] md:h-1"
            style={{
              background: `linear-gradient(to right,#d6ff36 ${progress}%,rgb(255 255 255 / 0.12) ${progress}%)`,
            }}
          />

          <span className={`text-right ${isYouTubeTrack ? "hidden md:inline" : ""}`}>
            {duration
              ? formatTime(duration)
              : "--:--"}
          </span>

        </div>

      </div>

      {isYouTubeTrack && currentTrack?.videoId ? (
        <div className="col-start-2 row-span-2 row-start-1 flex h-[200px] w-[200px] min-w-0 items-center justify-center md:col-start-1 md:row-span-1 md:row-start-2 lg:col-start-3 lg:row-start-1">
          <div className="h-[200px] w-[200px]">
            <span className="sr-only">Now playing on YouTube</span>
            <YouTubeEmbedPlayer
              ref={youtubePlayerRef}
              videoId={currentTrack.videoId}
              isPlaying={isPlaying}
              volume={volume}
              isMuted={isMuted}
              onPlayingChange={setPlaying}
              onReady={() => applyPendingSeek("youtube")}
              onTimeUpdate={(time) => {
                setCurrentTime(time);
                setPlaybackPosition(time);
              }}
              onDurationChange={setDuration}
              onEnded={handleTrackEnded}
            />
          </div>
        </div>
      ) : null}

      <div className={`${useCompactLayout ? "hidden" : "hidden items-center justify-end gap-4 text-zinc-400 md:flex"}`}>

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
              ? "border-[#00796b] bg-[#00796b]/20 text-[#00796b]"
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
          className="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-white/[0.06] text-zinc-300 transition hover:border-[#00796b]/50 hover:text-white disabled:opacity-40"
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
          className="h-1 w-28 cursor-pointer accent-[#00796b]"
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
    {isExpanded && currentTrack && typeof document !== "undefined" ? createPortal(
      <div role="dialog" aria-modal="true" aria-label={"Now playing " + currentTrack.title} className="fixed inset-0 z-[90] flex h-[100dvh] w-screen flex-col overflow-y-auto bg-[#0b1011] text-white">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-8">
          <header className="grid grid-cols-[3rem_1fr_3rem] items-center text-center">
            <button type="button" onClick={() => setIsExpanded(false)} aria-label="Close Now Playing" className="grid h-12 w-12 place-items-center rounded-full text-white transition hover:bg-white/10"><ChevronDown aria-hidden="true" className="h-7 w-7" /></button>
            <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#80cbc4]">Now playing</p><p className="truncate text-sm font-semibold text-zinc-300">Audiq</p></div>
            <span aria-hidden="true" />
          </header>
          <div className="flex flex-1 flex-col justify-center gap-6 py-5 sm:gap-8">
            <div className="relative mx-auto aspect-square w-[min(82vw,430px)] max-w-full overflow-hidden rounded-xl bg-[#151a1b] shadow-[0_24px_80px_rgba(0,0,0,0.48)]">
              <Image src={cover} alt={currentTrack.title + " album art"} fill sizes="(max-width: 640px) 82vw, 430px" unoptimized className="object-cover" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/[0.04]" />
            </div>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1"><h1 className="truncate text-2xl font-black tracking-tight sm:text-3xl">{currentTrack.title}</h1><p className="mt-1 truncate text-base text-zinc-300 sm:text-lg">{currentTrack.artist}</p><p className="mt-1 truncate text-xs text-[#80cbc4]">{sourceLabel}</p></div>
              <button type="button" onClick={() => isLiked ? unlikeSong(currentTrack.id) : likeSong(currentTrack)} aria-label={isLiked ? "Remove from Liked Songs" : "Add to Liked Songs"} aria-pressed={isLiked} className={isLiked ? "grid h-12 w-12 shrink-0 place-items-center rounded-full text-[#d6ff36] transition hover:bg-white/10" : "grid h-12 w-12 shrink-0 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10"}><Heart aria-hidden="true" className="h-6 w-6" fill={isLiked ? "currentColor" : "none"} /></button>
              <button type="button" onClick={() => { setQueueMenuOpen(false); setSleepMenuOpen(false); setShowPlaylistModal(true); }} aria-label="Add to playlist" className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white"><Plus aria-hidden="true" className="h-7 w-7" /></button>
            </div>
            <div>
              <input type="range" min={0} max={duration || 0} step="0.1" value={Math.min(currentTime, duration)} onChange={(event) => seekTo(event.target.value)} onPointerUp={() => requestSeek(currentTime, currentTrack)} onKeyUp={() => requestSeek(currentTime, currentTrack)} disabled={!currentTrack} aria-label="Track progress" className="h-2 w-full cursor-pointer accent-[#d6ff36]" style={{ background: "linear-gradient(to right,#d6ff36 " + progress + "%,rgb(255 255 255 / 0.18) " + progress + "%)" }} />
              <div className="mt-1 flex justify-between text-xs tabular-nums text-zinc-400"><span>{formatTime(currentTime)}</span><span>{duration ? formatTime(duration) : "--:--"}</span></div>
            </div>
            <div className="flex items-center justify-between gap-1 text-zinc-100 sm:justify-center sm:gap-4">
              <button type="button" onClick={previousTrack} disabled={!currentTrack} aria-label="Previous track" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"><SkipBack aria-hidden="true" className="h-6 w-6" /></button>
              <button type="button" onClick={() => jumpBy(-10)} disabled={!currentTrack} aria-label="Seek backward 10 seconds" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"><Rewind aria-hidden="true" className="h-5 w-5" /></button>
              <button type="button" onClick={handleTogglePlay} disabled={!currentTrack} aria-label={isPlaying ? "Pause" : "Play"} className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-full bg-[#d6ff36] text-[#07100d] shadow-[0_0_32px_rgba(214,255,54,0.2)] transition hover:scale-105 disabled:opacity-45">{isPlaying ? <Pause aria-hidden="true" className="h-8 w-8" /> : <Play aria-hidden="true" className="h-8 w-8 fill-current" />}</button>
              <button type="button" onClick={() => jumpBy(10)} disabled={!currentTrack} aria-label="Seek forward 10 seconds" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"><FastForward aria-hidden="true" className="h-5 w-5" /></button>
              <button type="button" onClick={nextTrack} disabled={!currentTrack} aria-label="Next track" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"><SkipForward aria-hidden="true" className="h-6 w-6" /></button>
            </div>
            <div className="relative flex items-center justify-center gap-1 border-t border-white/10 pt-3 text-zinc-400 sm:gap-2">
              <button type="button" onClick={toggleShuffle} aria-label={isShuffling ? "Turn shuffle off" : "Turn shuffle on"} aria-pressed={isShuffling} className={isShuffling ? "grid h-11 w-11 place-items-center rounded-xl text-[#d6ff36] transition hover:bg-white/10" : "grid h-11 w-11 place-items-center rounded-xl transition hover:bg-white/10 hover:text-white"}><Shuffle aria-hidden="true" className="h-5 w-5" /></button>
              <button type="button" onClick={toggleRepeat} aria-label={repeatMode === "off" ? "Turn repeat on" : repeatMode === "one" ? "Repeat all" : "Turn repeat off"} aria-pressed={repeatMode !== "off"} className={repeatMode !== "off" ? "relative grid h-11 w-11 place-items-center rounded-xl text-[#d6ff36] transition hover:bg-white/10" : "relative grid h-11 w-11 place-items-center rounded-xl transition hover:bg-white/10 hover:text-white"}><Repeat2 aria-hidden="true" className="h-5 w-5" />{repeatMode === "one" ? <span className="absolute right-1 top-1 grid h-3 w-3 place-items-center rounded-full bg-[#d6ff36] text-[8px] font-black text-[#07100d]">1</span> : null}</button>
              <div className="relative">
                <button type="button" onClick={() => setQueueMenuOpen((open) => !open)} aria-label={"Playback queue, " + upcomingCount + " upcoming"} aria-expanded={queueMenuOpen} className={queueMenuOpen ? "relative grid h-11 w-11 place-items-center rounded-xl text-[#d6ff36] transition hover:bg-white/10" : "relative grid h-11 w-11 place-items-center rounded-xl transition hover:bg-white/10 hover:text-white"}><ListMusic aria-hidden="true" className="h-5 w-5" />{upcomingCount > 0 ? <span className="absolute right-0 top-0 min-w-4 rounded-full bg-[#d6ff36] px-1 text-[9px] font-black leading-4 text-[#07100d]">{upcomingCount > 99 ? "99+" : upcomingCount}</span> : null}</button>
                {queueMenuOpen ? <div className="absolute bottom-full left-1/2 z-[120] mb-3 max-h-[min(45dvh,28rem)] w-[min(92vw,28rem)] -translate-x-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[#080b09] p-2 shadow-2xl shadow-black/60 sm:p-3"><QueuePanel /></div> : null}
              </div>
              <button type="button" onClick={() => saveAutoplayPreference(!autoplayEnabled)} aria-label={autoplayEnabled ? "Turn off autoplay radio" : "Turn on autoplay radio"} aria-pressed={autoplayEnabled} className={autoplayEnabled ? "grid h-11 w-11 place-items-center rounded-xl text-[#d6ff36] transition hover:bg-white/10" : "grid h-11 w-11 place-items-center rounded-xl transition hover:bg-white/10 hover:text-white"}><Radio aria-hidden="true" className="h-5 w-5" /></button>
              <div className="relative">
                <button type="button" onClick={() => setSleepMenuOpen((open) => !open)} aria-label="Sleep timer options" aria-expanded={sleepMenuOpen} className={sleepTimerMinutes !== null || sleepAtTrackEnd ? "grid h-11 w-11 place-items-center rounded-xl text-[#d6ff36] transition hover:bg-white/10" : "grid h-11 w-11 place-items-center rounded-xl transition hover:bg-white/10 hover:text-white"}><Moon aria-hidden="true" className="h-5 w-5" /></button>
                {sleepMenuOpen ? <div className="absolute bottom-full right-0 z-[120] mb-3 w-48 rounded-xl border border-white/10 bg-[#111513] p-2 text-left shadow-2xl"><p className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Sleep timer</p>{[15, 30, 45, 60].map((minutes) => <button key={minutes} type="button" onClick={() => { setSleepTimerMinutes(minutes); setSleepAtTrackEnd(false); setSleepMenuOpen(false); }} className="block w-full rounded-lg px-2 py-2 text-left text-sm text-zinc-200 hover:bg-white/10">{minutes} minutes</button>)}<button type="button" disabled={!currentTrack} onClick={() => { setSleepTimerMinutes(null); setSleepAtTrackEnd(true); setSleepMenuOpen(false); }} className="block w-full rounded-lg px-2 py-2 text-left text-sm text-zinc-200 hover:bg-white/10 disabled:opacity-40">At end of this track</button>{sleepTimerMinutes !== null || sleepAtTrackEnd ? <button type="button" onClick={() => { setSleepTimerMinutes(null); setSleepAtTrackEnd(false); setSleepMenuOpen(false); }} className="mt-1 block w-full rounded-lg border-t border-white/10 px-2 py-2 text-left text-sm text-[#80cbc4] hover:bg-white/5">Turn timer off</button> : null}</div> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    , document.body) : null}
    </>
  );
}

