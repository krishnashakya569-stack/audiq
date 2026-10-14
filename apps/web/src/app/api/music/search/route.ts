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

type YouTubeVideo = {
  id?: string;
  snippet?: {
    channelId?: string;
    channelTitle?: string;
    thumbnails?: {
      default?: { url?: string };
      medium?: { url?: string };
      high?: { url?: string };
    };
    title?: string;
  };
  contentDetails?: {
    duration?: string;
    regionRestriction?: { blocked?: string[] };
  };
  status?: {
    embeddable?: boolean;
    privacyStatus?: string;
    uploadStatus?: string;
  };
};

function youtubeDuration(value = "") {
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) return 0;

  return (
    Number(match[1] || 0) * 3600 +
    Number(match[2] || 0) * 60 +
    Number(match[3] || 0)
  );
}

async function searchYouTube(query: string, key: string) {
  const searchParams = new URLSearchParams({
    key,
    part: "snippet",
    q: `${query} official song`,
    type: "video",
    videoCategoryId: "10",
    videoEmbeddable: "true",
    videoSyndicated: "true",
    regionCode: process.env.YOUTUBE_REGION_CODE || "IN",
    maxResults: "10",
  });
  const searchResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`,
    { next: { revalidate: 300 } }
  );

  if (!searchResponse.ok) {
    throw new Error(`YouTube search failed (${searchResponse.status})`);
  }

  const searchPayload = (await searchResponse.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: YouTubeVideo["snippet"];
    }>;
  };
  const videos = searchPayload.items || [];
  const videoIds = videos
    .map((video) => video.id?.videoId)
    .filter((id): id is string => Boolean(id));

  if (videoIds.length === 0) return [];

  const detailsParams = new URLSearchParams({
    key,
    id: videoIds.join(","),
    part: "contentDetails,snippet,status",
  });
  const detailsResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${detailsParams.toString()}`,
    { next: { revalidate: 300 } }
  );

  if (!detailsResponse.ok) {
    throw new Error(`YouTube video details failed (${detailsResponse.status})`);
  }

  const detailsPayload = (await detailsResponse.json()) as {
    items?: YouTubeVideo[];
  };
  const detailsById = new Map(
    (detailsPayload.items || []).map((video) => [video.id, video])
  );

  return videos.flatMap((video, index) => {
    const videoId = video.id?.videoId;
    if (!videoId) return [];

    const details = detailsById.get(videoId);
    const snippet = details?.snippet || video.snippet;
    const status = details?.status;
    const duration = youtubeDuration(details?.contentDetails?.duration);

    if (
      !snippet?.title ||
      !details ||
      status?.embeddable !== true ||
      status.privacyStatus !== "public" ||
      status.uploadStatus !== "processed" ||
      details.contentDetails?.regionRestriction?.blocked?.includes(
        process.env.YOUTUBE_REGION_CODE || "IN"
      ) ||
      duration < 45
    ) {
      return [];
    }

    const thumbnail =
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      null;
    const trackId = `youtube:${videoId}`;

    return [{
      id: trackId,
      provider: "youtube",
      title: snippet.title,
      artists: [
        {
          id: snippet.channelId || "youtube",
          name: snippet.channelTitle || "YouTube",
        },
      ],
      album: { id: "youtube", title: "YouTube" },
      artwork: {
        small: snippet.thumbnails?.default?.url || thumbnail,
        medium: snippet.thumbnails?.medium?.url || thumbnail,
        large: thumbnail,
      },
      duration,
      playable: true,
      streamUrl: null,
      previewUrl: `https://www.youtube.com/watch?v=${videoId}`,
      isPreview: false,
      explicit: false,
      lyricsAvailable: false,
      language: null,
      providers: [
        { provider: "youtube", id: trackId, playable: true },
      ],
      preferredProvider: {
        provider: "youtube",
        id: trackId,
        playable: true,
      },
      sourceRank: index,
    }];
  });
}

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
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  const audiusParams = new URLSearchParams({
    query,
    app_name: audiusAppName,
  });

  const [providerResults, youtubeResult] = await Promise.all([
    Promise.allSettled([
      fetch(`https://itunes.apple.com/search?${params.toString()}`, {
        next: { revalidate: 300 },
      }),
      fetch(
        `https://discoveryprovider.audius.co/v1/tracks/search?${audiusParams.toString()}`,
        { next: { revalidate: 300 } }
      ),
    ]),
    youtubeApiKey
      ? searchYouTube(query, youtubeApiKey).then(
          (tracks) => ({ status: "fulfilled" as const, value: tracks }),
          (reason: unknown) => ({ status: "rejected" as const, reason })
        )
      : Promise.resolve({ status: "fulfilled" as const, value: [] }),
  ]);
  const [itunesResult, audiusResult] = providerResults;

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

  const youtubeTracks =
    youtubeResult.status === "fulfilled" ? youtubeResult.value : [];
  if (youtubeResult.status === "rejected") {
    console.error("YouTube search failed:", youtubeResult.reason);
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
    .map(({ score, ...song }) => {
      void score;
      return song;
    });

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

  return NextResponse.json([
    ...youtubeTracks,
    ...fullTrackSongs,
    ...previewSongs,
  ]);
}
