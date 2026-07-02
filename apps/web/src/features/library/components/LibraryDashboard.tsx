"use client";

import {
  Clock3,
  Download,
  Heart,
  History,
  Library,
  ListMusic,
  Music2,
  Play,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState, useSyncExternalStore } from "react";
import QueuePanel from "@/components/layout/QueuePanel";
import { useLibraryStore } from "@/store/library";
import { type Playlist, usePlaylistStore } from "@/store/playlist";
import { type Track, usePlayerStore } from "@/store/player";

export type LibraryTab = "liked" | "playlists" | "recent" | "downloads" | "queue" | "history";

const EMPTY_TRACKS: Track[] = [];
const EMPTY_PLAYLISTS: Playlist[] = [];

const tabs: Array<{ id: LibraryTab; label: string; icon: typeof Heart }> = [
  { id: "liked", label: "Liked Songs", icon: Heart },
  { id: "playlists", label: "Playlists", icon: ListMusic },
  { id: "recent", label: "Recently Played", icon: Clock3 },
  { id: "downloads", label: "Downloads", icon: Download },
  { id: "queue", label: "Queue", icon: Music2 },
  { id: "history", label: "History", icon: History },
];

function formatDuration(seconds?: number) {
  if (!seconds) return "--:--";

  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");

  return `${minutes}:${remaining}`;
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Heart;
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-white/10 bg-white/[0.035] p-8 text-center">
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-md border border-white/10 bg-white/[0.06] text-[#f5c2ce]">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

function TrackRow({
  track,
  index,
  queue,
  onRemove,
}: {
  track: Track;
  index: number;
  queue: Track[];
  onRemove?: () => void;
}) {
  const playTrack = usePlayerStore((state) => state.playTrack);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isActive = currentTrack?.id === track.id;

  return (
    <div
      className={`grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-2.5 transition md:grid-cols-[2.5rem_minmax(0,1.3fr)_minmax(0,0.8fr)_auto] ${
        isActive
          ? "border-[#ff2d67]/45 bg-[#b01340]/20"
          : "border-white/5 bg-white/[0.035] hover:border-white/10 hover:bg-white/[0.06]"
      }`}
    >
      <button
        type="button"
        onClick={() => playTrack(track, queue)}
        className="grid h-10 w-10 place-items-center rounded-md bg-white/[0.07] text-zinc-300 transition hover:bg-[#ff2d67] hover:text-white"
        title="Play"
      >
        {isActive ? <Play className="h-4 w-4 fill-current" /> : <span className="text-sm">{index + 1}</span>}
      </button>

      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-[#171317]">
          <Image src={track.albumArt || "/brand/audiq-logo.png"} alt="" fill sizes="48px" unoptimized className="object-cover" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{track.title}</p>
          <p className="truncate text-xs text-zinc-500">{track.artist}</p>
        </div>
      </div>

      <p className="hidden truncate text-sm text-zinc-500 md:block">{track.source ?? "AudiQ"}</p>

      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span className="w-10 text-right">{formatDuration(track.duration)}</span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="grid h-9 w-9 place-items-center rounded-md text-zinc-500 transition hover:bg-red-500/10 hover:text-red-300"
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PlaylistTile({
  playlist,
  onDelete,
}: {
  playlist: Playlist;
  onDelete: () => void;
}) {
  const playTrack = usePlayerStore((state) => state.playTrack);
  const renamePlaylist = usePlaylistStore((state) => state.renamePlaylist);
  const cover = playlist.cover || playlist.tracks[0]?.albumArt || "/brand/audiq-logo.png";

  return (
    <article className="group rounded-lg border border-white/10 bg-white/[0.045] p-4 transition hover:border-[#ff2d67]/40 hover:bg-white/[0.07]">
      <div className="relative aspect-square overflow-hidden rounded-md bg-[#151114]">
        <Image src={cover} alt="" fill sizes="220px" unoptimized className="object-cover transition group-hover:scale-105" />
        <button
          type="button"
          disabled={playlist.tracks.length === 0}
          onClick={() => playlist.tracks[0] && playTrack(playlist.tracks[0], playlist.tracks)}
          className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-[#ff2d67] text-white shadow-lg shadow-black/40 transition hover:scale-105 disabled:opacity-50"
          title="Play playlist"
        >
          <Play className="h-4 w-4 fill-current" />
        </button>
      </div>

      <input
        value={playlist.name}
        onChange={(event) => renamePlaylist(playlist.id, event.target.value)}
        className="mt-4 w-full rounded-md border border-transparent bg-transparent px-1 py-1 text-base font-bold text-white outline-none transition focus:border-white/10 focus:bg-black/20"
        aria-label="Playlist name"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
        <span>
          {playlist.tracks.length} song{playlist.tracks.length !== 1 ? "s" : ""}
        </span>
        <button type="button" onClick={onDelete} className="rounded-md p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-300" title="Delete playlist">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

type LibraryDashboardProps = {
  activeTab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
};

export default function LibraryDashboard({
  activeTab,
  onTabChange,
}: LibraryDashboardProps) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [filter, setFilter] = useState("");
  const likedSongs = useLibraryStore((state) => state.likedSongs);
  const recentlyPlayed = useLibraryStore((state) => state.recentlyPlayed);
  const clearRecentlyPlayed = useLibraryStore((state) => state.clearRecentlyPlayed);
  const unlikeSong = useLibraryStore((state) => state.unlikeSong);
  const playlists = usePlaylistStore((state) => state.playlists);
  const createPlaylist = usePlaylistStore((state) => state.createPlaylist);
  const deletePlaylist = usePlaylistStore((state) => state.deletePlaylist);

  const visibleLikedSongs = isClient ? likedSongs : EMPTY_TRACKS;
  const visibleRecentlyPlayed = isClient ? recentlyPlayed : EMPTY_TRACKS;
  const visiblePlaylists = isClient ? playlists : EMPTY_PLAYLISTS;

  const filteredLiked = useMemo(
    () => visibleLikedSongs.filter((track) => `${track.title} ${track.artist}`.toLowerCase().includes(filter.toLowerCase())),
    [filter, visibleLikedSongs]
  );

  const filteredRecent = useMemo(
    () => visibleRecentlyPlayed.filter((track) => `${track.title} ${track.artist}`.toLowerCase().includes(filter.toLowerCase())),
    [filter, visibleRecentlyPlayed]
  );

  const stats = [
    { label: "Liked", value: visibleLikedSongs.length, icon: Heart },
    { label: "Playlists", value: visiblePlaylists.length, icon: ListMusic },
    { label: "Recent", value: visibleRecentlyPlayed.length, icon: Clock3 },
  ];

  return (
    <section className="space-y-6 pb-6">
      <div className="overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(176,19,64,.28),rgba(68,215,182,.08),rgba(255,255,255,.04))] p-5 md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#f5c2ce]">
              <Library className="h-4 w-4" />
              Your Library
            </p>
            <h1 className="mt-3 text-3xl font-black text-white md:text-5xl">Everything you keep close.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Liked songs, playlists, queue, and listening history are now grouped into one focused AudiQ workspace.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-md border border-white/10 bg-black/25 p-3">
                <stat.icon className="h-4 w-4 text-[#f5c2ce]" />
                <p className="mt-2 text-2xl font-black">{stat.value}</p>
                <p className="text-xs text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="queue-scroll flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-[#ff2d67]/50 bg-[#b01340]/35 text-white"
                  : "border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-white/10 bg-white/[0.045] px-3 py-2 xl:w-72">
            <Search className="h-4 w-4 text-zinc-500" />
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter library"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
            />
          </label>
          <button
            type="button"
            onClick={() => createPlaylist(`New Playlist ${visiblePlaylists.length + 1}`)}
            className="grid h-10 w-10 place-items-center rounded-md bg-[#ff2d67] text-white shadow-lg shadow-[#b01340]/25"
            title="Create playlist"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {activeTab === "liked" ? (
        filteredLiked.length > 0 ? (
          <div className="space-y-2">
            {filteredLiked.map((track, index) => (
              <TrackRow key={`${track.source}-${track.id}`} track={track} index={index} queue={filteredLiked} onRemove={() => unlikeSong(track.id)} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Heart} title="No liked songs yet" description="Tap the heart in the player or on any song card and it will appear here instantly." />
        )
      ) : null}

      {activeTab === "playlists" ? (
        visiblePlaylists.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visiblePlaylists.map((playlist) => (
              <PlaylistTile key={playlist.id} playlist={playlist} onDelete={() => deletePlaylist(playlist.id)} />
            ))}
          </div>
        ) : (
          <EmptyState icon={ListMusic} title="Create your first playlist" description="Use the plus button to start a playlist, then add songs from any album card." />
        )
      ) : null}

      {activeTab === "recent" || activeTab === "history" ? (
        filteredRecent.length > 0 ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button type="button" onClick={clearRecentlyPlayed} className="rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-400 hover:border-red-400/40 hover:text-red-300">
                Clear history
              </button>
            </div>
            <div className="space-y-2">
              {filteredRecent.map((track, index) => (
                <TrackRow key={`${track.source}-${track.id}`} track={track} index={index} queue={filteredRecent} />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState icon={History} title="Your listening history is quiet" description="Play something from Home or Search and AudiQ will start building your recent activity." />
        )
      ) : null}

      {activeTab === "downloads" ? (
        <EmptyState icon={Download} title="Downloads are ready for the offline engine" description="This section is in place for Phase 13 caching and offline mode. Local and cached tracks will live here." />
      ) : null}

      {activeTab === "queue" ? <QueuePanel /> : null}
    </section>
  );
}
