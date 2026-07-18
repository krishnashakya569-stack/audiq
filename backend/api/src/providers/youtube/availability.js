export function isYouTubeStreamingEnabled() {
  return Boolean(
    process.env.YTDLP_COOKIES_PATH ||
      process.env.YTDLP_PROXY_URL ||
      process.env.YTDLP_ALLOW_UNAUTHENTICATED === "true"
  );
}

