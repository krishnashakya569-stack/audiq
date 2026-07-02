import { publicUrl } from "../utils/publicUrl.js";

const YOUTUBE_SEARCH_API = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_VIDEOS_API = "https://www.googleapis.com/youtube/v3/videos";

export async function searchYouTubeVideos(query) {
  const key = process.env.YOUTUBE_API_KEY;

  if (!key) {
    return [];
  }

  const params = new URLSearchParams({
    key,
    maxResults: "8",
    part: "snippet",
    q: `${query} official song`,
    safeSearch: "none",
    type: "video",
    videoCategoryId: "10",
    videoEmbeddable: "true",
    videoSyndicated: "true",
  });
  const response = await fetch(`${YOUTUBE_SEARCH_API}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`YouTube search failed with ${response.status}`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload.items) ? payload.items : [];
  const videoIds = items.map((item) => item.id?.videoId).filter(Boolean);

  if (videoIds.length === 0) {
    return [];
  }

  const detailsParams = new URLSearchParams({
    key,
    id: videoIds.join(","),
    part: "contentDetails,snippet,status",
  });
  const detailsResponse = await fetch(`${YOUTUBE_VIDEOS_API}?${detailsParams.toString()}`);

  if (!detailsResponse.ok) {
    throw new Error(`YouTube details failed with ${detailsResponse.status}`);
  }

  const detailsPayload = await detailsResponse.json();
  const detailsById = new Map(
    (Array.isArray(detailsPayload.items) ? detailsPayload.items : []).map((item) => [item.id, item]),
  );
  const toSeconds = (duration = "") => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

    if (!match) {
      return 0;
    }

    return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
  };

  return items
    .filter((item) => {
      const details = detailsById.get(item.id?.videoId);
      return (
        item.id?.videoId &&
        item.snippet?.title &&
        details?.status?.embeddable === true &&
        details?.status?.privacyStatus === "public" &&
        details?.status?.uploadStatus === "processed" &&
        !details?.contentDetails?.regionRestriction?.blocked?.includes("IN") &&
        toSeconds(details?.contentDetails?.duration) > 45
      );
    })
    .map((item) => {
      const details = detailsById.get(item.id.videoId);
      const snippet = details?.snippet || item.snippet;

      return {
        id: `youtube:${item.id.videoId}`,
        title: snippet.title,
        artist: {
          name: snippet.channelTitle || "YouTube",
        },
        album: {
          title: "YouTube",
          cover_medium:
            snippet.thumbnails?.high?.url ||
            snippet.thumbnails?.medium?.url ||
            snippet.thumbnails?.default?.url ||
            publicUrl("/media/audiq-logo.png"),
        },
        preview: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        duration: toSeconds(details?.contentDetails?.duration),
        isPreview: false,
        source: "youtube",
        videoId: item.id.videoId,
      };
    });
}
