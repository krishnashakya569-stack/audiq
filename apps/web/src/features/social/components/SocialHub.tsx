"use client";

import Image from "next/image";
import {
  Check,
  Copy,
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
import { useCallback, useEffect, useMemo, useState } from "react";
import { type AudiqProfile, useAuth } from "@/features/auth/AuthProvider";
import { usePlayerStore, type Track } from "@/store/player";

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

type ChatMessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  message_type: "text" | "song";
  song: SharedSong | null;
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
  return (
    <div
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full font-black text-white"
      style={{ backgroundColor: user.avatar_color || "#b01340" }}
      aria-hidden="true"
    >
      {user.display_name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function SocialHub({
  activeTab,
  onTabChange,
  onOpenAuth,
}: SocialHubProps) {
  const { user, profile, loading: authLoading, profileLoading, supabase } = useAuth();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const playTrack = usePlayerStore((state) => state.playTrack);

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
      .select("id,audiq_id,display_name,handle,avatar_color")
      .in("id", otherIds);

    if (profilesError) {
      setError("Could not load user profiles. Check the Supabase social migration and try again.");
    } else {
      setProfilesById(
        Object.fromEntries(
          ((profiles ?? []) as AudiqProfile[]).map((item) => [item.id, item])
        )
      );
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

  useEffect(() => {
    void refreshMessages();
  }, [refreshMessages]);

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

  useEffect(() => {
    if (!activeFriendId && friends[0]) setActiveFriendId(friends[0].id);
    if (activeFriendId && !friends.some((friend) => friend.id === activeFriendId)) {
      setActiveFriendId(friends[0]?.id ?? null);
    }
  }, [friends, activeFriendId]);

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
      .select("id,audiq_id,display_name,handle,avatar_color")
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
    const match = result.data as AudiqProfile;
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
    song?: SharedSong
  ) {
    if (!supabase || !user || !activeFriend) return;
    const { error: sendError } = await supabase.from("chat_messages").insert({
      sender_id: user.id,
      receiver_id: activeFriend.id,
      body,
      message_type: song ? "song" : "text",
      song: song ?? null,
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

  function playSharedSong(message: ChatMessageRow) {
    if (!message.song) return;
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

  if (authLoading) {
    return <div className="grid min-h-72 place-items-center text-sm text-zinc-400">Loading Audiq Social…</div>;
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(176,19,64,.25),rgba(68,215,182,.06),rgba(255,255,255,.03))] p-7 text-center md:p-12">
        <Users className="mx-auto h-12 w-12 text-[#f5c2ce]" />
        <h1 className="mt-4 text-3xl font-black text-white">AudiQ Friends & Chat</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-300">
          Create an account to get a unique AudiQ ID, find friends, share what you are listening to, and chat in real time.
        </p>
        <button type="button" onClick={onOpenAuth} className="mt-6 rounded-md bg-[#ff2d67] px-6 py-3 text-sm font-black text-white hover:bg-[#e9215b]">
          Sign in or create an account
        </button>
        {!supabase ? <p className="mt-4 text-xs text-amber-200">Sign-in needs the Supabase URL and publishable key in the app environment.</p> : null}
      </section>
    );
  }

  const myAudiqId = profile?.audiq_id ?? "Creating your Audiq ID…";

  return (
    <section className="space-y-5 pb-6">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(176,19,64,.3),rgba(68,215,182,.08),rgba(255,255,255,.04))] p-5 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#f5c2ce]">
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
      </div>

      <div className="flex gap-2">
        {[
          { id: "friends" as const, label: "Find Friends", icon: UserPlus },
          { id: "messages" as const, label: "Messages", icon: MessageCircle },
        ].map((tab) => (
          <button key={tab.id} type="button" onClick={() => onTabChange(tab.id)} className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-bold transition ${activeTab === tab.id ? "border-[#ff2d67]/50 bg-[#b01340]/35 text-white" : "border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white"}`}>
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

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
              <button type="submit" className="rounded-md border border-[#ff2d67]/40 bg-[#b01340]/20 px-4 text-sm font-bold text-[#f5c2ce]">Search</button>
            </form>

            {foundUser ? (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                <AvatarBlock user={foundUser} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">{foundUser.display_name}</p>
                  <p className="truncate text-sm text-zinc-500">{foundUser.audiq_id} · @{foundUser.handle}</p>
                </div>
                <button type="button" onClick={() => void handleAddFriend()} disabled={busy} className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#ff2d67] text-white disabled:opacity-50" title="Send friend request" aria-label="Send friend request">
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
                    <button type="button" onClick={() => { setActiveFriendId(friend.id); onTabChange("messages"); }} className="flex items-center gap-2 rounded-md border border-[#ff2d67]/30 px-3 py-2 text-sm font-bold text-[#f5c2ce] hover:bg-[#b01340]/20"><MessageCircle className="h-4 w-4" /> Chat</button>
                    <button type="button" onClick={() => { const relation = relationships.find((row) => row.status === "accepted" && (row.requester_id === friend.id || row.addressee_id === friend.id)); if (relation) void deleteRelationship(relation.id); }} title="Remove friend" aria-label={`Remove ${friend.display_name}`} className="grid h-9 w-9 place-items-center rounded-md text-zinc-500 hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "messages" ? (
        <div className="grid min-h-[520px] gap-4 xl:grid-cols-[19rem_1fr]">
          <aside className="rounded-xl border border-white/10 bg-white/[0.045] p-3">
            <h2 className="mb-3 px-2 font-bold text-white">Chats</h2>
            <div className="space-y-2">
              {friends.length === 0 ? (
                <button type="button" onClick={() => onTabChange("friends")} className="w-full rounded-md border border-dashed border-white/10 p-5 text-sm text-zinc-500">Add a friend to start chatting.</button>
              ) : friends.map((friend) => (
                <button key={friend.id} type="button" onClick={() => setActiveFriendId(friend.id)} className={`flex w-full items-center gap-3 rounded-md border p-3 text-left transition ${activeFriend?.id === friend.id ? "border-[#ff2d67]/45 bg-[#b01340]/20" : "border-white/5 bg-black/15 hover:bg-white/[0.06]"}`}>
                  <AvatarBlock user={friend} />
                  <span className="min-w-0"><span className="block truncate font-bold text-white">{friend.display_name}</span><span className="block truncate text-xs text-zinc-500">{friend.audiq_id}</span></span>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-[520px] min-w-0 flex-col rounded-xl border border-white/10 bg-white/[0.045]">
            {activeFriend ? (
              <>
                <div className="flex items-center gap-3 border-b border-white/10 p-4">
                  <AvatarBlock user={activeFriend} />
                  <div><h2 className="font-black text-white">{activeFriend.display_name}</h2><p className="text-sm text-zinc-500">{activeFriend.audiq_id}</p></div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.length === 0 ? <div className="grid min-h-40 place-items-center text-center text-sm text-zinc-500">Say hello or share the song you are listening to.</div> : messages.map((item) => {
                    const mine = item.sender_id === user.id;
                    const sharedSong = item.message_type === "song" ? item.song : null;
                    return (
                      <div key={item.id} className={`max-w-[88%] rounded-lg p-3 text-sm ${mine ? "ml-auto bg-[#8f1338] text-white" : "bg-white/[0.08] text-zinc-100"}`}>
                        {sharedSong ? (
                          <div className="flex min-w-0 items-center gap-3 rounded-md border border-white/10 bg-black/20 p-2">
                            <Image src={sharedSong.albumArt || "/covers/default.png"} alt="" width={52} height={52} unoptimized className="h-13 w-13 shrink-0 rounded object-cover" />
                            <div className="min-w-0 flex-1"><p className="truncate font-bold">{sharedSong.title}</p><p className="truncate text-xs text-white/65">{sharedSong.artist}</p><p className="mt-1 text-[10px] uppercase text-white/50">Shared from {sharedSong.source}</p></div>
                            {sharedSong.audioUrl || sharedSong.videoId ? <button type="button" onClick={() => playSharedSong(item)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ff2d67] text-white" aria-label={`Play ${sharedSong.title}`} title="Play in Audiq"><Play className="h-4 w-4 fill-current" /></button> : null}
                          </div>
                        ) : <p className="whitespace-pre-wrap break-words">{item.body}</p>}
                        <p className="mt-1 text-right text-[10px] text-white/55">{formatTime(item.created_at)}</p>
                      </div>
                    );
                  })}
                </div>

                <form className="flex flex-wrap items-center gap-2 border-t border-white/10 p-3" onSubmit={(event) => void handleSend(event)}>
                  <input value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder={`Message ${activeFriend.display_name}`} maxLength={2000} className="min-w-0 flex-1 basis-40 rounded-md border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#ff2d67]/50" />
                  <button type="button" onClick={() => void handleShareSong()} disabled={!currentTrack} title={currentTrack ? `Share ${currentTrack.title}` : "Play a song to share it"} className="flex h-11 items-center gap-2 rounded-md border border-white/10 px-3 text-sm font-bold text-[#f5c2ce] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"><Music2 className="h-4 w-4" /><span className="hidden sm:inline">Share song</span></button>
                  <button type="submit" disabled={!messageText.trim()} aria-label="Send message" className="grid h-11 w-11 place-items-center rounded-md bg-[#ff2d67] text-white disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" /></button>
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
