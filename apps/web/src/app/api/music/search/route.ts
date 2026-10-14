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

type AudiusTrack = {
  access?: { stream?: boolean };
  artwork?: {
    "1000x1000"?: string;
    "480x480"?: string;
    "150x150"?: string;
  };
  duration?: number;
  genre?: string;
  id?: string;
  is_stream_gated?: boolean;
  title?: string;
  user?: { handle?: string; id?: string; name?: string };
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

  const audiusAppName = process.env.AUDIUS_APP_NAME || "Audiq";
  const audiusParams = new URLSearchParams({
    query,
    app_name: audiusAppName,
  });

  const [itunesResult, audiusResult] = await Promise.allSettled([
    fetch(`https://itunes.apple.com/search?${params.toString()}`, {
      next: { revalidate: 300 },
    }),
    fetch(
      `https://discoveryprovider.audius.co/v1/tracks/search?${audiusParams.toString()}`,
      { next: { revalidate: 300 } }
    ),
  ]);

  let itunesTracks: ItunesTrack[] = [];
  if (itunesResult.status === "fulfilled" && itunesResult.value.ok) {
    const payload = (await itunesResult.value.json()) as {
      results?: ItunesTrack[];
    };
    itunesTracks = payload.results || [];
  }

  let audiusTracks: AudiusTrack[] = [];
  if (audiusResult.status === "fulfilled" && audiusResult.value.ok) {
    const payload = (await audiusResult.value.json()) as {
      data?: AudiusTrack[];
    };
    audiusTracks = payload.data || [];
  }

  const previewSongs = itunesTracks
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
      streamUrl: null,
      previewUrl: track.previewUrl || null,
      isPreview: true,
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
      score: rank(query, track, index) - 80,
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...song }) => song);

  const fullTrackSongs = audiusTracks
    .filter(
      (track) =>
        track.id &&
        track.title &&
        !track.is_stream_gated &&
        track.access?.stream !== false
    )
    .slice(0, 12)
    .map((track, index) => {
      const id = track.id as string;
      const streamParams = new URLSearchParams({ app_name: audiusAppName });
      const streamUrl =
        `https://discoveryprovider.audius.co/v1/tracks/${encodeURIComponent(id)}/stream?` +
        streamParams.toString();
      const cover =
        track.artwork?.["1000x1000"] ||
        track.artwork?.["480x480"] ||
        track.artwork?.["150x150"] ||
        null;
      const providerId = `audius:${id}`;

      return {
        id: providerId,
        provider: "audius",
        title: track.title as string,
        artists: [
          {
            id: track.user?.id || "audius",
            name: track.user?.name || track.user?.handle || "Audius Artist",
          },
        ],
        album: { id: "audius", title: track.genre || "Audius" },
        artwork: { small: cover, medium: cover, large: cover },
        duration: Number(track.duration) || 0,
        playable: true,
        streamUrl,
        previewUrl: null,
        isPreview: false,
        explicit: false,
        lyricsAvailable: false,
        language: null,
        providers: [{ provider: "audius", id: providerId, playable: true }],
        preferredProvider: {
          provider: "audius",
          id: providerId,
          playable: true,
        },
        sourceRank: index,
      };
    });

  return NextResponse.json([...fullTrackSongs, ...previewSongs]);
}
