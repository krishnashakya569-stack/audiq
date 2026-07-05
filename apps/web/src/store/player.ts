import { create } from "zustand";

export type Track = {
  id: number | string;
  title: string;
  artist: string;
  albumArt: string;
  audio: string;
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

      const activeQueue =
        queue && queue.length > 0
          ? [...queue]
          : [...state.queue];

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
    set((state) => ({
      queue,
      currentIndex:
        state.currentTrack == null
          ? -1
          : queue.findIndex(
              (song) =>
                song.id ===
                state.currentTrack?.id
            ),
    })),
      nextTrack: () =>
    set((state) => {
      if (
        state.queue.length === 0 ||
        state.currentIndex === -1
      ) {
        return {
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
        state.queue.length > 1
      ) {
        let randomIndex = state.currentIndex;

        while (
          randomIndex === state.currentIndex
        ) {
          randomIndex = Math.floor(
            Math.random() * state.queue.length
          );
        }

        return {
          currentTrack:
            state.queue[randomIndex],
          currentIndex: randomIndex,
          isPlaying: true,
        };
      }

      const nextIndex =
        state.currentIndex + 1;

      if (nextIndex < state.queue.length) {
        return {
          currentTrack:
            state.queue[nextIndex],
          currentIndex: nextIndex,
          isPlaying: true,
        };
      }

      if (state.repeatMode === "all") {
        return {
          currentTrack: state.queue[0],
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

      const previousIndex =
        state.currentIndex - 1;

      if (previousIndex >= 0) {
        return {
          currentTrack:
            state.queue[previousIndex],
          currentIndex: previousIndex,
          isPlaying: true,
        };
      }

      if (state.repeatMode === "all") {
        const last =
          state.queue.length - 1;

        return {
          currentTrack:
            state.queue[last],
          currentIndex: last,
          isPlaying: true,
        };
      }

      return {
        currentTrack: state.queue[0],
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
