"use client";

import { Headphones, LoaderCircle, Radio, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePlayerStore, type Track } from "@/store/player";

type RoomPlayerState = {
  userId: string;
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  playbackPosition: number;
  sentAt: number;
};

type RoomPresence = {
  userId: string;
  instanceId: string;
  joinedAt: number;
  playerState: RoomPlayerState;
};

type Status = "idle" | "connecting" | "connected" | "error";

function safeHttpUrl(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function shareableTrack(track: Track): Track {
  return {
    id: track.id,
    title: track.title.slice(0, 300),
    artist: track.artist.slice(0, 300),
    albumArt: safeHttpUrl(track.albumArt) || "/brand/audiq-vinyl.svg",
    audio: track.source === "youtube" ? "" : safeHttpUrl(track.audio),
    fallbackAudio: track.source === "youtube" ? undefined : safeHttpUrl(track.fallbackAudio) || undefined,
    duration: Number.isFinite(track.duration) ? track.duration : undefined,
    source: track.source?.slice(0, 80),
    videoId: track.source === "youtube" ? track.videoId?.slice(0, 32) : undefined,
    externalUrl: safeHttpUrl(track.externalUrl) || undefined,
  };
}

function isPlayable(track: Track | null): track is Track {
  return Boolean(track && (track.audio || (track.source === "youtube" && track.videoId)));
}

function packetFor(userId: string): RoomPlayerState {
  const state = usePlayerStore.getState();
  return {
    userId,
    currentTrack: state.currentTrack ? shareableTrack(state.currentTrack) : null,
    queue: state.queue.slice(0, 50).map(shareableTrack),
    isPlaying: state.isPlaying,
    playbackPosition: state.playbackPosition,
    sentAt: Date.now(),
  };
}

function presencePacketFor(userId: string): RoomPlayerState {
  const packet = packetFor(userId);
  return { ...packet, queue: packet.currentTrack ? [packet.currentTrack] : [] };
}

function parseTrack(value: unknown): Track | null {
  if (!value || typeof value !== "object") return null;
  const track = value as Partial<Track>;
  if ((typeof track.id !== "string" && typeof track.id !== "number") || typeof track.title !== "string" || typeof track.artist !== "string") return null;
  const normalized: Track = {
    id: track.id,
    title: track.title.slice(0, 300),
    artist: track.artist.slice(0, 300),
    albumArt: safeHttpUrl(track.albumArt) || "/brand/audiq-vinyl.svg",
    audio: track.source === "youtube" ? "" : safeHttpUrl(track.audio),
    fallbackAudio: track.source === "youtube" ? undefined : safeHttpUrl(track.fallbackAudio) || undefined,
    duration: Number.isFinite(track.duration) ? track.duration : undefined,
    source: typeof track.source === "string" ? track.source.slice(0, 80) : undefined,
    videoId: track.source === "youtube" && typeof track.videoId === "string" ? track.videoId.slice(0, 32) : undefined,
    externalUrl: safeHttpUrl(track.externalUrl) || undefined,
  };
  return isPlayable(normalized) ? normalized : null;
}

function parsePacket(value: unknown): RoomPlayerState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<RoomPlayerState>;
  if (typeof raw.userId !== "string" || typeof raw.isPlaying !== "boolean") return null;
  const queue = Array.isArray(raw.queue) ? raw.queue.slice(0, 50).map(parseTrack).filter((track): track is Track => Boolean(track)) : [];
  const currentTrack = parseTrack(raw.currentTrack);
  return {
    userId: raw.userId,
    currentTrack,
    queue,
    isPlaying: Boolean(raw.isPlaying && currentTrack),
    playbackPosition: Number.isFinite(raw.playbackPosition) ? Math.max(0, Math.min(Number(raw.playbackPosition), 21600)) : 0,
    sentAt: Number.isFinite(raw.sentAt) ? Number(raw.sentAt) : Date.now(),
  };
}

function trackKey(track: Track | null) {
  return track ? `${track.source ?? ""}:${track.id}:${track.videoId ?? ""}` : "";
}

