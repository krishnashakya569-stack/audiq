import axios from "axios";
import type { Song } from "./types";
import { API_BASE_URL } from "@/services/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

export async function searchMusic(query: string): Promise<Song[]> {
  const { data } = await api.get("/music/search", {
    params: {
      q: query,
    },
  });

  return data;
}
