"use client";

import { useEffect } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { recommendationTrackKey, useLibraryStore } from "@/store/library";
import { type Playlist, usePlaylistStore } from "@/store/playlist";
import type { Track } from "@/store/player";

type Props = { userId: string | null; supabase: SupabaseClient | null };
type LibrarySnapshot = { likedSongs: Track[]; playlists: Playlist[]; recentlyPlayed: Track[]; searchHistory: string[]; hiddenRecommendations: Track[] };
type CloudLike = { track_id: string; track: Track };
type CloudRecommendation = { track_id: string; track: Track };
type CloudPlaylist = { id: string; user_id: string; name: string; cover: string | null; created_at_ms: number; visibility: "private" | "public" };
type CloudPlaylistMember = { playlist_id: string; owner_id: string; user_id: string; role: "editor" | "viewer"; status: "pending" | "accepted" };
type CloudPlaylistTrack = { playlist_id: string; track_id: string; track: Track; position: number };
type CloudRecentTrack = { track_id: string; track: Track; position: number };
type CloudSearchQuery = { query_key: string; query: string; position: number };

const OWNER_STORAGE_KEY = "audiq-library-owner";

function trackKey(track: Track) {
  return String(track.id);
}

function searchKey(query: string) {
  return query.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 128);
}

function readSnapshot(): LibrarySnapshot {
  return {
    likedSongs: useLibraryStore.getState().likedSongs,
    hiddenRecommendations: useLibraryStore.getState().hiddenRecommendations,
    playlists: usePlaylistStore.getState().playlists,
    recentlyPlayed: useLibraryStore.getState().recentlyPlayed,
    searchHistory: useLibraryStore.getState().searchHistory,
  };
}

function cloneSnapshot(snapshot: LibrarySnapshot): LibrarySnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as LibrarySnapshot;
}

function sameSnapshot(left: LibrarySnapshot, right: LibrarySnapshot) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function uniqueTracks(...groups: Track[][]) {
  const byId = new Map<string, Track>();
  for (const group of groups) {
    for (const track of group) byId.set(trackKey(track), track);
  }
  return [...byId.values()];
}

function mergeRecentTracks(...groups: Track[][]) {
  const byId = new Map<string, Track>();
  for (const group of groups) {
    for (const track of group) {
      const id = trackKey(track);
      if (!byId.has(id)) byId.set(id, track);
    }
  }
  return [...byId.values()].slice(0, 50);
}

function mergeSearchHistory(...groups: string[][]) {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const group of groups) {
    for (const query of group) {
      const value = query.trim().slice(0, 120);
      const key = searchKey(value);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(value);
    }
  }
  return merged.slice(0, 20);
}

function mergeHiddenRecommendations(...groups: Track[][]) {
  const byKey = new Map<string, Track>();
  for (const group of groups) {
    for (const track of group) {
      const key = recommendationTrackKey(track);
      if (!byKey.has(key)) byKey.set(key, track);
    }
  }
  return [...byKey.values()].slice(0, 200);
}

function mergePlaylists(remote: Playlist[], local: Playlist[], userId: string) {
  const byId = new Map<string, Playlist>();
  for (const playlist of remote) byId.set(playlist.id, playlist);
  for (const playlist of local) {
    const remotePlaylist = byId.get(playlist.id);
    if (!remotePlaylist) {
      if (playlist.ownerId && playlist.ownerId !== userId) continue;
      byId.set(playlist.id, {
        ...playlist,
        ownerId: playlist.ownerId ?? userId,
        collaborationRole: playlist.collaborationRole ?? "owner",
        visibility: playlist.visibility ?? "private",
      });
      continue;
    }
    // Shared playlists use the cloud snapshot as their authority on sign-in.
    // Merging an old device cache here could resurrect tracks another member removed.
    if (remotePlaylist.collaborationRole !== "owner") continue;
    byId.set(playlist.id, {
      ...playlist,
      ...remotePlaylist,
      name: playlist.name,
      cover: playlist.cover || remotePlaylist.cover,
      createdAt: playlist.createdAt,
      visibility: remotePlaylist.visibility ?? playlist.visibility ?? "private",
      tracks: uniqueTracks(remotePlaylist.tracks ?? [], playlist.tracks ?? []),
    });
  }
  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt);
}

