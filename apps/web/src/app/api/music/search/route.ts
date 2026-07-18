import { NextResponse } from "next/server";

type ItunesTrack = {
  artistId?: number;
  artistName?: string;
  artworkUrl100?: string;
  collectionId?: number;
  collectionName?: string;
  previewUrl?: string;
  trackExplicitness?: string;
  trackId?: number;
  trackName?: string;
  trackTimeMillis?: number;
};

function artwork(url = "") {
  return url ? url.replace("100x100", "600x600") : null;
}

function normalize(value = "") {
  return value
    .toLowerCase()
    .replace(/[()[\]{}]/g, "")
    .replace(/feat\..*/gi, "")
    .replace(/ft\..*/gi, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function rank(query: string, track: ItunesTrack, index: number) {
  const q = normalize(query);
  const title = normalize(track.trackName);
  const artist = normalize(track.artistName);

  let score = Math.max(0, 260 - index * 18);

  if (title === q) {
    score += 140;
  } else if (title.startsWith(q)) {
    score += 120;
  } else if (title.includes(q)) {
    score += 80;
  }

  if (artist.includes(q)) {
    score += 80;
  }

  const duration = Math.floor((track.trackTimeMillis || 0) / 1000);

  if (duration < 45) {
    score -= 200;
  } else if (duration > 120 && duration < 420) {
    score += 25;
  }

  return score;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json(
      { message: "Missing search query" },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    term: query,
    media: "music",
    entity: "song",
    limit: "25",
    country: "US",
  });

  const response = await fetch(
    `https://itunes.apple.com/search?${params.toString()}`,
    {
      next: {
        revalidate: 300,
      },
    }
  );

  if (!response.ok) {
    return NextResponse.json(
      { message: "Music search failed" },
      { status: 502 }
    );
  }

  const payload = (await response.json()) as {
    results?: ItunesTrack[];
  };

  const songs = (payload.results || [])
    .filter((track) => track.trackId && track.trackName && track.previewUrl)
    .map((track, index) => ({
      id: `itunes:${track.trackId}`,
      provider: "itunes",
      title: track.trackName || "Unknown Title",
      artists: [
        {
          id: String(track.artistId || "itunes"),
          name: track.artistName || "iTunes Artist",
        },
      ],
      album: {
        id: String(track.collectionId || "itunes"),
        title: track.collectionName || "iTunes",
      },
      artwork: {
        small: track.artworkUrl100 || null,
        medium: artwork(track.artworkUrl100),
        large: artwork(track.artworkUrl100),
      },
      duration: Math.floor((track.trackTimeMillis || 0) / 1000),
      playable: true,
      streamUrl: track.previewUrl || null,
      previewUrl: track.previewUrl || null,
      explicit: track.trackExplicitness === "explicit",
      lyricsAvailable: false,
      language: null,
      providers: [
        {
          provider: "itunes",
          id: `itunes:${track.trackId}`,
          playable: true,
        },
      ],
      preferredProvider: {
        provider: "itunes",
        id: `itunes:${track.trackId}`,
        playable: true,
      },
      score: rank(query, track, index),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...song }) => song);

  return NextResponse.json(songs);
}
