import axios from "axios";
import type { Track } from "@/store/player";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
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