function roomTopic(userId: string, friendId: string) {
  const [first, second] = [userId, friendId].sort();
  return `audiq-listen:${first}:${second}`;
}

export default function ListenTogetherControl({ friendId, friendName }: { friendId: string; friendName: string }) {
  const { user, supabase } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [friendPresent, setFriendPresent] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const applyingRemote = useRef(false);
  const roomInitialized = useRef(false);
  const mounted = useRef(true);
  const playerUnsubscribe = useRef<(() => void) | null>(null);
  const channelReady = useRef(false);
  const leaderUserId = useRef<string | null>(null);
  const lastPositionBroadcastAt = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function leaveRoom() {
    const channel = channelRef.current;
    channelRef.current = null;
    channelReady.current = false;
    playerUnsubscribe.current?.();
    playerUnsubscribe.current = null;
    roomInitialized.current = false;
    leaderUserId.current = null;
    if (channel && supabase) await supabase.removeChannel(channel);
    if (mounted.current) {
      setStatus("idle");
      setFriendPresent(false);
    }
  }

  async function joinRoom() {
    if (!supabase || !user || !friendId || status === "connecting") return;
    setStatus("connecting");
    setFriendPresent(false);

    try {
      if (!mounted.current) return;

      const instanceId = crypto.randomUUID();
      const joinedAt = Date.now();
      const channel = supabase.channel(roomTopic(user.id, friendId), {
        config: {
          private: true,
          presence: { key: instanceId },
          broadcast: { self: false },
        },
      });
      channelRef.current = channel;

      const publish = async () => {
        if (channelRef.current !== channel || !channelReady.current) return;
        const playerState = packetFor(user.id);
        await channel.track({ userId: user.id, instanceId, joinedAt, playerState: presencePacketFor(user.id) } satisfies RoomPresence);
        await channel.send({ type: "broadcast", event: "player-state", payload: playerState });
      };
      const announceCurrentState = () => channel.send({ type: "broadcast", event: "player-state", payload: packetFor(user.id) });

      const apply = (value: unknown) => {
        const packet = parsePacket(value);
        if (!packet || packet.userId === user.id) return;
        const local = usePlayerStore.getState();
        const nextTrack = packet.currentTrack;
        let applied = false;
        applyingRemote.current = true;
        try {
          if (!nextTrack) {
            local.setPlaying(false);
            applied = true;
          } else {
            const queue = packet.queue.length ? packet.queue : [nextTrack];
            if (trackKey(local.currentTrack) !== trackKey(nextTrack)) {
              local.playTrack(nextTrack, queue);
              usePlayerStore.getState().requestSeek(packet.playbackPosition, nextTrack);
            } else {
              local.setQueue(queue);
              const currentPosition = usePlayerStore.getState().playbackPosition;
              if (Math.abs(currentPosition - packet.playbackPosition) > 2) {
                usePlayerStore.getState().requestSeek(packet.playbackPosition, nextTrack);
              } else {
                usePlayerStore.getState().setPlaybackPosition(packet.playbackPosition);
              }
            }
            usePlayerStore.getState().setPlaying(packet.isPlaying);
            applied = true;
          }
        } finally {
          applyingRemote.current = false;
        }
        if (applied && leaderUserId.current === user.id) void publish();
      };

      channel
        .on("broadcast", { event: "player-state" }, ({ payload }) => apply(payload))
        .on("broadcast", { event: "state-request" }, ({ payload }) => {
          const requester = payload && typeof payload === "object" ? (payload as { userId?: unknown }).userId : null;
          if (requester === friendId) void publish();
        })
        .on("presence", { event: "sync" }, () => {
          const presence = Object.values(channel.presenceState<RoomPresence>()).flat();
          const friendIsHere = presence.some((entry) => entry.userId === friendId);
          if (mounted.current) setFriendPresent(friendIsHere);
          if (!friendIsHere) {
            leaderUserId.current = user.id;
            roomInitialized.current = false;
            return;
          }
          if (roomInitialized.current) return;
          roomInitialized.current = true;

          const oldest = [...presence].sort((a, b) => a.joinedAt - b.joinedAt || a.userId.localeCompare(b.userId) || a.instanceId.localeCompare(b.instanceId))[0];
          if (!oldest) return;
          leaderUserId.current = oldest.userId;
          if (oldest.userId === user.id && oldest.instanceId === instanceId) {
            void announceCurrentState();
          } else if (oldest.userId !== user.id) {
            apply(oldest.playerState);
          }
        })
        .subscribe((channelStatus) => {
          if (!mounted.current) return;
          if (channelStatus === "SUBSCRIBED") {
            channelReady.current = true;
            setStatus("connected");
            void channel.track({ userId: user.id, instanceId, joinedAt, playerState: presencePacketFor(user.id) } satisfies RoomPresence);
            void channel.send({ type: "broadcast", event: "state-request", payload: { userId: user.id } });
          } else if (channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT") {
            channelReady.current = false;
            playerUnsubscribe.current?.();
            playerUnsubscribe.current = null;
            if (channelRef.current === channel) channelRef.current = null;
            leaderUserId.current = null;
            void supabase.removeChannel(channel).finally(() => {
              if (mounted.current) setStatus("error");
            });
          } else if (channelStatus === "CLOSED") {
            channelReady.current = false;
            playerUnsubscribe.current?.();
            playerUnsubscribe.current = null;
            if (channelRef.current === channel) channelRef.current = null;
            leaderUserId.current = null;
            if (mounted.current) {
              setStatus("idle");
              setFriendPresent(false);
            }
          }
        });

      const unsubscribe = usePlayerStore.subscribe((state, previous) => {
        if (applyingRemote.current || channelRef.current !== channel) return;
        const trackOrTransportChanged = state.currentTrack !== previous.currentTrack
          || state.isPlaying !== previous.isPlaying
          || state.queue !== previous.queue;
        const userSought = state.seekRequest?.sequence !== previous.seekRequest?.sequence;
        if (trackOrTransportChanged || userSought) {
          lastPositionBroadcastAt.current = Date.now();
          void publish();
          return;
        }
        const positionChanged = Math.abs(state.playbackPosition - previous.playbackPosition) >= 1;
        if (positionChanged && state.isPlaying && leaderUserId.current === user.id && Date.now() - lastPositionBroadcastAt.current >= 2500) {
          lastPositionBroadcastAt.current = Date.now();
          void publish();
        }
      });
      playerUnsubscribe.current = unsubscribe;
    } catch {
      const channel = channelRef.current;
      channelRef.current = null;
      channelReady.current = false;
      playerUnsubscribe.current?.();
      playerUnsubscribe.current = null;
      if (channel && supabase) void supabase.removeChannel(channel);
      if (mounted.current) setStatus("error");
    }
  }

  useEffect(() => () => {
    const channel = channelRef.current;
    channelRef.current = null;
    channelReady.current = false;
    playerUnsubscribe.current?.();
    playerUnsubscribe.current = null;
    if (channel && supabase) void supabase.removeChannel(channel);
  }, [supabase, friendId]);

  const label = status === "connected"
    ? friendPresent ? "Listening together" : "Room open · waiting"
    : status === "connecting" ? "Joining room…"
    : status === "error" ? "Room unavailable"
    : "Listen together";
  const Icon = status === "connecting" ? LoaderCircle : status === "connected" && friendPresent ? Users : status === "connected" ? Radio : Headphones;

  return (
    <button
      type="button"
      onClick={() => void (status === "connected" ? leaveRoom() : joinRoom())}
      disabled={!supabase || !user || status === "connecting"}
      title={status === "error" ? "Check the Audiq Realtime migration and try again" : `Listen along with ${friendName}`}
      aria-label={status === "connected" ? "Leave listening room" : `Listen together with ${friendName}`}
      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-bold transition ${status === "connected" ? "border-[#00796b]/50 bg-[#00594f]/30 text-[#80cbc4]" : "border-white/10 bg-white/[0.04] text-zinc-300 hover:border-[#00796b]/40 hover:text-white"} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <Icon className={`h-4 w-4 ${status === "connecting" ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
