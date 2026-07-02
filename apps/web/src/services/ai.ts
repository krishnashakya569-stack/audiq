import axios from "axios";
import type { Track } from "@/store/player";
import { API_BASE_URL } from "@/services/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

export type AiDjPlan = {
  provider: "openai" | "local";
  title: string;
  intro: string;
  queries: string[];
  reasons: string[];
  reason?: string;
};

export async function createAiDjPlan(input: {
  mood: string;
  energy: number;
  seed: string;
  likedSongs: Track[];
  recentlyPlayed: Track[];
}): Promise<AiDjPlan> {
  const { data } = await api.post("/ai/dj", input);

  return data;
}
