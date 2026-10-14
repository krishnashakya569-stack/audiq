"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

type YouTubePlayer = {
  cueVideoById(videoId: string): void;
  destroy(): void;
  getCurrentTime(): number;
  getDuration(): number;
  mute(): void;
  pauseVideo(): void;
  playVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  unMute(): void;
};

type YouTubeApi = {
  Player: new (
    element: HTMLElement,
    options: {
      height: string;
      width: string;
      videoId: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: (event: { target: YouTubePlayer }) => void;
        onStateChange: (event: { data: number; target: YouTubePlayer }) => void;
        onError: () => void;
      };
    }
  ) => YouTubePlayer;
  PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
  };
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export type YouTubeEmbedControls = {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
};

type YouTubeEmbedPlayerProps = {
  videoId: string;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  onPlayingChange: (playing: boolean) => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onEnded: () => void;
};

let youtubeApiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();

      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        reject(new Error("YouTube player API did not initialize."));
      }
    };

    let script = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]'
    );

    if (!script) {
      script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        youtubeApiPromise = null;
        reject(new Error("Could not load the YouTube player API."));
      };
      document.head.appendChild(script);
    }
  });

  return youtubeApiPromise;
}

const YouTubeEmbedPlayer = forwardRef<
  YouTubeEmbedControls,
  YouTubeEmbedPlayerProps
>(function YouTubeEmbedPlayer(
  {
    videoId,
    isPlaying,
    volume,
    isMuted,
    onPlayingChange,
    onTimeUpdate,
    onDurationChange,
    onEnded,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const callbacksRef = useRef({
    isPlaying,
    volume,
    isMuted,
    onPlayingChange,
    onTimeUpdate,
    onDurationChange,
    onEnded,
  });
  const [isReady, setReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  callbacksRef.current = {
    isPlaying,
    volume,
    isMuted,
    onPlayingChange,
    onTimeUpdate,
    onDurationChange,
    onEnded,
  };

  useImperativeHandle(
    ref,
    () => ({
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
      seekTo: (seconds) => playerRef.current?.seekTo(seconds, true),
    }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    let player: YouTubePlayer | null = null;
    let pollTimer: number | undefined;

    setReady(false);
    setHasError(false);
    playerRef.current = null;

    loadYouTubeApi()
      .then((api) => {
        if (cancelled || !containerRef.current) return;

        let playerReady = false;
        player = new api.Player(containerRef.current, {
          height: "100%",
          width: "100%",
          videoId,
          playerVars: {
            playsinline: 1,
            controls: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) {
                event.target.destroy();
                return;
              }

              playerReady = true;
              playerRef.current = event.target;
              event.target.setVolume(
                Math.round(callbacksRef.current.volume * 100)
              );
              if (callbacksRef.current.isMuted) event.target.mute();

              if (callbacksRef.current.isPlaying) {
                event.target.playVideo();
              } else {
                event.target.cueVideoById(videoId);
              }

              setReady(true);
              pollTimer = window.setInterval(() => {
                const current = playerRef.current;
                if (!current) return;

                const currentTime = current.getCurrentTime();
                const duration = current.getDuration();
                if (Number.isFinite(currentTime)) {
                  callbacksRef.current.onTimeUpdate(currentTime);
                }
                if (Number.isFinite(duration) && duration > 0) {
                  callbacksRef.current.onDurationChange(duration);
                }
              }, 500);
            },
            onStateChange: (event) => {
              if (!playerReady) return;

              if (event.data === api.PlayerState.PLAYING) {
                callbacksRef.current.onPlayingChange(true);
              } else if (event.data === api.PlayerState.ENDED) {
                callbacksRef.current.onPlayingChange(false);
                callbacksRef.current.onEnded();
              } else if (event.data === api.PlayerState.PAUSED) {
                callbacksRef.current.onPlayingChange(false);
              }
            },
            onError: () => {
              setHasError(true);
              callbacksRef.current.onPlayingChange(false);
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });

    return () => {
      cancelled = true;
      if (pollTimer) window.clearInterval(pollTimer);
      player?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !isReady) return;

    player.setVolume(Math.round(volume * 100));
    if (isMuted || volume === 0) {
      player.mute();
    } else {
      player.unMute();
    }

    if (isPlaying) {
      player.playVideo();
    } else {
      player.pauseVideo();
    }
  }, [isPlaying, isMuted, isReady, volume]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
      <div ref={containerRef} className="h-full w-full" />
      {hasError ? (
        <div className="absolute inset-0 grid place-items-center bg-black/90 p-4 text-center">
          <p className="max-w-sm text-sm text-zinc-200">
            This video cannot play in the embedded player. Try another result or
            open it on YouTube.
            <br />
            <a
              className="mt-2 inline-block text-[#ff8aa8] underline"
              href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`}
              target="_blank"
              rel="noopener"
            >
              Open on YouTube
            </a>
          </p>
        </div>
      ) : null}
    </div>
  );
});

YouTubeEmbedPlayer.displayName = "YouTubeEmbedPlayer";

export default YouTubeEmbedPlayer;
