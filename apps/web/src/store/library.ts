import { create } from "zustand";
import { Track } from "./player";
import { load, save } from "@/services/storage";

type Playlist = {
  id: string;
  name: string;
  cover?: string;
  songs: Track[];
  createdAt: number;
};

type LibraryState = {
  likedSongs: Track[];
  recentlyPlayed: Track[];
  hiddenRecommendations: Track[];
  playlists: Playlist[];
  searchHistory: string[];

  likeSong: (track: Track) => void;
  unlikeSong: (id: Track["id"]) => void;
  isLiked: (id: Track["id"]) => boolean;

  addRecentlyPlayed: (track: Track) => void;
  replaceRecentlyPlayed: (tracks: Track[]) => void;
  clearRecentlyPlayed: () => void;

  markRecommendationNotInterested: (track: Track) => void;
  restoreRecommendation: (track: Track) => void;
  replaceHiddenRecommendations: (tracks: Track[]) => void;

  createPlaylist: (name: string) => void;
  deletePlaylist: (id: string) => void;

  addSongToPlaylist: (
    playlistId: string,
    track: Track
  ) => void;

  removeSongFromPlaylist: (
    playlistId: string,
    trackId: Track["id"]
  ) => void;

  renamePlaylist: (
    playlistId: string,
    name: string
  ) => void;

  addSearch: (query: string) => void;
  replaceSearchHistory: (queries: string[]) => void;
  clearSearchHistory: () => void;
};

export function recommendationTrackKey(track: Track) {
  return `${track.source ?? "unknown"}:${String(track.id)}:${track.videoId ?? ""}`;
}

export const useLibraryStore =
  create<LibraryState>((set, get) => ({
    likedSongs: load("likedSongs", []),

    recentlyPlayed: load(
      "recentlyPlayed",
      []
    ),

    hiddenRecommendations: load("hiddenRecommendations", []),

    playlists: load("playlists", []),

    searchHistory: load(
      "searchHistory",
      []
    ),

    likeSong(track) {
      const exists = get().likedSongs.some(
        (song) => String(song.id) === String(track.id)
      );

      if (exists) return;

      const likedSongs = [
        track,
        ...get().likedSongs,
      ];

      save("likedSongs", likedSongs);

      set({ likedSongs });
    },

    unlikeSong(id) {
      const likedSongs =
        get().likedSongs.filter(
          (song) => String(song.id) !== String(id)
        );

      save("likedSongs", likedSongs);

      set({ likedSongs });
    },

    isLiked(id) {
      return get().likedSongs.some(
        (song) => String(song.id) === String(id)
      );
    },

    addRecentlyPlayed(track) {
      const history = [
        track,
        ...get().recentlyPlayed.filter(
          (song) => String(song.id) !== String(track.id)
        ),
      ].slice(0, 50);

      save("recentlyPlayed", history);

      set({
        recentlyPlayed: history,
      });
    },

    replaceRecentlyPlayed(tracks) {
      const recentlyPlayed = tracks.slice(0, 50);
      save("recentlyPlayed", recentlyPlayed);
      set({ recentlyPlayed });
    },

    clearRecentlyPlayed() {
      save("recentlyPlayed", []);

      set({
        recentlyPlayed: [],
      });
    },

    markRecommendationNotInterested(track) {
      const key = recommendationTrackKey(track);
      if (get().hiddenRecommendations.some((item) => recommendationTrackKey(item) === key)) return;
      const hiddenRecommendations = [track, ...get().hiddenRecommendations].slice(0, 200);
      save("hiddenRecommendations", hiddenRecommendations);
      set({ hiddenRecommendations });
    },

    restoreRecommendation(track) {
      const key = recommendationTrackKey(track);
      const hiddenRecommendations = get().hiddenRecommendations.filter((item) => recommendationTrackKey(item) !== key);
      if (hiddenRecommendations.length === get().hiddenRecommendations.length) return;
      save("hiddenRecommendations", hiddenRecommendations);
      set({ hiddenRecommendations });
    },

    replaceHiddenRecommendations(tracks) {
      const seen = new Set<string>();
      const hiddenRecommendations = tracks.filter((track) => {
        const key = recommendationTrackKey(track);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 200);
      save("hiddenRecommendations", hiddenRecommendations);
      set({ hiddenRecommendations });
    },

    createPlaylist(name) {
      const playlist: Playlist = {
        id: crypto.randomUUID(),
        name,
        songs: [],
        createdAt: Date.now(),
      };

      const playlists = [
        ...get().playlists,
        playlist,
      ];

      save("playlists", playlists);

      set({ playlists });
    },

    deletePlaylist(id) {
      const playlists =
        get().playlists.filter(
          (playlist) =>
            playlist.id !== id
        );

      save("playlists", playlists);

      set({ playlists });
    },

    renamePlaylist(id, name) {
      const playlists =
        get().playlists.map((playlist) =>
          playlist.id === id
            ? {
                ...playlist,
                name,
              }
            : playlist
        );

      save("playlists", playlists);

      set({ playlists });
    },

    addSongToPlaylist(
      playlistId,
      track
    ) {
      const playlists =
        get().playlists.map((playlist) => {
          if (
            playlist.id !== playlistId
          ) {
            return playlist;
          }

          if (
            playlist.songs.some(
              (song) =>
                song.id === track.id
            )
          ) {
            return playlist;
          }

          return {
            ...playlist,
            songs: [
              ...playlist.songs,
              track,
            ],
          };
        });

      save("playlists", playlists);

      set({ playlists });
    },

    removeSongFromPlaylist(
      playlistId,
      trackId
    ) {
      const playlists =
        get().playlists.map((playlist) => {
          if (
            playlist.id !== playlistId
          ) {
            return playlist;
          }

          return {
            ...playlist,
            songs:
              playlist.songs.filter(
                (song) =>
                  song.id !== trackId
              ),
          };
        });

      save("playlists", playlists);

      set({ playlists });
    },

    addSearch(query) {
      const value = query.trim().slice(0, 120);

      if (!value) return;

      const history = [
        value,
        ...get().searchHistory.filter(
          (q) =>
            q.toLowerCase() !==
            value.toLowerCase()
        ),
      ].slice(0, 20);

      save("searchHistory", history);

      set({
        searchHistory: history,
      });
    },

    replaceSearchHistory(queries) {
      const seen = new Set<string>();
      const searchHistory = queries
        .map((query) => query.trim().slice(0, 120))
        .filter((query) => {
          const key = query.toLowerCase().replace(/\s+/g, " ");
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 20);

      save("searchHistory", searchHistory);
      set({ searchHistory });
    },

    clearSearchHistory() {
      save("searchHistory", []);

      set({
        searchHistory: [],
      });
    },
  }));
