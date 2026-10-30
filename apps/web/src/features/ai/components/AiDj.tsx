"use client";

import {
  Brain,
  Heart,
  LoaderCircle,
  ListMusic,
  Mic2,
  Play,
  Plus,
  Radio,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { createAiDjPlan, type AiDjPlan } from "@/services/ai";
import { searchMusic } from "@/services/music";
import { songToTrack } from "@/lib/songAdapter";
import { useLibraryStore } from "@/store/library";
import { type Track, usePlayerStore } from "@/store/player";
import { usePlaylistStore } from "@/store/playlist";

const moods = [
  {
    id: "night",
    label: "Night Drive",
    prompt: "Glossy synths and a steady pulse",
    queries: ["night drive synth pop", "The Weeknd synth pop"],
    color: "#4db6ac",
  },
  {
    id: "focus",
    label: "Deep Focus",
    prompt: "Calm instrumentals and soft textures",
    queries: ["lofi focus instrumental", "ambient study music"],
    color: "#00796b",
  },
  {
    id: "party",
    label: "House Party",
    prompt: "Dance tracks with familiar hooks",
    queries: ["dance pop party hits", "popular club music"],
    color: "#80cbc4",
  },
  {
    id: "heartbreak",
    label: "Soft Reset",
    prompt: "Warm vocals and emotional songs",
    queries: ["soft heartbreak songs", "Arijit Singh acoustic"],
    color: "#00695c",
  },
  {
    id: "indie",
    label: "Indie Hour",
    prompt: "Fresh finds and thoughtful songwriting",
    queries: ["indie pop new music", "independent Indian music"],
    color: "#26a69a",
  },
] as const;

type MoodId = (typeof moods)[number]["id"];

function isPlayable(track: Track) {
  return !track.isPreview && Boolean(track.audio || (track.source === "youtube" && track.videoId));
}

function uniqueTracks(tracks: Track[]) {
  const seen = new Set<string>();
  return tracks.filter((track) => {
    if (!isPlayable(track)) return false;
    const key = `${track.source ?? "unknown"}:${track.id}:${track.videoId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueQueries(queries: string[]) {
  const seen = new Set<string>();
  return queries
    .map((query) => query.trim())
    .filter((query) => {
      const key = query.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export default function AiDj() {
  const [mood, setMood] = useState<MoodId>("night");
  const [energy, setEnergy] = useState(65);
  const [prompt, setPrompt] = useState("");
  const [aiPlan, setAiPlan] = useState<AiDjPlan | null>(null);
  const [suggestions, setSuggestions] = useState<Track[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState("Pick a mood, add a prompt, and build a set from the live catalog.");
  const [statusIsError, setStatusIsError] = useState(false);

  const likedSongs = useLibraryStore((state) => state.likedSongs);
  const recentlyPlayed = useLibraryStore((state) => state.recentlyPlayed);
  const personalTracks = useMemo(() => uniqueTracks([...likedSongs, ...recentlyPlayed]).slice(0, 20), [likedSongs, recentlyPlayed]);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const createPlaylist = usePlaylistStore((state) => state.createPlaylist);
  const addSongToPlaylist = usePlaylistStore((state) => state.addSongToPlaylist);
  const playlists = usePlaylistStore((state) => state.playlists);

  const selectedMood = moods.find((item) => item.id === mood) ?? moods[0];
  const queueTracks = suggestions.length > 0 ? suggestions : personalTracks;

  const generateSuggestions = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setHasGenerated(false);
    setStatusIsError(false);
    setStatus("Building your set and searching the music catalog…");

    const energyHint = energy >= 76 ? "upbeat energetic" : energy <= 35 ? "slow calm" : "mid-tempo";
    const topArtists = [...likedSongs, ...recentlyPlayed]
      .map((track) => track.artist)
      .filter((artist) => artist && artist !== "Audiq AI");
    const favoriteArtist = [...new Set(topArtists)][0];
    const personalQuery = [favoriteArtist, selectedMood.queries[0], energyHint, prompt.trim()]
      .filter(Boolean)
      .join(" ");
    const baseQueries = uniqueQueries([
      prompt.trim(),
      personalQuery,
      ...selectedMood.queries,
    ]).slice(0, 4);

    try {
      const planRequest = createAiDjPlan({
        mood,
        energy,
        seed: prompt.trim() || `${selectedMood.label} mix`,
        likedSongs: likedSongs.slice(0, 8),
        recentlyPlayed: recentlyPlayed.slice(0, 8),
      }).catch(() => null);

      const baseResponses = await Promise.allSettled(baseQueries.map((query, index) => searchMusic(query, { includeYouTube: index === 0 })));
      const plan = await planRequest;
      const extraQueries = uniqueQueries(plan?.queries ?? [])
        .filter((query) => !baseQueries.some((baseQuery) => baseQuery.toLowerCase() === query.toLowerCase()))
        .slice(0, 2);
      const extraResponses = await Promise.allSettled(extraQueries.map((query) => searchMusic(query, { includeYouTube: false })));
      const allResponses = [...baseResponses, ...extraResponses];
      const songs = allResponses.flatMap((response) => response.status === "fulfilled" ? response.value : []);
      const realTracks = uniqueTracks(songs.map(songToTrack)).slice(0, 24);

      setAiPlan(plan);
      setSuggestions(realTracks);
      setHasGenerated(true);

      if (realTracks.length > 0) {
        setStatus(plan
          ? `${plan.provider === "openai" ? "AI" : "Audiq"} built a set with ${realTracks.length} playable catalog tracks.`
          : `Found ${realTracks.length} playable tracks from the catalog. AI planning is unavailable, so these are based on your mood and prompt.`);
        return;
      }

      if (personalTracks.length > 0) {
        setStatus("The catalog returned no playable matches. Your liked and recently played songs are ready below.");
        return;
      }

      setStatus("No playable matches came back. Try a broader prompt or choose another mood.");
      setStatusIsError(true);
    } catch {
      setAiPlan(null);
      setSuggestions([]);
      setHasGenerated(true);
      if (personalTracks.length > 0) {
        setStatus("The catalog is unavailable right now. You can still play from your liked and recently played songs below.");
      } else {
        setStatus("Audiq could not reach the music catalog. Check your connection and try again.");
        setStatusIsError(true);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const startSet = () => {
    if (!queueTracks.length) {
      setStatus("Build a set first, or like a few songs to give Audiq a starting point.");
      return;
    }
    playTrack(queueTracks[0], queueTracks);
    setStatus(`Now playing ${selectedMood.label} · ${queueTracks.length} tracks.`);
    setStatusIsError(false);
  };

  const queueSet = () => {
    queueTracks.forEach(addToQueue);
    setStatus(`${queueTracks.length} tracks added to your queue.`);
    setStatusIsError(false);
  };

  const saveSet = () => {
    if (!queueTracks.length) return;
    const baseName = aiPlan?.title?.trim() || `Audiq ${selectedMood.label}`;
    let name = baseName;
    let suffix = 2;
    while (playlists.some((playlist) => playlist.name.toLowerCase() === name.toLowerCase())) {
      name = `${baseName} ${suffix}`;
      suffix += 1;
    }
    createPlaylist(name);
    const createdPlaylist = usePlaylistStore.getState().playlists.find((playlist) => playlist.name === name);
    if (!createdPlaylist) {
      setStatus("Could not save this mix. Please try again.");
      setStatusIsError(true);
      return;
    }
    queueTracks.forEach((track) => addSongToPlaylist(createdPlaylist.id, track));
    setStatus(`Saved ${queueTracks.length} tracks to “${name}” in your library.`);
    setStatusIsError(false);
  };

  const speakIntro = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setStatus("Voice intros are not supported in this browser.");
      setStatusIsError(true);
      return;
    }
    window.speechSynthesis.cancel();
    const intro = new SpeechSynthesisUtterance(
      aiPlan?.intro || `Your ${selectedMood.label} set is ready with ${queueTracks.length} tracks.`
    );
    intro.rate = 0.95;
    intro.pitch = 0.95;
    window.speechSynthesis.speak(intro);
    setStatus("Playing your voice intro.");
    setStatusIsError(false);
  };

  return (
    <section className="space-y-6 pb-8">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(0,121,107,.28),rgba(0,121,107,.14),rgba(0,0,0,.18))] p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#80cbc4]"><Sparkles aria-hidden="true" className="h-4 w-4" /> Audiq music lab</p>
            <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">AI Studio</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">Shape a mix around a mood, your listening, and a prompt. Audiq searches the live catalog, then lets you play, queue, or save the results.</p>
          </div>
          <button type="button" onClick={suggestions.length ? startSet : () => void generateSuggestions()} disabled={isGenerating} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#00332d] shadow-lg shadow-black/30 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60">
            {isGenerating ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Play aria-hidden="true" className="h-4 w-4 fill-current" />}
            {suggestions.length ? "Play my set" : "Build my set"}
          </button>
        </div>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[21rem_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2"><Wand2 aria-hidden="true" className="h-4 w-4 text-[#80cbc4]" /><h2 className="font-bold text-white">Choose a mood</h2></div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {moods.map((item) => (
                <button key={item.id} type="button" onClick={() => setMood(item.id)} disabled={isGenerating} aria-pressed={mood === item.id} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition disabled:opacity-60 ${mood === item.id ? "border-[#00796b]/50 bg-[#00594f]/20" : "border-white/10 bg-white/[0.025] hover:bg-white/[0.06]"}`}>
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="min-w-0"><span className="block text-sm font-semibold text-white">{item.label}</span><span className="block text-xs text-zinc-500">{item.prompt}</span></span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2"><SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-[#80cbc4]" /><h2 className="font-bold text-white">Set your direction</h2></div>
            <label htmlFor="ai-studio-prompt" className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">What should this mix feel like?</label>
            <input id="ai-studio-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} disabled={isGenerating} maxLength={120} placeholder="e.g. Hindi songs for a rainy evening" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#00796b]/55 disabled:opacity-60" />
            <div className="mt-4 flex items-center justify-between"><label htmlFor="ai-studio-energy" className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Energy</label><span className="text-sm font-bold text-[#80cbc4]">{energy}%</span></div>
            <input id="ai-studio-energy" type="range" min={15} max={100} value={energy} disabled={isGenerating} onChange={(event) => setEnergy(Number(event.target.value))} className="mt-3 w-full accent-[#00796b] disabled:opacity-60" />
            <div className="flex justify-between text-[11px] text-zinc-600"><span>Laid-back</span><span>High energy</span></div>
            <button type="button" onClick={() => void generateSuggestions()} disabled={isGenerating} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00594f] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#00695c] disabled:cursor-wait disabled:opacity-60">
              {isGenerating ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Sparkles aria-hidden="true" className="h-4 w-4" />}
              {isGenerating ? "Building your set…" : "Generate a set"}
            </button>
            <p role="status" className={`mt-3 text-xs leading-5 ${statusIsError ? "text-rose-300" : "text-zinc-400"}`}>{status}</p>
          </section>
        </aside>

        <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#80cbc4]">{hasGenerated ? suggestions.length ? "Live catalog mix" : "Personal fallback" : "Your starting point"}{aiPlan ? ` · ${aiPlan.provider === "openai" ? "AI planned" : "Audiq planned"}` : ""}</p>
              <h2 className="mt-1 text-2xl font-black text-white">{aiPlan?.title || (hasGenerated ? selectedMood.label : "Built around your taste")}</h2>
              <p className="mt-1 text-sm text-zinc-500">{suggestions.length ? `${suggestions.length} playable catalog tracks` : `${personalTracks.length} liked or recent tracks available`}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void generateSuggestions()} disabled={isGenerating} aria-label="Refresh recommendations" className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-zinc-300 transition hover:border-[#00796b]/40 hover:text-white disabled:opacity-50"><RefreshCw aria-hidden="true" className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} /></button>
              <button type="button" onClick={speakIntro} disabled={!queueTracks.length} aria-label="Play voice introduction" className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-zinc-300 transition hover:border-[#00796b]/40 hover:text-white disabled:opacity-40"><Mic2 aria-hidden="true" className="h-4 w-4" /></button>
              <button type="button" onClick={queueSet} disabled={!queueTracks.length} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"><Plus aria-hidden="true" className="h-4 w-4" /> Queue all</button>
              <button type="button" onClick={saveSet} disabled={!queueTracks.length} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"><ListMusic aria-hidden="true" className="h-4 w-4" /> Save mix</button>
            </div>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/15 p-3"><Brain aria-hidden="true" className="h-4 w-4 text-[#00796b]" /><p className="mt-2 text-xs text-zinc-500">Taste signals</p><p className="text-lg font-black text-white">{Math.min(20, likedSongs.length + recentlyPlayed.length)} tracks</p></div>
            <div className="rounded-xl border border-white/10 bg-black/15 p-3"><Radio aria-hidden="true" className="h-4 w-4 text-[#80cbc4]" /><p className="mt-2 text-xs text-zinc-500">Energy level</p><p className="text-lg font-black text-white">{energy}%</p></div>
            <div className="rounded-xl border border-white/10 bg-black/15 p-3"><Heart aria-hidden="true" className="h-4 w-4 text-[#4db6ac]" /><p className="mt-2 text-xs text-zinc-500">Your prompt</p><p className="truncate text-sm font-semibold text-white">{prompt.trim() || selectedMood.label}</p></div>
          </div>

          {aiPlan?.reasons?.length ? <div className="mb-4 rounded-xl border border-[#00796b]/20 bg-[#00796b]/10 p-4 text-sm text-zinc-300"><p className="mb-2 font-bold text-[#80cbc4]">Why this mix</p><ul className="list-inside list-disc space-y-1">{aiPlan.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div> : null}

          {queueTracks.length > 0 ? (
            <div className="space-y-2">
              {queueTracks.map((track, index) => (
                <article key={`${track.source}:${track.id}:${track.videoId ?? ""}`} className="grid grid-cols-[2rem_3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/5 bg-white/[0.035] p-2.5 transition hover:border-[#00796b]/25 hover:bg-white/[0.06]">
                  <span className="text-center text-sm text-zinc-500">{index + 1}</span>
                  <span className="relative h-12 w-12 overflow-hidden rounded-lg bg-[#101412]"><Image src={track.albumArt || "/brand/audiq-vinyl.svg"} alt="" fill sizes="48px" unoptimized className="object-cover" /></span>
                  <button type="button" onClick={() => playTrack(track, queueTracks)} className="min-w-0 text-left"><span className="block truncate text-sm font-semibold text-white">{track.title}</span><span className="block truncate text-xs text-zinc-500">{track.artist} · {track.source || "Audiq"}</span></button>
                  <button type="button" onClick={() => { addToQueue(track); setStatus(`${track.title} added to your queue.`); setStatusIsError(false); }} aria-label={`Add ${track.title} to queue`} className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 hover:bg-white/10 hover:text-white"><Plus aria-hidden="true" className="h-4 w-4" /></button>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-white/10 p-6 text-center">
              <div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#00594f]/15 text-[#80cbc4]"><Sparkles aria-hidden="true" className="h-6 w-6" /></span><h3 className="mt-4 font-bold text-white">Your mix starts here</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">Choose a mood and generate a set. Audiq will search for playable tracks and use your liked songs to personalize the results.</p><button type="button" onClick={() => void generateSuggestions()} disabled={isGenerating} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#00594f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#00695c] disabled:opacity-50"><Sparkles aria-hidden="true" className="h-4 w-4" /> Build my first set</button></div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
