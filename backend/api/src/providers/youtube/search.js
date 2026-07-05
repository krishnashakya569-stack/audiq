import Song from "../../models/Song.js";
import { publicUrl } from "../../utils/publicUrl.js";

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
  console.log(">>> searchYouTube() called");
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
  console.log("Search API returned:", searchData.items?.length);

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
  console.log(JSON.stringify(detailsData, null, 2));
  console.log("Details API returned:", detailsData.items?.length);

  const detailsMap = new Map(
    (detailsData.items || []).map((item) => [item.id, item])
  );
  const filtered = items.filter((item) => {
  const details = detailsMap.get(item.id.videoId);

  console.log("----------------");

  console.log(item.snippet.title);

  console.log("Embeddable:", details?.status?.embeddable);

  console.log("Privacy:", details?.status?.privacyStatus);

  console.log("Upload:", details?.status?.uploadStatus);

  console.log(
    "Blocked:",
    details?.contentDetails?.regionRestriction?.blocked
  );

  console.log(
    "Duration:",
    toSeconds(details?.contentDetails?.duration)
  );

  return true;
});

console.log(filtered.length);

return filtered.map((item) => {
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
      });
    });
}