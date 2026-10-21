"use client";

import Image from "next/image";
import {
  ArrowLeft,
  Check,
  Copy,
  ListMusic,
  MessageCircle,
  Music2,
  Play,
  Plus,
  Search,
  Send,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type AudiqProfile, useAuth } from "@/features/auth/AuthProvider";
import ProfileAvatar from "@/features/social/components/ProfileAvatar";
import { getChatTheme } from "@/features/auth/profileAppearance";
import ListenTogetherControl from "@/features/social/components/ListenTogetherControl";
import { withSignedAvatarUrls } from "@/lib/supabase/avatars";
import { usePlayerStore, type Track } from "@/store/player";
import { usePlaylistStore, type Playlist } from "@/store/playlist";

export type SocialTab = "friends" | "messages";

type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
};

type SharedSong = {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  source: string;
  videoId?: string | null;
  audioUrl?: string | null;
  externalUrl?: string | null;
};

type SharedPlaylistTrack = Omit<SharedSong, "source"> & {
  source?: string | null;
  duration?: number | null;
};

type SharedPlaylist = {
  id: string;
  name: string;
  cover: string | null;
  tracks: SharedPlaylistTrack[];
};

type ChatMessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  message_type: "text" | "song" | "playlist";
  song: SharedSong | SharedPlaylist | null;
  created_at: string;
};

