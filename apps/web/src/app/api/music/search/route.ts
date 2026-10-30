import { NextResponse } from "next/server";

const MIN_FULL_TRACK_SECONDS = 60;

type AudiusTrack = {
  access?: { stream?: boolean };
  description?: string;
  artwork?: {
    "1000x1000"?: string;
    "480x480"?: string;
    "150x150"?: string;
  };
  duration?: number;
  genre?: string;
  id?: string;
  is_stream_gated?: boolean;
  is_streamable?: boolean;
  is_preview?: boolean;
  is_preview_only?: boolean;
  tags?: string;
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
    q: query,
    type: "video",    videoEmbeddable: "true",    regionCode: process.env.YOUTUBE_REGION_CODE || "IN",
    maxResults: "25",
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

  if (videoIds.length === 0) return { tracks: [], candidates: videos.length, details: 0 };

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

  const tracks = videos.flatMap((video, index) => {
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
      duration < MIN_FULL_TRACK_SECONDS
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
  return { tracks, candidates: videos.length, details: detailsById.size };
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

const INDIAN_LANGUAGE_SCRIPT = /[\u0900-\u097f\u0980-\u09ff\u0a00-\u0a7f\u0a80-\u0aff\u0b00-\u0b7f\u0b80-\u0bff\u0c00-\u0c7f\u0c80-\u0cff\u0d00-\u0d7f]/;
const INDIAN_MUSIC_TERMS = /\b(?:indian|bharatiya|desi|bollywood|filmi|hindi|punjabi|tamil|telugu|malayalam|kannada|bengali|bangla|marathi|gujarati|bhojpuri|haryanvi|odia|assamese|rajasthani|konkani|manipuri|sindhi|kashmiri|urdu|qawwali|ghazal|sufi|bhajan|kirtan|bhangra|garba|dandiya|hindustani|carnatic|kollywood|tollywood|mollywood|sandalwood|t-series|saregama|zee music|sony music india|tips official|speed records|white hill music|lahari music|think music india)\b/i;

function indianMusicPreferenceBonus(values: Array<string | null | undefined>) {
  const text = values.filter(Boolean).join(" ");
  if (INDIAN_LANGUAGE_SCRIPT.test(text)) return 54;
  if (INDIAN_MUSIC_TERMS.test(text)) return 36;
  return 0;
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

  const audiusAppName = process.env.AUDIUS_APP_NAME || "Audiq";
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  const audiusParams = new URLSearchParams({
    query,
    app_name: audiusAppName,
    limit: "40",
  });

  const [providerResults, youtubeResult] = await Promise.all([
    Promise.allSettled([
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
      : Promise.resolve({ status: "fulfilled" as const, value: { tracks: [], candidates: 0, details: 0 } }),
  ]);
  const [audiusResult] = providerResults;

  let audiusTracks: AudiusTrack[] = [];
  if (audiusResult.status === "fulfilled" && audiusResult.value.ok) {
    const payload = (await audiusResult.value.json()) as {
      data?: AudiusTrack[];
    };
    audiusTracks = payload.data || [];
  }

  const youtubeTracks =
    youtubeResult.status === "fulfilled" ? youtubeResult.value.tracks : [];
  if (youtubeResult.status === "rejected") {
    console.error("YouTube search failed:", youtubeResult.reason);
  }

  const fullTrackSongs = audiusTracks
    .filter(
      (track) =>
        track.id &&
        track.title &&
        !track.is_preview &&
        !track.is_preview_only &&
        Number(track.duration) >= MIN_FULL_TRACK_SECONDS &&
        !track.is_stream_gated &&
        track.access?.stream !== false &&
        track.is_streamable !== false
    )
    .slice(0, 40)
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
        rankScore:
          Math.max(0, 260 - index * 18) +
          indianMusicPreferenceBonus([
            track.title,
            track.genre,
            track.tags,
            track.description,
            track.user?.name,
            track.user?.handle,
          ]),
      };
    })
    .sort(
      (a, b) =>
        b.rankScore - a.rankScore ||
        a.sourceRank - b.sourceRank
    )
    .map(({ rankScore, ...song }) => {
      void rankScore;
      return song;
    });

  const seen = new Set<string>();
  const results = [
    ...youtubeTracks,
    ...fullTrackSongs,
  ].filter((track) => {
    const title = normalize(track.title);
    const artist = normalize(track.artists[0]?.name || "");
    const key = title && artist ? title + "::" + artist : track.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const youtubeErrorCode =
    youtubeResult.status === "rejected" && youtubeResult.reason instanceof Error
      ? youtubeResult.reason.message.match(/\\((\\d{3})\\)/)?.[1] || "unknown"
      : "unknown";
  const youtubeDiagnostic = !youtubeApiKey
    ? "key-missing"
    : youtubeResult.status === "rejected"
      ? `api-error-${youtubeErrorCode}`
      : `candidates-${youtubeResult.value.candidates}-details-${youtubeResult.value.details}-tracks-${youtubeTracks.length}`;
  if (searchParams.get("diagnostics") === "1") {
    return NextResponse.json({
      youtubeSearch: {
        status: youtubeDiagnostic,
        candidates:
          youtubeResult.status === "fulfilled" ? youtubeResult.value.candidates : null,
        details:
          youtubeResult.status === "fulfilled" ? youtubeResult.value.details : null,
        acceptedTracks: youtubeTracks.length,
      },
      totalResults: results.length,
    });
  }
  const response = NextResponse.json(results);
  if (searchParams.get("diagnostics") === "1") {
    response.headers.set("x-audiq-youtube-search", youtubeDiagnostic);
  }
  return response;
}

