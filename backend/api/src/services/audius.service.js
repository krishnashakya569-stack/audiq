const AUDIUS_API = process.env.AUDIUS_API_URL || "https://discoveryprovider.audius.co/v1";
const AUDIUS_APP_NAME = process.env.AUDIUS_APP_NAME || "Audiq";
const API_BASE_URL = process.env.API_PUBLIC_URL || "http://localhost:5000";

function getArtwork(track) {
  return (
    track.artwork?.["1000x1000"] ||
    track.artwork?.["480x480"] ||
    track.artwork?.["150x150"] ||
    `${API_BASE_URL}/media/audiq-logo.png`
  );
}

export function audiusStreamUrl(trackId) {
  const params = new URLSearchParams({
    app_name: AUDIUS_APP_NAME,
  });

  return `${AUDIUS_API}/tracks/${encodeURIComponent(trackId)}/stream?${params.toString()}`;
}

export async function searchAudiusTracks(query) {
  const params = new URLSearchParams({
    query,
    app_name: AUDIUS_APP_NAME,
  });
  const response = await fetch(`${AUDIUS_API}/tracks/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Audius search failed with ${response.status}`);
  }

  const payload = await response.json();
  const tracks = Array.isArray(payload.data) ? payload.data : [];

  return tracks
    .filter((track) => track.id && track.title)
    .slice(0, 12)
    .map((track) => ({
      id: `audius:${track.id}`,
      title: track.title,
      artist: {
        name: track.user?.name || track.user?.handle || "Audius Artist",
      },
      album: {
        title: track.genre || "Audius",
        cover_medium: getArtwork(track),
      },
      preview: `${API_BASE_URL}/api/music/stream/audius/${encodeURIComponent(track.id)}`,
      duration: track.duration || 0,
      isPreview: false,
      source: "audius",
    }));
}