async function readCloud(supabase: SupabaseClient, userId: string): Promise<LibrarySnapshot> {
  const [likesResult, recentResult, membersResult, searchResult, recommendationsResult] = await Promise.all([
    supabase.from("audiq_liked_songs").select("track_id,track").eq("user_id", userId),
    supabase.from("audiq_listening_history").select("track_id,track,position").eq("user_id", userId).order("position"),
    supabase.from("audiq_playlist_members").select("playlist_id,owner_id,user_id,role,status"),
    supabase.from("audiq_search_history").select("query_key,query,position").eq("user_id", userId).order("position"),
    supabase.from("audiq_hidden_recommendations").select("track_id,track").eq("user_id", userId).order("hidden_at", { ascending: false }).limit(200),
  ]);
  if (likesResult.error) throw likesResult.error;
  if (recentResult.error) throw recentResult.error;
  if (membersResult.error) throw membersResult.error;
  if (searchResult.error) throw searchResult.error;
  if (recommendationsResult.error) throw recommendationsResult.error;

  const likes = (likesResult.data ?? []) as unknown as CloudLike[];
  const members = (membersResult.data ?? []) as unknown as CloudPlaylistMember[];
  const recentTracks = (recentResult.data ?? []) as unknown as CloudRecentTrack[];
  const searchQueries = (searchResult.data ?? []) as unknown as CloudSearchQuery[];
  const hiddenRecommendations = (recommendationsResult.data ?? []) as unknown as CloudRecommendation[];
  const membershipPlaylistIds = [...new Set(members
    .filter((member) => member.user_id === userId)
    .map((member) => member.playlist_id))];
  const [ownedPlaylistsResult, sharedPlaylistsResult] = await Promise.all([
    supabase.from("audiq_playlists").select("id,user_id,name,cover,created_at_ms,visibility")
      .eq("user_id", userId).order("created_at_ms"),
    membershipPlaylistIds.length
      ? supabase.from("audiq_playlists").select("id,user_id,name,cover,created_at_ms,visibility")
        .in("id", membershipPlaylistIds).order("created_at_ms")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (ownedPlaylistsResult.error) throw ownedPlaylistsResult.error;
  if (sharedPlaylistsResult.error) throw sharedPlaylistsResult.error;
  const playlistsById = new Map<string, CloudPlaylist>();
  for (const row of [...(ownedPlaylistsResult.data ?? []), ...(sharedPlaylistsResult.data ?? [])] as unknown as CloudPlaylist[]) {
    playlistsById.set(row.id, row);
  }
  const playlistRows = [...playlistsById.values()].sort((a, b) => a.created_at_ms - b.created_at_ms);
  const playlistIds = playlistRows.map((playlist) => playlist.id);
  const tracksResult = playlistIds.length
    ? await supabase.from("audiq_playlist_tracks").select("playlist_id,track_id,track,position")
      .in("playlist_id", playlistIds).order("position")
    : { data: [], error: null };
  if (tracksResult.error) throw tracksResult.error;
  const tracks = (tracksResult.data ?? []) as unknown as CloudPlaylistTrack[];
  const membershipsByPlaylist = new Map(members
    .filter((member) => member.user_id === userId)
    .map((member) => [member.playlist_id, member]));
  const tracksByPlaylist = new Map<string, Track[]>();
  for (const row of tracks) {
    const items = tracksByPlaylist.get(row.playlist_id) ?? [];
    items.push(row.track);
    tracksByPlaylist.set(row.playlist_id, items);
  }

  return {
    likedSongs: likes.map((row) => row.track),
    hiddenRecommendations: hiddenRecommendations.map((row) => row.track),
    recentlyPlayed: recentTracks.map((row) => row.track).slice(0, 50),
    searchHistory: searchQueries.map((row) => row.query).slice(0, 20),
    playlists: playlistRows.map((row) => {
      const membership = membershipsByPlaylist.get(row.id);
      const collaborationRole: Playlist["collaborationRole"] = row.user_id === userId
        ? "owner"
        : membership?.status === "pending"
          ? "pending"
          : membership?.role ?? "viewer";
      return {
        id: row.id,
        name: row.name,
        cover: row.cover ?? undefined,
        createdAt: Number(row.created_at_ms),
        tracks: tracksByPlaylist.get(row.id) ?? [],
        visibility: row.visibility ?? "private",
        ownerId: row.user_id,
        collaborationRole,
      };
    }),
  };
}

async function syncDelta(
  supabase: SupabaseClient,
  userId: string,
  previous: LibrarySnapshot,
  current: LibrarySnapshot
) {
  const beforeLikes = new Map(previous.likedSongs.map((track) => [trackKey(track), track]));
  const afterLikes = new Map(current.likedSongs.map((track) => [trackKey(track), track]));
  const removedLikes = [...beforeLikes.keys()].filter((id) => !afterLikes.has(id));
  if (removedLikes.length) {
    const { error } = await supabase.from("audiq_liked_songs").delete().eq("user_id", userId).in("track_id", removedLikes);
    if (error) throw error;
  }
  const changedLikes = [...afterLikes.entries()]
    .filter(([id, track]) => JSON.stringify(beforeLikes.get(id)) !== JSON.stringify(track))
    .map(([track_id, track]) => ({ user_id: userId, track_id, track }));
  if (changedLikes.length) {
    const { error } = await supabase.from("audiq_liked_songs").upsert(changedLikes, { onConflict: "user_id,track_id" });
    if (error) throw error;
  }

  const beforeRecent = new Map(previous.recentlyPlayed.map((track) => [trackKey(track), track]));
  const afterRecent = new Map(current.recentlyPlayed.map((track) => [trackKey(track), track]));
  const removedRecent = [...beforeRecent.keys()].filter((id) => !afterRecent.has(id));
  if (removedRecent.length) {
    const { error } = await supabase.from("audiq_listening_history").delete()
      .eq("user_id", userId).in("track_id", removedRecent);
    if (error) throw error;
  }
  const changedRecent = current.recentlyPlayed
    .map((track, position) => ({ track, position, id: trackKey(track) }))
    .filter(({ track, position, id }) => JSON.stringify(beforeRecent.get(id)) !== JSON.stringify(track)
      || previous.recentlyPlayed.findIndex((item) => trackKey(item) === id) !== position)
    .map(({ track, position, id: track_id }) => ({ user_id: userId, track_id, track, position }));
  if (changedRecent.length) {
    const { error } = await supabase.from("audiq_listening_history").upsert(changedRecent, { onConflict: "user_id,track_id" });
    if (error) throw error;
  }

  const beforeSearch = new Map(previous.searchHistory.map((query) => [searchKey(query), query]));
  const afterSearch = new Map(current.searchHistory.slice(0, 20).map((query) => [searchKey(query), query.trim().slice(0, 120)]));
  const removedSearch = [...beforeSearch.keys()].filter((key) => key && !afterSearch.has(key));
  if (removedSearch.length) {
    const { error } = await supabase.from("audiq_search_history").delete()
      .eq("user_id", userId).in("query_key", removedSearch);
    if (error) throw error;
  }
  const changedSearch = [...afterSearch.entries()]
    .map(([query_key, query]) => ({ query_key, query, position: current.searchHistory.findIndex((item) => searchKey(item) === query_key) }))
    .filter(({ query_key, query, position }) => beforeSearch.get(query_key) !== query
      || previous.searchHistory.findIndex((item) => searchKey(item) === query_key) !== position)
    .map(({ query_key, query, position }) => ({ user_id: userId, query_key, query, position }));
  if (changedSearch.length) {
    const { error } = await supabase.from("audiq_search_history").upsert(changedSearch, { onConflict: "user_id,query_key" });
    if (error) throw error;
  }

  const beforeHidden = new Map(previous.hiddenRecommendations.map((track) => [recommendationTrackKey(track), track]));
  const afterHidden = new Map(current.hiddenRecommendations.slice(0, 200).map((track) => [recommendationTrackKey(track), track]));
  const removedHidden = [...beforeHidden.keys()].filter((id) => !afterHidden.has(id));
  if (removedHidden.length) {
    const { error } = await supabase.from("audiq_hidden_recommendations").delete()
      .eq("user_id", userId).in("track_id", removedHidden);
    if (error) throw error;
  }
  const changedHidden = [...afterHidden.entries()]
    .filter(([id, track]) => JSON.stringify(beforeHidden.get(id)) !== JSON.stringify(track))
    .map(([track_id, track]) => ({ user_id: userId, track_id, track }));
  if (changedHidden.length) {
    const { error } = await supabase.from("audiq_hidden_recommendations").upsert(changedHidden, { onConflict: "user_id,track_id" });
    if (error) throw error;
  }

  const canManagePlaylist = (playlist: Playlist) =>
    ((playlist.ownerId === undefined || playlist.ownerId === userId)
      && playlist.collaborationRole !== "viewer"
      && playlist.collaborationRole !== "pending")
    || playlist.collaborationRole === "editor";
  const beforePlaylists = new Map(previous.playlists.filter(canManagePlaylist).map((playlist) => [playlist.id, playlist]));
  const afterPlaylists = new Map(current.playlists.filter(canManagePlaylist).map((playlist) => [playlist.id, playlist]));
  const removedPlaylists = [...beforePlaylists.entries()]
    .filter(([id, playlist]) => !afterPlaylists.has(id) && (playlist.ownerId ?? userId) === userId)
    .map(([id]) => id);
  if (removedPlaylists.length) {
    const { error } = await supabase.from("audiq_playlists").delete().eq("user_id", userId).in("id", removedPlaylists);
    if (error) throw error;
  }

  for (const playlist of current.playlists) {
    const isOwner = (playlist.ownerId ?? userId) === userId;
    const canEditTracks = isOwner || playlist.collaborationRole === "editor";
    if (!canEditTracks) continue;
    const oldPlaylist = beforePlaylists.get(playlist.id);
    const metadataChanged = isOwner && (!oldPlaylist || oldPlaylist.name !== playlist.name || oldPlaylist.cover !== playlist.cover || oldPlaylist.createdAt !== playlist.createdAt || (oldPlaylist.visibility ?? "private") !== (playlist.visibility ?? "private"));
    if (metadataChanged) {
      const { error } = await supabase.from("audiq_playlists").upsert({
        id: playlist.id,
        user_id: playlist.ownerId ?? userId,
        name: playlist.name.slice(0, 100),
        cover: playlist.cover ?? null,
        created_at_ms: playlist.createdAt,
        visibility: playlist.visibility ?? "private",
      }, { onConflict: "id" });
      if (error) throw error;
    }

    const oldTracks = new Map((oldPlaylist?.tracks ?? []).map((track) => [trackKey(track), track]));
    const newTracks = new Map(playlist.tracks.map((track) => [trackKey(track), track]));
    const removedTracks = [...oldTracks.keys()].filter((id) => !newTracks.has(id));
    if (removedTracks.length) {
      const { error } = await supabase.from("audiq_playlist_tracks").delete()
        .eq("user_id", playlist.ownerId ?? userId).eq("playlist_id", playlist.id).in("track_id", removedTracks);
      if (error) throw error;
    }
    const changedTracks = playlist.tracks
      .map((track, position) => ({ track, position, id: trackKey(track) }))
      .filter(({ track, position, id }) => JSON.stringify(oldTracks.get(id)) !== JSON.stringify(track) || oldPlaylist?.tracks.findIndex((item) => trackKey(item) === id) !== position)
      .map(({ track, position, id: track_id }) => ({ user_id: playlist.ownerId ?? userId, playlist_id: playlist.id, track_id, track, position }));
    if (changedTracks.length) {
      const { error } = await supabase.from("audiq_playlist_tracks").upsert(changedTracks, { onConflict: "playlist_id,track_id" });
      if (error) throw error;
    }
  }
}

function applySnapshot(snapshot: LibrarySnapshot) {
  const targetLikes = new Map(snapshot.likedSongs.map((track) => [trackKey(track), track]));
  const currentLikes = useLibraryStore.getState().likedSongs;
  const currentKeys = new Set(currentLikes.map(trackKey));
  const targetKeys = new Set(targetLikes.keys());
  for (const track of currentLikes) if (!targetKeys.has(trackKey(track))) useLibraryStore.getState().unlikeSong(track.id);
  for (const [id, track] of targetLikes) if (!currentKeys.has(id)) useLibraryStore.getState().likeSong(track);
  useLibraryStore.getState().replaceRecentlyPlayed(snapshot.recentlyPlayed);
  useLibraryStore.getState().replaceSearchHistory(snapshot.searchHistory);
  useLibraryStore.getState().replaceHiddenRecommendations(snapshot.hiddenRecommendations);
  usePlaylistStore.setState({ playlists: snapshot.playlists });
}

function snapshotFromCloudRows(rows: { new: Record<string, unknown>; old: Record<string, unknown> }, eventType: string, table: string, snapshot: LibrarySnapshot, userId: string): LibrarySnapshot {
  const next = cloneSnapshot(snapshot);
  const row = (eventType === "DELETE" ? rows.old : rows.new) as Record<string, unknown>;
  if (String(row.user_id ?? "") !== userId) return snapshot;

  if (table === "audiq_liked_songs") {
    const id = String(row.track_id);
    if (eventType === "DELETE") next.likedSongs = next.likedSongs.filter((track) => trackKey(track) !== id);
    else next.likedSongs = uniqueTracks(next.likedSongs.filter((track) => trackKey(track) !== id), [row.track as Track]);
  } else if (table === "audiq_hidden_recommendations") {
    const id = String(row.track_id);
    if (eventType === "DELETE") {
      next.hiddenRecommendations = next.hiddenRecommendations.filter((track) => recommendationTrackKey(track) !== id);
    } else {
      const track = row.track as Track;
      next.hiddenRecommendations = [track, ...next.hiddenRecommendations.filter((item) => recommendationTrackKey(item) !== id)].slice(0, 200);
    }
  } else if (table === "audiq_playlists") {
    const id = String(row.id);
    if (eventType === "DELETE") next.playlists = next.playlists.filter((playlist) => playlist.id !== id);
    else {
      const old = next.playlists.find((playlist) => playlist.id === id);
      const updated: Playlist = {
        id,
        name: String(row.name ?? old?.name ?? "Playlist"),
        cover: (row.cover as string | null) ?? old?.cover,
        createdAt: Number(row.created_at_ms ?? old?.createdAt ?? Date.now()),
        tracks: old?.tracks ?? [],
        visibility: row.visibility === "public" ? "public" : "private",
      };
      next.playlists = [...next.playlists.filter((playlist) => playlist.id !== id), updated].sort((a, b) => a.createdAt - b.createdAt);
    }
  } else if (table === "audiq_playlist_tracks") {
    const playlistId = String(row.playlist_id);
    const trackId = String(row.track_id);
    next.playlists = next.playlists.map((playlist) => {
      if (playlist.id !== playlistId) return playlist;
      if (eventType === "DELETE") return { ...playlist, tracks: playlist.tracks.filter((track) => trackKey(track) !== trackId) };
      const track = row.track as Track;
      const old = playlist.tracks.filter((item) => trackKey(item) !== trackId);
      old.splice(Math.min(Number(row.position ?? old.length), old.length), 0, track);
      return { ...playlist, tracks: old };
    });
  } else if (table === "audiq_listening_history") {
    const id = String(row.track_id);
    if (eventType === "DELETE") {
      next.recentlyPlayed = next.recentlyPlayed.filter((track) => trackKey(track) !== id);
    } else {
      const track = row.track as Track;
      const updated = next.recentlyPlayed.filter((item) => trackKey(item) !== id);
      updated.splice(Math.max(0, Math.min(Number(row.position ?? updated.length), updated.length)), 0, track);
      next.recentlyPlayed = updated.slice(0, 50);
    }
  }
  return next;
}

export default function LibraryCloudSync({ userId, supabase }: Props) {
  useEffect(() => {
    if (!userId || !supabase || typeof window === "undefined") return;
    let cancelled = false;
    let ready = false;
    let applyingRemote = false;
    let flushTimer: ReturnType<typeof setTimeout> | undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let flushPromise: Promise<void> | null = null;
    let lastSynced: LibrarySnapshot = { likedSongs: [], playlists: [], recentlyPlayed: [], searchHistory: [], hiddenRecommendations: [] };
    let channel: RealtimeChannel | undefined;
    let cleanupListeners = () => {};

    const waitForPlaylists = () => new Promise<void>((resolve) => {
      if (usePlaylistStore.persist.hasHydrated()) return resolve();
      let unsubscribe = () => {};
      unsubscribe = usePlaylistStore.persist.onFinishHydration(() => {
        unsubscribe();
        resolve();
      });
    });

    const flush = async () => {
      if (!ready || cancelled || applyingRemote) return;
      if (flushPromise) return flushPromise;
      const current = cloneSnapshot(readSnapshot());
      if (sameSnapshot(lastSynced, current)) return;
      flushPromise = syncDelta(supabase, userId, lastSynced, current)
        .then(() => { lastSynced = current; })
        .catch((error) => { console.warn("Audiq library sync failed; changes remain on this device.", error); })
        .finally(() => { flushPromise = null; });
      return flushPromise;
    };

    const scheduleFlush = () => {
      if (!ready || applyingRemote) return;
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(() => { void flush(); }, 350);
    };

    const refreshCloud = async () => {
      if (!ready || cancelled) return;
      await flushPromise;
      await flush();
      const localBeforeRead = cloneSnapshot(readSnapshot());
      if (!sameSnapshot(lastSynced, localBeforeRead)) return;
      try {
        const remote = await readCloud(supabase, userId);
        if (cancelled) return;
        if (!sameSnapshot(localBeforeRead, readSnapshot())) {
          scheduleFlush();
          return;
        }
        applyingRemote = true;
        applySnapshot(remote);
        lastSynced = cloneSnapshot(remote);
      } catch (error) {
        console.warn("Audiq could not refresh the cloud library.", error);
      } finally {
        applyingRemote = false;
      }
    };

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { void refreshCloud(); }, 250);
    };

    const start = async () => {
      try {
        await waitForPlaylists();
        if (cancelled) return;
        const previousOwner = window.localStorage.getItem(OWNER_STORAGE_KEY);
        if (!previousOwner) window.localStorage.setItem(OWNER_STORAGE_KEY, userId);
        if (previousOwner && previousOwner !== userId) {
          applyingRemote = true;
          applySnapshot({ likedSongs: [], playlists: [], recentlyPlayed: [], searchHistory: [], hiddenRecommendations: [] });
          applyingRemote = false;
        }
        const remote = await readCloud(supabase, userId);
        if (cancelled) return;
        const local = readSnapshot();
        const initial = previousOwner && previousOwner !== userId
          ? remote
          : {
              likedSongs: uniqueTracks(remote.likedSongs, local.likedSongs),
              hiddenRecommendations: mergeHiddenRecommendations(remote.hiddenRecommendations, local.hiddenRecommendations),
              recentlyPlayed: mergeRecentTracks(local.recentlyPlayed, remote.recentlyPlayed),
              searchHistory: previousOwner === null
                ? mergeSearchHistory(local.searchHistory, remote.searchHistory)
                : remote.searchHistory,
              playlists: mergePlaylists(remote.playlists, local.playlists, userId),
            };
        applyingRemote = true;
        applySnapshot(initial);
        applyingRemote = false;
        await syncDelta(supabase, userId, remote, initial);
        if (cancelled) return;
        window.localStorage.setItem(OWNER_STORAGE_KEY, userId);
        lastSynced = cloneSnapshot(initial);
        ready = true;

        const stopLibrary = useLibraryStore.subscribe(scheduleFlush);
        const stopPlaylists = usePlaylistStore.subscribe(scheduleFlush);
        channel = supabase.channel(`audiq-library-${userId}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "audiq_liked_songs", filter: `user_id=eq.${userId}` }, (payload) => {
            if (applyingRemote) return;
            applyingRemote = true;
            const next = snapshotFromCloudRows(payload as unknown as { new: Record<string, unknown>; old: Record<string, unknown> }, payload.eventType, "audiq_liked_songs", readSnapshot(), userId);
            applySnapshot(next);
            lastSynced = cloneSnapshot(next);
            applyingRemote = false;
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "audiq_playlists" }, () => {
            if (!applyingRemote) scheduleRefresh();
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "audiq_playlist_tracks" }, () => {
            if (!applyingRemote) scheduleRefresh();
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "audiq_playlist_members", filter: `user_id=eq.${userId}` }, () => {
            if (!applyingRemote) scheduleRefresh();
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "audiq_playlist_members", filter: `owner_id=eq.${userId}` }, () => {
            if (!applyingRemote) scheduleRefresh();
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "audiq_listening_history", filter: `user_id=eq.${userId}` }, (payload) => {
            if (applyingRemote) return;
            applyingRemote = true;
            const next = snapshotFromCloudRows(payload as unknown as { new: Record<string, unknown>; old: Record<string, unknown> }, payload.eventType, "audiq_listening_history", readSnapshot(), userId);
            applySnapshot(next);
            lastSynced = cloneSnapshot(next);
            applyingRemote = false;
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "audiq_search_history", filter: `user_id=eq.${userId}` }, () => {
            if (!applyingRemote) scheduleRefresh();
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "audiq_hidden_recommendations", filter: `user_id=eq.${userId}` }, () => {
            if (!applyingRemote) scheduleRefresh();
          })
          .subscribe();

        const visibilityListener = () => { if (document.visibilityState === "visible") scheduleRefresh(); };
        window.addEventListener("focus", scheduleRefresh);
        document.addEventListener("visibilitychange", visibilityListener);
        cleanupListeners = () => {
          stopLibrary();
          stopPlaylists();
          window.removeEventListener("focus", scheduleRefresh);
          document.removeEventListener("visibilitychange", visibilityListener);
        };
      } catch (error) {
        console.warn("Audiq could not start library sync; local playlists and likes are still available.", error);
      }
    };

    void start();
    return () => {
      cancelled = true;
      ready = false;
      if (flushTimer) clearTimeout(flushTimer);
      if (refreshTimer) clearTimeout(refreshTimer);
      cleanupListeners();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  return null;
}
