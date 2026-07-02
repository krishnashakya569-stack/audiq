"use client";

import { Music2, Trash2 } from "lucide-react";
import { usePlayerStore } from "@/store/player";

export default function QueuePanel() {
  const {
    queue,
    currentTrack,
    playTrack,
    clearQueue,
  } = usePlayerStore();

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">
            Now Playing Queue
          </h2>

          <p className="text-xs text-zinc-500">
            {queue.length} song{queue.length !== 1 ? "s" : ""}
          </p>
        </div>

        <button
          onClick={clearQueue}
          className="rounded-md p-2 text-zinc-400 transition hover:bg-white/10 hover:text-red-400"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="mt-4 max-h-[340px] overflow-y-auto pr-2 queue-scroll space-y-2">
        {queue.length === 0 ? (
          <div className="rounded-md border border-dashed border-white/10 p-6 text-center text-zinc-500">
            Queue is empty
          </div>
        ) : (
          queue.map((track,index) => {
            const active = currentTrack?.id === track.id;

            return (
              <button
                key={`${track.source}-${track.id}-${index}`}
                onClick={() => playTrack(track, queue)}
                className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition ${
                  active
                    ? "bg-[#b01340]/25 border border-[#ff2d67]/40"
                    : "hover:bg-white/5"
                }`}
              >
                <div
                  className={`grid h-10 w-10 place-items-center rounded-md ${
                    active
                      ? "bg-[#ff2d67]"
                      : "bg-zinc-800"
                  }`}
                >
                  <Music2 size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">
                    {track.title}
                  </div>

                  <div className="truncate text-xs text-zinc-400">
                    {track.artist}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}