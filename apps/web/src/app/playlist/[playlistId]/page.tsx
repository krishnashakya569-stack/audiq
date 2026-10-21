"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Globe2, Music2, Play } from "lucide-react";
import { useParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { type Track, usePlayerStore } from "@/store/player";

type PublicPlaylist = {
  id: string;
  name: string;
  cover: string | null;
  created_at_ms: number;
  visibility: "private" | "public";
};

function durationLabel(seconds?: number) {
  if (!seconds || !Number.isFinite(seconds)) return "--:--";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

export default function SharedPlaylistPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const [playlist, setPlaylist] = useState<PublicPlaylist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setUnavailable(false);
      if (!supabase || !playlistId) {
        if (active) {
          setPlaylist(null);
          setTracks([]);
          setUnavailable(true);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase.from("audiq_playlists")
        .select("id,name,cover,created_at_ms,visibility")
        .eq("id", playlistId)
        .eq("visibility", "public")
        .maybeSingle();

      if (!active) return;
      if (error || !data) {
        setPlaylist(null);
        setTracks([]);
        setUnavailable(true);
        setLoading(false);
        return;
      }

      const { data: trackRows, error: tracksError } = await supabase.from("audiq_playlist_tracks")
        .select("track,position")
        .eq("playlist_id", playlistId)
        .order("position");
      if (!active) return;
      if (tracksError) {
        setPlaylist(null);
        setTracks([]);
        setUnavailable(true);
      } else {
        setPlaylist(data as PublicPlaylist);
        setTracks((trackRows ?? []).map((row) => row.track as Track));
      }
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [playlistId, supabase]);

  const playableTracks = tracks.filter((track) => !!track.audio || (track.source === "youtube" && !!track.videoId));
  const cover = playlist?.cover || tracks[0]?.albumArt || "/brand/audiq-vinyl.svg";

  return (
    <main className="min-h-dvh bg-[#050706] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:border-[#00796b]/50 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Audiq
        </Link>

        {loading ? (
          <div className="mt-8 animate-pulse rounded-xl border border-white/10 bg-white/[0.04] p-8 text-zinc-400">Loading shared playlist…</div>
        ) : unavailable || !playlist ? (
          <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-white/[0.06] text-[#80cbc4]"><Music2 className="h-7 w-7" /></div>
            <h1 className="mt-4 text-2xl font-black">This playlist isn’t available</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">It may be private, removed, or the sharing link may be incorrect.</p>
          </section>
        ) : (
          <>
            <section className="mt-8 flex flex-col gap-6 rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(0,121,107,.24),rgba(255,255,255,.035))] p-5 sm:flex-row sm:items-end sm:p-8">
              <div className="relative aspect-square w-full max-w-52 shrink-0 overflow-hidden rounded-lg bg-[#101412] shadow-2xl shadow-black/40">
                <Image src={cover} alt="" fill sizes="(max-width: 640px) 80vw, 208px" unoptimized className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#80cbc4]"><Globe2 className="h-4 w-4" /> Public playlist</p>
                <h1 className="mt-3 break-words text-3xl font-black sm:text-5xl">{playlist.name}</h1>
                <p className="mt-3 text-sm text-zinc-400">{tracks.length} songs · Shared from Audiq</p>
                <button type="button" disabled={!playableTracks.length}
                  onClick={() => playableTracks[0] && playTrack(playableTracks[0], playableTracks)}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#00796b] px-5 py-3 font-bold text-white transition hover:bg-[#008f80] disabled:cursor-not-allowed disabled:opacity-50">
                  <Play className="h-4 w-4 fill-current" /> Play playlist
                </button>
              </div>
            </section>

            <section className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-white/[0.025]">
              <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_3rem] gap-3 border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">
                <span>#</span><span>Title</span><span className="text-right">Time</span>
              </div>
              {tracks.length ? tracks.map((track, index) => {
                const isPlayable = !!track.audio || (track.source === "youtube" && !!track.videoId);
                return (
                  <div key={`${track.source ?? ""}-${track.id}-${index}`} className="grid grid-cols-[2.5rem_minmax(0,1fr)_3rem] items-center gap-3 border-b border-white/[0.06] px-4 py-3 last:border-b-0 hover:bg-white/[0.045]">
                    <button type="button" disabled={!isPlayable} onClick={() => playTrack(track, playableTracks)} aria-label={`Play ${track.title}`} className="grid h-9 w-9 place-items-center rounded-md text-zinc-400 hover:bg-[#00796b] hover:text-white disabled:opacity-30">
                      <Play className="h-4 w-4 fill-current" />
                    </button>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-[#101412]">
                        <Image src={track.albumArt || "/brand/audiq-vinyl.svg"} alt="" fill sizes="44px" unoptimized className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{track.title}</p>
                        <p className="truncate text-xs text-zinc-500">{track.artist}</p>
                      </div>
                    </div>
                    <span className="text-right text-sm tabular-nums text-zinc-400">{durationLabel(track.duration)}</span>
                  </div>
                );
              }) : (
                <p className="px-4 py-8 text-center text-sm text-zinc-500">This playlist has no songs yet.</p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
