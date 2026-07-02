"use client";

import { useQuery } from "@tanstack/react-query";
import { searchMusic } from "@/services/music";

export function useMusic(query: string) {
  return useQuery({
    queryKey: ["music", query],
    queryFn: () => searchMusic(query),
    enabled: query.trim().length > 0,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });
}
