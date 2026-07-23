"use client";

import {
  Clock3,
  Compass,
  Download,
  Heart,
  History,
  Home,
  Library,
  ListMusic,
  MessageCircle,
  Music2,
  Plus,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

import { useSyncExternalStore } from "react";

import { useLibraryStore } from "@/store/library";
import { usePlaylistStore } from "@/store/playlist";

import type { Playlist } from "@/store/playlist";
import type { Track } from "@/store/player";

import type { LibraryTab } from "@/features/library/components/LibraryDashboard";
import type { SocialTab } from "@/features/social/components/SocialHub";

import type { AppView } from "./AppShell";

const EMPTY_TRACKS: Track[] = [];
const EMPTY_PLAYLISTS: Playlist[] = [];

const menu: Array<{
  icon: typeof Home;
  label: string;
  view?: AppView;
  tab?: LibraryTab;
  socialTab?: SocialTab;
}> = [
  {
    icon: Home,
    label: "Home",
    view: "home",
  },
  {
    icon: Compass,
    label: "Explore",
  },
  {
    icon: Library,
    label: "Library",
    view: "library",
    tab: "liked",
  },
  {
    icon: Music2,
    label: "Playlists",
    view: "library",
    tab: "playlists",
  },
  {
    icon: Users,
    label: "Friends",
    view: "social",
    socialTab: "friends",
  },
  {
    icon: MessageCircle,
    label: "Messages",
    view: "social",
    socialTab: "messages",
  },
  {
    icon: Sparkles,
    label: "AI Studio",
    view: "ai",
  },
];

type SidebarProps = {
  mobile?: boolean;

  activeLibraryTab: LibraryTab;
  activeSocialTab: SocialTab;
  activeView: AppView;

  onLibraryTabChange: (tab: LibraryTab) => void;
  onSocialTabChange: (tab: SocialTab) => void;
  onViewChange: (view: AppView) => void;
};

export default function Sidebar({
  mobile = false,
  activeLibraryTab,
  activeSocialTab,
  activeView,
  onLibraryTabChange,
  onSocialTabChange,
  onViewChange,
}: SidebarProps) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const likedSongs = useLibraryStore(
    (state) => state.likedSongs
  );

  const recentlyPlayed = useLibraryStore(
    (state) => state.recentlyPlayed
  );

  const playlists = usePlaylistStore(
    (state) => state.playlists
  );

  const createPlaylist = usePlaylistStore(
    (state) => state.createPlaylist
  );

  const visibleLikedSongs = isClient
    ? likedSongs
    : EMPTY_TRACKS;

  const visibleRecentlyPlayed = isClient
    ? recentlyPlayed
    : EMPTY_TRACKS;

  const visiblePlaylists = isClient
    ? playlists
    : EMPTY_PLAYLISTS;

  const libraryShortcuts = [
    {
      icon: Heart,
      title: "Liked Songs",
      meta: `${visibleLikedSongs.length} tracks`,
      accent: "#ff5c8a",
      tab: "liked" as const,
    },
    {
      icon: ListMusic,
      title: "Playlists",
      meta: `${visiblePlaylists.length} collection${
        visiblePlaylists.length === 1 ? "" : "s"
      }`,
      accent: "#f7b955",
      tab: "playlists" as const,
    },
    {
      icon: Clock3,
      title: "Recently Played",
      meta: `${visibleRecentlyPlayed.length} songs`,
      accent: "#44d7b6",
      tab: "recent" as const,
    },
    {
      icon: Download,
      title: "Downloads",
      meta: "Offline music",
      accent: "#7dd3fc",
      tab: "downloads" as const,
    },
    {
      icon: Music2,
      title: "Queue",
      meta: "Now Playing",
      accent: "#c084fc",
      tab: "queue" as const,
    },
    {
      icon: History,
      title: "History",
      meta: "Listening Log",
      accent: "#fb7185",
      tab: "history" as const,
    },
    ...visiblePlaylists.slice(0, 2).map((playlist) => ({
      icon: Music2,
      title: playlist.name,
      meta: `${playlist.tracks.length} songs`,
      accent: "#facc15",
      tab: "playlists" as const,
    })),
  ];

  return (
    <div
      className={`flex h-full flex-col overflow-y-auto px-4 py-5 ${
        mobile ? "w-full" : ""
      }`}
    >
      {/* Navigation */}

      <div className="space-y-2">
        {menu.map((item) => {
          const active =
            item.view === activeView &&
            (item.view !== "library" ||
              item.tab === activeLibraryTab) &&
            (item.view !== "social" ||
              item.socialTab === activeSocialTab);

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                if (!item.view) return;

                if (item.view === "library") {
                  onLibraryTabChange(
                    item.tab ?? "liked"
                  );
                  return;
                }

                if (item.view === "social") {
                  onSocialTabChange(
                    item.socialTab ?? "friends"
                  );
                  return;
                }

                onViewChange(item.view);
              }}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-gradient-to-r from-[#b01340] to-[#800f2f] text-white shadow-lg"
                  : "text-zinc-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon size={18} />

              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Library */}

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
            Your Library
          </h3>

          <button
            type="button"
            title="Create Playlist"
            onClick={() => {
              createPlaylist(
                `New Playlist ${playlists.length + 1}`
              );

              onLibraryTabChange("playlists");
            }}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/10 hover:text-white"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {libraryShortcuts.map((playlist) => (
            <button
              key={playlist.title}
              type="button"
              onClick={() => {
                onLibraryTabChange(playlist.tab);
              }}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 ${
                activeView === "library" &&
                activeLibraryTab === playlist.tab
                  ? "border-[#ff2d67]/40 bg-[#b01340]/20 shadow-lg shadow-[#b01340]/20"
                  : "border-white/5 bg-white/[0.045] hover:border-[#ff2d67]/30 hover:bg-white/[0.08]"
              }`}
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                style={{
                  backgroundColor: `${playlist.accent}22`,
                  color: playlist.accent,
                }}
              >
                <playlist.icon size={18} />
              </span>

              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">
                  {playlist.title}
                </span>

                <span className="block truncate text-xs text-zinc-500">
                  {playlist.meta}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Live Room */}

      <div className="mt-auto rounded-xl border border-[#b01340]/25 bg-gradient-to-br from-[#b01340]/10 to-[#111111] p-4">

        <p className="text-xs uppercase tracking-[0.22em] text-[#f5c2ce]">
          Live Room
        </p>

        <p className="mt-2 text-sm font-semibold leading-6 text-white">
          Krishna and 7 friends are syncing a playlist.
        </p>

        <button
          type="button"
          className="mt-4 w-full rounded-xl bg-white py-3 font-semibold text-[#800f2f] transition-all hover:scale-[1.02] hover:bg-zinc-100"
        >
          Join Session
        </button>

        <button
          type="button"
          className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
