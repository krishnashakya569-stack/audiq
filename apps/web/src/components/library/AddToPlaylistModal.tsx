"use client";

import { Check, X, Music2, Plus } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Track } from "@/store/player";
import { usePlaylistStore } from "@/store/playlist";

type Props = {
  open: boolean;
  onClose: () => void;
  track: Track;
};

export default function AddToPlaylistModal({
  open,
  onClose,
  track,
}: Props) {
  const {
    playlists,
    createPlaylist,
    addSongToPlaylist,
  } = usePlaylistStore();
  const editablePlaylists = playlists.filter((playlist) =>
    !playlist.collaborationRole ||
    playlist.collaborationRole === "owner" ||
    playlist.collaborationRole === "editor"
  );

  const [playlistName, setPlaylistName] =
    useState("");
  const [createError, setCreateError] = useState("");

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-white/10 bg-[#121212] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >

        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <h2 className="text-lg font-bold text-white">
              Add to Playlist
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              {track.title}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 transition hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-4">

          {editablePlaylists.length === 0 ? (

            <div className="py-10 text-center">

              <Music2
                size={40}
                className="mx-auto mb-3 text-zinc-500"
              />

              <p className="text-zinc-400">No editable playlists</p>

              <p className="mt-1 text-sm text-zinc-500">
                Create your first playlist below.
              </p>

            </div>

          ) : (

            <div className="space-y-2">

              {editablePlaylists.map((playlist) => (
                <PlaylistChoice
                  key={playlist.id}
                  name={playlist.name}
                  songCount={playlist.tracks.length}
                  alreadyAdded={playlist.tracks.some((song) => String(song.id) === String(track.id))}
                  onChoose={() => {
                    addSongToPlaylist(playlist.id, track);
                    onClose();
                  }}
                />
              ))}

            </div>

          )}

        </div>

        <div className="border-t border-white/10 p-5">

          <input
            value={playlistName}
            onChange={(e) =>
              setPlaylistName(e.target.value)
            }
            placeholder="New Playlist"
            className="mb-3 w-full rounded-lg border border-white/10 bg-[#1b1b1b] px-4 py-3 text-white outline-none transition focus:border-[#00796b]"
          />

          <button
            type="button"
            onClick={() => {
              const name = playlistName.trim();
              if (!name) return;

              const existingIds = new Set(usePlaylistStore.getState().playlists.map((playlist) => playlist.id));
              createPlaylist(name);

              const created = usePlaylistStore.getState().playlists.find(
                (playlist) => !existingIds.has(playlist.id) && playlist.name.toLowerCase() === name.toLowerCase()
              );

              if (!created) {
                setCreateError("A playlist with that name already exists, or the name is empty.");
                return;
              }
              addSongToPlaylist(created.id, track);

              setPlaylistName("");
              setCreateError("");
              onClose();
            }}
            disabled={!playlistName.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#00796b] to-[#00594f] py-3 font-semibold text-white transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={18} />

            Create Playlist
          </button>
          {createError ? <p role="alert" className="mt-2 text-sm text-red-300">{createError}</p> : null}

        </div>

      </div>
    </div>,
    document.body
  );
}

function PlaylistChoice({
  name,
  songCount,
  alreadyAdded,
  onChoose,
}: {
  name: string;
  songCount: number;
  alreadyAdded: boolean;
  onChoose: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChoose}
      disabled={alreadyAdded}
      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-[#00796b] hover:bg-[#00796b]/10 disabled:cursor-default disabled:opacity-70"
    >
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#00594f]">
                    <Music2 size={18} />
                  </div>

                  <div className="flex-1 text-left">
                    <p className="font-medium text-white">{name}</p>
                    <p className="text-xs text-zinc-500">
                      {alreadyAdded ? "Already in this playlist" : `${songCount} songs`}
                    </p>
                  </div>

      {alreadyAdded ? <Check aria-hidden="true" className="h-4 w-4 text-[#80cbc4]" /> : <Plus aria-hidden="true" className="h-4 w-4 text-zinc-400" />}
    </button>
  );
}
