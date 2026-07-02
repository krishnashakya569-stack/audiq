"use client";

import { X, Music2, Plus } from "lucide-react";
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

  const [playlistName, setPlaylistName] =
    useState("");

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

          {playlists.length === 0 ? (

            <div className="py-10 text-center">

              <Music2
                size={40}
                className="mx-auto mb-3 text-zinc-500"
              />

              <p className="text-zinc-400">
                No playlists yet
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Create your first playlist below.
              </p>

            </div>

          ) : (

            <div className="space-y-2">

              {playlists.map((playlist) => (

                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => {
                    addSongToPlaylist(
                      playlist.id,
                      track
                    );

                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-[#ff2d67] hover:bg-[#ff2d67]/10"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#b01340]">
                    <Music2 size={18} />
                  </div>

                  <div className="flex-1 text-left">

                    <p className="font-medium text-white">
                      {playlist.name}
                    </p>

                    <p className="text-xs text-zinc-500">
                      {playlist.tracks.length} songs
                    </p>

                  </div>

                </button>

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
            className="mb-3 w-full rounded-lg border border-white/10 bg-[#1b1b1b] px-4 py-3 text-white outline-none transition focus:border-[#ff2d67]"
          />

          <button
            type="button"
            onClick={() => {
              if (!playlistName.trim()) return;

              createPlaylist(playlistName);

              const created =
                usePlaylistStore
                  .getState()
                  .playlists.at(-1);

              if (created) {
                addSongToPlaylist(
                  created.id,
                  track
                );
              }

              setPlaylistName("");

              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#ff2d67] to-[#b01340] py-3 font-semibold text-white transition hover:scale-[1.02]"
          >
            <Plus size={18} />

            Create Playlist
          </button>

        </div>

      </div>
    </div>,
    document.body
  );
}
