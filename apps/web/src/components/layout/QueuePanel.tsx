"use client";

import { ChevronDown, ChevronUp, Music2, Trash2 } from "lucide-react";
import { usePlayerStore } from "@/store/player";

export default function QueuePanel() {
  const queue = usePlayerStore((state) => state.queue);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const clearQueue = usePlayerStore((state) => state.clearQueue);
  const removeFromQueue = usePlayerStore((state) => state.removeFromQueue);
  const moveInQueue = usePlayerStore((state) => state.moveInQueue);
  const upcomingCount = Math.max(0, queue.length - currentIndex - 1);

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Queue</h2>
          <p className="text-xs text-zinc-500">
            {upcomingCount} upcoming song{upcomingCount !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={clearQueue}
          disabled={!queue.length || (currentIndex >= 0 && currentIndex >= queue.length - 1)}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-400 transition hover:border-red-400/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
          title="Remove upcoming songs; keep the current track"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          <span>Clear upcoming</span>
        </button>
      </div>

      <div className="queue-scroll mt-4 max-h-[min(55vh,520px)] space-y-2 overflow-y-auto pr-1 sm:pr-2">
        {queue.length === 0 ? (
          <div className="rounded-md border border-dashed border-white/10 p-6 text-center text-zinc-500">
            Queue is empty
          </div>
        ) : (
          queue.map((track, index) => {
            const active = currentTrack?.id === track.id && currentTrack?.videoId === track.videoId;

            return (
              <article
                key={`${track.source}-${track.id}-${track.videoId ?? ""}-${index}`}
                className={`flex min-w-0 items-center gap-2 rounded-lg border p-2 transition sm:gap-3 ${
                  active ? "border-[#00796b]/40 bg-[#00594f]/25" : "border-transparent hover:border-white/10 hover:bg-white/5"
                }`}
              >
                <button
                  type="button"
                  onClick={() => playTrack(track, queue)}
                  aria-label={`${active ? "Restart" : "Play"} ${track.title} by ${track.artist}`}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-zinc-800 text-zinc-300 transition hover:bg-[#00796b] hover:text-white"
                >
                  <Music2 aria-hidden="true" className="h-[18px] w-[18px]" />
                </button>

                <button type="button" onClick={() => playTrack(track, queue)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold text-white">{track.title}</span>
                  <span className="block truncate text-xs text-zinc-400">
                    {active ? "Now playing" : track.artist}
                  </span>
                </button>

                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveInQueue(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`Move ${track.title} up in queue`}
                    title="Move up"
                    className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronUp aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveInQueue(index, index + 1)}
                    disabled={index === queue.length - 1}
                    aria-label={`Move ${track.title} down in queue`}
                    title="Move down"
                    className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronDown aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromQueue(index)}
                    aria-label={`Remove ${track.title} from queue`}
                    title="Remove from queue"
                    className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
