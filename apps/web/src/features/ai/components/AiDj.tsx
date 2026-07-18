"use client";

import {
  Brain,
  Heart,
  Loader2,
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
import { mockSongs } from "@/services/music/mock";
import { createAiDjPlan, type AiDjPlan } from "@/services/ai";
import { searchMusic } from "@/services/music";
import { songToTrack } from "@/lib/songAdapter";
import { useLibraryStore } from "@/store/library";
import { type Track, usePlayerStore } from "@/store/player";

type Mood = "night" | "focus" | "party" | "heartbreak";

const moods: Array<{
  id: Mood;
  label: string;
  prompt: string;
  searchTerms: string[];
  color: string;
}> = [
  {
    id: "night",
    label: "Night Drive",
    prompt: "glossy, late, bass-forward",
    searchTerms: ["The Weeknd", "night drive", "synth pop"],
    color: "#ff5c8a",
  },
  {
    id: "focus",
    label: "Deep Focus",
    prompt: "clean, minimal, no distractions",
    searchTerms: ["lofi focus", "ambient study", "instrumental"],
    color: "#44d7b6",
  },
  {
    id: "party",
    label: "House Party",
    prompt: "high energy, familiar hooks",
    searchTerms: ["party hits", "dance pop", "club mix"],
    color: "#f7b955",
  },
  {
    id: "heartbreak",
    label: "Soft Reset",
    prompt: "emotional, warm, cinematic",
    searchTerms: ["sad songs", "Arijit Singh", "acoustic heartbreak"],
    color: "#a78bfa",
  },
];

const fallbackTracks = mockSongs
  .map(songToTrack)
  .filter((track) => track.audio || (track.source === "youtube" && track.videoId));

function uniqueTracks(tracks: Track[]) {
  const unique = new Map<string, Track>();

  tracks.forEach((track) => {
    unique.set(`${track.source ?? "unknown"}-${track.id}-${track.videoId ?? ""}`, track);
  });

  return Array.from(unique.values());
}

function getSeedArtist(tracks: Track[]) {
  const first = tracks.find((track) => track.artist && track.artist !== "Audiq AI");

  return first?.artist;
}

export default function AiDj() {
  const [mood, setMood] = useState<Mood>("night");
  const [energy, setEnergy] = useState(72);
  const [seed, setSeed] = useState("Krishna's late-night mix");
  const [aiPlan, setAiPlan] = useState<AiDjPlan | null>(null);
  const [realSuggestions, setRealSuggestions] = useState<Track[]>([]);
  const [isSuggesting, setSuggesting] = useState(false);
  const [aiStatus, setAiStatus] = useState("Ready to build a set from your library.");
  const likedSongs = useLibraryStore((state) => state.likedSongs);
  const recentlyPlayed = useLibraryStore((state) => state.recentlyPlayed);
  const { addToQueue, playTrack, setQueue } = usePlayerStore();

  const selectedMood = moods.find((item) => item.id === mood) ?? moods[0];

  const aiQueue = useMemo(() => {
    const librarySeeds = [...likedSongs, ...recentlyPlayed].slice(0, 6);
    const energySortedSuggestions = [...realSuggestions].sort((a, b) => {
      const aScore = (a.duration ?? 180) + (a.title.length % Math.max(energy, 1));
      const bScore = (b.duration ?? 180) + (b.title.length % Math.max(energy, 1));

      return energy >= 60 ? bScore - aScore : aScore - bScore;
    });

    return uniqueTracks([...librarySeeds, ...energySortedSuggestions, ...fallbackTracks]).slice(0, 10);
  }, [energy, likedSongs, realSuggestions, recentlyPlayed]);

  const suggestionQuery = useMemo(() => {
    const seedArtist = getSeedArtist([...likedSongs, ...recentlyPlayed]);
    const energyHint = energy > 75 ? "upbeat" : energy < 40 ? "chill" : "popular";
    const promptTokens = seed
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2)
      .slice(0, 3)
      .join(" ");

    return [seedArtist, selectedMood.searchTerms[0], energyHint, promptTokens]
      .filter(Boolean)
      .join(" ");
  }, [energy, likedSongs, recentlyPlayed, seed, selectedMood.searchTerms]);

  const generateSuggestions = async () => {
    setSuggesting(true);
    setAiStatus(`Asking AI DJ for ${selectedMood.label} recommendations...`);

    try {
      const plan = await createAiDjPlan({
        mood,
        energy,
        seed,
        likedSongs,
        recentlyPlayed,
      });
      const queries = [...plan.queries, suggestionQuery, ...selectedMood.searchTerms].filter(Boolean);
      const responses = await Promise.allSettled(queries.slice(0, 5).map((query) => searchMusic(query)));
      const songs = responses.flatMap((response) => (response.status === "fulfilled" ? response.value : []));
      const tracks = uniqueTracks(songs.map(songToTrack)).filter((track) => track.audio || track.source === "youtube");

      setAiPlan(plan);

      if (tracks.length > 0) {
        setRealSuggestions(tracks);
        setAiStatus(
          `${plan.provider === "openai" ? "OpenAI" : "Local AI"} suggested ${tracks.length} real playable songs.`
        );
      } else {
        setAiStatus(`${plan.provider === "openai" ? "OpenAI" : "Local AI"} made a plan, but the catalog returned no playable matches.`);
      }
    } catch {
      setAiStatus("Could not reach AI DJ or the music catalog. Using your library and offline fallback picks.");
    } finally {
      setSuggesting(false);
    }
  };

  const startSet = () => {
    setQueue(aiQueue);

    if (aiQueue[0]) {
      playTrack(aiQueue[0], aiQueue);
      setAiStatus(`Now mixing ${selectedMood.label} with ${aiQueue.length} tracks.`);
    }
  };

  const speakIntro = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setAiStatus("Voice intro is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const intro = new SpeechSynthesisUtterance(
      aiPlan?.intro ||
        `AudiQ AI DJ is starting ${selectedMood.label}. Energy is set to ${energy} percent. First up, ${aiQueue[0]?.title ?? "your custom mix"}.`
    );

    intro.rate = 0.95;
    intro.pitch = 0.92;
    window.speechSynthesis.speak(intro);
    setAiStatus("Voice intro playing.");
  };

  const refreshSet = () => {
    void generateSuggestions();
  };

  return (
    <section className="space-y-6 pb-6">
      <div className="overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(176,19,64,.34),rgba(68,215,182,.1),rgba(0,0,0,.2))] p-5 md:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#f5c2ce]">
              <Sparkles className="h-4 w-4" />
              AudiQ AI
            </p>
            <h1 className="mt-3 text-3xl font-black text-white md:text-5xl">AI DJ</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Build a live set from your taste, recent listening, and a mood prompt. This is the first layer of AudiQ AI music assistant.
            </p>
          </div>

          <button
            type="button"
            onClick={startSet}
            className="flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-[#800f2f] shadow-lg shadow-black/30"
          >
            <Play className="h-4 w-4 fill-current" />
            Start AI Set
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
        <aside className="space-y-4">
          <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
            <div className="mb-4 flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-[#f5c2ce]" />
              <h2 className="font-bold">Mood Engine</h2>
            </div>

            <div className="grid gap-2">
              {moods.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMood(item.id)}
                  className={`flex items-center gap-3 rounded-md border p-3 text-left transition ${
                    mood === item.id
                      ? "border-[#ff2d67]/45 bg-[#b01340]/25"
                      : "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>
                    <span className="block text-sm font-semibold text-white">{item.label}</span>
                    <span className="text-xs text-zinc-500">{item.prompt}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
            <div className="mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#f5c2ce]" />
              <h2 className="font-bold">Set Controls</h2>
            </div>

            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Prompt</label>
            <input
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              className="mt-2 w-full rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-[#ff2d67]/50"
            />

            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Energy {energy}%
            </label>
            <input
              type="range"
              min={15}
              max={100}
              value={energy}
              onChange={(event) => setEnergy(Number(event.target.value))}
              className="mt-3 w-full accent-[#ff2d67]"
            />

            <button
              type="button"
              onClick={generateSuggestions}
              disabled={isSuggesting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-[#ff2d67]/40 bg-[#b01340]/20 px-4 py-2.5 text-sm font-bold text-[#f5c2ce] transition hover:bg-[#b01340]/30 disabled:cursor-wait disabled:opacity-70"
            >
              {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Real AI Suggestions
            </button>

            <p className="mt-3 text-xs leading-5 text-zinc-500">{aiStatus}</p>
          </section>
        </aside>

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4 md:p-5">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#f5c2ce]">
                Generated Set {aiPlan ? `- ${aiPlan.provider === "openai" ? "OpenAI" : "Local AI"}` : ""}
              </p>
              <h2 className="mt-1 text-2xl font-black">{aiPlan?.title || selectedMood.label}</h2>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={refreshSet}
                disabled={isSuggesting}
                className="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-white/[0.05] text-zinc-300 transition hover:border-[#ff2d67]/40 hover:text-white disabled:cursor-wait"
                title="Refresh set"
              >
                <RefreshCw className={`h-4 w-4 ${isSuggesting ? "animate-spin" : ""}`} />
              </button>
              <button
                type="button"
                onClick={speakIntro}
                className="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-white/[0.05] text-zinc-300 transition hover:border-[#ff2d67]/40 hover:text-white"
                title="Voice intro"
              >
                <Mic2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <Brain className="h-4 w-4 text-[#44d7b6]" />
              <p className="mt-2 text-sm font-semibold">Taste match</p>
              <p className="text-2xl font-black">{Math.min(98, 72 + likedSongs.length * 3)}%</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <Radio className="h-4 w-4 text-[#f7b955]" />
              <p className="mt-2 text-sm font-semibold">Energy curve</p>
              <p className="text-2xl font-black">{energy}%</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <Heart className="h-4 w-4 text-[#ff5c8a]" />
              <p className="mt-2 text-sm font-semibold">Seed</p>
              <p className="truncate text-sm text-zinc-400">{seed}</p>
            </div>
          </div>

          <div className="space-y-2">
            {aiPlan?.reasons?.length ? (
              <div className="mb-3 rounded-md border border-[#44d7b6]/25 bg-[#44d7b6]/10 p-3 text-sm text-zinc-300">
                <p className="mb-2 font-bold text-[#9ff5de]">AI reasoning</p>
                <div className="space-y-1">
                  {aiPlan.reasons.map((reason) => (
                    <p key={reason}>{reason}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {aiQueue.map((track, index) => (
              <div
                key={`${track.source}-${track.id}`}
                className="grid w-full grid-cols-[2rem_3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-white/5 bg-white/[0.035] p-2.5 text-left transition hover:border-[#ff2d67]/30 hover:bg-white/[0.065]"
              >
                <span className="text-sm text-zinc-500">{index + 1}</span>
                <span className="relative h-12 w-12 overflow-hidden rounded-md bg-[#151114]">
                  <Image src={track.albumArt || "/brand/audiq-logo.png"} alt="" fill sizes="48px" unoptimized className="object-cover" />
                </span>
                <button
                  type="button"
                  onClick={() => playTrack(track, aiQueue)}
                  className="min-w-0 text-left"
                >
                  <span className="block truncate text-sm font-semibold text-white">{track.title}</span>
                  <span className="block truncate text-xs text-zinc-500">{track.artist}</span>
                </button>
                <span className="hidden items-center gap-2 md:flex">
                  <span className="items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-400 md:flex">
                    <ListMusic className="h-3.5 w-3.5" />
                    {realSuggestions.some((item) => item.id === track.id) ? "Real pick" : "AI pick"}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      addToQueue(track);
                      setAiStatus(`Added ${track.title} to the queue.`);
                    }}
                    className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-zinc-400 transition hover:border-[#ff2d67]/40 hover:text-white"
                    title="Add to queue"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
