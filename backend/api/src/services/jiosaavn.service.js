const API_BASE_URL = process.env.API_PUBLIC_URL || "http://localhost:5000";

function pickAudioUrl(song) {
  return song.audioUrl || song.mediaUrl || song.streamUrl || "";
}

function pickCover(song) {
  if (Array.isArray(song.image)) {
    return song.image.at(-1)?.url || `${API_BASE_URL}/media/audiq-logo.png`;
  }

  return (
    song.image ||
    song.cover ||
    song.artwork ||
    song.albumArt ||
    `${API_BASE_URL}/media/audiq-logo.png`
  );
}

function pickArtist(song) {
  if (song.artist || song.primaryArtists || song.singers) {
    return song.artist || song.primaryArtists || song.singers;
  }

  if (Array.isArray(song.artists?.primary)) {
    return song.artists.primary.map((artist) => artist.name).filter(Boolean).join(", ");
  }

  if (Array.isArray(song.artists?.all)) {
    return song.artists.all
      .filter((artist) => ["primary_artists", "singer"].includes(artist.role))
      .map((artist) => artist.name)
      .filter(Boolean)
      .join(", ");
  }

  return "JioSaavn Artist";
}

function pickAlbumTitle(song) {
  if (typeof song.album === "string") {
    return song.album;
  }

  return song.album?.name || song.albumName || "JioSaavn";
}

function getSongs(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.songs)) {
    return payload.songs;
  }

  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  if (Array.isArray(payload.data?.results)) {
    return payload.data.results;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
}

function buildSearchUrl(baseUrl, query) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const searchPath = process.env.JIOSAAVN_SEARCH_PATH || "/search";
  const queryParam = process.env.JIOSAAVN_QUERY_PARAM || "q";

  if (
    normalizedBaseUrl.includes("saavn.dev") &&
    (!process.env.JIOSAAVN_SEARCH_PATH || process.env.JIOSAAVN_SEARCH_PATH === "/search")
  ) {
    const params = new URLSearchParams({ query });
    return `${normalizedBaseUrl}/api/search/songs?${params.toString()}`;
  }

  const params = new URLSearchParams({ [queryParam]: query });
  return `${normalizedBaseUrl}${searchPath.startsWith("/") ? searchPath : `/${searchPath}`}?${params.toString()}`;
}

export async function searchJioSaavnTracks(query) {
  const baseUrl = process.env.JIOSAAVN_API_BASE_URL;

  if (!baseUrl) {
    return [];
  }

  const response = await fetch(buildSearchUrl(baseUrl, query), {
    headers: process.env.JIOSAAVN_API_KEY
      ? {
          Authorization: `Bearer ${process.env.JIOSAAVN_API_KEY}`,
        }
      : undefined,
  });

  if (!response.ok) {
    throw new Error(`JioSaavn search failed with ${response.status}`);
  }

  const payload = await response.json();
  const songs = getSongs(payload);

  return songs
    .map((song, index) => {
      const audioUrl = pickAudioUrl(song);
      const externalUrl = song.url || song.perma_url || "";

      return {
        id: `jiosaavn:${song.id || song.songId || index}`,
        title: song.title || song.name || "JioSaavn Track",
        artist: {
          name: pickArtist(song),
        },
        album: {
          title: pickAlbumTitle(song),
          cover_medium: pickCover(song),
        },
        preview: audioUrl,
        duration: Number(song.duration) || 0,
        isPreview: !audioUrl,
        source: "jiosaavn",
        externalUrl,
      };
    })
    .filter((song) => song.preview || song.externalUrl);
}
