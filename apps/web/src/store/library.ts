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
  playlists: Playlist[];
  searchHistory: string[];

  likeSong: (track: Track) => void;
  unlikeSong: (id: Track["id"]) => void;
  isLiked: (id: Track["id"]) => boolean;

  addRecentlyPlayed: (track: Track) => void;
  clearRecentlyPlayed: () => void;

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
  clearSearchHistory: () => void;
};

export const useLibraryStore =
  create<LibraryState>((set, get) => ({
    likedSongs: load("likedSongs", []),

    recentlyPlayed: load(
      "recentlyPlayed",
      []
    ),

    playlists: load("playlists", []),

    searchHistory: load(
      "searchHistory",
      []
    ),

    likeSong(track) {
      const exists = get().likedSongs.some(
        (song) => song.id === track.id
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
          (song) => song.id !== id
        );

      save("likedSongs", likedSongs);

      set({ likedSongs });
    },

    isLiked(id) {
      return get().likedSongs.some(
        (song) => song.id === id
      );
    },

    addRecentlyPlayed(track) {
      const history = [
        track,
        ...get().recentlyPlayed.filter(
          (song) => song.id !== track.id
        ),
      ].slice(0, 50);

      save("recentlyPlayed", history);

      set({
        recentlyPlayed: history,
      });
    },

    clearRecentlyPlayed() {
      save("recentlyPlayed", []);

      set({
        recentlyPlayed: [],
      });
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
      const value = query.trim();

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

    clearSearchHistory() {
      save("searchHistory", []);

      set({
        searchHistory: [],
      });
    },
  }));