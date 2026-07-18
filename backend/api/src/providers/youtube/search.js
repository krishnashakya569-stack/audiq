import Song from "../../models/Song.js";
import { publicUrl } from "../../utils/publicUrl.js";
import { isYouTubeStreamingEnabled } from "./availability.js";

const YOUTUBE_SEARCH_API = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_VIDEOS_API = "https://www.googleapis.com/youtube/v3/videos";

function toSeconds(duration = "") {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) return 0;

  return (
    Number(match[1] || 0) * 3600 +
    Number(match[2] || 0) * 60 +
    Number(match[3] || 0)
  );
}

export async function searchYouTube(query) {
  if (!isYouTubeStreamingEnabled()) {
    return [];
  }

  const key = process.env.YOUTUBE_API_KEY;

  if (!key) {
    return [];
  }

  const searchParams = new URLSearchParams({
  key,
  part: "snippet",
  q: `${query} official song`,
  type: "video",
  maxResults: "8",
});

  const searchResponse = await fetch(
    `${YOUTUBE_SEARCH_API}?${searchParams.toString()}`
  );

  if (!searchResponse.ok) {
  const error = await searchResponse.text();

  console.error("YouTube Search Error:");
  console.error(error);

  throw new Error(
    `YouTube search failed (${searchResponse.status})`
  );
}

  const searchData = await searchResponse.json();
  const items = Array.isArray(searchData.items)
    ? searchData.items
    : [];

  const videoIds = items
    .map((item) => item.id?.videoId)
    .filter(Boolean);

  if (videoIds.length === 0) {
    return [];
  }

  const detailsParams = new URLSearchParams({
    key,
    id: videoIds.join(","),
    part: "snippet,status,contentDetails",
  });

  const detailsResponse = await fetch(
    `${YOUTUBE_VIDEOS_API}?${detailsParams.toString()}`
  );

  if (!detailsResponse.ok) {
    throw new Error(
      `YouTube details failed (${detailsResponse.status})`
    );
  }

  const detailsData = await detailsResponse.json();
  const detailsMap = new Map(
    (detailsData.items || []).map((item) => [item.id, item])
  );
  const filtered = items.filter((item) => {
  const details = detailsMap.get(item.id.videoId);

  return (
    item.id?.videoId &&
    item.snippet?.title &&
    details?.status?.embeddable === true &&
    details?.status?.privacyStatus === "public" &&
    details?.status?.uploadStatus === "processed" &&
    !details?.contentDetails?.regionRestriction?.blocked?.includes("IN") &&
    toSeconds(details?.contentDetails?.duration) > 45
  );
});

return filtered.map((item, index) => {
      const details = detailsMap.get(item.id.videoId);

      const snippet = details.snippet;

      return new Song({
        id: `youtube:${item.id.videoId}`,

        provider: "youtube",

        title: snippet.title,

        artists: [
          {
            id: snippet.channelId,
            name: snippet.channelTitle,
          },
        ],

        album: {
          id: "youtube",
          title: "YouTube",
        },

        artwork: {
          small:
            snippet.thumbnails?.default?.url ??
            publicUrl("/media/audiq-logo.png"),

          medium:
            snippet.thumbnails?.medium?.url ??
            publicUrl("/media/audiq-logo.png"),

          large:
            snippet.thumbnails?.high?.url ??
            publicUrl("/media/audiq-logo.png"),
        },

        duration: toSeconds(details.contentDetails.duration),

        playable: true,

        previewUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,

        streamUrl: null,

        explicit: false,

        lyricsAvailable: false,

        language: null,

        sourceRank: index,
      });
    });
}
