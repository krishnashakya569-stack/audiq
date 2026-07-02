"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Track } from "./player";

export type Playlist = {
  id: string;
  name: string;
  cover?: string;
  createdAt: number;
  tracks: Track[];
};

type PlaylistState = {
  playlists: Playlist[];

  createPlaylist: (
    name: string,
    cover?: string
  ) => void;

  deletePlaylist: (
    id: string
  ) => void;

  renamePlaylist: (
    id: string,
    name: string
  ) => void;

  addSongToPlaylist: (
    playlistId: string,
    track: Track
  ) => void;

  removeSongFromPlaylist: (
    playlistId: string,
    trackId: Track["id"]
  ) => void;

  clearPlaylist: (
    playlistId: string
  ) => void;

  getPlaylist: (
    id: string
  ) => Playlist | undefined;
};

export const usePlaylistStore =
create<PlaylistState>()(
persist(
(set, get) => ({

playlists: [],

createPlaylist: (
name,
cover
) =>

set((state) => {

const trimmed = name.trim();

if (!trimmed) return {};

const exists =
state.playlists.some(
(p) =>
p.name.toLowerCase() ===
trimmed.toLowerCase()
);

if (exists) return {};

return {
playlists: [
...state.playlists,
{
id: crypto.randomUUID(),
name: trimmed,
cover,
createdAt: Date.now(),
tracks: [],
},
],
};

}),

deletePlaylist: (id) =>
set((state) => ({
playlists:
state.playlists.filter(
(p) => p.id !== id
),
})),

renamePlaylist: (
id,
name
) =>
set((state) => ({
playlists:
state.playlists.map(
(p) =>
p.id === id
? {
...p,
name:
name.trim() ||
p.name,
}
: p
),
})),

addSongToPlaylist: (
playlistId,
track
) =>
set((state) => ({
playlists:
state.playlists.map(
(playlist) => {

if (
playlist.id !==
playlistId
)
return playlist;

const alreadyExists =
playlist.tracks.some(
(song) =>
song.id ===
track.id
);

if (alreadyExists)
return playlist;

return {
...playlist,
cover:
playlist.cover ??
track.albumArt,
tracks: [
...playlist.tracks,
track,
],
};
}
),
})),

removeSongFromPlaylist: (
playlistId,
trackId
) =>
set((state) => ({
playlists:
state.playlists.map(
(playlist) => {

if (
playlist.id !==
playlistId
)
return playlist;

return {
...playlist,
tracks:
playlist.tracks.filter(
(song) =>
song.id !==
trackId
),
};
}
),
})),

clearPlaylist: (
playlistId
) =>
set((state) => ({
playlists:
state.playlists.map(
(playlist) =>
playlist.id ===
playlistId
? {
...playlist,
tracks: [],
}
: playlist
),
})),

getPlaylist: (id) =>
get().playlists.find(
(p) => p.id === id
),

}),
{
name: "audiq-playlists",
}
)
);