type SocialHubProps = {
  activeTab: SocialTab;
  onTabChange: (tab: SocialTab) => void;
  onOpenAuth: () => void;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function AvatarBlock({ user }: { user: AudiqProfile }) {
  return <ProfileAvatar profile={user} className="h-11 w-11" />;
}

export default function SocialHub({
  activeTab,
  onTabChange,
  onOpenAuth,
}: SocialHubProps) {
  const { user, profile, loading: authLoading, profileLoading, supabase } = useAuth();
  const chatTheme = getChatTheme(profile?.chat_theme);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const playlists = usePlaylistStore((state) => state.playlists);

  const [searchId, setSearchId] = useState("");
  const [foundUser, setFoundUser] = useState<AudiqProfile | null>(null);
  const [messageText, setMessageText] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [relationships, setRelationships] = useState<FriendshipRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, AudiqProfile>>({});
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [chatSearch, setChatSearch] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [sharePlaylistOpen, setSharePlaylistOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refreshRelationships = useCallback(async () => {
    if (!supabase || !user) return;

    setLoadingSocial(true);
    const { data, error: fetchError } = await supabase
      .from("friendships")
      .select("id,requester_id,addressee_id,status,created_at")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError("Could not load friends. Check the Supabase social migration and try again.");
      setLoadingSocial(false);
      return;
    }

    const rows = (data ?? []) as FriendshipRow[];
    setRelationships(rows);
    const otherIds = Array.from(
      new Set(
        rows.map((row) =>
          row.requester_id === user.id ? row.addressee_id : row.requester_id
        )
      )
    );

    if (otherIds.length === 0) {
      setProfilesById({});
      setLoadingSocial(false);
      return;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id,audiq_id,display_name,handle,avatar_color,avatar_path,avatar_style,chat_theme")
      .in("id", otherIds);

    if (profilesError) {
      setError("Could not load user profiles. Check the Supabase social migration and try again.");
    } else {
      const profilesWithAvatars = await withSignedAvatarUrls(supabase, (profiles ?? []) as AudiqProfile[]);
      setProfilesById(Object.fromEntries(profilesWithAvatars.map((item) => [item.id, item])));
    }
    setLoadingSocial(false);
  }, [supabase, user]);

  const refreshMessages = useCallback(async () => {
    if (!supabase || !user || !activeFriendId) {
      setMessages([]);
      return;
    }

    const pairFilter =
      `and(sender_id.eq.${user.id},receiver_id.eq.${activeFriendId}),` +
      `and(sender_id.eq.${activeFriendId},receiver_id.eq.${user.id})`;
    const { data, error: fetchError } = await supabase
      .from("chat_messages")
      .select("id,sender_id,receiver_id,body,message_type,song,created_at")
      .or(pairFilter)
      .order("created_at", { ascending: true })
      .limit(200);

    if (fetchError) {
      setError("Could not load this chat. Check your friend connection and try again.");
      return;
    }
    setMessages((data ?? []) as ChatMessageRow[]);
  }, [supabase, user, activeFriendId]);

  /* eslint-disable react-hooks/set-state-in-effect -- Clear listener-backed state as the Supabase session changes. */
  useEffect(() => {
    if (!supabase || !user) {
      setRelationships([]);
      setProfilesById({});
      setMessages([]);
      return;
    }

    void refreshRelationships();
    const channel = supabase
      .channel(`audiq-social-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => void refreshRelationships()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        () => void refreshMessages()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, user, refreshRelationships, refreshMessages]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- Keep the open chat synchronized with the selected friend. */
  useEffect(() => {
    void refreshMessages();
  }, [refreshMessages]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  const friends = useMemo(() => {
    if (!user) return [];
    return relationships
      .filter((row) => row.status === "accepted")
      .map((row) =>
        profilesById[
          row.requester_id === user.id ? row.addressee_id : row.requester_id
        ]
      )
      .filter((item): item is AudiqProfile => Boolean(item));
  }, [relationships, profilesById, user]);

  const incomingRequests = useMemo(() => {
    if (!user) return [];
    return relationships
      .filter((row) => row.status === "pending" && row.addressee_id === user.id)
      .map((row) => ({ row, profile: profilesById[row.requester_id] }))
      .filter((item): item is { row: FriendshipRow; profile: AudiqProfile } => Boolean(item.profile));
  }, [relationships, profilesById, user]);

  const outgoingRequests = useMemo(() => {
    if (!user) return [];
    return relationships
      .filter((row) => row.status === "pending" && row.requester_id === user.id)
      .map((row) => profilesById[row.addressee_id])
      .filter((item): item is AudiqProfile => Boolean(item));
  }, [relationships, profilesById, user]);

  const activeFriend = friends.find((friend) => friend.id === activeFriendId) ?? friends[0] ?? null;

  /* eslint-disable react-hooks/set-state-in-effect -- Select the first available friend and clear stale selections. */
  useEffect(() => {
    if (!activeFriendId && friends[0]) setActiveFriendId(friends[0].id);
    if (activeFriendId && !friends.some((friend) => friend.id === activeFriendId)) {
      setActiveFriendId(friends[0]?.id ?? null);
    }
  }, [friends, activeFriendId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setFoundUser(null);
    if (!supabase || !user) return;

    const query = searchId.trim();
    if (!query) return;

    const isAudiqId = query.toUpperCase().startsWith("AQ-");
    const normalized = isAudiqId
      ? query.toUpperCase()
      : query.replace(/^@/, "").toLowerCase();
    const result = await supabase
      .from("profiles")
      .select("id,audiq_id,display_name,handle,avatar_color,avatar_path,avatar_style,chat_theme")
      .eq(isAudiqId ? "audiq_id" : "handle", normalized)
      .maybeSingle();

    if (result.error) {
      setError("Could not search users. Please try again.");
      return;
    }
    if (!result.data) {
      setNotice("No Audiq user found with that ID or username.");
      return;
    }
    const [match] = await withSignedAvatarUrls(supabase, [result.data as AudiqProfile]);
    if (match.id === user.id) {
      setNotice("That is your own Audiq profile.");
      return;
    }
    setFoundUser(match);
    setNotice(`${match.display_name} found. Send a friend request to connect.`);
  }

  async function handleAddFriend() {
    if (!supabase || !user || !foundUser) return;
    setBusy(true);
    setError("");
    setNotice("");

    const { data: incoming } = await supabase
      .from("friendships")
      .select("id,status")
      .eq("requester_id", foundUser.id)
      .eq("addressee_id", user.id)
      .maybeSingle();

    if (incoming?.status === "pending") {
      const { error: acceptError } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", incoming.id);
      if (acceptError) setError(acceptError.message);
      else setNotice(`${foundUser.display_name}'s request accepted.`);
      await refreshRelationships();
      setBusy(false);
      return;
    }

    const { data: existing } = await supabase
      .from("friendships")
      .select("id,status")
      .eq("requester_id", user.id)
      .eq("addressee_id", foundUser.id)
      .maybeSingle();

    if (existing) {
      setNotice(existing.status === "accepted" ? "You are already friends." : "Friend request already sent.");
      setBusy(false);
      return;
    }

    const { error: insertError } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: foundUser.id,
      status: "pending",
    });
    if (insertError) setError(insertError.message);
    else setNotice(`Friend request sent to ${foundUser.display_name}.`);
    await refreshRelationships();
    setBusy(false);
  }

  async function acceptRequest(request: FriendshipRow, requestedBy: AudiqProfile) {
    if (!supabase || !user) return;
    const { error: updateError } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", request.id)
      .eq("addressee_id", user.id);
    if (updateError) setError(updateError.message);
    else {
      setNotice(`${requestedBy.display_name} is now your friend.`);
      setActiveFriendId(requestedBy.id);
      setMobileChatOpen(true);
      onTabChange("messages");
    }
    await refreshRelationships();
  }

  async function deleteRelationship(id: string) {
    if (!supabase || !user) return;
    const { error: deleteError } = await supabase
      .from("friendships")
      .delete()
      .eq("id", id);
    if (deleteError) setError(deleteError.message);
    await refreshRelationships();
  }

  async function sendChatMessage(
    body: string,
    share?: SharedSong | SharedPlaylist
  ) {
    if (!supabase || !user || !activeFriend) return;
    const { error: sendError } = await supabase.from("chat_messages").insert({
      sender_id: user.id,
      receiver_id: activeFriend.id,
      body,
      message_type: !share ? "text" : "tracks" in share ? "playlist" : "song",
      song: share ?? null,
    });
    if (sendError) {
      setError(sendError.message);
      return;
    }
    setError("");
    await refreshMessages();
  }

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = messageText.trim();
    if (!body) return;
    await sendChatMessage(body);
    setMessageText("");
  }

  async function handleShareSong() {
    if (!currentTrack) return;
    const song: SharedSong = {
      id: String(currentTrack.id),
      title: currentTrack.title,
      artist: currentTrack.artist,
      albumArt: currentTrack.albumArt,
      source: currentTrack.source || "Audiq",
      videoId: currentTrack.videoId || null,
      audioUrl: currentTrack.source === "youtube" ? null : currentTrack.audio || null,
      externalUrl: currentTrack.externalUrl || null,
    };
    await sendChatMessage(`Shared a song: ${song.title}`, song);
  }

  async function handleSharePlaylist(playlist: Playlist) {
    const shared: SharedPlaylist = {
      id: playlist.id,
      name: playlist.name,
      cover: playlist.cover || playlist.tracks[0]?.albumArt || null,
      tracks: playlist.tracks.slice(0, 100).map((track) => ({
        id: String(track.id),
        title: track.title,
        artist: track.artist,
        albumArt: track.albumArt,
        source: track.source || "Audiq",
        videoId: track.videoId || null,
        audioUrl: track.source === "youtube" ? null : track.audio || null,
        externalUrl: track.externalUrl || null,
        duration: track.duration ?? null,
      })),
    };
    if (shared.tracks.length === 0) return;
    await sendChatMessage(`Shared a playlist: ${shared.name}`, shared);
    setSharePlaylistOpen(false);
  }

  function saveSharedPlaylist(message: ChatMessageRow) {
    if (message.message_type !== "playlist" || !message.song || !("tracks" in message.song) || !message.song.tracks.length) return;
    const shared = message.song;
    const baseName = `${shared.name} (shared)`;
    let name = baseName;
    let suffix = 2;
    const existingNames = new Set(usePlaylistStore.getState().playlists.map((playlist) => playlist.name.toLowerCase()));
    while (existingNames.has(name.toLowerCase())) {
      name = `${shared.name} (shared ${suffix})`;
      suffix += 1;
    }

    const store = usePlaylistStore.getState();
    store.createPlaylist(name, shared.cover || undefined);
    const created = usePlaylistStore.getState().playlists.find((playlist) => playlist.name === name);
    if (!created) {
      setNotice("Could not save this playlist to your library.");
      return;
    }
    for (const song of shared.tracks) {
      store.addSongToPlaylist(created.id, {
        id: song.id,
        title: song.title,
        artist: song.artist,
        albumArt: song.albumArt || "/brand/audiq-vinyl.svg",
        audio: song.audioUrl || "",
        source: song.source || undefined,
        videoId: song.videoId || undefined,
        externalUrl: song.externalUrl || undefined,
        duration: song.duration || undefined,
      });
    }
    setNotice(`Saved “${name}” to your Library.`);
  }

  function playSharedSong(message: ChatMessageRow) {
    if (message.message_type !== "song" || !message.song || "tracks" in message.song) return;
    const song = message.song;
    const track: Track = {
      id: song.id || `shared-${message.id}`,
      title: song.title,
      artist: song.artist,
      albumArt: song.albumArt || "/covers/default.png",
      audio: song.audioUrl || "",
      source: song.source,
      videoId: song.videoId || undefined,
      externalUrl: song.externalUrl || undefined,
    };
    if (!track.audio && !track.videoId) return;
    playTrack(track);
  }

  function playSharedPlaylist(message: ChatMessageRow) {
    if (message.message_type !== "playlist" || !message.song || !("tracks" in message.song)) return;
    const tracks: Track[] = message.song.tracks.map((song) => ({
      id: song.id || `shared-${message.id}`,
      title: song.title,
      artist: song.artist,
      albumArt: song.albumArt || "/covers/default.png",
      audio: song.audioUrl || "",
      source: song.source || undefined,
      videoId: song.videoId || undefined,
      externalUrl: song.externalUrl || undefined,
      duration: song.duration || undefined,
    }));
    const playableTracks = tracks.filter((track) => track.audio || track.videoId);
    if (playableTracks[0]) playTrack(playableTracks[0], playableTracks);
  }

  if (authLoading) {
    return <div className="grid min-h-72 place-items-center text-sm text-zinc-400">Loading Audiq Social…</div>;
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(0,121,107,.18),rgba(0,121,107,.08),rgba(255,255,255,.03))] p-7 text-center md:p-12">
        <Users className="mx-auto h-12 w-12 text-[#80cbc4]" />
        <h1 className="mt-4 text-3xl font-black text-white">AudiQ Friends & Chat</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-300">
          Create an account to get a unique AudiQ ID, find friends, share what you are listening to, and chat in real time.
        </p>
        <button type="button" onClick={onOpenAuth} className="mt-6 rounded-md bg-[#00796b] px-6 py-3 text-sm font-black text-white hover:bg-[#00695c]">
          Sign in or create an account
        </button>
        {!supabase ? <p className="mt-4 text-xs text-amber-200">Sign-in needs the Supabase URL and publishable key in the app environment.</p> : null}
      </section>
    );
  }

  const myAudiqId = profile?.audiq_id ?? "Creating your Audiq ID…";

  return (
    <section className={`min-h-0 ${activeTab === "messages" ? "flex h-full flex-col gap-2" : "space-y-5 pb-6"}`}>
      {activeTab === "friends" ? <div className="overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(0,121,107,.3),rgba(0,121,107,.08),rgba(255,255,255,.04))] p-5 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#80cbc4]">
              <Users className="h-4 w-4" /> AudiQ Social
            </p>
            <h1 className="mt-3 text-3xl font-black text-white md:text-5xl">Friends & Chat</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Find listeners by their AudiQ ID, accept friend requests, and share songs in private chats.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/25 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Your AudiQ ID</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="font-black text-white">{myAudiqId}</span>
              {profile ? (
                <button type="button" onClick={() => void navigator.clipboard?.writeText(profile.audiq_id)} className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-zinc-400 hover:text-white" title="Copy AudiQ ID" aria-label="Copy AudiQ ID">
                  <Copy className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            {profile ? <p className="mt-1 text-xs text-zinc-500">@{profile.handle}</p> : null}
          </div>
        </div>
      </div> : (
        <div className="flex shrink-0 items-center justify-between gap-3">
          <h1 className="text-xl font-black text-white">Messages</h1>
          <button type="button" onClick={() => onTabChange("friends")} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-zinc-200 transition hover:border-[#00796b]/50 hover:bg-[#00594f]/20">
            Find people
          </button>
        </div>
      )}

      {activeTab === "friends" ? <div className="flex shrink-0 gap-2">
        {[
          { id: "friends" as const, label: "Find Friends", icon: UserPlus },
          { id: "messages" as const, label: "Messages", icon: MessageCircle },
        ].map((tab) => (
          <button key={tab.id} type="button" onClick={() => onTabChange(tab.id)} className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-bold transition ${activeTab === tab.id ? "border-[#00796b]/50 bg-[#00594f]/35 text-white" : "border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white"}`}>
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div> : null}

      {error ? <p role="alert" className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
      {notice ? <p role="status" className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-300">{notice}</p> : null}
      {!profile && !profileLoading ? <p className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">Your profile is not available yet. Apply the Audiq social database migration, then sign out and back in.</p> : null}

      {activeTab === "friends" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(18rem,22rem)_1fr]">
          <section className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
            <h2 className="font-bold text-white">Find a listener</h2>
            <p className="mt-1 text-sm text-zinc-500">Search by AudiQ ID or username.</p>
            <form onSubmit={handleSearch} className="mt-4 flex gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-white/10 bg-black/25 px-3">
                <Search className="h-4 w-4 shrink-0 text-zinc-500" />
                <input value={searchId} onChange={(event) => setSearchId(event.target.value)} placeholder="AQ-1A2B3C4D or @username" className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-zinc-600" />
              </label>
              <button type="submit" className="rounded-md border border-[#00796b]/40 bg-[#00594f]/20 px-4 text-sm font-bold text-[#80cbc4]">Search</button>
            </form>

            {foundUser ? (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                <AvatarBlock user={foundUser} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">{foundUser.display_name}</p>
                  <p className="truncate text-sm text-zinc-500">{foundUser.audiq_id} · @{foundUser.handle}</p>
                </div>
                <button type="button" onClick={() => void handleAddFriend()} disabled={busy} className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#00796b] text-white disabled:opacity-50" title="Send friend request" aria-label="Send friend request">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold text-white">Friend requests</h3>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-300">{incomingRequests.length}</span>
              </div>
              {incomingRequests.length === 0 ? (
                <p className="rounded-md border border-dashed border-white/10 p-4 text-center text-sm text-zinc-500">No pending requests.</p>
              ) : (
                <div className="space-y-2">
                  {incomingRequests.map(({ row, profile: requester }) => (
                    <div key={row.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                      <AvatarBlock user={requester} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-white">{requester.display_name}</p>
                        <p className="truncate text-xs text-zinc-500">{requester.audiq_id}</p>
                      </div>
                      <button type="button" onClick={() => void acceptRequest(row, requester)} aria-label={`Accept ${requester.display_name}`} title="Accept" className="grid h-9 w-9 place-items-center rounded-md bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"><Check className="h-4 w-4" /></button>
                      <button type="button" onClick={() => void deleteRelationship(row.id)} aria-label={`Decline ${requester.display_name}`} title="Decline" className="grid h-9 w-9 place-items-center rounded-md bg-white/5 text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {outgoingRequests.length ? (
              <div className="mt-5">
                <h3 className="mb-2 font-bold text-white">Sent requests</h3>
                <div className="space-y-2">
                  {outgoingRequests.map((requested) => (
                    <div key={requested.id} className="flex items-center gap-3 rounded-md bg-black/20 p-3">
                      <AvatarBlock user={requested} />
                      <div className="min-w-0 flex-1"><p className="truncate font-medium text-white">{requested.display_name}</p><p className="text-xs text-zinc-500">Awaiting response</p></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-white">Your friends</h2>
              <span className="text-xs text-zinc-500">{friends.length} connected</span>
            </div>
            {loadingSocial ? <p className="p-5 text-center text-sm text-zinc-500">Loading friends…</p> : friends.length === 0 ? (
              <div className="rounded-md border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">Search for someone by AudiQ ID to send your first friend request.</div>
            ) : (
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                    <AvatarBlock user={friend} />
                    <div className="min-w-0 flex-1"><p className="truncate font-bold text-white">{friend.display_name}</p><p className="truncate text-sm text-zinc-500">{friend.audiq_id} · @{friend.handle}</p></div>
                    <button type="button" onClick={() => { setActiveFriendId(friend.id); setMobileChatOpen(true); onTabChange("messages"); }} className="flex items-center gap-2 rounded-md border border-[#00796b]/30 px-3 py-2 text-sm font-bold text-[#80cbc4] hover:bg-[#00594f]/20"><MessageCircle className="h-4 w-4" /> Chat</button>
                    <button type="button" onClick={() => { const relation = relationships.find((row) => row.status === "accepted" && (row.requester_id === friend.id || row.addressee_id === friend.id)); if (relation) void deleteRelationship(relation.id); }} title="Remove friend" aria-label={`Remove ${friend.display_name}`} className="grid h-9 w-9 place-items-center rounded-md text-zinc-500 hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "messages" ? (
        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className={`min-h-0 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.045] p-3 ${mobileChatOpen ? "hidden xl:block" : ""}`}>
            <div className="mb-3 flex items-center justify-between px-2">
              <h2 className="font-bold text-white">Chats</h2>
              <span className="text-xs text-zinc-500">{friends.length}</span>
            </div>
            <label className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-2.5 text-zinc-500">
              <Search className="h-4 w-4 shrink-0" />
              <span className="sr-only">Search chats</span>
              <input value={chatSearch} onChange={(event) => setChatSearch(event.target.value)} placeholder="Search chats" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500" />
            </label>
            <div className="mt-3 space-y-1">
              {friends.length === 0 ? (
                <button type="button" onClick={() => onTabChange("friends")} className="w-full rounded-2xl border border-dashed border-white/10 p-5 text-sm text-zinc-500 transition hover:border-[#00796b]/40 hover:text-zinc-300">Add a friend to start chatting.</button>
              ) : friends.filter((friend) => `${friend.display_name} ${friend.handle} ${friend.audiq_id}`.toLowerCase().includes(chatSearch.trim().toLowerCase())).map((friend) => (
                <button key={friend.id} type="button" onClick={() => { setActiveFriendId(friend.id); setMobileChatOpen(true); }} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${activeFriend?.id === friend.id ? "border-[#00796b]/45 bg-[#00594f]/20" : "border-transparent hover:border-white/10 hover:bg-white/[0.06]"}`}>
                  <AvatarBlock user={friend} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-bold text-white">{friend.display_name}</span><span className="mt-0.5 block truncate text-xs text-zinc-500">{friend.audiq_id}</span></span>
                  <MessageCircle className="h-4 w-4 shrink-0 text-zinc-500" />
                </button>
              ))}
              {friends.length > 0 && !friends.some((friend) => `${friend.display_name} ${friend.handle} ${friend.audiq_id}`.toLowerCase().includes(chatSearch.trim().toLowerCase())) ? (
                <p className="px-3 py-6 text-center text-sm text-zinc-500">No chats match that search.</p>
              ) : null}
            </div>
          </aside>

          <section className={`min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d100f] ${mobileChatOpen ? "flex" : "hidden xl:flex"}`}>
            {activeFriend ? (
              <>
                <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-white/[0.02] px-3 py-3 sm:px-4">
                  <button type="button" onClick={() => setMobileChatOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 xl:hidden" aria-label="Back to chats"><ArrowLeft className="h-5 w-5" /></button>
                  <AvatarBlock user={activeFriend} />
                  <div className="min-w-0"><h2 className="truncate font-black text-white">{activeFriend.display_name}</h2><p className="truncate text-sm text-zinc-500">{activeFriend.audiq_id}</p></div>
                  <div className="ml-auto"><ListenTogetherControl key={activeFriend.id} friendId={activeFriend.id} friendName={activeFriend.display_name} /></div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 sm:p-5">
                  {messages.length === 0 ? <div className="grid flex-1 place-items-center px-6 text-center text-sm text-zinc-500">Say hello or share the song you are listening to.</div> : messages.map((item) => {
                    const mine = item.sender_id === user.id;
                    const sharedSong = item.message_type === "song" && item.song && !("tracks" in item.song) ? item.song : null;
                    const sharedPlaylist = item.message_type === "playlist" && item.song && "tracks" in item.song ? item.song : null;
                    return (
                      <div key={item.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                        {!mine ? <ProfileAvatar profile={activeFriend} className="mb-5 h-7 w-7" /> : null}
                        <div style={mine ? { backgroundColor: chatTheme.color, color: chatTheme.textColor } : undefined} className={`max-w-[88%] rounded-[1.35rem] px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[78%] ${mine ? "rounded-br-md" : "rounded-bl-md bg-[#202523] text-zinc-100"}`}>
                        {sharedSong ? (
                          <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-white/10 bg-black/20 p-2">
                            <Image src={sharedSong.albumArt || "/covers/default.png"} alt="" width={48} height={48} unoptimized className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                            <div className="min-w-0 flex-1"><p className="truncate font-bold">{sharedSong.title}</p><p className="truncate text-xs text-white/65">{sharedSong.artist}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-white/50">Shared from {sharedSong.source}</p></div>
                            {sharedSong.audioUrl || sharedSong.videoId ? <button type="button" onClick={() => playSharedSong(item)} style={{ backgroundColor: chatTheme.color, color: chatTheme.textColor }} className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:scale-105" aria-label={`Play ${sharedSong.title}`} title="Play in Audiq"><Play className="h-4 w-4 fill-current" /></button> : null}
                          </div>
                        ) : sharedPlaylist ? (
                          <div className="w-[min(19rem,70vw)] rounded-xl border border-white/10 bg-black/20 p-2">
                            <div className="flex items-center gap-3">
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white/10">
                                <Image src={sharedPlaylist.cover || sharedPlaylist.tracks[0]?.albumArt || "/brand/audiq-vinyl.svg"} alt="" fill sizes="56px" unoptimized className="object-cover" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-bold">{sharedPlaylist.name}</p>
                                <p className="text-xs text-white/65">{sharedPlaylist.tracks.length} songs · Shared playlist</p>
                              </div>
                              <button type="button" disabled={!sharedPlaylist.tracks.some((track) => track.audioUrl || track.videoId)} onClick={() => playSharedPlaylist(item)} style={{ backgroundColor: chatTheme.color, color: chatTheme.textColor }} className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:scale-105 disabled:opacity-40" aria-label={`Play ${sharedPlaylist.name}`} title="Play shared playlist"><Play className="h-4 w-4 fill-current" /></button>
                            </div>
                            {sharedPlaylist.tracks.slice(0, 3).map((track, index) => <p key={`${track.id}-${index}`} className="mt-2 truncate border-t border-white/5 pt-2 text-xs text-white/60">{index + 1}. {track.title} · {track.artist}</p>)}
                            <button type="button" onClick={() => saveSharedPlaylist(item)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-bold text-white/80 transition hover:border-white/25 hover:bg-white/10"><Plus className="h-3.5 w-3.5" /> Save to Library</button>
                          </div>
                        ) : <p className="whitespace-pre-wrap break-words">{item.body}</p>}
                        <p className={`mt-1 text-[10px] text-white/50 ${mine ? "text-right" : "text-left"}`}>{formatTime(item.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} aria-hidden="true" />
                </div>

                <form className="relative flex shrink-0 items-center gap-2 border-t border-white/10 bg-[#0a0d0c] px-3 py-3 sm:px-4" onSubmit={(event) => void handleSend(event)}>
                  <input value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder={`Message ${activeFriend.display_name}`} maxLength={2000} className="min-h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition focus:border-[#00796b]/60 focus:bg-white/[0.06]" />
                  <div className="relative shrink-0">
                    <button type="button" onClick={() => setSharePlaylistOpen((open) => !open)} disabled={!playlists.length} title={playlists.length ? "Share a playlist" : "Create a playlist in Library first"} aria-label="Share a playlist" aria-expanded={sharePlaylistOpen} style={{ color: chatTheme.color }} className="grid h-11 w-11 place-items-center rounded-full transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"><ListMusic className="h-5 w-5" /></button>
                    {sharePlaylistOpen ? (
                      <div className="absolute bottom-full right-0 z-30 mb-2 max-h-64 w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-white/10 bg-[#151917] p-2 shadow-2xl">
                        <p className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Share a playlist</p>
                        {playlists.map((playlist) => (
                          <button key={playlist.id} type="button" disabled={!playlist.tracks.length} onClick={() => void handleSharePlaylist(playlist)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-45">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-white/10"><Image src={playlist.cover || playlist.tracks[0]?.albumArt || "/brand/audiq-vinyl.svg"} alt="" fill sizes="40px" unoptimized className="object-cover" /></div>
                            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{playlist.name}</span><span className="block text-xs text-zinc-500">{playlist.tracks.length} songs</span></span>
                            <Send className="h-4 w-4 shrink-0 text-zinc-500" />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button type="button" onClick={() => void handleShareSong()} disabled={!currentTrack} title={currentTrack ? `Share ${currentTrack.title}` : "Play a song to share it"} aria-label={currentTrack ? `Share ${currentTrack.title}` : "Play a song to share it"} style={{ color: chatTheme.color }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:gap-2 sm:px-3"><Music2 className="h-5 w-5" /><span className="hidden text-sm font-bold sm:inline">Share</span></button>
                  <button type="submit" disabled={!messageText.trim()} aria-label="Send message" style={{ backgroundColor: chatTheme.color, color: chatTheme.textColor }} className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" /></button>
                </form>
              </>
            ) : (
              <div className="grid flex-1 place-items-center p-8 text-center text-zinc-500">Add a friend, then open a chat.</div>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}

