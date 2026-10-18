import { NextResponse } from "next/server";

const moodProfiles: Record<
  string,
  { label: string; intro: string; searches: string[]; artistHint: string }
> = {
  night: {
    label: "Night Drive",
    intro: "A late-night mix with a steady pulse and glossy electronic sounds.",
    searches: ["synthwave night drive", "late-night synth pop", "dark electronic pop"],
    artistHint: "synth pop night drive",
  },
  focus: {
    label: "Deep Focus",
    intro: "A calm, low-distraction mix for settling into focused work.",
    searches: ["lofi instrumental study", "ambient focus music", "chillhop instrumental"],
    artistHint: "calm instrumental",
  },
  party: {
    label: "House Party",
    intro: "An upbeat mix built around danceable tracks and familiar hooks.",
    searches: ["dance pop party hits", "Bollywood dance hits", "upbeat club anthems"],
    artistHint: "dance pop party",
  },
  heartbreak: {
    label: "Soft Reset",
    intro: "A warm, gentle mix for an emotional reset.",
    searches: ["acoustic heartbreak songs", "Hindi emotional songs", "soft pop ballads"],
    artistHint: "acoustic emotional songs",
  },
  indie: {
    label: "Indie Hour",
    intro: "A set of fresh indie sounds and thoughtful songwriting.",
    searches: ["Indian indie pop", "indie singer songwriter", "independent Hindi music"],
    artistHint: "indie pop",
  },
};

function text(value: unknown, maxLength = 120) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function artistsFrom(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((track) => {
      if (!track || typeof track !== "object") return "";
      return text((track as { artist?: unknown }).artist, 80);
    })
    .filter((artist, index, artists) => artist && artists.indexOf(artist) === index)
    .slice(0, 4);
}

function createLocalPlan(input: {
  mood: string;
  energy: number;
  seed: string;
  likedSongs: unknown;
  recentlyPlayed: unknown;
}) {
  const profile = moodProfiles[input.mood] ?? moodProfiles.night;
  const likedArtists = artistsFrom(input.likedSongs);
  const recentArtists = artistsFrom(input.recentlyPlayed);
  const artists = [...likedArtists, ...recentArtists.filter((artist) => !likedArtists.includes(artist))].slice(0, 4);
  const energyHint = input.energy >= 76 ? "upbeat" : input.energy <= 35 ? "laid-back" : "mid-tempo";
  const seed = input.seed.toLowerCase() === `${profile.label.toLowerCase()} mix` ? "" : input.seed;
  const queries = [
    seed,
    ...artists.slice(0, 2).map((artist) => `${artist} ${profile.artistHint} ${energyHint}`),
    ...profile.searches.map((query) => `${query} ${energyHint}`),
  ]
    .map((query) => query.trim())
    .filter((query, index, all) => query && all.findIndex((item) => item.toLowerCase() === query.toLowerCase()) === index)
    .slice(0, 6);

  return {
    provider: "local",
    title: profile.label,
    intro: profile.intro,
    queries,
    reasons: [
      artists.length
        ? `Uses ${artists.slice(0, 2).join(" and ")} from your liked and recent tracks as taste signals.`
        : "Uses your chosen mood to find a focused set of tracks.",
      `Tunes search toward ${energyHint} music at ${input.energy}% energy.`,
      "Searches Audiq's live music catalog for playable results.",
    ],
  };
}

function parseJsonObject(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

async function createPlan(input: {
  mood: string;
  energy: number;
  seed: string;
  likedSongs: unknown;
  recentlyPlayed: unknown;
}) {
  const fallback = createLocalPlan(input);
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) return fallback;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are Audiq's music curator. Return strict JSON with title, intro, queries, and reasons. Suggest concise search queries for real songs that fit the requested mood, energy, and prompt. Do not include commentary outside the JSON.",
          },
          {
            role: "user",
            content: JSON.stringify({
              mood: input.mood,
              energy: input.energy,
              prompt: input.seed,
              fallbackQueries: fallback.queries,
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) return fallback;

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    const parsed = content ? parseJsonObject(content) : null;
    const modelQueries = Array.isArray(parsed?.queries)
      ? parsed.queries.map((query) => text(query, 100)).filter(Boolean)
      : [];

    if (modelQueries.length === 0) return fallback;

    return {
      provider: "openai",
      title: text(parsed?.title, 80) || fallback.title,
      intro: text(parsed?.intro, 220) || fallback.intro,
      queries: [...new Set([...modelQueries, ...fallback.queries])].slice(0, 6),
      reasons: Array.isArray(parsed?.reasons)
        ? parsed.reasons.map((reason) => text(reason, 160)).filter(Boolean).slice(0, 4)
        : fallback.reasons,
    };
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return NextResponse.json({ message: "Invalid AI DJ request" }, { status: 400 });
  }

  const energyValue = Number(body.energy);
  const plan = await createPlan({
    mood: text(body.mood, 32),
    energy: Number.isFinite(energyValue) ? Math.max(0, Math.min(100, energyValue)) : 65,
    seed: text(body.seed, 160),
    likedSongs: body.likedSongs,
    recentlyPlayed: body.recentlyPlayed,
  });

  return NextResponse.json(plan);
}
