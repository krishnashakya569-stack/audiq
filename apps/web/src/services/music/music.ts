import axios from "axios";
import type { Song } from "./types";
import { API_BASE_URL } from "@/services/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

type MusicSearchResults = Song[] & { youtubeSearchStatus?: string };

export async function searchMusic(
  query: string,
  options: { includeYouTube?: boolean } = {},
): Promise<Song[]> {
  const { data, headers } = await api.get<Song[]>("/music/search", {
    params: {
      q: query,
      ...(options.includeYouTube === false ? { youtube: "0" } : {}),
    },
  });

  const songs = data as MusicSearchResults;
  songs.youtubeSearchStatus = headers["x-audiq-youtube-search"];
  return songs;
}
