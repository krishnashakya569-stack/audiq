import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import axios from "axios";
import { searchAudiusTracks } from "./audius.service.js";
import { searchJioSaavnTracks } from "./jiosaavn.service.js";
import { searchYouTubeVideos } from "./youtube.service.js";

const API = "https://itunes.apple.com/search";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MEDIA_DIR = path.resolve(__dirname, "../../media");
const LIBRARY_FILE = path.join(MEDIA_DIR, "library.json");
const API_BASE_URL = process.env.API_PUBLIC_URL || "http://localhost:5000";
const QUERY_ALIASES = new Map([
  ["rabata", "raabta"],
  ["rabta", "raabta"],
  ["rabtaa", "raabta"],
  ["raabata", "raabta"],
]);
const PREFERRED_MATCH_TERMS = new Map([
  ["raabta", ["pritam", "arijit", "nikhita gandhi", "agent vinod"]],
]);

function normalize(value = "") {
  return value.toString().trim().toLowerCase();
}

function getSearchQuery(query) {
  return QUERY_ALIASES.get(normalize(query)) || query;
}

function matchesQuery(track, query) {
  const normalizedQuery = normalize(getSearchQuery(query));
  const haystack = [track.title, track.artist, track.album].map(normalize).join(" ");
  return haystack.includes(normalizedQuery);
}

function sourceWeight(source) {
  switch (source) {
    case "local":
      return 80;
    case "youtube":
      return 125;
    case "jiosaavn":
      return 55;
    case "itunes":
      return 45;
    case "audius":
      return 20;
    default:
      return 0;
  }
}

function relevanceScore(song, query) {
  const normalizedQuery = normalize(query);
  const title = normalize(song.title);
  const artist = normalize(song.artist?.name);
  const album = normalize(song.album?.title);
  const haystack = [title, artist, album].join(" ");
  let score = sourceWeight(song.source);

  if (title === normalizedQuery) {
    score += 140;
  } else if (title.startsWith(normalizedQuery)) {
    score += 105;
  } else if (title.includes(normalizedQuery)) {
    score += 75;
  }

  if (artist.includes(normalizedQuery)) {
    score += 35;
  }

  if (album.includes(normalizedQuery)) {
    score += 25;
  }

  if (song.isPreview === false) {
    score += 10;
  }

  if (song.source === "youtube" && /\b(full|official|lyrical|video|song)\b/.test(title)) {
    score += 35;
  }

  for (const term of PREFERRED_MATCH_TERMS.get(normalizedQuery) || []) {
    if (haystack.includes(term)) {
      score += 30;
    }
  }

  return score;
}

function toLocalTrack(track) {
  return {
    id: track.id,
    title: track.title,
    artist: {
      name: track.artist,
    },
    album: {
      title: track.album,
      cover_medium: track.cover || `${API_BASE_URL}/media/audiq-logo.png`,
    },
    preview: `${API_BASE_URL}/media/${encodeURIComponent(track.file)}`,
    duration: track.duration || 0,
    isPreview: false,
    source: "local",
  };
}

async function getLocalSongs(query) {
  try {
    const raw = await fs.readFile(LIBRARY_FILE, "utf8");
    const library = JSON.parse(raw);

    return library
      .filter((track) => track.enabled !== false && track.file)
      .filter((track) => matchesQuery(track, query))
      .map(toLocalTrack);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Failed to read local music library", error);
    }

    return [];
  }
}

async function searchPreviewSongs(query) {
  const { data } = await axios.get(API, {
    params: {
      term: query,
      media: "music",
      limit: 20,
    },
  });

  return data.results.map((song) => ({
    id: song.trackId,
    title: song.trackName,
    artist: {
      name: song.artistName,
    },
    album: {
      title: song.collectionName,
      cover_medium: song.artworkUrl100.replace("100x100", "600x600"),
    },
    preview: song.previewUrl,
    duration: Math.floor(song.trackTimeMillis / 1000),
    isPreview: true,
    source: "itunes",
  }));
}

export async function searchSongs(query) {
  const searchQuery = getSearchQuery(query);
  const [localSongs, jioSaavnSongs, audiusSongs, youtubeSongs, previewSongs] = await Promise.all([
    getLocalSongs(searchQuery),
    searchJioSaavnTracks(searchQuery).catch((error) => {
      console.error("JioSaavn search failed", error);
      return [];
    }),
    searchAudiusTracks(searchQuery).catch((error) => {
      console.error("Audius search failed", error);
      return [];
    }),
    searchYouTubeVideos(searchQuery).catch((error) => {
      console.error("YouTube search failed", error);
      return [];
    }),
    searchPreviewSongs(searchQuery),
  ]);

  return [...localSongs, ...jioSaavnSongs, ...audiusSongs, ...youtubeSongs, ...previewSongs].sort(
    (first, second) => relevanceScore(second, searchQuery) - relevanceScore(first, searchQuery),
  );
}
