import Song from "../../models/Song.js";

const ITUNES_SEARCH_API = "https://itunes.apple.com/search";

function artwork(url = "") {
  if (!url) {
    return null;
  }

  return url.replace("100x100", "600x600");
}

export async function searchItunes(query) {
  const params = new URLSearchParams({
    term: query,
    media: "music",
    entity: "song",
    limit: "25",
    country: "US",
  });

  const response = await fetch(`${ITUNES_SEARCH_API}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`iTunes search failed (${response.status})`);
  }

  const payload = await response.json();
  const results = Array.isArray(payload.results) ? payload.results : [];

  return results
    .filter((track) => track.trackId && track.trackName && track.previewUrl)
    .map(
      (track, index) =>
        new Song({
          id: `itunes:${track.trackId}`,
          provider: "itunes",
          title: track.trackName,
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
          previewUrl: track.previewUrl,
          streamUrl: track.previewUrl,
          explicit: track.trackExplicitness === "explicit",
          lyricsAvailable: false,
          language: null,
          sourceRank: index,
        })
    );
}
