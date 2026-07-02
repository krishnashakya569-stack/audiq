import axios from "axios";
import type { Song } from "./types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
});

export async function searchMusic(query: string): Promise<Song[]> {
  const { data } = await api.get("/music/search", {
    params: {
      q: query,
    },
  });

  return data;
}
