import { create } from "zustand";

export type Track = {
  id: number | string;
  title: string;
  artist: string;
  albumArt: string;
  audio: string;
  fallbackAudio?: string;
  duration?: number;
  isPreview?: boolean;
  source?: string;
  videoId?: string;
  externalUrl?: string;
};

type PlayerState = {
  currentTrack: Track | null;

  queue: Track[];

  currentIndex: number;

  isPlaying: boolean;

  isShuffling: boolean;

  repeatMode: "off" | "one" | "all";

  playTrack: (
    track: Track,
    queue?: Track[]
  ) => void;

  togglePlay: () => void;

  setPlaying: (
    playing: boolean
  ) => void;

  setQueue: (
    queue: Track[]
  ) => void;

  nextTrack: () => void;

  previousTrack: () => void;

  toggleShuffle: () => void;

  toggleRepeat: () => void;

  addToQueue: (
    track: Track
  ) => void;

  removeFromQueue: (
    queueIndex: number
  ) => void;

  clearQueue: () => void;
};

function canPlayTrack(track: Track | null | undefined) {
  if (!track) return false;

  return (
    !!track.audio ||
    (track.source === "youtube" && !!track.videoId)
  );
}

export const usePlayerStore =
create<PlayerState>((set) => ({

  currentTrack: null,

  queue: [],

  currentIndex: -1,

  isPlaying: false,

  isShuffling: false,

  repeatMode: "off",

  playTrack: (track, queue) =>
    set((state) => {
      if (!canPlayTrack(track)) {
        return {
          isPlaying: false,
        };
      }

      const activeQueue =
        queue && queue.length > 0
          ? queue.filter(canPlayTrack)
          : state.queue.filter(canPlayTrack);

      let index = activeQueue.findIndex(
        (item) =>
          item.id === track.id &&
          item.videoId === track.videoId
      );

      if (index === -1) {
        activeQueue.push(track);
        index = activeQueue.length - 1;
      }

      return {
        currentTrack: track,
        queue: activeQueue,
        currentIndex: index,
        isPlaying: true,
      };
    }),

  togglePlay: () =>
    set((state) => ({
      isPlaying:
        !!state.currentTrack &&
        !state.isPlaying,
    })),

  setPlaying: (playing) =>
    set({
      isPlaying: playing,
    }),

  setQueue: (queue) =>
    set((state) => {
      const playableQueue = queue.filter(canPlayTrack);

      return {
        queue: playableQueue,
        currentIndex:
          state.currentTrack == null
            ? -1
            : playableQueue.findIndex(
                (song) =>
                  song.id ===
                  state.currentTrack?.id
              ),
      };
    }),
      nextTrack: () =>
    set((state) => {
      const playableQueue =
        state.queue.filter(canPlayTrack);

      const currentIndex = playableQueue.findIndex(
        (track) =>
          track.id === state.currentTrack?.id &&
          track.videoId === state.currentTrack?.videoId
      );

      if (
        playableQueue.length === 0 ||
        currentIndex === -1
      ) {
        return {
          queue: playableQueue,
          currentIndex: -1,
          isPlaying: false,
        };
      }

      if (state.repeatMode === "one") {
        return {
          currentTrack: state.currentTrack,
          isPlaying: true,
        };
      }

      if (
        state.isShuffling &&
        playableQueue.length > 1
      ) {
        let randomIndex = currentIndex;

        while (
          randomIndex === currentIndex
        ) {
          randomIndex = Math.floor(
            Math.random() * playableQueue.length
          );
        }

        return {
          queue: playableQueue,
          currentTrack:
            playableQueue[randomIndex],
          currentIndex: randomIndex,
          isPlaying: true,
        };
      }

      const nextIndex =
        currentIndex + 1;

      if (nextIndex < playableQueue.length) {
        return {
          queue: playableQueue,
          currentTrack:
            playableQueue[nextIndex],
          currentIndex: nextIndex,
          isPlaying: true,
        };
      }

      if (state.repeatMode === "all") {
        return {
          queue: playableQueue,
          currentTrack: playableQueue[0],
          currentIndex: 0,
          isPlaying: true,
        };
      }

      return {
        isPlaying: false,
      };
    }),

  previousTrack: () =>
    set((state) => {
      if (
        state.queue.length === 0 ||
        state.currentIndex === -1
      ) {
        return {};
      }

      const playableQueue =
        state.queue.filter(canPlayTrack);

      const currentIndex = playableQueue.findIndex(
        (track) =>
          track.id === state.currentTrack?.id &&
          track.videoId === state.currentTrack?.videoId
      );

      if (
        playableQueue.length === 0 ||
        currentIndex === -1
      ) {
        return {
          queue: playableQueue,
          currentIndex: -1,
          isPlaying: false,
        };
      }

      const previousIndex =
        currentIndex - 1;

      if (previousIndex >= 0) {
        return {
          queue: playableQueue,
          currentTrack:
            playableQueue[previousIndex],
          currentIndex: previousIndex,
          isPlaying: true,
        };
      }

      if (state.repeatMode === "all") {
        const last =
          playableQueue.length - 1;

        return {
          queue: playableQueue,
          currentTrack:
            playableQueue[last],
          currentIndex: last,
          isPlaying: true,
        };
      }

      return {
        queue: playableQueue,
        currentTrack: playableQueue[0],
        currentIndex: 0,
        isPlaying: true,
      };
    }),

  toggleShuffle: () =>
    set((state) => ({
      isShuffling:
        !state.isShuffling,
    })),

  toggleRepeat: () =>
    set((state) => ({
      repeatMode:
        state.repeatMode === "off"
          ? "all"
          : state.repeatMode === "all"
          ? "one"
          : "off",
    })),

  addToQueue: (track) =>
    set((state) => {
      if (!canPlayTrack(track)) {
        return {};
      }

      const exists = state.queue.some(
        (song, index) =>
          index !== state.currentIndex &&
          song.id === track.id &&
          song.videoId === track.videoId
      );

      if (exists) {
        return {};
      }

      return {
        queue: [
          ...state.queue,
          track,
        ],
      };
    }),

  removeFromQueue: (
    queueIndex
  ) =>
    set((state) => {
      if (
        queueIndex < 0 ||
        queueIndex >= state.queue.length
      ) {
        return {};
      }

      const updatedQueue =
        [...state.queue];

      updatedQueue.splice(
        queueIndex,
        1
      );

      let currentIndex =
        state.currentIndex;

      if (
        queueIndex <
        state.currentIndex
      ) {
        currentIndex--;
      }

      if (
        queueIndex ===
        state.currentIndex
      ) {
        if (
          updatedQueue.length === 0
        ) {
          return {
            queue: [],
            currentTrack: null,
            currentIndex: -1,
            isPlaying: false,
          };
        }

        currentIndex = Math.min(
          currentIndex,
          updatedQueue.length - 1
        );

        return {
          queue: updatedQueue,
          currentTrack:
            updatedQueue[currentIndex],
          currentIndex,
        };
      }

      return {
        queue: updatedQueue,
        currentIndex,
      };
    }),

  clearQueue: () =>
    set({
      queue: [],
      currentTrack: null,
      currentIndex: -1,
      isPlaying: false,
    }),

}));
