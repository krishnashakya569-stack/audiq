"use client";

import {
  ArrowDownAZ,
  ArrowLeft,
  Check,
  Clock3,
  Copy,
  Download,
  Globe2,
  Heart,
  History,
  Library,
  ListMusic,
  LockKeyhole,
  Music2,
  Play,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState, useSyncExternalStore } from "react";
import QueuePanel from "@/components/layout/QueuePanel";
import TrackActions from "@/components/library/TrackActions";
import { useLibraryStore } from "@/store/library";
import { type Playlist, usePlaylistStore } from "@/store/playlist";
import { type Track, usePlayerStore } from "@/store/player";
import PlaylistCollaborationPanel from "@/features/library/components/PlaylistCollaborationPanel";
import { useAuth } from "@/features/auth/AuthProvider";

export type LibraryTab = "liked" | "playlists" | "recent" | "downloads" | "queue" | "history";

const EMPTY_TRACKS: Track[] = [];
const EMPTY_PLAYLISTS: Playlist[] = [];
type PlaylistSort = "custom" | "title" | "artist" | "shortest" | "longest";

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
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-md border border-white/10 bg-white/[0.06] text-[#80cbc4]">
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
      className={`grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border p-2 transition md:grid-cols-[2.5rem_minmax(0,1.3fr)_minmax(0,0.55fr)_auto] md:gap-3 md:p-2.5 ${
        isActive
          ? "border-[#00796b]/45 bg-[#00594f]/20"
          : "border-white/5 bg-white/[0.035] hover:border-white/10 hover:bg-white/[0.06]"
      }`}
    >
      <button
        type="button"
        onClick={() => playTrack(track, queue)}
        className="grid h-10 w-10 place-items-center rounded-md bg-white/[0.07] text-zinc-300 transition hover:bg-[#00796b] hover:text-white"
        title="Play"
      >
        {isActive ? <Play className="h-4 w-4 fill-current" /> : <span className="text-sm">{index + 1}</span>}
      </button>

      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-[#101412]">
          <Image src={track.albumArt || "/brand/audiq-vinyl.svg"} alt="" fill sizes="48px" unoptimized className="object-cover" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{track.title}</p>
          <p className="truncate text-xs text-zinc-500">{track.artist}</p>
        </div>
      </div>

      <p className="hidden truncate text-sm text-zinc-500 md:block">{track.source ?? "AudiQ"}</p>

      <div className="flex items-center gap-1 text-xs text-zinc-500">
        <span className="w-10 text-right">{formatDuration(track.duration)}</span>
        <TrackActions track={track} compact />
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
  onOpen,
}: {
  playlist: Playlist;
  onDelete?: () => void;
  onOpen: () => void;
}) {
  const playTrack = usePlayerStore((state) => state.playTrack);
  const renamePlaylist = usePlaylistStore((state) => state.renamePlaylist);
  const cover = playlist.cover || playlist.tracks[0]?.albumArt || "/brand/audiq-vinyl.svg";
  const isOwner = !playlist.collaborationRole || playlist.collaborationRole === "owner";
  const isPending = playlist.collaborationRole === "pending";

  return (
    <article className="group rounded-lg border border-white/10 bg-white/[0.045] p-3 transition hover:border-[#00796b]/40 hover:bg-white/[0.07] sm:p-4">
      <div className="relative aspect-square overflow-hidden rounded-md bg-[#101412]">
        <button type="button" onClick={onOpen} aria-label={`Open ${playlist.name}`} className="absolute inset-0 z-0">
          <Image src={cover} alt="" fill sizes="(max-width: 640px) 45vw, 220px" unoptimized className="object-cover transition group-hover:scale-105" />
        </button>
        <button
          type="button"
          disabled={playlist.tracks.length === 0 || isPending}
          onClick={() => playlist.tracks[0] && playTrack(playlist.tracks[0], playlist.tracks)}
          className="absolute bottom-2 right-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-[#00796b] text-white shadow-lg shadow-black/40 transition hover:scale-105 disabled:opacity-50 sm:bottom-3 sm:right-3 sm:h-10 sm:w-10"
          title="Play playlist"
        >
          <Play className="h-4 w-4 fill-current" />
        </button>
        {playlist.collaborationRole ? (
          <span className="absolute left-2 top-2 z-10 rounded-full border border-black/20 bg-black/75 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {isPending ? "Invite" : playlist.collaborationRole}
          </span>
        ) : null}
      </div>

      <input
        value={playlist.name}
        onChange={(event) => renamePlaylist(playlist.id, event.target.value)}
        readOnly={!isOwner}
        className={`mt-3 w-full rounded-md border border-transparent bg-transparent px-1 py-1 text-sm font-bold text-white outline-none transition focus:border-white/10 focus:bg-black/20 sm:text-base ${isOwner ? "" : "cursor-pointer"}`}
        aria-label="Playlist name"
        onClick={!isOwner ? onOpen : undefined}
      />
      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
        <span>
          {playlist.tracks.length} song{playlist.tracks.length !== 1 ? "s" : ""}
        </span>
        {onDelete ? (
          <button type="button" onClick={onDelete} className="rounded-md p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-300" title="Delete playlist">
            <Trash2 className="h-4 w-4" />
          </button>
        ) : playlist.collaborationRole ? <Users className="h-4 w-4 text-[#80cbc4]" aria-label="Collaborative playlist" /> : null}
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
  const [playlistSort, setPlaylistSort] = useState<PlaylistSort>("custom");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState("");
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const { user, supabase } = useAuth();
  const likedSongs = useLibraryStore((state) => state.likedSongs);
  const recentlyPlayed = useLibraryStore((state) => state.recentlyPlayed);
  const clearRecentlyPlayed = useLibraryStore((state) => state.clearRecentlyPlayed);
  const playlists = usePlaylistStore((state) => state.playlists);
  const createPlaylist = usePlaylistStore((state) => state.createPlaylist);
  const deletePlaylist = usePlaylistStore((state) => state.deletePlaylist);
  const setPlaylistVisibility = usePlaylistStore((state) => state.setPlaylistVisibility);
  const playTrack = usePlayerStore((state) => state.playTrack);

  const visibleLikedSongs = isClient ? likedSongs : EMPTY_TRACKS;
  const visibleRecentlyPlayed = isClient ? recentlyPlayed : EMPTY_TRACKS;
  const visiblePlaylists = isClient ? playlists : EMPTY_PLAYLISTS;
  const selectedPlaylist = visiblePlaylists.find((playlist) => playlist.id === selectedPlaylistId);
  const selectedPlaylistIsOwner = Boolean(selectedPlaylist && user && selectedPlaylist.ownerId === user.id
    && (!selectedPlaylist.collaborationRole || selectedPlaylist.collaborationRole === "owner"));

  const changeSelectedPlaylistVisibility = async () => {
    if (!selectedPlaylist || !selectedPlaylistIsOwner || !supabase || !user || visibilityBusy) return;
    const visibility = selectedPlaylist.visibility === "public" ? "private" : "public";
    setVisibilityBusy(true);
    setShareNotice("");
    const { error } = await supabase.from("audiq_playlists").update({ visibility })
      .eq("id", selectedPlaylist.id).eq("user_id", user.id);
    setVisibilityBusy(false);
    if (error) {
      setShareNotice("Could not update sharing. Please try again.");
      return;
    }
    setPlaylistVisibility(selectedPlaylist.id, visibility);
    setShareNotice(visibility === "public" ? "Playlist is public. Copy its link to share it." : "Playlist is private again.");
  };

  const copySelectedPlaylistLink = async () => {
    if (!selectedPlaylist || selectedPlaylist.visibility !== "public" || typeof window === "undefined") return;
    const link = `${window.location.origin}/playlist/${selectedPlaylist.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setShareNotice("Public playlist link copied.");
    } catch {
      setShareNotice(link);
    }
  };
  const sortedPlaylistTracks = useMemo(() => {
    const tracks = [...(selectedPlaylist?.tracks ?? EMPTY_TRACKS)];
    if (playlistSort === "title") tracks.sort((a, b) => a.title.localeCompare(b.title));
    if (playlistSort === "artist") tracks.sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));
    if (playlistSort === "shortest") tracks.sort((a, b) => (a.duration ?? Number.MAX_SAFE_INTEGER) - (b.duration ?? Number.MAX_SAFE_INTEGER));
    if (playlistSort === "longest") tracks.sort((a, b) => (b.duration ?? -1) - (a.duration ?? -1));
    return tracks;
  }, [playlistSort, selectedPlaylist]);

  const filteredPlaylistTracks = useMemo(
    () => sortedPlaylistTracks.filter((track) => `${track.title} ${track.artist}`.toLowerCase().includes(filter.toLowerCase())),
    [filter, sortedPlaylistTracks]
  );

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
      <div className="overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(0,121,107,.2),rgba(0,121,107,.1),rgba(255,255,255,.04))] p-5 md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#80cbc4]">
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
                <stat.icon className="h-4 w-4 text-[#80cbc4]" />
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
                  ? "border-[#00796b]/50 bg-[#00594f]/35 text-white"
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
            className="grid h-10 w-10 place-items-center rounded-md bg-[#00796b] text-white shadow-lg shadow-[#00594f]/25"
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
              <TrackRow key={`${track.source}-${track.id}`} track={track} index={index} queue={filteredLiked} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Heart} title="No liked songs yet" description="Tap the heart in the player or on any song card and it will appear here instantly." />
        )
      ) : null}

      {activeTab === "playlists" ? (
        selectedPlaylist ? (
          <div className="space-y-4">
            <PlaylistCollaborationPanel playlist={selectedPlaylist} />
            <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 sm:p-4">
              <div className="flex min-w-0 items-center gap-3">
                <button type="button" onClick={() => setSelectedPlaylistId(null)} aria-label="Back to playlists" className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-white">{selectedPlaylist.name}</h2>
                  <p className="text-xs text-zinc-500">
                    {selectedPlaylist.tracks.length} songs
                    {selectedPlaylist.collaborationRole ? ` · ${selectedPlaylist.collaborationRole}` : ` · ${selectedPlaylist.visibility === "public" ? "Public" : "Private"}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-2.5 py-2 text-sm text-zinc-300">
                  <ArrowDownAZ aria-hidden="true" className="h-4 w-4 text-[#80cbc4]" />
                  <span className="sr-only">Sort playlist tracks</span>
                  <select aria-label="Sort playlist tracks" value={playlistSort} onChange={(event) => setPlaylistSort(event.target.value as PlaylistSort)}
                    className="max-w-32 bg-transparent text-xs font-semibold text-zinc-200 outline-none [color-scheme:dark]">
                    <option value="custom">Custom order</option>
                    <option value="title">Title A–Z</option>
                    <option value="artist">Artist A–Z</option>
                    <option value="shortest">Shortest first</option>
                    <option value="longest">Longest first</option>
                  </select>
                </label>
                {selectedPlaylistIsOwner ? (
                  <>
                    <button type="button" onClick={() => void changeSelectedPlaylistVisibility()} disabled={visibilityBusy}
                      className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-200 hover:border-[#00796b]/50 hover:text-white disabled:opacity-50">
                      {selectedPlaylist.visibility === "public" ? <Globe2 className="h-4 w-4 text-[#80cbc4]" /> : <LockKeyhole className="h-4 w-4" />}
                      {selectedPlaylist.visibility === "public" ? "Make private" : "Make public"}
                    </button>
                    {selectedPlaylist.visibility === "public" ? (
                      <button type="button" onClick={() => void copySelectedPlaylistLink()}
                        className="inline-flex items-center gap-2 rounded-md border border-[#00796b]/40 bg-[#00594f]/20 px-3 py-2 text-sm font-semibold text-[#b2dfdb] hover:bg-[#00594f]/40">
                        <Copy className="h-4 w-4" /> Copy link
                      </button>
                    ) : null}
                  </>
                ) : null}
                <button
                  type="button"
                  disabled={!selectedPlaylist.tracks.length || selectedPlaylist.collaborationRole === "pending"}
                  onClick={() => {
                    const firstTrack = sortedPlaylistTracks[0];
                    if (firstTrack) playTrack(firstTrack, sortedPlaylistTracks);
                  }}
                  className="inline-flex items-center gap-2 rounded-md bg-[#00796b] px-3 py-2 text-sm font-bold text-white hover:bg-[#00695c] disabled:opacity-50"
                >
                  <Play className="h-4 w-4 fill-current" /> Play playlist
                </button>
              </div>
            </header>
            {shareNotice ? (
              <p role="status" className="flex items-start gap-2 break-all rounded-md border border-[#00796b]/30 bg-[#00594f]/15 px-3 py-2 text-sm text-[#b2dfdb]">
                {selectedPlaylist.visibility === "public" ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                {shareNotice}
              </p>
            ) : null}
            {filteredPlaylistTracks.length ? (
              <div className="space-y-2">
                {filteredPlaylistTracks.map((track, index) => (
                  <TrackRow
                    key={`${track.source}-${track.id}`}
                    track={track}
                    index={index}
                    queue={sortedPlaylistTracks}
                    onRemove={selectedPlaylist.collaborationRole === "viewer" || selectedPlaylist.collaborationRole === "pending"
                      ? undefined
                      : () => usePlaylistStore.getState().removeSongFromPlaylist(selectedPlaylist.id, track.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ListMusic}
                title={selectedPlaylist.tracks.length ? "No matching songs" : "This playlist is empty"}
                description={selectedPlaylist.tracks.length ? "Try a different filter." : "Use the add-to-playlist button on any track, or search for a song and add it here."}
              />
            )}
          </div>
        ) : visiblePlaylists.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
            {visiblePlaylists.map((playlist) => (
              <PlaylistTile key={playlist.id} playlist={playlist} onOpen={() => setSelectedPlaylistId(playlist.id)} onDelete={!playlist.collaborationRole || playlist.collaborationRole === "owner" ? () => deletePlaylist(playlist.id) : undefined} />
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
