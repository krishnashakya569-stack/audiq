const moodProfiles = {
  night: {
    label: "Night Drive",
    queries: ["The Weeknd night drive", "synth pop late night", "dark pop"],
    intro: "AudiQ AI DJ is dimming the lights for a glossy night-drive set.",
  },
  focus: {
    label: "Deep Focus",
    queries: ["lofi focus", "ambient study", "instrumental beats"],
    intro: "AudiQ AI DJ is clearing the room for a focused, low-distraction session.",
  },
  party: {
    label: "House Party",
    queries: ["party hits", "dance pop", "club mix"],
    intro: "AudiQ AI DJ is raising the energy for a hook-heavy party run.",
  },
  heartbreak: {
    label: "Soft Reset",
    queries: ["sad songs", "Arijit Singh acoustic", "emotional pop"],
    intro: "AudiQ AI DJ is easing into a warm, emotional reset.",
  },
};

function getSeedArtists(likedSongs = [], recentlyPlayed = []) {
  return [...likedSongs, ...recentlyPlayed]
    .map((track) => track?.artist)
    .filter(Boolean)
    .filter((artist, index, artists) => artists.indexOf(artist) === index)
    .slice(0, 4);
}

function fallbackPlan(input) {
  const profile = moodProfiles[input.mood] ?? moodProfiles.night;
  const artists = getSeedArtists(input.likedSongs, input.recentlyPlayed);
  const energyWord = input.energy > 75 ? "upbeat" : input.energy < 40 ? "chill" : "popular";
  const prompt = String(input.seed || "").trim();
  const queries = [
    ...artists.map((artist) => `${artist} ${energyWord}`),
    `${profile.label} ${energyWord}`,
    prompt,
    ...profile.queries,
  ]
    .map((query) => query.trim())
    .filter(Boolean)
    .filter((query, index, queries) => queries.indexOf(query) === index)
    .slice(0, 5);

  return {
    provider: "local",
    title: profile.label,
    intro: profile.intro,
    queries,
    reasons: [
      "Matched against your liked songs and recently played artists.",
      `Energy target is ${input.energy}%, so the set balances momentum and familiarity.`,
      "Queries are sent through AudiQ's real music search engine for playable results.",
    ],
  };
}

function parseJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

export async function createAiDjPlan(input) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackPlan(input);
  }

  const fallback = fallbackPlan(input);

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
            content:
              "You are AudiQ AI DJ. Return strict JSON only with title, intro, queries, and reasons. Queries must be short music search queries that can find real songs.",
          },
          {
            role: "user",
            content: JSON.stringify({
              mood: input.mood,
              energy: input.energy,
              prompt: input.seed,
              likedArtists: getSeedArtists(input.likedSongs, []),
              recentlyPlayedArtists: getSeedArtists([], input.recentlyPlayed),
              fallbackQueries: fallback.queries,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      return {
        ...fallback,
        reason: `OpenAI returned ${response.status}; using local AI DJ fallback.`,
      };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = content ? parseJsonObject(content) : null;

    if (!parsed || !Array.isArray(parsed.queries)) {
      return fallback;
    }

    return {
      provider: "openai",
      title: String(parsed.title || fallback.title),
      intro: String(parsed.intro || fallback.intro),
      queries: parsed.queries
        .map((query) => String(query).trim())
        .filter(Boolean)
        .slice(0, 6),
      reasons: Array.isArray(parsed.reasons)
        ? parsed.reasons.map((reason) => String(reason)).slice(0, 4)
        : fallback.reasons,
    };
  } catch (err) {
    console.error("AI DJ plan failed", err);

    return {
      ...fallback,
      reason: "OpenAI request failed; using local AI DJ fallback.",
    };
  }
}
